'use strict';
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const logger = require('../utils/logger');
const { requireAuth, requireAdmin } = require('../utils/auth');
const { logAudit } = require('../utils/auditLog');

const VALID_ROLES = ['admin', 'viewer'];
const SEVERITY_LEVELS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'ALL'];

// ── Admin user management ────────────────────────────────────────────────────

// GET /api/users — list all users (admin only)
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await db('users')
      .select('id', 'username', 'email', 'role', 'active', 'created_at')
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
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
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
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

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

module.exports = router;
