const pool = require("../db/pool");

async function syncCustomerCRM(business_id, phone) {
  if (!phone || phone === '0000000000' || phone === '') return;
  try {
    const result = await pool.query(`
      INSERT INTO customers (business_id, phone, name, total_orders_count, total_spent, last_visit)
      SELECT 
          $1::uuid, 
          $2::varchar, 
          MAX(customer_name) as name, 
          COUNT(id) as total_orders_count, 
          COALESCE(SUM(total), 0) as total_spent, 
          MAX(created_at) as last_visit
      FROM orders
      WHERE business_id = $1::uuid AND customer_phone = $2::varchar AND status != 'cancelled'
      ON CONFLICT (business_id, phone) DO UPDATE SET
          name = EXCLUDED.name,
          total_orders_count = EXCLUDED.total_orders_count,
          total_spent = EXCLUDED.total_spent,
          last_visit = GREATEST(customers.last_visit, EXCLUDED.last_visit),
          updated_at = CURRENT_TIMESTAMP;
    `, [business_id, phone]);
    console.log(`CRM Sync Success for ${phone} - Inserted: ${result.rowCount}`);
  } catch (err) {
    console.error("CRM Sync Error:", err);
  }
}

module.exports = { syncCustomerCRM };
