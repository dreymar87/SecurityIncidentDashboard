const express = require('express');
const router = express.Router();
const db = require('../db');

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
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch settings status' });
  }
});

module.exports = router;
