'use strict';
const express = require('express');
const router = express.Router();
const db = require('../db');
const logger = require('../utils/logger');
const { requireAuth, requireAdmin } = require('../utils/auth');

// GET /api/audit-log — list audit log entries (admin only)
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = (page - 1) * limit;
    const action = req.query.action;

    let query = db('audit_log');
    let countQuery = db('audit_log');

    if (action) {
      query = query.where('action', action);
      countQuery = countQuery.where('action', action);
    }

    const [{ count }] = await countQuery.count('id as count');
    const rows = await query
      .select('id', 'user_id', 'username', 'action', 'resource_type', 'resource_id', 'details', 'ip_address', 'created_at')
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    res.json({
      total: parseInt(count),
      page,
      limit,
      pages: Math.ceil(parseInt(count) / limit),
      data: rows,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to fetch audit log');
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

module.exports = router;
