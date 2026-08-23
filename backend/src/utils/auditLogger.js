const pool = require("../db/pool");
const { tenantContext } = require("../middleware/tenantContext");

/**
 * Logs an action to the audit_logs table.
 * 
 * @param {Object} req - The Express request object (must have req.user with id)
 * @param {string} action - The action performed (e.g., 'UPDATE_MENU', 'DELETE_ORDER')
 * @param {string} entityType - The type of entity modified (e.g., 'menu_item', 'order')
 * @param {string} entityId - The ID of the entity modified (optional)
 * @param {Object} details - Additional metadata or before/after state (optional)
 */
async function logAuditAction(req, action, entityType, entityId = null, details = null) {
  try {
    const businessId = tenantContext.getStore() || req.business_id;
    if (!businessId) {
      console.warn("Audit log skipped: No businessId found in context or req.business_id");
      return;
    }

    const actorId = req.user && req.user.id ? req.user.id : null;
    const ipAddress = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || null;

    // Use a direct parameterized query (pool.query will enforce RLS implicitly)
    await pool.query(
      `INSERT INTO audit_logs (business_id, actor_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        businessId,
        actorId,
        action,
        entityType,
        entityId ? String(entityId) : null,
        details ? JSON.stringify(details) : null,
        ipAddress
      ]
    );
  } catch (err) {
    console.error("Failed to insert audit log:", err);
  }
}

module.exports = {
  logAuditAction
};
