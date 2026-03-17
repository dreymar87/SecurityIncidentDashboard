'use strict';
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../db');
const logger = require('../utils/logger');
const { requireAuth, requireAdmin } = require('../utils/auth');
const { logAudit } = require('../utils/auditLog');

const VALID_ROLES = ['admin', 'viewer'];
const SEVERITY_LEVELS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'ALL'];

function validatePassword(password) {
  if (!password || password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) return 'Password must contain at least one number or special character.';
  return null;
}

// ── Admin user management ────────────────────────────────────────────────────

// GET /api/users — list all users (admin only)
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await db('users')
      .select('id', 'username', 'email', 'role', 'active', 'created_at', 'totp_enabled', 'mfa_required')
      .orderBy('created_at', 'asc');
    res.json(users);
  } catch (err) {
    logger.error({ err }, 'Failed to fetch users');
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/users — create user (admin only)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { username, password, role, email } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    if (username.length < 3 || username.length > 100) {
      return res.status(400).json({ error: 'Username must be 3-100 characters' });
    }
    const pwError = validatePassword(password);
    if (pwError) return res.status(400).json({ error: pwError });
    if (role && !VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Valid: ${VALID_ROLES.join(', ')}` });
    }

    const existing = await db('users').where('username', username).first();
    if (existing) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const hash = await bcrypt.hash(password, 12);
    const [user] = await db('users')
      .insert({
        username,
        password_hash: hash,
        role: role || 'viewer',
        email: email || null,
      })
      .returning(['id', 'username', 'email', 'role', 'created_at']);

    await logAudit({ req, action: 'user_create', resourceType: 'user', resourceId: String(user.id), details: { username, role: role || 'viewer' } });

    res.status(201).json(user);
  } catch (err) {
    logger.error({ err }, 'Failed to create user');
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// DELETE /api/users/:id — delete user (admin only, cannot self-delete)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) return res.status(400).json({ error: 'Invalid user ID' });

    if (req.user && req.user.id === userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const user = await db('users').where('id', userId).first();
    if (!user) return res.status(404).json({ error: 'User not found' });

    await db('users').where('id', userId).del();
    await logAudit({ req, action: 'user_delete', resourceType: 'user', resourceId: String(userId), details: { username: user.username } });

    res.json({ message: 'User deleted' });
  } catch (err) {
    logger.error({ err }, 'Failed to delete user');
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// PUT /api/users/:id/reset-password — reset user password (admin only)
router.put('/:id/reset-password', requireAuth, requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) return res.status(400).json({ error: 'Invalid user ID' });

    const { password } = req.body;
    const pwError = validatePassword(password);
    if (pwError) return res.status(400).json({ error: pwError });

    const user = await db('users').where('id', userId).first();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const hash = await bcrypt.hash(password, 12);
    await db('users').where('id', userId).update({ password_hash: hash });
    await logAudit({ req, action: 'password_reset', resourceType: 'user', resourceId: String(userId), details: { username: user.username } });

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    logger.error({ err }, 'Failed to reset password');
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// PUT /api/users/:id/role — change user role (admin only, cannot self-demote)
router.put('/:id/role', requireAuth, requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) return res.status(400).json({ error: 'Invalid user ID' });

    const { role } = req.body;
    if (!role || !VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Valid: ${VALID_ROLES.join(', ')}` });
    }

    if (req.user && req.user.id === userId && role !== 'admin') {
      return res.status(400).json({ error: 'Cannot demote your own account' });
    }

    const user = await db('users').where('id', userId).first();
    if (!user) return res.status(404).json({ error: 'User not found' });

    await db('users').where('id', userId).update({ role });
    await logAudit({ req, action: 'role_change', resourceType: 'user', resourceId: String(userId), details: { username: user.username, oldRole: user.role, newRole: role } });

    res.json({ message: `Role updated to ${role}` });
  } catch (err) {
    logger.error({ err }, 'Failed to update role');
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// PUT /api/users/:id/mfa-required — set MFA requirement per user (admin only)
router.put('/:id/mfa-required', requireAuth, requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) return res.status(400).json({ error: 'Invalid user ID' });

    const { mfa_required } = req.body;
    if (typeof mfa_required !== 'boolean') {
      return res.status(400).json({ error: 'mfa_required must be a boolean' });
    }

    const user = await db('users').where('id', userId).first();
    if (!user) return res.status(404).json({ error: 'User not found' });

    await db('users').where('id', userId).update({ mfa_required });
    await logAudit({
      req,
      action: 'mfa_requirement_change',
      resourceType: 'user',
      resourceId: String(userId),
      details: { username: user.username, mfa_required },
    });

    res.json({ message: `MFA requirement ${mfa_required ? 'enabled' : 'disabled'} for ${user.username}` });
  } catch (err) {
    logger.error({ err }, 'Failed to update MFA requirement');
    res.status(500).json({ error: 'Failed to update MFA requirement' });
  }
});

// ── Per-user preferences ─────────────────────────────────────────────────────

