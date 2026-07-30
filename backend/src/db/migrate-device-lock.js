require("dotenv").config();
const pool = require("./pool");

async function migrateDeviceLock() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    console.log("Starting device lock migration...");

    // Add is_claimed boolean if it doesn't exist
    await client.query(`
      ALTER TABLE table_sessions 
      ADD COLUMN IF NOT EXISTS is_claimed BOOLEAN DEFAULT false;
    `);

    // Backfill existing active sessions to be claimed (so current users aren't locked out)
    await client.query(`
      UPDATE table_sessions 
      SET is_claimed = true 
      WHERE status = 'active' AND is_claimed = false;
    `);

    await client.query("COMMIT");
    console.log("Device lock migration completed successfully.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", err);
  } finally {
    client.release();
    process.exit(0);
  }
}

migrateDeviceLock();
