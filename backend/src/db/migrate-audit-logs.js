require("dotenv").config();
const { Pool } = require("pg");

const isProduction = process.env.NODE_ENV === "production";
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("neon.tech") || isProduction
    ? { rejectUnauthorized: false }
    : false,
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log("Starting audit_logs migration...");
    await client.query("BEGIN");

    // 1. Create audit_logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
        actor_id UUID REFERENCES staff(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id VARCHAR(100),
        details JSONB,
        ip_address VARCHAR(45),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log("Created audit_logs table.");

    // 2. Create indices
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_business_id ON audit_logs(business_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);
    `);
    console.log("Created indices for audit_logs.");

    // 3. RLS Policies
    await client.query(`ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;`);
    
    // Policy to allow access to the tenant's own audit logs
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'audit_logs' AND policyname = 'tenant_isolation_audit_logs'
        ) THEN
          CREATE POLICY tenant_isolation_audit_logs ON audit_logs
            USING (business_id = current_setting('app.current_tenant')::uuid);
        END IF;
      END
      $$;
    `);
    console.log("Enabled RLS and created tenant_isolation_audit_logs policy.");

    await client.query("COMMIT");
    console.log("Migration completed successfully!");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", error);
  } finally {
    client.release();
    pool.end();
  }
}

runMigration();
