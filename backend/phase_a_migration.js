const { Client } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_pvi1rbCdEk0U@ep-little-silence-azn9y99q-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

const sql = `
  -- 1. Add status column
  ALTER TABLE businesses ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

  -- 2. Create Indexes safely
  CREATE INDEX IF NOT EXISTS idx_admin_account_business_id ON admin_account(business_id);
  CREATE INDEX IF NOT EXISTS idx_admin_login_logs_business_id ON admin_login_logs(business_id);
  CREATE INDEX IF NOT EXISTS idx_admin_passkeys_business_id ON admin_passkeys(business_id);
  CREATE INDEX IF NOT EXISTS idx_business_settings_business_id ON business_settings(business_id);
  CREATE INDEX IF NOT EXISTS idx_coupons_business_id ON coupons(business_id);
  CREATE INDEX IF NOT EXISTS idx_customers_business_id ON customers(business_id);
  CREATE INDEX IF NOT EXISTS idx_gallery_images_business_id ON gallery_images(business_id);
  CREATE INDEX IF NOT EXISTS idx_hero_content_business_id ON hero_content(business_id);
  CREATE INDEX IF NOT EXISTS idx_location_content_business_id ON location_content(business_id);
  CREATE INDEX IF NOT EXISTS idx_menu_categories_business_id ON menu_categories(business_id);
  CREATE INDEX IF NOT EXISTS idx_menu_items_business_id ON menu_items(business_id);
  CREATE INDEX IF NOT EXISTS idx_order_items_business_id ON order_items(business_id);
  CREATE INDEX IF NOT EXISTS idx_orders_business_id ON orders(business_id);
  CREATE INDEX IF NOT EXISTS idx_promotions_business_id ON promotions(business_id);
  CREATE INDEX IF NOT EXISTS idx_reviews_business_id ON reviews(business_id);
  CREATE INDEX IF NOT EXISTS idx_staff_business_id ON staff(business_id);
  CREATE INDEX IF NOT EXISTS idx_table_sessions_business_id ON table_sessions(business_id);
  CREATE INDEX IF NOT EXISTS idx_tables_business_id ON tables(business_id);
  CREATE INDEX IF NOT EXISTS idx_token_counter_business_id ON token_counter(business_id);
`;

async function run() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log("Connected to Neon DB.");
    await client.query(sql);
    console.log("SQL executed successfully.");
  } catch (err) {
    console.error("Error executing SQL:", err);
  } finally {
    await client.end();
  }
}

run();
