require("dotenv").config();
const pool = require("./pool");

async function migrate() {
  console.log("Starting Waitlist migration...");
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Create the waitlist table
    await client.query(`
      CREATE TABLE IF NOT EXISTS waitlist (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id UUID NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(255) NOT NULL,
        party_size INTEGER NOT NULL,
        status VARCHAR(50) DEFAULT 'waiting', -- waiting, notified, seated, cancelled
        quoted_wait_minutes INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        notified_at TIMESTAMP WITH TIME ZONE,
        seated_at TIMESTAMP WITH TIME ZONE,
        CONSTRAINT fk_business FOREIGN KEY(business_id) REFERENCES businesses(id) ON DELETE CASCADE
      );
    `);

    // Create an index on business_id and status for faster queue lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_waitlist_business_status ON waitlist (business_id, status);
    `);

    await client.query('COMMIT');
    console.log("Migration successful!");
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Migration failed:", error);
    throw error;
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
