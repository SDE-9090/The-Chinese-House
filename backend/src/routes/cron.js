const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
const { sendWhatsAppTemplate } = require("../utils/whatsapp");

// Protect this route from public access
function cronAuth(req, res, next) {
  const secret = req.headers["x-cron-secret"];
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

router.get("/process-whatsapp-marketing", cronAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    // 1. Fetch businesses that have CRM/loyalty enabled and have active subscriptions
    const { rows: businesses } = await client.query(`
      SELECT b.id, bs.restaurant_name, bs.winback_discount_type, bs.winback_discount_value
      FROM businesses b
      JOIN business_settings bs ON b.id = bs.business_id
      WHERE b.is_active = true
    `);

    let totalMessaged = 0;

    for (const business of businesses) {
      // 2. Find churn-risk customers for this business
      // Rule: > 3 orders, last visit > 30 days ago
      const { rows: churnRisks } = await client.query(`
        SELECT c.phone, c.name
        FROM customers c
        WHERE c.business_id = $1
          AND c.total_orders_count >= 3
          AND c.last_visit < (NOW() - INTERVAL '30 days')
          -- Exclude if we sent them a win-back in the last 60 days
          AND NOT EXISTS (
            SELECT 1 FROM marketing_campaigns mc 
            WHERE mc.customer_phone = c.phone 
              AND mc.business_id = c.business_id 
              AND mc.campaign_type = 'win-back'
              AND mc.sent_at > (NOW() - INTERVAL '60 days')
          )
      `, [business.id]);

      for (const customer of churnRisks) {
        await client.query("BEGIN");
        
        try {
          // 3. Find their favorite item
          const { rows: favoriteItems } = await client.query(`
            SELECT oi.name
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            WHERE o.business_id = $1 AND o.customer_phone = $2 AND o.status != 'cancelled'
            GROUP BY oi.name
            ORDER BY COUNT(oi.id) DESC
            LIMIT 1
          `, [business.id, customer.phone]);
          
          let favItem = "dish";
          if (favoriteItems.length > 0) {
            favItem = favoriteItems[0].name;
          }

          // 4. Generate dynamic coupon
          const randomString = Math.random().toString(36).substring(2, 8).toUpperCase();
          const couponCode = `WB-${randomString}`;
          
          await client.query(`
            INSERT INTO coupons (code, discount_type, value, expiry_date, active, usage_limit, used_count, created_by, business_id)
            VALUES ($1, $2, $3, NOW() + INTERVAL '48 hours', true, 1, 0, 'Automated CRM', $4)
          `, [
            couponCode, 
            business.winback_discount_type || 'percent', 
            business.winback_discount_value || 15.00, 
            business.id
          ]);

          // 5. Log the campaign
          await client.query(`
            INSERT INTO marketing_campaigns (business_id, customer_phone, campaign_type, coupon_code)
            VALUES ($1, $2, 'win-back', $3)
          `, [business.id, customer.phone, couponCode]);

          // 6. Formulate the WhatsApp Payload (Dry-run)
          const discountText = business.winback_discount_type === 'flat' 
            ? `₹${business.winback_discount_value} OFF`
            : `${business.winback_discount_value}% OFF`;
            
          await sendWhatsAppTemplate(customer.phone, "winback_campaign", [
            customer.name || "Foodie",
            business.restaurant_name,
            discountText,
            favItem,
            couponCode
          ]);

          await client.query("COMMIT");
          totalMessaged++;
        } catch (innerErr) {
          await client.query("ROLLBACK");
          console.error(`Failed to process win-back for ${customer.phone}:`, innerErr);
        }
      }
    }

    res.json({ success: true, totalMessaged });
  } catch (err) {
    console.error("Cron error:", err);
    res.status(500).json({ error: "Failed to process marketing cron" });
  } finally {
    client.release();
  }
});

module.exports = router;
