const { axiosWithRetry } = require('../utils/httpClient');
const db = require('../db');
const logger = require('../utils/logger');
const { syncRecordsTotal } = require('../utils/metrics');

const HIBP_BASE = 'https://haveibeenpwned.com/api/v3';

async function syncHibpBreaches() {
  const apiKey = process.env.HIBP_API_KEY;
  if (!apiKey) {
    logger.warn('[HIBP] No API key set — skipping sync. Set HIBP_API_KEY in .env');
    return { success: false, reason: 'missing_api_key' };
  }

  const startTime = Date.now();
  let recordsSynced = 0;

  try {
    const { data: breaches } = await axiosWithRetry({
      url: `${HIBP_BASE}/breaches`,
      headers: { 'hibp-api-key': apiKey, 'user-agent': 'SecurityIncidentDashboard/1.0' },
      timeout: 30000,
    });

    for (const b of breaches) {
      const record = {
        source: 'hibp',
        breach_key: `hibp:${b.Name}`,
        organization: b.Title,
        domain: b.Domain || null,
        country: null, // HIBP doesn't provide country at breach level
        breach_date: b.BreachDate ? new Date(b.BreachDate) : null,
        records_affected: b.PwnCount || 0,
        breach_types: JSON.stringify(b.DataClasses || []),
        description: b.Description
          ? b.Description.replace(/<[^>]*>/g, '') // strip HTML tags
          : null,
        is_verified: b.IsVerified || false,
        is_sensitive: b.IsSensitive || false,
        is_fabricated: b.IsFabricated || false,
        raw_data: JSON.stringify(b),
      };

      await db('breaches')
        .insert(record)
        .onConflict('breach_key')
        .merge({
          records_affected: record.records_affected,
          breach_types: record.breach_types,
          is_verified: record.is_verified,
          raw_data: record.raw_data,
        });

      recordsSynced++;
    }

    await db('sync_log').insert({ source: 'hibp', status: 'success', records_synced: recordsSynced });
    syncRecordsTotal.labels('hibp').inc(recordsSynced);
    logger.info(`[HIBP] Synced ${recordsSynced} breaches in ${Date.now() - startTime}ms`);
    return { success: true, recordsSynced };
  } catch (err) {
    await db('sync_log').insert({
      source: 'hibp',
      status: 'error',
      records_synced: recordsSynced,
      error_message: err.message,
    });
    logger.error('[HIBP] Sync failed: %s', err.message);
    throw err;
  }
}

module.exports = { syncHibpBreaches };
