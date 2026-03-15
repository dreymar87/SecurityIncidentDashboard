const express = require('express');
const router = express.Router();
const db = require('../db');
const { Parser } = require('json2csv');

const VALID_SEVERITIES = new Set(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'NONE']);

function sanitizePagination(rawPage, rawLimit) {
  const page = Math.max(1, parseInt(rawPage) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(rawLimit) || 50));
  return { page, limit };
}

// GET /api/vulnerabilities
router.get('/', async (req, res) => {
  try {
    const {
      severity, country, source, dateFrom, dateTo,
      kev, exploit, export: exportFormat,
    } = req.query;
    const q = req.query.q ? String(req.query.q).slice(0, 200) : undefined;
    const { page, limit } = sanitizePagination(req.query.page, req.query.limit);

    if (dateFrom && isNaN(new Date(dateFrom).getTime())) {
      return res.status(400).json({ error: 'Invalid dateFrom value' });
    }
    if (dateTo && isNaN(new Date(dateTo).getTime())) {
      return res.status(400).json({ error: 'Invalid dateTo value' });
    }

    let query = db('vulnerabilities');

    if (severity) {
      const severities = severity.split(',').map((s) => s.trim().toUpperCase()).filter((s) => VALID_SEVERITIES.has(s));
      if (severities.length > 0) query = query.whereIn('severity', severities);
    }
    if (country) {
      query = query.whereRaw('? = ANY(countries)', [country]);
    }
    if (source) {
      const sources = source.split(',').map((s) => s.trim());
      query = query.whereIn('source', sources);
    }
    if (dateFrom) query = query.where('published_at', '>=', new Date(dateFrom));
    if (dateTo) query = query.where('published_at', '<=', new Date(dateTo));
    if (kev === 'true') query = query.where('cisa_kev', true);
    if (exploit === 'true') query = query.where('exploit_available', true);
    if (q) {
      query = query.where((b) =>
        b.where('cve_id', 'ilike', `%${q}%`)
          .orWhere('title', 'ilike', `%${q}%`)
          .orWhere('description', 'ilike', `%${q}%`)
      );
    }

    if (exportFormat) {
      const rows = await query
        .select('cve_id', 'source', 'title', 'severity', 'cvss_score', 'cisa_kev',
          'exploit_available', 'patch_available', 'published_at')
        .orderBy('published_at', 'desc');
      const parser = new Parser();
      const csv = parser.parse(rows);
      res.set('Content-Type', 'text/csv');
      res.set('Content-Disposition', 'attachment; filename="vulnerabilities.csv"');
      return res.send(csv);
    }

    const offset = (page - 1) * limit;
    const countQuery = query.clone().count('id as total').first();
    const [{ total }, rows] = await Promise.all([
      countQuery,
      query
        .select('id', 'cve_id', 'source', 'title', 'severity', 'cvss_score',
          'cisa_kev', 'exploit_available', 'patch_available', 'countries',
          'affected_products', 'published_at', 'last_modified')
        .orderBy('published_at', 'desc')
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
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch vulnerabilities' });
  }
});

// GET /api/vulnerabilities/:cveId
router.get('/:cveId', async (req, res) => {
  try {
    const row = await db('vulnerabilities').where('cve_id', req.params.cveId).first();
    if (!row) return res.status(404).json({ error: 'CVE not found' });
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch CVE' });
  }
});

module.exports = router;
