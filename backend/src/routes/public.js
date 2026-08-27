const express = require("express");
const router = express.Router();
const pool = require("../db/pool");

// ======================================================
// GET PUBLIC BUSINESS INFO (No Auth Required)
// Used for initial branding, SEO, and PWA Manifest
// ======================================================
router.get("/business-info", async (req, res) => {
  const slug = req.headers["x-tenant-slug"];

  if (!slug) {
    return res.status(400).json({ error: "Missing X-Tenant-Slug header" });
  }

  try {
    const result = await pool.query(
      `SELECT 
        b.id, b.name, b.logo_url, b.theme, b.layout_theme, b.status, b.features,
        s.landing_page_content
       FROM businesses b
       LEFT JOIN business_settings s ON s.business_id = b.id
       WHERE b.slug = $1 LIMIT 1`,
      [slug]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    const business = result.rows[0];

    // Build the dynamic PWA manifest inside the response
    // Wait, the client can just generate the manifest blob itself from the colors.
    // Let's pass the raw info so the frontend can inject everything dynamically.
    const publicInfo = {
      name: business.name,
      logo_url: business.logo_url || "/favicon.png",
      theme: business.theme || "hennys-classic",
      layout_theme: business.layout_theme || "classic",
      status: business.status,
      features: business.features || {}
    };

    // Very aggressive caching for public branding to make load times instant
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=600");
    res.json(publicInfo);
  } catch (err) {
    console.error("Public business info error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ======================================================
// GET PUBLIC SAAS SETTINGS
// ======================================================
router.get("/saas-settings", async (req, res) => {
  try {
    const result = await pool.query(`SELECT contact_email, contact_phone FROM saas_settings LIMIT 1`);
    if (result.rows.length === 0) {
      return res.json({ contact_email: "support@classicos.com", contact_phone: "+91 98765 43210" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Fetch saas settings error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ======================================================
// POST SAAS ENQUIRY
// ======================================================
router.post("/saas-enquiry", async (req, res) => {
  const { name, restaurant_name, email, phone, message } = req.body;
  if (!name || !restaurant_name || !email || !phone) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  
  try {
    await pool.query(
      `INSERT INTO saas_enquiries (name, restaurant_name, email, phone, message)
       VALUES ($1, $2, $3, $4, $5)`,
      [name, restaurant_name, email, phone, message || ""]
    );
    res.status(201).json({ success: true, message: "Enquiry submitted successfully" });
  } catch (err) {
    console.error("Submit saas enquiry error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
