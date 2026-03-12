const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/threat-intel
router.get('/', async (req, res) => {
  try {
    const { country, source, q, page = 1, limit = 50 } = req.query;

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

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const [{ total }, rows] = await Promise.all([
      query.clone().count('id as total').first(),
      query
        .select('id', 'source', 'ip_address', 'country', 'org',
          'open_ports', 'tags', 'risk_score', 'first_seen', 'last_seen')
        .orderBy('risk_score', 'desc')
        .limit(parseInt(limit))
        .offset(offset),
    ]);

    res.json({
      total: parseInt(total),
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(parseInt(total) / parseInt(limit)),
      data: rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch threat intel' });
  }
});

module.exports = router;
