const { Pool } = require('pg');
require('dotenv').config({ path: __dirname + '/../../.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrateTiers() {
  const client = await pool.connect();
  
  try {
    console.log('Starting Subscription Tiers Migration...');
    await client.query('BEGIN');

    // 1. Create the subscription_tiers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscription_tiers (
          name VARCHAR(50) PRIMARY KEY,
          monthly_order_limit INTEGER NOT NULL,
          monthly_price NUMERIC(10,2) NOT NULL,
          included_features JSONB DEFAULT '[]'::jsonb,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Created subscription_tiers table.');

    // 2. Insert default tiers if they don't exist
    await client.query(`
      INSERT INTO subscription_tiers (name, monthly_order_limit, monthly_price, included_features)
      VALUES 
      ('free', 1000, 0, '["pos_system", "kitchen_display", "manual_table_orders"]'),
      ('pro', 5000, 999, '["pos_system", "kitchen_display", "manual_table_orders", "qr_digital_ordering", "coupons"]'),
      ('enterprise', 999999, 2999, '["pos_system", "kitchen_display", "manual_table_orders", "qr_digital_ordering", "coupons", "analytics_dashboard", "custom_domain"]')
      ON CONFLICT (name) DO NOTHING;
    `);
    console.log('Seeded default subscription tiers.');

    // 3. Ensure businesses.subscription_tier is a foreign key
    // First, verify all existing subscription_tiers in businesses exist in the new table.
    // To be safe, update any NULL or unknown tiers to 'free'
    await client.query(`
      UPDATE businesses 
      SET subscription_tier = 'free' 
      WHERE subscription_tier IS NULL OR subscription_tier NOT IN (SELECT name FROM subscription_tiers);
    `);

    // Add Foreign Key constraint safely
    await client.query(`
      ALTER TABLE businesses
      DROP CONSTRAINT IF EXISTS fk_businesses_tier;
    `);

    await client.query(`
      ALTER TABLE businesses
      ADD CONSTRAINT fk_businesses_tier
      FOREIGN KEY (subscription_tier) REFERENCES subscription_tiers(name)
      ON DELETE SET DEFAULT
      ON UPDATE CASCADE;
    `);
    console.log('Added foreign key constraint to businesses.subscription_tier.');

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

migrateTiers();
