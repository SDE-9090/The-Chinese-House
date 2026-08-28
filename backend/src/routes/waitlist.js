const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
const { adminAuth, authorizeRole } = require("../middleware/adminAuth");
const { sendWhatsAppTemplate } = require("../utils/whatsapp");
const { v4: uuidv4 } = require("uuid");

// ==========================================
// PUBLIC ROUTES
// ==========================================

// Join the waitlist (public via QR, or staff form)
router.post("/public/:slug/join", async (req, res) => {
  const { name, phone, party_size } = req.body;
  const businessId = req.business_id;

  if (!name || !phone || !party_size) {
    return res.status(400).json({ error: "Name, phone, and party size are required" });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get business name for WhatsApp
    const { rows: businesses } = await client.query(
      "SELECT name as restaurant_name FROM businesses WHERE id = $1",
      [businessId]
    );

    if (businesses.length === 0) {
      throw new Error("Business not found");
    }

    const business = businesses[0];
    const waitlistId = uuidv4();
    
    // Estimate wait time (naive estimate: 5 mins per existing waiting party)
    const { rows: currentQueue } = await client.query(
      "SELECT count(*) as count FROM waitlist WHERE business_id = $1 AND status = 'waiting'",
      [businessId]
    );
    const waitingParties = parseInt(currentQueue[0].count) || 0;
    const estimatedWait = Math.max(10, waitingParties * 5); // Minimum 10 mins

    await client.query(`
      INSERT INTO waitlist (id, business_id, customer_name, customer_phone, party_size, quoted_wait_minutes)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [waitlistId, businessId, name, phone, party_size, estimatedWait]);

    // Send WhatsApp notification
    try {
      await sendWhatsAppTemplate(phone, "waitlist_joined", [
        name,
        business.restaurant_name,
        party_size,
        estimatedWait
      ]);
    } catch (waErr) {
      console.error("Failed to send waitlist_joined WhatsApp:", waErr);
      // We don't fail the transaction if WhatsApp fails
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, estimatedWait, position: waitingParties + 1 });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Waitlist join error:", err);
    res.status(500).json({ error: "Failed to join waitlist" });
  } finally {
    client.release();
  }
});

// ==========================================
// ADMIN / STAFF ROUTES
// ==========================================

// Get the active waitlist for the business
router.get("/admin", adminAuth, authorizeRole(["admin", "manager", "staff"]), async (req, res) => {
  const businessId = req.business_id;

  try {
    const { rows } = await pool.query(`
      SELECT * FROM waitlist 
      WHERE business_id = $1 AND status IN ('waiting', 'notified')
      ORDER BY created_at ASC
    `, [businessId]);
    
    res.json(rows);
  } catch (err) {
    console.error("Fetch waitlist error:", err);
    res.status(500).json({ error: "Failed to fetch waitlist" });
  }
});

// Update status (e.g. mark seated or cancelled)
router.put("/admin/:id/status", adminAuth, authorizeRole(["admin", "manager", "staff"]), async (req, res) => {
  const businessId = req.business_id;
  const { id } = req.params;
  const { status } = req.body; // 'seated', 'cancelled'

  if (!["seated", "cancelled"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  try {
    const result = await pool.query(`
      UPDATE waitlist 
      SET status = $1, seated_at = CASE WHEN $2::text = 'seated' THEN CURRENT_TIMESTAMP ELSE seated_at END
      WHERE id = $3 AND business_id = $4
      RETURNING *
    `, [status, status, id, businessId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Entry not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update waitlist status error:", err);
    res.status(500).json({ error: "Failed to update status" });
  }
});

// Notify customer that table is ready
router.post("/admin/:id/notify", adminAuth, authorizeRole(["admin", "manager", "staff"]), async (req, res) => {
  const businessId = req.business_id;
  const { id } = req.params;

  try {
    const { rows } = await pool.query(`
      SELECT w.*, b.name as restaurant_name 
      FROM waitlist w
      JOIN businesses b ON w.business_id = b.id
      WHERE w.id = $1 AND w.business_id = $2
    `, [id, businessId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Entry not found" });
    }

    const entry = rows[0];

    if (entry.status !== 'waiting') {
      return res.status(400).json({ error: "Can only notify customers currently waiting" });
    }

    await sendWhatsAppTemplate(entry.customer_phone, "waitlist_ready", [
      entry.customer_name,
      entry.restaurant_name
    ]);

    const result = await pool.query(`
      UPDATE waitlist 
      SET status = 'notified', notified_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [id]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Notify waitlist error:", err);
    res.status(500).json({ error: "Failed to notify customer" });
  }
});

module.exports = router;
