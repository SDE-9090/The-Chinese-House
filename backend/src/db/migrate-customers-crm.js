const { Pool } = require('pg');
require('dotenv').config({ path: __dirname + '/../../.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrateCustomers() {
  const client = await pool.connect();
  
  try {
    console.log('Starting Customers CRM Migration...');
    await client.query('BEGIN');

    // 1. Alter the existing customers table
    await client.query(`
      ALTER TABLE public.customers
      ADD COLUMN IF NOT EXISTS total_orders_count INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    `);
    console.log('Altered customers table successfully.');

    // 2. Create index for fast lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_customers_last_visit ON customers(business_id, last_visit);
    `);
    console.log('Created index for last_visit.');

    // 3. Retroactively migrate historical order data into customers table
    const result = await client.query(`
      INSERT INTO customers (business_id, phone, name, total_orders_count, total_spent, last_visit)
      SELECT 
          business_id, 
          customer_phone, 
          MAX(customer_name) as name, 
          COUNT(id) as total_orders_count, 
          SUM(total) as total_spent, 
          MAX(created_at) as last_visit
      FROM orders
      WHERE customer_phone IS NOT NULL 
        AND customer_phone != ''
        AND status != 'cancelled'
      GROUP BY business_id, customer_phone
      ON CONFLICT (business_id, phone) DO UPDATE SET
          total_orders_count = customers.total_orders_count + EXCLUDED.total_orders_count,
          total_spent = customers.total_spent + EXCLUDED.total_spent,
          last_visit = GREATEST(customers.last_visit, EXCLUDED.last_visit),
          updated_at = CURRENT_TIMESTAMP;
    `);
    console.log(`Migrated historical customer data. Affected rows: ${result.rowCount}`);

    await client.query('COMMIT');
    console.log('Migration Completed Successfully!');
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error applying migration:', err);
  } finally {
    client.release();
    pool.end();
  }
}

migrateCustomers();
