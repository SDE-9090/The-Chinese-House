const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
// Multer config moved to superAdmin.js since upload is now Super Admin only.



// GET /api/updates/latest - Publicly accessible by the app to check for updates
router.get("/latest", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT version, url, release_notes, created_at 
       FROM app_updates 
       ORDER BY created_at DESC 
       LIMIT 1`
    );

    if (result.rows.length === 0) {
      return res.json({ updateAvailable: false });
    }

    res.json({ updateAvailable: true, update: result.rows[0] });
  } catch (err) {
    console.error("Error fetching latest update:", err);
    res.status(500).json({ error: "Failed to fetch update info" });
  }
});

// (Admin upload route moved to superAdmin.js for global OTA)

module.exports = router;
