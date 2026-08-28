const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
const { adminAuth } = require("../middleware/adminAuth");

router.get("/history", adminAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT mc.id, mc.customer_phone, c.name as customer_name, mc.campaign_type, mc.coupon_code, mc.sent_at 
       FROM marketing_campaigns mc
       LEFT JOIN customers c ON mc.customer_phone = c.phone AND mc.business_id = c.business_id
       WHERE mc.business_id = $1
       ORDER BY mc.sent_at DESC
       LIMIT 100`,
      [req.business_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Marketing history fetch error:", err);
    res.status(500).json({ error: "Failed to fetch marketing history" });
  }
});

module.exports = router;
