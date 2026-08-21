const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db/pool");
const { adminAuth, authorizeRole, JWT_SECRET } = require("../middleware/adminAuth");
const { tenantContext } = require("../middleware/tenantContext");

const BCRYPT_ROUNDS = 12;

// Middleware to inject 'super_admin' context for RLS bypass
router.use((req, res, next) => {
  tenantContext.run('super_admin', next);
});

// ======================================================
// LOGIN (Super Admin)
// ======================================================
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const result = await pool.query(
      "SELECT id, password_hash FROM super_admins WHERE email = $1 LIMIT 1",
      [email.trim().toLowerCase()]
    );

    if (!result.rows.length) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const admin = result.rows[0];
    const valid = await bcrypt.compare(password, admin.password_hash);

    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: admin.id, role: "super_admin" },
      JWT_SECRET,
      { expiresIn: "12h" }
    );

    res.json({ message: "Login successful", token, role: "super_admin" });
  } catch (err) {
    console.error("Super Admin login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Middleware to secure the rest of the routes
router.use(adminAuth, authorizeRole(['super_admin']));

// ======================================================
// GET ALL BUSINESSES
// ======================================================
router.get("/businesses", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT b.id, b.name, b.slug, b.status, b.is_active, b.created_at, a.mobile_number as owner_phone
      FROM businesses b
      LEFT JOIN admin_account a ON a.business_id = b.id
      ORDER BY b.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching businesses:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ======================================================
// CREATE NEW BUSINESS (TENANT)
// ======================================================
router.post("/businesses", async (req, res) => {
  const { name, slug, phone, password } = req.body;

  if (!name || !slug || !phone || !password) {
    return res.status(400).json({ error: "Name, slug, owner phone, and password are required" });
  }

  // Basic slug validation (alphanumeric, dashes, lowercase)
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return res.status(400).json({ error: "Slug must contain only lowercase letters, numbers, and dashes" });
  }

  // Basic phone validation
  if (!/^[0-9]{10}$/.test(phone)) {
    return res.status(400).json({ error: "Phone number must be exactly 10 digits." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Create Business
    const businessResult = await client.query(
      `INSERT INTO businesses (name, slug, features, is_active, status) 
       VALUES ($1, $2, '{}', true, 'active') RETURNING id`,
      [name, slug]
    );
    const businessId = businessResult.rows[0].id;

    // 2. Create Admin Account (Owner)
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await client.query(
      `INSERT INTO admin_account (mobile_number, password_hash, business_id, webauthn_user_id) 
       VALUES ($1, $2, $3, gen_random_uuid())`,
      [phone, passwordHash, businessId]
    );

    // 3. Create Default Business Settings
    await client.query(
      `INSERT INTO business_settings (
        business_id, gst_number, gst_percentage, sst_percentage, include_gst_in_price,
        store_address, contact_number, fssai_number, working_hours,
        order_modes, delivery_radius_km, minimum_order_value, tax_type
      ) VALUES ($1, '', 5, 0, false, '', '', '', '{}', '["dine-in", "takeaway", "delivery"]', 5, 0, 'none')`,
      [businessId]
    );

    await client.query("COMMIT");
    res.status(201).json({ message: "Business created successfully", business_id: businessId });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error creating business:", err);
    if (err.constraint === 'businesses_slug_key') {
      return res.status(400).json({ error: "Slug already in use" });
    }
    if (err.constraint === 'admin_account_mobile_business_unique') {
      return res.status(400).json({ error: "Phone number already exists for this business" });
    }
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

// ======================================================
// TOGGLE BUSINESS STATUS
// ======================================================
router.patch("/businesses/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['active', 'suspended'].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  try {
    // We also update is_active to match for backward compatibility until fully migrated
    const isActive = status === 'active';
    const result = await pool.query(
      "UPDATE businesses SET status = $1, is_active = $2 WHERE id = $3 RETURNING id, status, is_active",
      [status, isActive, id]
    );
    
    if (!result.rows.length) {
      return res.status(404).json({ error: "Business not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error toggling business status:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
