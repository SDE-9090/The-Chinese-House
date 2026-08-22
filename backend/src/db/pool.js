const { Pool } = require("pg");
const { tenantContext } = require("../middleware/tenantContext");

const isProduction = process.env.NODE_ENV === "production";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("neon.tech") || isProduction
    ? { rejectUnauthorized: false }
    : false,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000
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
  console.log("pool.query called:", text);
  const businessId = tenantContext.getStore();
  
  // If no tenant context is set (e.g. system jobs or pre-tenant middleware), 
  // we bypass injection and rely on original query
  if (!businessId) {
    console.log("No businessId, calling originalPoolQuery");
    return originalPoolQuery(text, params, callback);
  }

  console.log("Calling pool.connect() in pool.query");
  const client = await pool.connect();
  try {
    return await client.query(text, params, callback);
  } finally {
    client.release();
  }
};

// 2. Intercept pool.connect() to set session vars and clean up on release
const originalPoolConnect = pool.connect.bind(pool);
pool.connect = async function (callback) {
  try {
    const client = await originalPoolConnect();
    const businessId = tenantContext.getStore();

    if (businessId) {
      await client.query(`SELECT set_config('app.current_tenant', $1, false)`, [businessId]);
      
      const originalRelease = client.release.bind(client);
      client.release = function (err) {
        client.release = originalRelease;
        client.query(`SELECT set_config('app.current_tenant', '', false)`)
          .catch(e => console.error("Failed to clear tenant config on release:", e))
          .finally(() => { originalRelease(err); });
      };
    }

    if (callback) {
      callback(null, client, client.release.bind(client));
    }
    return client;
  } catch (err) {
    if (callback) {
      callback(err);
    }
    throw err;
  }
};

module.exports = pool;
