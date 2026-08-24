const pool = require("../db/pool");
const { tenantContext } = require("./tenantContext");

/**
 * Multi-Tenant Middleware
 * Resolves the business_id dynamically based on the request's origin or X-Tenant-Slug header.
 */

// In-memory cache mapping slug -> { id, status, is_active }
const tenantCache = new Map();

async function tenantEnforcer(req, res, next) {
  // 1. If already authenticated (admin/staff JWT), use the JWT's business_id
  if (req.admin && req.admin.business_id) {
    req.business_id = req.admin.business_id;
    return tenantContext.run(req.business_id, () => next());
  }

  // 2. Extract slug from Origin or Header
  let slug = req.headers["x-tenant-slug"]; // Frontend fallback for mobile/dev
  
  if (!slug && req.headers.origin) {
    try {
      const url = new URL(req.headers.origin);
      const hostname = url.hostname;
      // If hostname is e.g. "momskitchen.thechinesehouse.app", extract "momskitchen"
      // If it's localhost, we default to "the-chinese-house" or what X-Tenant-Slug sent
      if (hostname !== "localhost" && hostname !== "127.0.0.1") {
        slug = hostname.split('.')[0];
      }
    } catch (e) {
      // Ignore invalid origin parsing errors
    }
  }
  
  if (!slug) {
    slug = "the-chinese-house"; // Ultimate fallback for local dev if headers are missing
  }

  // 3. Check Cache
  let tenant = tenantCache.get(slug);

  // 4. Fetch from DB if not in cache
  if (!tenant) {
    try {
      const result = await pool.query(
        `SELECT b.id, b.status, b.is_active, t.monthly_order_limit 
         FROM businesses b 
         LEFT JOIN subscription_tiers t ON b.subscription_tier = t.name 
         WHERE b.slug = $1`, 
        [slug]
      );
      if (result.rows.length) {
        tenant = result.rows[0];
        tenantCache.set(slug, tenant);
      }
    } catch (err) {
      console.error("Failed to resolve tenant from DB:", err);
      return res.status(500).json({ error: "Internal server error during tenant resolution" });
    }
  }

  // 5. Tenant Not Found
  if (!tenant) {
    return res.status(404).json({ error: `Tenant '${slug}' not found` });
  }

  // 6. Validate Status (Supports both legacy is_active and new status columns during migration)
  if (tenant.status !== 'active' && tenant.is_active !== true) {
    return res.status(403).json({ error: "Tenant account is suspended or inactive" });
  }

  // 7. Attach tenant context to the request
  req.business_id = tenant.id;
  req.tenant_slug = slug;
  req.tenant_limit = tenant.monthly_order_limit;
  
  // Wrap the rest of the request inside the AsyncLocalStorage context
  // This allows the connection pool to automatically inject PostgreSQL RLS variables
  return tenantContext.run(tenant.id, () => {
    next();
  });
}

module.exports = { tenantEnforcer, tenantCache };
