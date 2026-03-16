const express = require('express');
const router = express.Router();
const db = require('../db');
const logger = require('../utils/logger');

const SEVERITY_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

function getSeveritiesAtOrAbove(threshold) {
  if (!threshold || threshold === 'ALL') return null; // no filter
  const idx = SEVERITY_ORDER.indexOf(threshold);
  if (idx === -1) return null;
  return SEVERITY_ORDER.slice(0, idx + 1);
}

async function getUserAlertThreshold(req) {
  if (!req.user) return null;
  try {
    const user = await db('users').where('id', req.user.id).select('preferences').first();
    return user?.preferences?.alertThreshold || null;
  } catch {
    return null;
  }
}

// GET /api/alerts — recent alerts (filtered by user's severity preference)
router.get('/', async (req, res) => {
  try {
    let query = db('alerts').orderBy('created_at', 'desc').limit(50);

    const threshold = await getUserAlertThreshold(req);
    const severities = getSeveritiesAtOrAbove(threshold);
    if (severities) {
      query = query.whereIn('severity', severities);
    }

    const alerts = await query;
    res.json(alerts);
  } catch (err) {
    logger.error({ err }, 'Alert route error');
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// GET /api/alerts/unread-count
router.get('/unread-count', async (req, res) => {
  try {
    let query = db('alerts').where('read', false);

    const threshold = await getUserAlertThreshold(req);
    const severities = getSeveritiesAtOrAbove(threshold);
    if (severities) {
      query = query.whereIn('severity', severities);
    }

    const [{ count }] = await query.count('id as count');
    res.json({ count: parseInt(count) });
  } catch (err) {
    logger.error({ err }, 'Alert route error');
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// PATCH /api/alerts/read-all
router.patch('/read-all', async (req, res) => {
  try {
    await db('alerts').where('read', false).update({ read: true });
    res.json({ message: 'All alerts marked as read' });
  } catch (err) {
    logger.error({ err }, 'Alert route error');
    res.status(500).json({ error: 'Failed to mark alerts as read' });
  }
});

// PATCH /api/alerts/:id/read
router.patch('/:id/read', async (req, res) => {
  try {
    await db('alerts').where('id', req.params.id).update({ read: true });
    res.json({ message: 'Alert marked as read' });
  } catch (err) {
    logger.error({ err }, 'Alert route error');
    res.status(500).json({ error: 'Failed to mark alert as read' });
  }
});

module.exports = router;