// GET /api/users/me/preferences — get current user preferences
router.get('/me/preferences', requireAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.json({ alertThreshold: 'ALL' });
    }
    const user = await db('users').where('id', req.user.id).select('preferences').first();
    const prefs = user?.preferences || {};
    res.json({
      alertThreshold: prefs.alertThreshold || 'ALL',
    });
  } catch (err) {
    logger.error({ err }, 'Failed to fetch preferences');
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

// PUT /api/users/me/password — change own password
router.put('/me/password', requireAuth, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'currentPassword and newPassword are required' });
    }

    const user = await db('users').where('id', req.user.id).first();
    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });

    const pwError = validatePassword(newPassword);
    if (pwError) return res.status(400).json({ error: pwError });

    const hash = await bcrypt.hash(newPassword, 12);
    await db('users').where('id', req.user.id).update({ password_hash: hash });
    await logAudit({ req, action: 'password_change', resourceType: 'user', resourceId: String(req.user.id), details: { username: user.username } });

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    logger.error({ err }, 'Failed to change password');
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// PUT /api/users/me/profile — update own profile
router.put('/me/profile', requireAuth, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });

    const { email } = req.body;
    const updates = { email: email || null };

    await db('users').where('id', req.user.id).update(updates);
    await logAudit({ req, action: 'profile_update', resourceType: 'user', resourceId: String(req.user.id), details: { email: email || null } });

    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    logger.error({ err }, 'Failed to update profile');
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// PUT /api/users/me/preferences — update current user preferences
router.put('/me/preferences', requireAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { alertThreshold } = req.body;
    if (alertThreshold && !SEVERITY_LEVELS.includes(alertThreshold)) {
      return res.status(400).json({ error: `Invalid alertThreshold. Valid: ${SEVERITY_LEVELS.join(', ')}` });
    }

    const user = await db('users').where('id', req.user.id).select('preferences').first();
    const prefs = user?.preferences || {};
    if (alertThreshold) prefs.alertThreshold = alertThreshold;

    await db('users').where('id', req.user.id).update({ preferences: JSON.stringify(prefs) });
    res.json({ message: 'Preferences updated', preferences: prefs });
  } catch (err) {
    logger.error({ err }, 'Failed to update preferences');
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// ── API key management ────────────────────────────────────────────────────────

// GET /api/users/me/api-keys — list current user's API keys
router.get('/me/api-keys', requireAuth, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    const keys = await db('api_keys')
      .where('user_id', req.user.id)
      .where('active', true)
      .select('id', 'name', 'last_used_at', 'created_at', 'active')
      .orderBy('created_at', 'desc');
    res.json(keys);
  } catch (err) {
    logger.error({ err }, 'Failed to fetch API keys');
    res.status(500).json({ error: 'Failed to fetch API keys' });
  }
});

// POST /api/users/me/api-keys — create a new API key
router.post('/me/api-keys', requireAuth, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });

    const { name } = req.body;
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Key name is required' });
    }
    if (name.length > 100) {
      return res.status(400).json({ error: 'Key name must be 100 characters or fewer' });
    }

    // Generate raw key: ssdk_ + 32 random bytes hex (69 chars total)
    const rawKey = `ssdk_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const [key] = await db('api_keys')
      .insert({
        user_id: req.user.id,
        name: name.trim(),
        key_hash: keyHash,
      })
      .returning(['id', 'name', 'last_used_at', 'created_at', 'active']);

    await logAudit({
      req,
      action: 'api_key_create',
      resourceType: 'api_key',
      resourceId: String(key.id),
      details: { name: key.name },
    });

    // Return the raw key only at creation time
    res.status(201).json({ ...key, key: rawKey });
  } catch (err) {
    logger.error({ err }, 'Failed to create API key');
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

// DELETE /api/users/me/api-keys/:id — revoke an API key (soft delete)
router.delete('/me/api-keys/:id', requireAuth, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });

    const keyId = parseInt(req.params.id, 10);
    if (isNaN(keyId)) return res.status(400).json({ error: 'Invalid key ID' });

    const key = await db('api_keys').where('id', keyId).where('user_id', req.user.id).first();
    if (!key) return res.status(404).json({ error: 'API key not found' });

    await db('api_keys').where('id', keyId).update({ active: false });
    await logAudit({
      req,
      action: 'api_key_revoke',
      resourceType: 'api_key',
      resourceId: String(keyId),
      details: { name: key.name },
    });

    res.json({ message: 'API key revoked' });
  } catch (err) {
    logger.error({ err }, 'Failed to revoke API key');
    res.status(500).json({ error: 'Failed to revoke API key' });
  }
});

// ── Session management ────────────────────────────────────────────────────────

// GET /api/users/me/sessions — list active sessions for current user
router.get('/me/sessions', requireAuth, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });

    const sessions = await db('active_sessions')
      .where('user_id', req.user.id)
      .orderBy('last_activity', 'desc')
      .select('id', 'session_id', 'ip_address', 'user_agent', 'created_at', 'last_activity');

    const currentSessionId = req.session?.id;
    const result = sessions.map(({ session_id, ...s }) => ({
      ...s,
      is_current: session_id === currentSessionId,
    }));

    res.json(result);
  } catch (err) {
    logger.error({ err }, 'Failed to fetch sessions');
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// DELETE /api/users/me/sessions/:id — revoke a session by active_sessions.id
router.delete('/me/sessions/:id', requireAuth, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });

    const sessionRowId = parseInt(req.params.id, 10);
    if (isNaN(sessionRowId)) return res.status(400).json({ error: 'Invalid session ID' });

    const sessionRow = await db('active_sessions')
      .where('id', sessionRowId)
      .where('user_id', req.user.id)
      .first();

    if (!sessionRow) return res.status(404).json({ error: 'Session not found' });

    // Prevent revoking the current session
    if (sessionRow.session_id === req.session?.id) {
      return res.status(400).json({ error: 'Cannot revoke your current session. Use logout instead.' });
    }

    // Delete from active_sessions and from connect-pg-simple's session table
    await db('active_sessions').where('id', sessionRowId).del();
    await db('session').where('sid', sessionRow.session_id).del();

    await logAudit({
      req,
      action: 'session_revoke',
      resourceType: 'session',
      resourceId: String(sessionRowId),
      details: { ip_address: sessionRow.ip_address },
    });

    res.json({ message: 'Session revoked' });
  } catch (err) {
    logger.error({ err }, 'Failed to revoke session');
    res.status(500).json({ error: 'Failed to revoke session' });
  }
});

module.exports = router;
