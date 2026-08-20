const { Pool } = require("pg");

const isProduction = process.env.NODE_ENV === "production";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction
    ? { rejectUnauthorized: false }
    : false,
});

// Force search_path to public on every connection checkout
// This prevents issues with PgBouncer returning cached connections
// that might have had their search_path altered by schema.sql scripts.
pool.on("connect", (client) => {
  client.query("SET search_path TO public");
});

module.exports = pool;
