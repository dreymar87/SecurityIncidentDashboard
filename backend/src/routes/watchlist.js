const express = require('express');
const router = express.Router();
const db = require('../db');
const logger = require('../utils/logger');
const { requireAuth } = require('../utils/auth');

// GET /api/watchlist — return array of cve_id strings for current user
router.get('/', requireAuth, async (req, res) => {
  try {
    const rows = await db('watchlist')
      .where('user_id', req.user.id)
      .select('cve_id')
      .orderBy('created_at', 'desc');
    res.json(rows.map((r) => r.cve_id));
  } catch (err) {
    logger.error({ err }, 'Failed to fetch watchlist');
    res.status(500).json({ error: 'Failed to fetch watchlist' });
  }
});

// POST /api/watchlist/:cveId — add CVE to watchlist
router.post('/:cveId', requireAuth, async (req, res) => {
  try {
    const { cveId } = req.params;

    const vuln = await db('vulnerabilities').where('cve_id', cveId).select('cve_id').first();
    if (!vuln) return res.status(404).json({ error: 'CVE not found' });

    await db('watchlist')
      .insert({ user_id: req.user.id, cve_id: cveId })
      .onConflict(['user_id', 'cve_id'])
      .ignore();

    res.status(201).json({ cve_id: cveId, watched: true });
  } catch (err) {
    logger.error({ err }, 'Failed to add to watchlist');
    res.status(500).json({ error: 'Failed to add to watchlist' });
  }
});

// DELETE /api/watchlist/:cveId — remove CVE from watchlist
router.delete('/:cveId', requireAuth, async (req, res) => {
  try {
    const { cveId } = req.params;
    await db('watchlist').where({ user_id: req.user.id, cve_id: cveId }).delete();
    res.json({ cve_id: cveId, watched: false });
  } catch (err) {
    logger.error({ err }, 'Failed to remove from watchlist');
    res.status(500).json({ error: 'Failed to remove from watchlist' });
  }
});

module.exports = router;
