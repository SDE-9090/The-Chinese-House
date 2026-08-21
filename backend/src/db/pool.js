const { Pool } = require("pg");
const { tenantContext } = require("../middleware/tenantContext");

const isProduction = process.env.NODE_ENV === "production";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction
    ? { rejectUnauthorized: false }
    : false,
});

pool.on("connect", (client) => {
  client.query("SET search_path TO public");
});

/**
 * RLS INTERCEPTOR:
 * Automatically injects the app.current_tenant setting into every database 
 * connection check-out, ensuring zero-trust Row Level Security works without 
 * having to manually refactor all 400+ queries.
 */

// 1. Intercept pool.query()
const originalPoolQuery = pool.query.bind(pool);
pool.query = async function (text, params, callback) {
  const businessId = tenantContext.getStore();
  
  // If no tenant context is set (e.g. system jobs or pre-tenant middleware), 
  // we bypass injection and rely on original query
  if (!businessId) {
    return originalPoolQuery(text, params, callback);
  }

  const client = await pool.connect();
  try {
    return await client.query(text, params, callback);
  } finally {
    client.release();
  }
};

// 2. Intercept pool.connect() to set session vars and clean up on release
const originalPoolConnect = pool.connect.bind(pool);
pool.connect = async function () {
  const client = await originalPoolConnect();
  const businessId = tenantContext.getStore();

  if (businessId) {
    // Set for the current connection session
    await client.query(`SELECT set_config('app.current_tenant', $1, false)`, [businessId]);
    
    // Monkey patch client.release to clean up the session BEFORE it goes back to the pool
    const originalRelease = client.release.bind(client);
    client.release = function (err) {
      // Restore release immediately to prevent infinite loops if release throws
      client.release = originalRelease;
      
      // Reset the config so the next checkout gets a clean slate
      client.query(`SELECT set_config('app.current_tenant', '', false)`)
        .then(() => {
          originalRelease(err);
        })
        .catch((e) => {
          console.error("CRITICAL: Failed to reset tenant config on connection release", e);
          // If we can't clean the connection, destroy it so it doesn't pollute the pool
          originalRelease(e || new Error("Failed to reset tenant config"));
        });
    };
  }

  return client;
};

module.exports = pool;
