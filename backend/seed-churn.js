require('dotenv').config({ path: __dirname + '/.env' });
const pool = require('./src/db/pool');

async function seed() {
  const client = await pool.connect();
  try {
    // 1. Get first active business
    const { rows: businesses } = await client.query("SELECT id FROM businesses WHERE is_active = true LIMIT 1");
    if (!businesses.length) return;
    const bId = businesses[0].id;
    
    // 2. Insert fake customer with >3 orders and last_visit 35 days ago
    await client.query(`
      INSERT INTO customers (business_id, phone, name, total_orders_count, total_spent, last_visit)
      VALUES ($1, '9999999999', 'Churn Tester', 5, 2000.00, NOW() - INTERVAL '35 days')
      ON CONFLICT (business_id, phone) DO UPDATE SET last_visit = NOW() - INTERVAL '35 days', total_orders_count = 5
    `, [bId]);

    // 3. Insert a fake order so they have a favorite item
    await client.query(`
      INSERT INTO orders (business_id, customer_phone, customer_name, token, subtotal, total, status, payment_status, payment_method)
      VALUES ($1, '9999999999', 'Churn Tester', 999, 500, 500, 'completed', 'paid', 'online')
      RETURNING id
    `, [bId]).then(async (res) => {
      const orderId = res.rows[0].id;
      await client.query(`
        INSERT INTO order_items (order_id, name, price, quantity, business_id)
        VALUES ($1, 'Kung Pao Chicken', 500, 1, $2)
      `, [orderId, bId]);
    });
    console.log("Seeded churn customer successfully.");
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    pool.end();
  }
}
seed();
