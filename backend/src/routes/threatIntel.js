const express = require('express');
const router = express.Router();
const db = require('../db');
const logger = require('../utils/logger');

function sanitizePagination(rawPage, rawLimit) {
  const page = Math.max(1, parseInt(rawPage) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(rawLimit) || 50));
  return { page, limit };
}

// GET /api/threat-intel
router.get('/', async (req, res) => {
  try {
    const { country, source } = req.query;
    const q = req.query.q ? String(req.query.q).slice(0, 200) : undefined;
    const { page, limit } = sanitizePagination(req.query.page, req.query.limit);

    let query = db('threat_intel');

    if (country) query = query.where('country', 'ilike', `%${country}%`);
    if (source) {
      const sources = source.split(',').map((s) => s.trim());
      query = query.whereIn('source', sources);
    }
    if (q) {
      query = query.where((b) =>
        b.where('ip_address', 'ilike', `%${q}%`)
          .orWhere('org', 'ilike', `%${q}%`)
          .orWhere('country', 'ilike', `%${q}%`)
      );
    }

    const offset = (page - 1) * limit;
    const [{ total }, rows] = await Promise.all([
      query.clone().count('id as total').first(),
      query
        .select('id', 'source', 'ip_address', 'country', 'org',
          'open_ports', 'tags', 'risk_score', 'first_seen', 'last_seen')
        .orderBy('risk_score', 'desc')
        .limit(limit)
        .offset(offset),
    ]);

    res.json({
      total: parseInt(total),
      page,
      limit,
      pages: Math.ceil(parseInt(total) / limit),
      data: rows,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to fetch threat intel');
    res.status(500).json({ error: 'Failed to fetch threat intel' });
  }
});

module.exports = router;
