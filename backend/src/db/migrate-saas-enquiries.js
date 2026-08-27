require("dotenv").config({ path: require('path').resolve(__dirname, '../../.env') });
const pool = require("./pool");

async function migrate() {
  console.log("Starting saas enquiries and settings migration...");

  try {
    // 1. Create saas_enquiries table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS saas_enquiries (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        name text NOT NULL,
        restaurant_name text NOT NULL,
        email text NOT NULL,
        phone text NOT NULL,
        message text NOT NULL,
        status text DEFAULT 'New',
        created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("saas_enquiries table created or verified.");

    // 2. Create saas_settings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS saas_settings (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        contact_email text NOT NULL,
        contact_phone text NOT NULL,
        updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("saas_settings table created or verified.");

    // 3. Seed default settings if empty
    const checkSettings = await pool.query(`SELECT COUNT(*) FROM saas_settings`);
    if (parseInt(checkSettings.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO saas_settings (contact_email, contact_phone)
        VALUES ('support@classicos.com', '+91 98765 43210')
      `);
      console.log("Seeded default saas settings.");
    } else {
      console.log("saas_settings already seeded.");
    }

    console.log("Migration completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrate();
