const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
const { auth, adminAuth } = require("../middleware/auth");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure public/updates directory exists
const updatesDir = path.join(__dirname, "../../public/updates");
if (!fs.existsSync(updatesDir)) {
  fs.mkdirSync(updatesDir, { recursive: true });
}

// Set up multer for handling .zip uploads locally
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, updatesDir);
  },
  filename: function (req, file, cb) {
    // Generate a unique filename: update-<timestamp>.zip
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "update-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/zip" || file.mimetype === "application/x-zip-compressed" || path.extname(file.originalname) === '.zip') {
      cb(null, true);
    } else {
      cb(new Error("Only .zip files are allowed for updates"));
    }
  },
});

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

// POST /api/updates/upload - Admin only
router.post("/upload", adminAuth, upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No update file uploaded" });
  }

  const { version, release_notes } = req.body;
  if (!version) {
    return res.status(400).json({ error: "Version number is required" });
  }

  const client = await pool.connect();
  try {
    // The public URL to the file
    const fileUrl = `/public/updates/${req.file.filename}`;

    await client.query("BEGIN");

    const insertResult = await client.query(
      `INSERT INTO app_updates (business_id, version, url, release_notes) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.business_id, version, fileUrl, release_notes || ""]
    );

    await client.query("COMMIT");

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

module.exports = router;
