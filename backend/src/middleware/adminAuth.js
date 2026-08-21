const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "change-this-in-production";

function adminAuth(req, res, next) {
  // Support both Authorization header (preferred) and cookie fallback
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  } else {
    token = req.cookies?.admin_token;
  }
  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Allow 'admin' (Owner), 'super_admin' and all staff roles
    const validRoles = ["admin", "manager", "waiter", "kitchen", "super_admin"];
    if (!validRoles.includes(decoded.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    req.admin = decoded;

    // CROSS-TENANT ACCESS PREVENTION
    // If a request targets a specific tenant (req.business_id from tenantEnforcer)
    // we must ensure the JWT's business_id matches it exactly.
    // Super admins bypass this check.
    if (decoded.role !== "super_admin" && req.business_id && req.business_id !== decoded.business_id) {
      return res.status(403).json({ error: "Cross-tenant access forbidden. Please login again for this restaurant." });
    }

    // Always prefer the token's business_id if no specific tenant was targeted
    // or if the user is a super admin acting globally.
    if (decoded.business_id) {
      req.business_id = decoded.business_id;
    }

    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Middleware to restrict access based on role
 * @param {string[]} allowedRoles Array of roles that are allowed (e.g. ['admin', 'manager'])
 */
function authorizeRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    // Admin always has access; check role for others
    if (req.admin.role !== 'admin' && !allowedRoles.includes(req.admin.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}

module.exports = { adminAuth, authorizeRole, JWT_SECRET };
