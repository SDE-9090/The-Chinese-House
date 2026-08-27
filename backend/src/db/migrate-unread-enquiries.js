require("dotenv").config({ path: require('path').resolve(__dirname, '../../.env') });
const pool = require("./pool");

async function migrate() {
  console.log("Starting unread enquiries migration...");

  try {
    await pool.query(`
      ALTER TABLE saas_enquiries
      ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;
    `);
    console.log("is_read column added to saas_enquiries table.");

    console.log("Migration completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrate();
