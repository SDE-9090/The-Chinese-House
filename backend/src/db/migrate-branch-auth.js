require("dotenv").config({ path: require('path').resolve(__dirname, '../../.env') });
const pool = require("./pool");

async function migrate() {
  console.log("Starting multi-branch auth migration...");

  try {
    // 1. Add requested_mobile and requested_password_hash to branch_requests
    await pool.query(`
      ALTER TABLE branch_requests 
      ADD COLUMN IF NOT EXISTS requested_mobile text,
      ADD COLUMN IF NOT EXISTS requested_password_hash text;
    `);
    console.log("Columns added to branch_requests table.");

    console.log("Migration completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrate();
