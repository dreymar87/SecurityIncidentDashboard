const express = require('express');
const router = express.Router();
const db = require('../db');
const logger = require('../utils/logger');
const { requireAuth } = require('../utils/auth');
const { syncCisaKev } = require('../services/cisa.service');
const { syncNvd } = require('../services/nvd.service');
const { syncHibpBreaches } = require('../services/hibp.service');
const { syncGreyNoise } = require('../services/greynoise.service');
const { syncOsv } = require('../services/osv.service');
const { syncExploitDb } = require('../services/exploitdb.service');
const { syncGhsa } = require('../services/ghsa.service');
const { syncMitre } = require('../services/mitre.service');

const syncers = {
  cisa: syncCisaKev,
  nvd: () => syncNvd({ daysBack: 7 }),
  hibp: syncHibpBreaches,
  greynoise: syncGreyNoise,
  osv: syncOsv,
  exploitdb: syncExploitDb,
  ghsa: syncGhsa,
  mitre: syncMitre,
};

// GET /api/sync/status
router.get('/status', async (req, res) => {
  try {
    const rows = await db('sync_log')
      .select('source', 'status', 'records_synced', 'error_message', 'ran_at')
      .whereIn(
        'id',
        db('sync_log').select(db.raw('MAX(id)')).groupBy('source')
      );
    res.json(rows);
  } catch (err) {
    logger.error({ err }, 'Failed to fetch sync status');
    res.status(500).json({ error: 'Failed to fetch sync status' });
  }
});

// POST /api/sync/trigger/:source
router.post('/trigger/:source', requireAuth, async (req, res) => {
  const { source } = req.params;
  const syncer = syncers[source];

  if (!syncer) {
    return res.status(400).json({ error: `Unknown source: ${source}. Valid: ${Object.keys(syncers).join(', ')}` });
  }

  // Respond immediately, run in background
  res.json({ message: `Sync triggered for ${source}`, status: 'running' });

  try {
    await syncer();
  } catch (err) {
    logger.error('[Sync] Manual trigger for %s failed: %s', source, err.message);
  }
});

module.exports = router;
