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
async function logAuditAction(req, action, entityType, entityId = null, details = null, overrideBusinessId = null) {
  try {
    let businessId = overrideBusinessId || tenantContext.getStore() || req.business_id;

    if (businessId === 'super_admin') {
      businessId = null;
    }

    if (!businessId && tenantContext.getStore() !== 'super_admin') {
      console.warn("Audit log skipped: No businessId found in context or req.business_id");
      return;
    }

    let actorId = null;
    let finalDetails = details ? { ...details } : {};

    // Determine who performed the action
    if (req.user && req.user.id) {
      // It's a staff member (exists in staff table)
      actorId = req.user.id;
    } else if (req.admin) {
      // It's an admin or super admin (not in staff table, so actor_id must be null to avoid FK violation)
      finalDetails.admin_actor = {
        id: req.admin.id,
        role: req.admin.role,
        email: req.admin.email || null
      };
    }

    const ipAddress = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || null;

    await pool.query(
      `INSERT INTO audit_logs (business_id, actor_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        businessId,
        actorId,
        action,
        entityType,
        entityId ? String(entityId) : null,
        Object.keys(finalDetails).length > 0 ? JSON.stringify(finalDetails) : null,
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
