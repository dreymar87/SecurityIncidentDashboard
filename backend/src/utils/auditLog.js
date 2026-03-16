'use strict';
const db = require('../db');
const logger = require('./logger');

/**
 * Log an action to the audit_log table.
 * @param {object} opts
 * @param {object} [opts.req] - Express request (used to extract user + IP)
 * @param {string} opts.action - e.g. 'sync_trigger', 'import_upload', 'user_create'
 * @param {string} opts.resourceType - e.g. 'sync', 'import', 'user'
 * @param {string} [opts.resourceId] - e.g. source name, user id
 * @param {object} [opts.details] - additional JSON context
 */
async function logAudit({ req, action, resourceType, resourceId, details }) {
  try {
    const entry = {
      action,
      resource_type: resourceType,
      resource_id: resourceId || null,
      details: details ? JSON.stringify(details) : null,
    };

    if (req) {
      entry.user_id = req.user?.id || null;
      entry.username = req.user?.username || null;
      entry.ip_address = req.ip || req.connection?.remoteAddress || null;
    }

    await db('audit_log').insert(entry);
  } catch (err) {
    // Audit logging should never break the main request
    logger.error({ err }, 'Failed to write audit log');
  }
}

module.exports = { logAudit };
