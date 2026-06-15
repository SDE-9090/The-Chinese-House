const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
const { adminAuth } = require("../middleware/adminAuth");
const {
  GSTIN_REGEX,
  ensureBusinessSettings,
  normalizeBusinessSettings,
} = require("../utils/businessSettings");

router.get("/", adminAuth, async (req, res) => {
  try {
    const settings = await ensureBusinessSettings(pool, req.business_id);
    
    // Also fetch features from businesses table
    const businessRes = await pool.query("SELECT features FROM businesses WHERE id = $1", [req.business_id]);
    settings.features = businessRes.rows[0]?.features || {};
    
    res.json(settings);
  } catch (err) {
    console.error("Admin business settings fetch error:", err);
    res.status(500).json({ error: "Failed to fetch business settings" });
  }
});

router.put("/", adminAuth, async (req, res) => {
  const {
    restaurantName,
    gstin,
    address,
    phone,
    email,
    isGstEnabled,
    cgstRate,
    sgstRate,
    kitchenPin,
    landingPageContent,
    features,
  } = req.body;

  if (restaurantName !== undefined) {
    if (typeof restaurantName !== "string" || !restaurantName.trim()) {
      return res.status(400).json({ error: "Restaurant name is required" });
    }
  }

  if (address !== undefined && typeof address !== "string") {
    return res.status(400).json({ error: "Address must be a string" });
  }

  if (phone !== undefined && typeof phone !== "string") {
    return res.status(400).json({ error: "Phone must be a string" });
  }

  if (email !== undefined && typeof email !== "string") {
    return res.status(400).json({ error: "Email must be a string" });
  }

  if (isGstEnabled !== undefined && typeof isGstEnabled !== "boolean") {
    return res.status(400).json({ error: "GST toggle must be true or false" });
  }

  if (cgstRate !== undefined) {
    if (typeof cgstRate !== "number" || cgstRate < 0) {
      return res.status(400).json({ error: "CGST rate must be a non-negative number" });
    }
  }

  if (sgstRate !== undefined) {
    if (typeof sgstRate !== "number" || sgstRate < 0) {
      return res.status(400).json({ error: "SGST rate must be a non-negative number" });
    }
  }

  if (kitchenPin !== undefined) {
    if (typeof kitchenPin !== "string" || !/^\d{4,6}$/.test(kitchenPin)) {
      return res.status(400).json({ error: "Kitchen PIN must be 4-6 digits" });
    }
  }

  const normalizedGstin = typeof gstin === "string" ? gstin.trim().toUpperCase() : "";
  if (normalizedGstin && !GSTIN_REGEX.test(normalizedGstin)) {
    return res.status(400).json({ error: "Invalid GSTIN format" });
  }

  try {
    const current = await ensureBusinessSettings(pool, req.business_id);
    const next = {
      restaurantName:
        typeof restaurantName === "string" ? restaurantName.trim() : current.restaurantName,
      gstin:
        gstin === undefined ? current.gstin : normalizedGstin || null,
      address: typeof address === "string" ? address.trim() : current.address,
      phone: typeof phone === "string" ? phone.trim() : current.phone,
      email: typeof email === "string" ? email.trim() : current.email,
      isGstEnabled:
        typeof isGstEnabled === "boolean" ? isGstEnabled : current.isGstEnabled,
      cgstRate: typeof cgstRate === "number" ? cgstRate : current.cgstRate,
      sgstRate: typeof sgstRate === "number" ? sgstRate : current.sgstRate,
      kitchenPin: typeof kitchenPin === "string" ? kitchenPin : current.kitchenPin,
      landingPageContent: landingPageContent !== undefined ? landingPageContent : current.landingPageContent,
    };

    const result = await pool.query(
      `INSERT INTO business_settings (business_id, restaurant_name, gstin, address, phone, email, is_gst_enabled, cgst_rate, sgst_rate, kitchen_pin, updated_at, landing_page_content)
       VALUES ($10, $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $11)
       ON CONFLICT (business_id) DO UPDATE SET
         restaurant_name = EXCLUDED.restaurant_name,
         gstin = EXCLUDED.gstin,
         address = EXCLUDED.address,
         phone = EXCLUDED.phone,
         email = EXCLUDED.email,
         is_gst_enabled = EXCLUDED.is_gst_enabled,
         cgst_rate = EXCLUDED.cgst_rate,
         sgst_rate = EXCLUDED.sgst_rate,
         kitchen_pin = EXCLUDED.kitchen_pin,
         landing_page_content = EXCLUDED.landing_page_content,
         updated_at = NOW()
       RETURNING id, restaurant_name, gstin, address, phone, email, is_gst_enabled, cgst_rate, sgst_rate, kitchen_pin, landing_page_content`,
      [
        next.restaurantName,
        next.gstin,
        next.address,
        next.phone,
        next.email,
        next.isGstEnabled,
        next.cgstRate,
        next.sgstRate,
        next.kitchenPin,
        req.business_id,
        JSON.stringify(next.landingPageContent),
      ],
    );

    const updated = normalizeBusinessSettings(result.rows[0]);
    
    // Update features if provided
    if (features !== undefined) {
      const featureRes = await pool.query(
        "UPDATE businesses SET features = $1 WHERE id = $2 RETURNING features",
        [JSON.stringify(features), req.business_id]
      );
      updated.features = featureRes.rows[0]?.features || {};
    } else {
      const featureRes = await pool.query("SELECT features FROM businesses WHERE id = $1", [req.business_id]);
      updated.features = featureRes.rows[0]?.features || {};
    }
    
    // Notify frontend via socket
    const io = req.app.get("io");
    if (io) {
      io.emit("business-settings-updated");
    }

    res.json(updated);
  } catch (err) {
    console.error("Admin business settings update error:", err);
    res.status(500).json({ error: "Failed to update business settings" });
  }
});

