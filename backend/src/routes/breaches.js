const express = require('express');
const router = express.Router();
const db = require('../db');
const { Parser } = require('json2csv');
const logger = require('../utils/logger');

const SORT_WHITELIST = new Set(['organization', 'domain', 'country', 'breach_date', 'records_affected', 'source']);

function sanitizePagination(rawPage, rawLimit) {
  const page = Math.max(1, parseInt(rawPage) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(rawLimit) || 50));
  return { page, limit };
}

// GET /api/breaches
router.get('/', async (req, res) => {
  try {
    const { country, source, dateFrom, dateTo, type, export: exportFormat } = req.query;
    const q = req.query.q ? String(req.query.q).slice(0, 200) : undefined;
    const { page, limit } = sanitizePagination(req.query.page, req.query.limit);
    const sort = SORT_WHITELIST.has(req.query.sort) ? req.query.sort : 'breach_date';
    const order = req.query.order === 'asc' ? 'asc' : 'desc';

    if (dateFrom && isNaN(new Date(dateFrom).getTime())) {
      return res.status(400).json({ error: 'Invalid dateFrom value' });
    }
    if (dateTo && isNaN(new Date(dateTo).getTime())) {
      return res.status(400).json({ error: 'Invalid dateTo value' });
    }

    let query = db('breaches');

    if (country) query = query.where('country', 'ilike', `%${country}%`);
    if (source) {
      const sources = source.split(',').map((s) => s.trim());
      query = query.whereIn('source', sources);
    }
    if (dateFrom) query = query.where('breach_date', '>=', new Date(dateFrom));
    if (dateTo) query = query.where('breach_date', '<=', new Date(dateTo));
    if (type) query = query.whereRaw('? = ANY(breach_types)', [type]);
    if (q) {
      query = query.where((b) =>
        b.where('organization', 'ilike', `%${q}%`)
          .orWhere('domain', 'ilike', `%${q}%`)
          .orWhere('description', 'ilike', `%${q}%`)
      );
    }

    if (exportFormat) {
      const rows = await query
        .select('organization', 'domain', 'country', 'breach_date',
          'records_affected', 'breach_types', 'source', 'is_verified')
        .orderBy(sort, order);
      const parser = new Parser();
      const csv = parser.parse(rows);
      res.set('Content-Type', 'text/csv');
      res.set('Content-Disposition', 'attachment; filename="breaches.csv"');
      return res.send(csv);
    }

    const offset = (page - 1) * limit;
    const [{ total }, rows] = await Promise.all([
      query.clone().count('id as total').first(),
      query
        .select('id', 'source', 'organization', 'domain', 'country',
          'breach_date', 'records_affected', 'breach_types',
          'is_verified', 'is_sensitive', 'created_at')
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
    logger.error({ err }, 'Failed to fetch breaches');
    res.status(500).json({ error: 'Failed to fetch breaches' });
  }
});

// GET /api/breaches/:id
router.get('/:id', async (req, res) => {
  try {
    const breach = await db('breaches').where('id', req.params.id).first();
    if (!breach) return res.status(404).json({ error: 'Not found' });
    res.json(breach);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch breach' });
  }
});

// GET /api/breaches/:id/related-vulns
router.get('/:id/related-vulns', async (req, res) => {
  try {
    const breach = await db('breaches').where('id', req.params.id).first();
    if (!breach || !breach.country) return res.json([]);
    const vulns = await db('vulnerabilities')
      .whereRaw('? = ANY(countries)', [breach.country])
      .whereIn('severity', ['CRITICAL', 'HIGH'])
      .orderBy('cvss_score', 'desc')
      .select('id', 'cve_id', 'title', 'severity', 'cvss_score', 'cisa_kev', 'patch_available')
      .limit(5);
    res.json(vulns);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch related vulnerabilities' });
  }
});

module.exports = router;
