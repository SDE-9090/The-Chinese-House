const { Pool } = require('pg');
require('dotenv').config({ path: __dirname + '/../../.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const tenantTables = [
  'admin_account',
  'staff',
  'menu_categories',
  'menu_items',
  'item_reviews',
  'tables',
  'gallery',
  'orders',
  'order_items',
  'customers',
  'business_settings',
  'admin_passkeys',
  'staff_passkeys',
  'promotions',
  'coupons',
  'kitchen_tickets',
  'waiter_tracking',
  'loyalty_points',
  'device_lock'
];

async function applyRLS() {
  const client = await pool.connect();
  
  try {
    console.log('Starting Row Level Security Migration...');
    await client.query('BEGIN');

    // First check which tables actually exist and have a business_id column
    for (const tableName of tenantTables) {
      
      // Check if table has business_id column
      const checkRes = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = 'business_id'
      `, [tableName]);

      if (checkRes.rows.length === 0) {
        console.log(`Skipping ${tableName} (does not exist or no business_id column)`);
        continue;
      }

      console.log(`Applying RLS to ${tableName}...`);

      // 1. Enable RLS
      await client.query(`ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY`);
      
      // 2. Force RLS (Applies even to the table owner, which our Node app connects as)
      await client.query(`ALTER TABLE ${tableName} FORCE ROW LEVEL SECURITY`);

      // 3. Drop existing policy if any
      await client.query(`DROP POLICY IF EXISTS tenant_isolation_policy ON ${tableName}`);

      // 4. Create the tenant isolation policy
      // RLS allows access IF:
      // a) current_tenant is super_admin OR
      // b) current_tenant matches the row's business_id
      await client.query(`
        CREATE POLICY tenant_isolation_policy ON ${tableName}
        USING (
          current_setting('app.current_tenant', true) = 'super_admin'
          OR business_id = current_setting('app.current_tenant', true)::uuid
        )
      `);
    }

    await client.query('COMMIT');
    console.log('RLS Migration Completed Successfully!');
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error applying RLS:', err);
  } finally {
    client.release();
    pool.end();
  }
}

applyRLS();
