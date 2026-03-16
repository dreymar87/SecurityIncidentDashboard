const express = require('express');
const router = express.Router();
const db = require('../db');
const logger = require('../utils/logger');

// GET /api/search?q=
router.get('/', async (req, res) => {
  try {
    const q = req.query.q ? String(req.query.q).slice(0, 200).trim() : '';
    if (q.length < 2) {
      return res.json({ vulnerabilities: [], breaches: [], threatIntel: [] });
    }

    const pattern = `%${q}%`;

    const [vulns, breaches, threats] = await Promise.all([
      db('vulnerabilities')
        .where((b) =>
          b.where('cve_id', 'ilike', pattern)
            .orWhere('title', 'ilike', pattern)
            .orWhere('description', 'ilike', pattern)
        )
        .select('id', 'cve_id', 'title', 'severity', 'cvss_score')
        .orderBy('published_at', 'desc')
        .limit(5),

      db('breaches')
        .where((b) =>
          b.where('organization', 'ilike', pattern)
            .orWhere('domain', 'ilike', pattern)
        )
        .select('id', 'organization', 'domain', 'country', 'records_affected')
        .orderBy('breach_date', 'desc')
        .limit(5),

      db('threat_intel')
        .where((b) =>
          b.where('ip_address', 'ilike', pattern)
            .orWhere('org', 'ilike', pattern)
            .orWhere('country', 'ilike', pattern)
        )
        .select('id', 'ip_address', 'country', 'org', 'risk_score')
        .orderBy('risk_score', 'desc')
        .limit(5),
    ]);

    res.json({
      vulnerabilities: vulns,
      breaches,
      threatIntel: threats,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to perform search');
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;
