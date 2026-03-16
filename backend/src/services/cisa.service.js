const { axiosWithRetry } = require('../utils/httpClient');
const db = require('../db');
const { generateAlerts } = require('../utils/alertGenerator');
const logger = require('../utils/logger');
const { syncRecordsTotal } = require('../utils/metrics');

const CISA_KEV_URL =
  'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';

async function syncCisaKev() {
  const startTime = Date.now();
  let recordsSynced = 0;
  const syncedRecords = [];

  try {
    const { data } = await axiosWithRetry({ url: CISA_KEV_URL, timeout: 30000 });
    const vulns = data.vulnerabilities || [];

    for (const v of vulns) {
      const record = {
        cve_id: v.cveID,
        source: 'cisa',
        title: v.vulnerabilityName || null,
        description: `${v.shortDescription || ''} Required Action: ${v.requiredAction || ''}`.trim(),
        severity: null, // CISA KEV doesn't include CVSS
        cvss_score: null,
        cisa_kev: true,
        exploit_available: true,
        patch_available: !!v.requiredAction,
        published_at: v.dateAdded ? new Date(v.dateAdded) : null,
        last_modified: new Date(),
        affected_products: JSON.stringify([
          { vendor: v.vendorProject, product: v.product },
        ]),
        raw_data: JSON.stringify(v),
      };

      await db('vulnerabilities')
        .insert(record)
        .onConflict('cve_id')
        .merge({
          cisa_kev: true,
          exploit_available: true,
          last_modified: record.last_modified,
          raw_data: record.raw_data,
          title: db.raw('COALESCE(vulnerabilities.title, EXCLUDED.title)'),
        });

      syncedRecords.push(record);
      recordsSynced++;
    }

    await db('sync_log').insert({
      source: 'cisa',
      status: 'success',
      records_synced: recordsSynced,
    });

    await generateAlerts('cisa', syncedRecords).catch((e) => logger.error('[CISA] Alert generation failed: %s', e.message));
    syncRecordsTotal.labels('cisa').inc(recordsSynced);
    logger.info(`[CISA] Synced ${recordsSynced} KEV entries in ${Date.now() - startTime}ms`);
    return { success: true, recordsSynced };
  } catch (err) {
    await db('sync_log').insert({
      source: 'cisa',
      status: 'error',
      records_synced: recordsSynced,
      error_message: err.message,
    });
    logger.error('[CISA] Sync failed: %s', err.message);
    throw err;
  }
}

module.exports = { syncCisaKev };
