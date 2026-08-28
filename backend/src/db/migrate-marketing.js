const { Pool } = require('pg');
require('dotenv').config({ path: __dirname + '/../../.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrateMarketing() {
  const client = await pool.connect();
  
  try {
    console.log('Starting Marketing Campaigns Migration...');
    await client.query('BEGIN');

    // 1. Create the marketing_campaigns table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
          customer_phone VARCHAR(20) NOT NULL,
          campaign_type VARCHAR(50) NOT NULL DEFAULT 'win-back',
          coupon_code VARCHAR(50),
          sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Created marketing_campaigns table.');

    // 2. Create index for fast lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_marketing_phone ON marketing_campaigns(business_id, customer_phone);
    `);
    console.log('Created index for marketing campaigns.');

    // 3. Add CRM config fields to business_settings
    await client.query(`
      ALTER TABLE public.business_settings
      ADD COLUMN IF NOT EXISTS winback_discount_type VARCHAR(20) DEFAULT 'percent',
      ADD COLUMN IF NOT EXISTS winback_discount_value NUMERIC(10,2) DEFAULT 15.00;
    `);
    console.log('Added winback config to business_settings.');

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

migrateMarketing();
