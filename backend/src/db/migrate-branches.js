require("dotenv").config({ path: require('path').resolve(__dirname, '../../.env') });
const pool = require("./pool");

async function migrate() {
  console.log("Starting multi-branch migration...");

  try {
    // 1. Add parent_business_id to businesses table
    await pool.query(`
      ALTER TABLE businesses 
      ADD COLUMN IF NOT EXISTS parent_business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;
    `);
    console.log("parent_business_id column added to businesses table.");

    // 2. Create branch_requests table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS branch_requests (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        parent_business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        requested_name text NOT NULL,
        requested_slug text NOT NULL,
        requested_tier text NOT NULL,
        status text DEFAULT 'pending',
        created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("branch_requests table created.");

    console.log("Migration completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrate();
