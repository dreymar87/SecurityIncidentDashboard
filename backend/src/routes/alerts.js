const express = require('express');
const router = express.Router();
const db = require('../db');
const logger = require('../utils/logger');

// GET /api/alerts — recent alerts
router.get('/', async (req, res) => {
  try {
    const alerts = await db('alerts')
      .orderBy('created_at', 'desc')
      .limit(50);
    res.json(alerts);
  } catch (err) {
    logger.error({ err }, 'Alert route error');
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// GET /api/alerts/unread-count
router.get('/unread-count', async (req, res) => {
  try {
    const [{ count }] = await db('alerts').where('read', false).count('id as count');
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
