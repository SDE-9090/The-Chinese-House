const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db/pool");
const { adminAuth, authorizeRole, JWT_SECRET } = require("../middleware/adminAuth");
const { tenantContext } = require("../middleware/tenantContext");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../../config/cloudinary");

// Set up multer for handling .zip uploads via Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "app_updates",
    resource_type: "raw", // Required for non-image/video files like .zip
    public_id: (req, file) => `update-${Date.now()}-${Math.round(Math.random() * 1e9)}`,
  },
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/zip" || file.mimetype === "application/x-zip-compressed" || file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error("Only .zip files are allowed for updates"));
    }
  },
});

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
      SELECT b.id, b.name, b.slug, b.status, b.is_active, b.created_at, b.features, b.subscription_tier, a.mobile_number as owner_phone,
             (SELECT COUNT(*) FROM orders o WHERE o.business_id = b.id AND date_trunc('month', o.created_at) = date_trunc('month', CURRENT_DATE)) as current_month_orders
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
// UPDATE BUSINESS FEATURES
// ======================================================
router.patch("/businesses/:id/features", async (req, res) => {
  const { id } = req.params;
  const { features } = req.body;

  if (typeof features !== 'object' || Array.isArray(features)) {
    return res.status(400).json({ error: "Features must be a JSON object" });
  }

  try {
    const result = await pool.query(
      "UPDATE businesses SET features = $1 WHERE id = $2 RETURNING id, features",
      [JSON.stringify(features), id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Business not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating business features:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ======================================================
// UPDATE BUSINESS TIER
// ======================================================
const TIER_FEATURES = {
  free: { pos_system: true, kitchen_display: true, manual_table_orders: true, qr_digital_ordering: false, advanced_analytics: false, website_cms: false, coupon_engine: false, customer_reviews: false },
  pro: { pos_system: true, kitchen_display: true, manual_table_orders: true, qr_digital_ordering: true, advanced_analytics: true, website_cms: false, coupon_engine: false, customer_reviews: true },
  enterprise: { pos_system: true, kitchen_display: true, manual_table_orders: true, qr_digital_ordering: true, advanced_analytics: true, website_cms: true, coupon_engine: true, customer_reviews: true }
};

router.patch("/businesses/:id/tier", async (req, res) => {
  const { id } = req.params;
  const { tier } = req.body;

  if (!TIER_FEATURES[tier]) {
    return res.status(400).json({ error: "Invalid subscription tier" });
  }

  try {
    const result = await pool.query(
      "UPDATE businesses SET subscription_tier = $1, features = $2 WHERE id = $3 RETURNING id, subscription_tier, features",
      [tier, JSON.stringify(TIER_FEATURES[tier]), id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Business not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating business tier:", err);
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
      `INSERT INTO business_settings (business_id, restaurant_name) 
       VALUES ($1, $2)`,
      [businessId, name]
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

// ======================================================
// UPLOAD GLOBAL OTA UPDATE
// ======================================================
router.post("/ota/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No update file uploaded" });
  }

  const { version, release_notes } = req.body;
  if (!version) {
    return res.status(400).json({ error: "Version number is required" });
  }

  const client = await pool.connect();
  try {
    const fileUrl = req.file.path;
    await client.query("BEGIN");

    const insertResult = await client.query(
      `INSERT INTO app_updates (version, url, release_notes) 
       VALUES ($1, $2, $3) RETURNING *`,
      [version, fileUrl, release_notes || ""]
    );

    // Keep only the latest 3 global updates
    const oldUpdates = await client.query(
      `SELECT id, url FROM app_updates ORDER BY created_at DESC OFFSET 3`
    );

    for (const row of oldUpdates.rows) {
      try {
        if (row.url.includes("cloudinary")) {
          const parts = row.url.split("/");
          const filename = parts[parts.length - 1];
          const folder = parts[parts.length - 2];
          const publicId = `${folder}/${filename}`;
          await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
        }
        await client.query(`DELETE FROM app_updates WHERE id = $1`, [row.id]);
      } catch (e) {
        console.error("Failed to delete old update:", e);
      }
    }

    await client.query("COMMIT");

    // Broadcast globally to all connected tablets
    const io = req.app.get("io");
    if (io) {
      io.emit("global-ota-update", { version, url: fileUrl, release_notes });
    }

    res.json({
      success: true,
      message: "Update uploaded successfully",
      update: insertResult.rows[0],
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error uploading update:", err);
    res.status(500).json({ error: "Failed to save update to database" });
  } finally {
    client.release();
  }
});

// ======================================================
// GET GLOBAL ANALYTICS (God View)
// ======================================================
router.get("/analytics", async (req, res) => {
  try {
    const client = await pool.connect();
    
    // Total GMV (Paid Orders)
    const gmvResult = await client.query(`SELECT SUM(total) as gmv FROM orders WHERE payment_status = 'paid'`);
    const totalGmv = parseFloat(gmvResult.rows[0]?.gmv || 0);

    // Total Tenants
    const tenantResult = await client.query(`SELECT COUNT(*) as total_tenants, SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as active_tenants FROM businesses`);
    
    // Total Orders
    const ordersResult = await client.query(`SELECT COUNT(*) as total_orders FROM orders`);

    // 30-Day Growth Data
    const growthResult = await client.query(`
      WITH dates AS (
        SELECT generate_series(
          CURRENT_DATE - INTERVAL '30 days',
          CURRENT_DATE,
          '1 day'::interval
        )::date as day
      ),
      daily_orders AS (
        SELECT DATE(created_at) as day, COUNT(*) as orders_count, SUM(total) as revenue
        FROM orders
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE(created_at)
      ),
      daily_tenants AS (
        SELECT DATE(created_at) as day, COUNT(*) as new_tenants
        FROM businesses
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE(created_at)
      )
      SELECT 
        to_char(d.day, 'Mon DD') as date,
        COALESCE(o.orders_count, 0) as orders,
        COALESCE(o.revenue, 0) as revenue,
        COALESCE(t.new_tenants, 0) as signups
      FROM dates d
      LEFT JOIN daily_orders o ON d.day = o.day
      LEFT JOIN daily_tenants t ON d.day = t.day
      ORDER BY d.day ASC;
    `);

    client.release();

    res.json({
      metrics: {
        totalGmv,
        totalTenants: parseInt(tenantResult.rows[0]?.total_tenants || 0),
        activeTenants: parseInt(tenantResult.rows[0]?.active_tenants || 0),
        totalOrders: parseInt(ordersResult.rows[0]?.total_orders || 0),
      },
      chartData: growthResult.rows
    });
  } catch (err) {
    console.error("Error fetching global analytics:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ======================================================
// TENANT IMPERSONATION (Log In As)
// ======================================================
router.post("/impersonate/:business_id", async (req, res) => {
  const { business_id } = req.params;

  try {
    // Find the primary admin account for this business, and also get the business slug
    const result = await pool.query(
      `SELECT a.id, b.slug 
       FROM admin_account a 
       JOIN businesses b ON a.business_id = b.id 
       WHERE a.business_id = $1 
       ORDER BY a.id ASC LIMIT 1`,
      [business_id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "No admin account found for this tenant" });
    }

    const admin = result.rows[0];

    // Generate standard admin JWT but append impersonator flag
    const token = jwt.sign(
      { 
        id: admin.id, 
        role: "admin", 
        business_id: business_id,
        impersonator: true // Key flag for the frontend banner
      },
      JWT_SECRET,
      { expiresIn: "2h" } // Impersonation sessions should be short-lived
    );

    res.json({ 
      message: "Impersonation session started", 
      token, 
      role: "admin",
      slug: admin.slug
    });
  } catch (err) {
    console.error("Error starting impersonation:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ======================================================
// GLOBAL ANNOUNCEMENTS
// ======================================================
router.post("/announcements", async (req, res) => {
  const { title, message, type } = req.body;

  if (!title || !message) {
    return res.status(400).json({ error: "Title and message are required" });
  }

  try {
    const io = req.app.get("io");
    if (io) {
      io.emit("global-announcement", {
        id: `announcement-${Date.now()}`,
        title,
        message,
        type: type || "info",
        timestamp: new Date().toISOString()
      });
    }

    res.json({ success: true, message: "Announcement broadcasted successfully" });
  } catch (err) {
    console.error("Error broadcasting announcement:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
