'use strict';
const express = require('express');
const router = express.Router();
const db = require('../db');
const logger = require('../utils/logger');
const { requireAuth, requireAdmin } = require('../utils/auth');
const { sendTestNotification } = require('../services/notification.service');
const { logAudit } = require('../utils/auditLog');

const VALID_TYPES = ['slack', 'teams', 'pagerduty', 'smtp'];
const VALID_THRESHOLDS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'ALL'];

// All routes require auth + admin
router.use(requireAuth, requireAdmin);

// GET /api/notification-channels
router.get('/', async (req, res) => {
  try {
    const channels = await db('notification_channels').orderBy('created_at', 'asc');
    // Mask sensitive config fields before returning
    const safe = channels.map((ch) => {
      const config = typeof ch.config === 'string' ? JSON.parse(ch.config) : ch.config;
      const masked = { ...config };
      if (masked.webhook_url) masked.webhook_url = maskSecret(masked.webhook_url);
      if (masked.routing_key) masked.routing_key = maskSecret(masked.routing_key);
      if (masked.pass) masked.pass = '••••••••';
      return { ...ch, config: masked };
    });
    res.json(safe);
  } catch (err) {
    logger.error({ err }, 'Failed to list notification channels');
    res.status(500).json({ error: 'Failed to list notification channels' });
  }
});

// POST /api/notification-channels
router.post('/', async (req, res) => {
  const { name, type, config, enabled = true, severity_threshold = 'CRITICAL' } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'name is required' });
  }
  if (!VALID_TYPES.includes(type)) {
    return res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` });
  }
  if (!VALID_THRESHOLDS.includes(severity_threshold)) {
    return res.status(400).json({ error: `severity_threshold must be one of: ${VALID_THRESHOLDS.join(', ')}` });
  }

  try {
    const [channel] = await db('notification_channels').insert({
      name: name.trim(),
      type,
      config: JSON.stringify(config || {}),
      enabled: Boolean(enabled),
      severity_threshold,
    }).returning('*');

    await logAudit({ req, action: 'notification_channel_create', resourceType: 'notification_channel', resourceId: String(channel.id), details: { name, type } });
    res.status(201).json({ ...channel, config: config || {} });
  } catch (err) {
    logger.error({ err }, 'Failed to create notification channel');
    res.status(500).json({ error: 'Failed to create notification channel' });
  }
});

// PUT /api/notification-channels/:id
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, type, config, enabled, severity_threshold } = req.body;

  if (type && !VALID_TYPES.includes(type)) {
    return res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` });
  }
  if (severity_threshold && !VALID_THRESHOLDS.includes(severity_threshold)) {
    return res.status(400).json({ error: `severity_threshold must be one of: ${VALID_THRESHOLDS.join(', ')}` });
  }

  try {
    const existing = await db('notification_channels').where('id', id).first();
    if (!existing) return res.status(404).json({ error: 'Channel not found' });

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (type !== undefined) updates.type = type;
    if (enabled !== undefined) updates.enabled = Boolean(enabled);
    if (severity_threshold !== undefined) updates.severity_threshold = severity_threshold;
    if (config !== undefined) {
      // Merge with existing config so secrets not sent from frontend are preserved
      const existingConfig = typeof existing.config === 'string' ? JSON.parse(existing.config) : existing.config;
      updates.config = JSON.stringify({ ...existingConfig, ...config });
    }
    updates.updated_at = db.fn.now();

    const [updated] = await db('notification_channels').where('id', id).update(updates).returning('*');
    await logAudit({ req, action: 'notification_channel_update', resourceType: 'notification_channel', resourceId: id, details: { name: updated.name } });
    res.json(updated);
  } catch (err) {
    logger.error({ err }, 'Failed to update notification channel');
    res.status(500).json({ error: 'Failed to update notification channel' });
  }
});

// DELETE /api/notification-channels/:id
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await db('notification_channels').where('id', req.params.id).delete();
    if (!deleted) return res.status(404).json({ error: 'Channel not found' });
    await logAudit({ req, action: 'notification_channel_delete', resourceType: 'notification_channel', resourceId: req.params.id });
    res.json({ message: 'Channel deleted' });
  } catch (err) {
    logger.error({ err }, 'Failed to delete notification channel');
    res.status(500).json({ error: 'Failed to delete notification channel' });
  }
});

// POST /api/notification-channels/:id/test
router.post('/:id/test', async (req, res) => {
  try {
    const channel = await db('notification_channels').where('id', req.params.id).first();
    if (!channel) return res.status(404).json({ error: 'Channel not found' });

    await sendTestNotification(channel);
    res.json({ message: 'Test notification sent successfully' });
  } catch (err) {
    logger.error({ err }, 'Test notification failed');
    res.status(500).json({ error: `Test notification failed: ${err.message}` });
  }
});

// GET /api/notification-channels/:id/log — delivery history for a channel
router.get('/:id/log', async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const offset = (page - 1) * limit;

    const [{ count }] = await db('webhook_delivery_log').where('channel_id', req.params.id).count('id as count');
    const entries = await db('webhook_delivery_log')
      .where('channel_id', req.params.id)
      .orderBy('attempted_at', 'desc')
      .limit(limit)
      .offset(offset);

    res.json({ data: entries, total: parseInt(count), page, limit });
  } catch (err) {
    logger.error({ err }, 'Failed to fetch delivery log');
    res.status(500).json({ error: 'Failed to fetch delivery log' });
  }
});

function maskSecret(s) {
  if (!s || s.length <= 8) return '••••••••';
  return s.slice(0, 8) + '••••••••' + s.slice(-4);
}

module.exports = router;
