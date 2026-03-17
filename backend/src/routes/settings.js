const express = require('express');
const router = express.Router();
const db = require('../db');
const logger = require('../utils/logger');
const { requireAuth, requireAdmin } = require('../utils/auth');
const { recalculateAllRiskScores } = require('../utils/riskScore');
const { logAudit } = require('../utils/auditLog');

const API_KEYS = ['NVD_API_KEY', 'HIBP_API_KEY', 'GREYNOISE_API_KEY', 'GITHUB_TOKEN'];

// GET /api/settings/status
router.get('/status', async (req, res) => {
  try {
    const rows = await db('sync_log')
      .select('source', 'status', 'records_synced', 'error_message', 'ran_at')
      .whereIn(
        'id',
        db('sync_log').select(db.raw('MAX(id)')).groupBy('source')
      );

    const sources = rows.map((r) => ({
      name: r.source,
      lastSync: r.ran_at,
      status: r.status,
      recordsSynced: r.records_synced,
      errorMessage: r.error_message,
    }));

    const keys = {};
    for (const key of API_KEYS) {
      keys[key] = !!process.env[key];
    }

    res.json({ sources, keys });
  } catch (err) {
    logger.error({ err }, 'Failed to fetch settings status');
    res.status(500).json({ error: 'Failed to fetch settings status' });
  }
});

// GET /api/settings/risk-weights
router.get('/risk-weights', async (req, res) => {
  try {
    const row = await db('app_settings').where('key', 'risk_weights').first();
    const weights = row
      ? (typeof row.value === 'string' ? JSON.parse(row.value) : row.value)
      : { cvss: 0.6, exploit: 0.25, kev: 0.15 };
    res.json(weights);
  } catch (err) {
    logger.error({ err }, 'Failed to fetch risk weights');
    res.status(500).json({ error: 'Failed to fetch risk weights' });
  }
});

// PUT /api/settings/risk-weights (admin only)
router.put('/risk-weights', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { cvss, exploit, kev } = req.body;

    if (
      typeof cvss !== 'number' || typeof exploit !== 'number' || typeof kev !== 'number' ||
      cvss < 0 || exploit < 0 || kev < 0 ||
      cvss > 1 || exploit > 1 || kev > 1
    ) {
      return res.status(400).json({ error: 'Each weight must be a number between 0 and 1' });
    }

    const sum = cvss + exploit + kev;
    if (Math.abs(sum - 1.0) > 0.01) {
      return res.status(400).json({ error: `Weights must sum to 1.0 (current sum: ${sum.toFixed(2)})` });
    }

    const weights = { cvss, exploit, kev };
    await db('app_settings')
      .insert({ key: 'risk_weights', value: JSON.stringify(weights), updated_at: db.fn.now() })
      .onConflict('key')
      .merge({ value: JSON.stringify(weights), updated_at: db.fn.now() });

    await logAudit({ req, action: 'risk_weights_update', resourceType: 'settings', details: weights });

    // Recalculate all risk scores asynchronously (non-blocking)
    recalculateAllRiskScores(weights).catch((err) =>
      logger.error({ err }, 'Background risk score recalculation failed')
    );

    res.json({ message: 'Risk weights updated. Recalculating scores in background.', weights });
  } catch (err) {
    logger.error({ err }, 'Failed to update risk weights');
    res.status(500).json({ error: 'Failed to update risk weights' });
  }
});

module.exports = router;
