const express = require('express');
const router = express.Router();
const db = require('../db');
const logger = require('../utils/logger');
const { requireAuth } = require('../utils/auth');
const { enrichWithShodan } = require('../services/shodan.service');
const { enrichWithCensys } = require('../services/censys.service');

const SORT_WHITELIST = new Set(['ip_address', 'country', 'org', 'risk_score', 'last_seen', 'source']);

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
    const sort = SORT_WHITELIST.has(req.query.sort) ? req.query.sort : 'risk_score';
    const order = req.query.order === 'asc' ? 'asc' : 'desc';

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
        .orderBy(sort, order)
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

// GET /api/threat-intel/:id — detail including Shodan/Censys enrichment
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

    const row = await db('threat_intel').where('id', id).first();
    if (!row) return res.status(404).json({ error: 'Not found' });

    res.json(row);
  } catch (err) {
    logger.error({ err }, 'Failed to fetch threat intel detail');
    res.status(500).json({ error: 'Failed to fetch threat intel detail' });
  }
});

// POST /api/threat-intel/:id/enrich — enrich with Shodan + Censys (fire and update)
router.post('/:id/enrich', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

    const row = await db('threat_intel').where('id', id).select('id', 'ip_address').first();
    if (!row) return res.status(404).json({ error: 'Not found' });

    const [shodanData, censysData] = await Promise.all([
      enrichWithShodan(row.ip_address),
      enrichWithCensys(row.ip_address),
    ]);

    const updates = {};
    if (shodanData && !shodanData.reason) updates.shodan_data = JSON.stringify(shodanData);
    if (censysData && !censysData.reason) updates.censys_data = JSON.stringify(censysData);

    if (Object.keys(updates).length > 0) {
      await db('threat_intel').where('id', id).update(updates);
    }

    const updated = await db('threat_intel').where('id', id).first();
    res.json(updated);
  } catch (err) {
    logger.error({ err }, 'Failed to enrich threat intel');
    res.status(500).json({ error: 'Failed to enrich threat intel' });
  }
});

module.exports = router;
