require("dotenv").config({ path: require('path').resolve(__dirname, "../../.env") });
const pool = require("./pool");

async function migrateUpdates() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS app_updates (
        id SERIAL PRIMARY KEY,
        business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
        version VARCHAR(50) NOT NULL,
        url VARCHAR(255) NOT NULL,
        release_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Created app_updates table.");
    
    await client.query("COMMIT");
    console.log("Migration successful.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", err);
  } finally {
    client.release();
    process.exit(0);
  }
}

migrateUpdates();
