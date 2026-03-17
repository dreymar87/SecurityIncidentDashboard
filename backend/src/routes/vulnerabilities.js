const express = require('express');
const router = express.Router();
const db = require('../db');
const { Parser } = require('json2csv');
const logger = require('../utils/logger');
const { requireAuth } = require('../utils/auth');
const { logAudit } = require('../utils/auditLog');

const VALID_SEVERITIES = new Set(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'NONE']);
const VALID_TRIAGE = new Set(['new', 'watching', 'reviewed', 'dismissed']);
const SORT_WHITELIST = new Set(['cve_id', 'severity', 'cvss_score', 'published_at', 'source', 'risk_score', 'triage_status']);

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
      kev, exploit, export: exportFormat, triage, watched,
    } = req.query;
    const q = req.query.q ? String(req.query.q).slice(0, 200) : undefined;
    const { page, limit } = sanitizePagination(req.query.page, req.query.limit);
    const sort = SORT_WHITELIST.has(req.query.sort) ? req.query.sort : 'published_at';
    const order = req.query.order === 'asc' ? 'asc' : 'desc';

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
    if (triage) {
      const triageVals = triage.split(',').map((s) => s.trim()).filter((s) => VALID_TRIAGE.has(s));
      if (triageVals.length > 0) query = query.whereIn('triage_status', triageVals);
    }
    if (q) {
      query = query.where((b) =>
        b.where('cve_id', 'ilike', `%${q}%`)
          .orWhere('title', 'ilike', `%${q}%`)
          .orWhere('description', 'ilike', `%${q}%`)
      );
    }

    // Watched filter — only when auth is enabled and user is logged in
    if (watched === 'true' && process.env.ENABLE_AUTH === 'true' && req.user?.id) {
      query = query.whereIn(
        'cve_id',
        db('watchlist').select('cve_id').where('user_id', req.user.id)
      );
    }

    if (exportFormat) {
      const rows = await query
        .select('cve_id', 'source', 'title', 'severity', 'cvss_score', 'risk_score', 'triage_status',
          'cisa_kev', 'exploit_available', 'patch_available', 'published_at')
        .orderBy(sort, order);
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
        .select('id', 'cve_id', 'source', 'title', 'severity', 'cvss_score', 'risk_score',
          'triage_status', 'cisa_kev', 'exploit_available', 'patch_available', 'countries',
          'affected_products', 'published_at', 'last_modified')
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
    logger.error({ err }, 'Failed to fetch vulnerabilities');
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
    logger.error({ err }, 'Failed to fetch CVE');
    res.status(500).json({ error: 'Failed to fetch CVE' });
  }
});

// PATCH /api/vulnerabilities/:cveId/triage
router.patch('/:cveId/triage', requireAuth, async (req, res) => {
  try {
    const { cveId } = req.params;
    const { status } = req.body;

    if (!status || !VALID_TRIAGE.has(status)) {
      return res.status(400).json({ error: `Invalid triage status. Must be one of: ${[...VALID_TRIAGE].join(', ')}` });
    }

    const vuln = await db('vulnerabilities').where('cve_id', cveId).select('cve_id', 'triage_status').first();
    if (!vuln) return res.status(404).json({ error: 'CVE not found' });

    await db('vulnerabilities').where('cve_id', cveId).update({ triage_status: status });

    await logAudit({
      req,
      action: 'triage_update',
      resourceType: 'vulnerability',
      resourceId: cveId,
      details: { from: vuln.triage_status, to: status },
    });

    res.json({ cve_id: cveId, triage_status: status });
  } catch (err) {
    logger.error({ err }, 'Failed to update triage status');
    res.status(500).json({ error: 'Failed to update triage status' });
  }
});

module.exports = router;
