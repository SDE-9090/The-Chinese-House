const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db/pool");
const { adminAuth, authorizeRole, JWT_SECRET } = require("../middleware/adminAuth");
const { tenantContext } = require("../middleware/tenantContext");
const { tenantCache } = require("../middleware/tenantEnforcer");
const { logAuditAction } = require("../utils/auditLogger");
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
// PROFILE MANAGEMENT (Super Admin)
// ======================================================
router.get("/profile", async (req, res) => {
  try {
    const result = await pool.query("SELECT email FROM super_admins WHERE id = $1", [req.admin.id]);
    if (!result.rows.length) return res.status(404).json({ error: "Super admin not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching super admin profile:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/profile", async (req, res) => {
  const { email, password, oldPassword } = req.body;
  if (!email) return res.status(400).json({ error: "Email/Username is required" });

  if (password && password.trim() !== "") {
    if (!oldPassword) {
      return res.status(400).json({ error: "Current password is required to set a new password" });
    }
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    // Check if new email already exists (excluding self)
    const check = await client.query("SELECT id FROM super_admins WHERE email = $1 AND id != $2", [email.trim().toLowerCase(), req.admin.id]);
    if (check.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Username/Email already in use" });
    }

    if (password && password.trim() !== "") {
      const adminRes = await client.query("SELECT password_hash FROM super_admins WHERE id = $1", [req.admin.id]);
      if (!adminRes.rows.length) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Super admin not found" });
      }

      const valid = await bcrypt.compare(oldPassword, adminRes.rows[0].password_hash);
      if (!valid) {
        await client.query("ROLLBACK");
        return res.status(401).json({ error: "Incorrect current password" });
      }

      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      await client.query("UPDATE super_admins SET password_hash = $1 WHERE id = $2", [passwordHash, req.admin.id]);
    }

    await client.query("UPDATE super_admins SET email = $1 WHERE id = $2", [email.trim().toLowerCase(), req.admin.id]);

    await client.query("COMMIT");
    res.json({ success: true, message: "Profile updated successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error updating super admin profile:", err);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

// ======================================================
// GET GLOBAL AUDIT LOGS
// ======================================================
router.get("/audit-logs", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;
  const businessId = req.query.businessId;

  try {
    let queryStr = `
      SELECT al.*, b.name as business_name, s.name as staff_name, s.role as staff_role 
      FROM audit_logs al
      LEFT JOIN businesses b ON al.business_id = b.id
      LEFT JOIN staff s ON al.actor_id = s.id
    `;
    let countQueryStr = `SELECT COUNT(*) FROM audit_logs al`;
    let queryParams = [];
    let countParams = [];

    if (businessId) {
      queryStr += ` WHERE al.business_id = $1`;
      countQueryStr += ` WHERE al.business_id = $1`;
      queryParams.push(businessId);
      countParams.push(businessId);
    }

    queryStr += ` ORDER BY al.created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);

    const [logsResult, countResult] = await Promise.all([
      pool.query(queryStr, queryParams),
      pool.query(countQueryStr, countParams)
    ]);

    res.json({
      logs: logsResult.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit
    });
  } catch (err) {
    console.error("Error fetching global audit logs:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ======================================================
// GET ALL BUSINESSES
// ======================================================
router.get("/businesses", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT b.id, b.name, b.slug, b.status, b.is_active, b.created_at, b.features, b.subscription_tier, b.parent_business_id,
             a.mobile_number as owner_phone, t.monthly_order_limit,
             pb.name as parent_name, pb.slug as parent_slug,
             (SELECT COUNT(*) FROM orders o WHERE o.business_id = b.id AND date_trunc('month', o.created_at) = date_trunc('month', CURRENT_DATE)) as current_month_orders,
             (SELECT COUNT(*) FROM marketing_campaigns mc WHERE mc.business_id = b.id AND date_trunc('month', mc.sent_at) = date_trunc('month', CURRENT_DATE)) as current_month_marketing
      FROM businesses b
      LEFT JOIN admin_account a ON a.business_id = b.id
      LEFT JOIN subscription_tiers t ON t.name = b.subscription_tier
      LEFT JOIN businesses pb ON b.parent_business_id = pb.id
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

    // Clear tenant cache just in case features are needed in cache later
    const slugRes = await pool.query("SELECT slug FROM businesses WHERE id = $1", [id]);
    if (slugRes.rows.length) {
      tenantCache.delete(slugRes.rows[0].slug);
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
// ======================================================
// MANAGE SUBSCRIPTION TIERS
// ======================================================
router.get("/tiers", async (req, res) => {
  try {
    const result = await pool.query("SELECT name, monthly_order_limit, monthly_price, included_features FROM subscription_tiers ORDER BY monthly_price ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching tiers:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/tiers/:name", async (req, res) => {
  const { name } = req.params;
  const { monthly_order_limit, monthly_price, included_features } = req.body;

  try {
    const result = await pool.query(
      "UPDATE subscription_tiers SET monthly_order_limit = $1, monthly_price = $2, included_features = $3 WHERE name = $4 RETURNING *",
      [monthly_order_limit, monthly_price, JSON.stringify(included_features || []), name]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Tier not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating tier:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/businesses/:id/tier", async (req, res) => {
  const { id } = req.params;
  const { tier } = req.body;

  try {
    const tierRes = await pool.query("SELECT included_features FROM subscription_tiers WHERE name = $1", [tier]);
    if (!tierRes.rows.length) {
      return res.status(400).json({ error: "Invalid subscription tier" });
    }

    const includedArray = tierRes.rows[0].included_features || [];
    const newFeaturesObj = {};
    const ALL_POSSIBLE_FEATURES = ["pos_system", "kitchen_display", "manual_table_orders", "qr_digital_ordering", "advanced_analytics", "website_cms", "coupon_engine", "customer_reviews"];
    
    for (const f of ALL_POSSIBLE_FEATURES) {
      newFeaturesObj[f] = includedArray.includes(f);
    }

    const result = await pool.query(
      "UPDATE businesses SET subscription_tier = $1, features = $2 WHERE id = $3 RETURNING id, subscription_tier, features",
      [tier, JSON.stringify(newFeaturesObj), id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Business not found" });
    }

    await logAuditAction(req, "UPDATE_TENANT_TIER", "businesses", id, { tier: tier }, id);

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

    await logAuditAction(req, "CREATE_TENANT", "businesses", businessId, { name, slug }, businessId);

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
// EDIT BUSINESS DETAILS
// ======================================================
router.put("/businesses/:id", async (req, res) => {
  const { id } = req.params;
  const { name, slug, phone, password } = req.body;

  if (!name || !slug || !phone) {
    return res.status(400).json({ error: "Name, slug, and phone are required" });
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    return res.status(400).json({ error: "Slug must contain only lowercase letters, numbers, and dashes" });
  }
  
  if (!/^[0-9]{10}$/.test(phone)) {
    return res.status(400).json({ error: "Phone number must be exactly 10 digits." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Update Business (name, slug)
    await client.query(
      "UPDATE businesses SET name = $1, slug = $2 WHERE id = $3",
      [name, slug, id]
    );

    // 2. Update Admin Account phone
    await client.query(
      "UPDATE admin_account SET mobile_number = $1 WHERE business_id = $2",
      [phone, id]
    );

    // 3. Optionally update password
    if (password && password.trim() !== "") {
      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      await client.query(
        "UPDATE admin_account SET password_hash = $1 WHERE business_id = $2",
        [passwordHash, id]
      );
    }

    await client.query("COMMIT");
    
    await logAuditAction(req, "UPDATE_TENANT", "businesses", id, { name, slug, phone }, id);

    // Clear tenant cache
    tenantCache.delete(slug);

    res.json({ message: "Business updated successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error updating business:", err);
    if (err.constraint === 'businesses_slug_key') {
      return res.status(400).json({ error: "Slug already in use" });
    }
    if (err.constraint === 'admin_account_mobile_business_unique') {
      return res.status(400).json({ error: "Phone number already exists for another business" });
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

    await logAuditAction(req, "TOGGLE_TENANT_STATUS", "businesses", id, { status: newStatus }, id);

    // Clear tenant cache so tenantEnforcer fetches fresh status
    const slugRes = await pool.query("SELECT slug FROM businesses WHERE id = $1", [id]);
    if (slugRes.rows.length) {
      tenantCache.delete(slugRes.rows[0].slug);
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
// GET TENANT SPECIFIC ANALYTICS
// ======================================================
router.get("/businesses/:id/analytics", async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    const businessCheck = await client.query("SELECT name FROM businesses WHERE id = $1", [id]);
    if (!businessCheck.rows.length) {
      return res.status(404).json({ error: "Business not found" });
    }

    // All-time
    const allTimeRes = await client.query(
      `SELECT COUNT(*) as total_orders, COALESCE(SUM(total), 0) as total_revenue 
       FROM orders WHERE business_id = $1 AND status != 'cancelled'`, 
      [id]
    );

    // Today (Daily)
    const dailyRes = await client.query(
      `SELECT COUNT(*) as total_orders, COALESCE(SUM(total), 0) as total_revenue 
       FROM orders WHERE business_id = $1 AND status != 'cancelled' 
       AND (created_at AT TIME ZONE 'Asia/Kolkata')::date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date`, 
      [id]
    );

    // This Week (Last 7 Days)
    const weeklyRes = await client.query(
      `SELECT COUNT(*) as total_orders, COALESCE(SUM(total), 0) as total_revenue 
       FROM orders WHERE business_id = $1 AND status != 'cancelled' 
       AND created_at >= (NOW() AT TIME ZONE 'Asia/Kolkata') - INTERVAL '7 days'`, 
      [id]
    );

    // This Month
    const monthlyRes = await client.query(
      `SELECT COUNT(*) as total_orders, COALESCE(SUM(total), 0) as total_revenue 
       FROM orders WHERE business_id = $1 AND status != 'cancelled' 
       AND date_trunc('month', created_at AT TIME ZONE 'Asia/Kolkata') = date_trunc('month', NOW() AT TIME ZONE 'Asia/Kolkata')`, 
      [id]
    );

    // This Year
    const yearlyRes = await client.query(
      `SELECT COUNT(*) as total_orders, COALESCE(SUM(total), 0) as total_revenue 
       FROM orders WHERE business_id = $1 AND status != 'cancelled' 
       AND date_trunc('year', created_at AT TIME ZONE 'Asia/Kolkata') = date_trunc('year', NOW() AT TIME ZONE 'Asia/Kolkata')`, 
      [id]
    );

    res.json({
      allTime: {
        orders: parseInt(allTimeRes.rows[0].total_orders),
        revenue: parseFloat(allTimeRes.rows[0].total_revenue)
      },
      daily: {
        orders: parseInt(dailyRes.rows[0].total_orders),
        revenue: parseFloat(dailyRes.rows[0].total_revenue)
      },
      weekly: {
        orders: parseInt(weeklyRes.rows[0].total_orders),
        revenue: parseFloat(weeklyRes.rows[0].total_revenue)
      },
      monthly: {
        orders: parseInt(monthlyRes.rows[0].total_orders),
        revenue: parseFloat(monthlyRes.rows[0].total_revenue)
      },
      yearly: {
        orders: parseInt(yearlyRes.rows[0].total_orders),
        revenue: parseFloat(yearlyRes.rows[0].total_revenue)
      }
    });

  } catch (err) {
    console.error("Tenant Analytics Error:", err);
    res.status(500).json({ error: "Failed to fetch analytics for tenant" });
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

// ======================================================
// ENQUIRIES & SETTINGS
// ======================================================

router.get("/enquiries/unread-count", async (req, res) => {
  try {
    const result = await pool.query(`SELECT COUNT(*) FROM saas_enquiries WHERE is_read = false`);
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    console.error("Error fetching unread enquiries count:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/enquiries/mark-read", async (req, res) => {
  try {
    await pool.query(`UPDATE saas_enquiries SET is_read = true WHERE is_read = false`);
    res.json({ success: true });
  } catch (err) {
    console.error("Error marking enquiries as read:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
router.get("/enquiries", async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM saas_enquiries ORDER BY created_at DESC`);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching enquiries:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/enquiries/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: "Status is required" });

  try {
    await pool.query(`UPDATE saas_enquiries SET status = $1 WHERE id = $2`, [status, id]);
    res.json({ success: true });
  } catch (err) {
    console.error("Error updating enquiry status:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/enquiries/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(`DELETE FROM saas_enquiries WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting enquiry:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/settings", async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM saas_settings LIMIT 1`);
    if (result.rows.length === 0) {
      return res.json({ contact_email: "", contact_phone: "" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching saas settings:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/settings", async (req, res) => {
  const { contact_email, contact_phone } = req.body;
  try {
    const check = await pool.query(`SELECT id FROM saas_settings LIMIT 1`);
    if (check.rows.length === 0) {
      await pool.query(
        `INSERT INTO saas_settings (contact_email, contact_phone) VALUES ($1, $2)`,
        [contact_email, contact_phone]
      );
    } else {
      await pool.query(
        `UPDATE saas_settings SET contact_email = $1, contact_phone = $2, updated_at = CURRENT_TIMESTAMP`,
        [contact_email, contact_phone]
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Error updating saas settings:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
// ======================================================
// MULTI-BRANCH REQUESTS (SUPER ADMIN)
// ======================================================
router.get("/branch-requests", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT br.*, p.name as parent_name, p.slug as parent_slug 
       FROM branch_requests br
       JOIN businesses p ON br.parent_business_id = p.id
       ORDER BY br.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching branch requests:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/branch-requests/:id/approve", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    // 1. Get the request
    const reqResult = await client.query("SELECT * FROM branch_requests WHERE id = $1 FOR UPDATE", [req.params.id]);
    if (reqResult.rows.length === 0) throw new Error("Request not found");
    const request = reqResult.rows[0];
    if (request.status !== 'pending') throw new Error("Request is not pending");

    // 2. Get Parent Business
    const parentResult = await client.query("SELECT * FROM businesses WHERE id = $1", [request.parent_business_id]);
    if (parentResult.rows.length === 0) throw new Error("Parent business not found");
    const parent = parentResult.rows[0];

    // 3. Create the new business branch
    const newBusiness = await client.query(
      `INSERT INTO businesses (name, slug, parent_business_id, subscription_tier, status, is_active) 
       VALUES ($1, $2, $3, $4, 'active', true) RETURNING id`,
      [request.requested_name, request.requested_slug, request.parent_business_id, request.requested_tier]
    );
    const branchId = newBusiness.rows[0].id;

    // 4. Create branch admin account using requested credentials
    await client.query(
      `INSERT INTO admin_account (business_id, mobile_number, password_hash, webauthn_user_id) 
       VALUES ($1, $2, $3, $4)`,
      [branchId, request.requested_mobile, request.requested_password_hash, require("crypto").randomUUID()]
    );

    // 5. Setup basic tables for the new branch
    await client.query(`INSERT INTO business_settings (business_id, restaurant_name) VALUES ($1, $2)`, [branchId, request.requested_name]);

    // 6. Update request status
    await client.query("UPDATE branch_requests SET status = 'approved' WHERE id = $1", [req.params.id]);

    await client.query("COMMIT");
    res.json({ success: true, message: "Branch approved and provisioned successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error approving branch request:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  } finally {
    client.release();
  }
});

router.put("/branch-requests/:id/reject", async (req, res) => {
  try {
    const result = await pool.query(
      "UPDATE branch_requests SET status = 'rejected' WHERE id = $1 AND status = 'pending' RETURNING id",
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Request not found or not pending" });
    }
    res.json({ success: true, message: "Branch request rejected" });
  } catch (err) {
    console.error("Error rejecting branch request:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
