'use strict';
const db = require('../db');
const logger = require('../utils/logger');

// Throttle map: sessionId → last DB write timestamp (ms)
const lastWriteMap = new Map();
const THROTTLE_MS = 60 * 1000; // write at most once per minute

/**
 * Middleware that updates last_activity in active_sessions for authenticated requests.
 * Throttled to avoid excessive DB writes on every request.
 * Skipped for unauthenticated requests and MFA-pending sessions.
 */
function sessionTracker(req, res, next) {
  if (
    !req.isAuthenticated ||
    !req.isAuthenticated() ||
    !req.session?.id ||
    req.session.mfa_pending ||
    req.apiKeyAuthenticated
  ) {
    return next();
  }

  const sessionId = req.session.id;
  const now = Date.now();
  const lastWrite = lastWriteMap.get(sessionId) || 0;

  if (now - lastWrite >= THROTTLE_MS) {
    lastWriteMap.set(sessionId, now);
    db('active_sessions')
      .where('session_id', sessionId)
      .update({ last_activity: new Date() })
      .catch((err) => logger.debug({ err }, 'Session tracker update failed'));
  }

  next();
}

module.exports = sessionTracker;
