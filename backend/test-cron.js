require('dotenv').config({ path: __dirname + '/.env' });
const pool = require('./src/db/pool');

async function testCron() {
  const client = await pool.connect();
  try {
    const { rows: businesses } = await client.query(`
      SELECT b.id, bs.restaurant_name, bs.winback_discount_type, bs.winback_discount_value
      FROM businesses b
      JOIN business_settings bs ON b.id = bs.business_id
      WHERE b.is_active = true
    `);

    let totalMessaged = 0;

    for (const business of businesses) {
      const { rows: churnRisks } = await client.query(`
        SELECT c.phone, c.name
        FROM customers c
        WHERE c.business_id = $1
          AND c.total_orders_count >= 3
          AND c.last_visit < (NOW() - INTERVAL '30 days')
          AND NOT EXISTS (
            SELECT 1 FROM marketing_campaigns mc 
            WHERE mc.customer_phone = c.phone 
              AND mc.business_id = c.business_id 
              AND mc.campaign_type = 'win-back'
              AND mc.sent_at > (NOW() - INTERVAL '60 days')
          )
      `, [business.id]);

      console.log(`Found ${churnRisks.length} churn risks for ${business.restaurant_name}`);

      for (const customer of churnRisks) {
        await client.query("BEGIN");
        try {
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

          await client.query(`
            INSERT INTO marketing_campaigns (business_id, customer_phone, campaign_type, coupon_code)
            VALUES ($1, $2, 'win-back', $3)
          `, [business.id, customer.phone, couponCode]);

          const discountText = business.winback_discount_type === 'flat' 
            ? `₹${business.winback_discount_value} OFF`
            : `${business.winback_discount_value}% OFF`;
            
          const whatsappPayload = {
            messaging_product: "whatsapp",
            to: customer.phone,
            type: "template",
            template: {
              name: "winback_campaign",
              language: { code: "en_US" },
              components: [
                {
                  type: "body",
                  parameters: [
                    { type: "text", text: customer.name || "Foodie" },
                    { type: "text", text: business.restaurant_name },
                    { type: "text", text: discountText },
                    { type: "text", text: favItem },
                    { type: "text", text: couponCode }
                  ]
                }
              ]
            }
          };

          console.log(`[CRON] WIN-BACK TRIGGERED for ${customer.phone} at ${business.restaurant_name}`);
          console.log(`[CRON] Payload: ${JSON.stringify(whatsappPayload, null, 2)}`);

          await client.query("COMMIT");
          totalMessaged++;
        } catch (innerErr) {
          await client.query("ROLLBACK");
          console.error(`Failed to process win-back for ${customer.phone}:`, innerErr);
        }
      }
    }
    console.log("Total messages sent:", totalMessaged);
  } catch (err) {
    console.error("Test error:", err);
  } finally {
    client.release();
    pool.end();
  }
}

testCron();