// ======================================================
// FACTORY RESET (Danger Zone)
// ======================================================
router.post("/factory-reset", adminAuth, async (req, res) => {
  const { confirmText } = req.body;

  if (confirmText !== "DELETE ALL DATA") {
    return res.status(400).json({ error: "Invalid confirmation text" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const businessId = req.business_id;

    // Delete orders (this cascades to order_items)
    await client.query("DELETE FROM orders WHERE business_id = $1", [businessId]);

    // Delete sessions (this cascades to active tables)
    await client.query("DELETE FROM table_sessions WHERE business_id = $1", [businessId]);
    await client.query("DELETE FROM tables WHERE business_id = $1", [businessId]);

    // Delete reviews (depends on menu_items)
    await client.query("DELETE FROM reviews WHERE business_id = $1", [businessId]);

    // Delete menu items (must happen before categories due to RESTRICT constraint)
    await client.query("DELETE FROM menu_items WHERE business_id = $1", [businessId]);
    await client.query("DELETE FROM menu_categories WHERE business_id = $1", [businessId]);

    // Delete coupons & promotions
    await client.query("DELETE FROM coupons WHERE business_id = $1", [businessId]);
    await client.query("DELETE FROM promotions WHERE business_id = $1", [businessId]);

    // Delete staff
    await client.query("DELETE FROM staff WHERE business_id = $1", [businessId]);

    // Reset token counter
    await client.query("UPDATE token_counter SET last_token = 0 WHERE business_id = $1", [businessId]);

    await client.query("COMMIT");

    // Notify frontend via socket to force reload for any active sessions
    const io = req.app.get("io");
    if (io) {
      io.emit("business-settings-updated");
    }

    res.json({ message: "Database reset successfully." });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Factory reset error:", err);
    res.status(500).json({ error: "Failed to reset database" });
  } finally {
    client.release();
  }
});

module.exports = router;
