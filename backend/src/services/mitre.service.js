const { axiosWithRetry } = require('../utils/httpClient');
const db = require('../db');
const logger = require('../utils/logger');
const { syncRecordsTotal } = require('../utils/metrics');

const MITRE_STIX_URL =
  'https://raw.githubusercontent.com/mitre-attack/attack-stix-data/master/enterprise-attack/enterprise-attack.json';

async function syncMitre() {
  const startTime = Date.now();
  let recordsSynced = 0;

  try {
    const { data } = await axiosWithRetry({
      url: MITRE_STIX_URL,
      timeout: 120000,
    });

    const objects = data.objects || [];
    const techniques = objects.filter(
      (o) =>
        o.type === 'attack-pattern' &&
        !o.revoked &&
        !o.x_mitre_deprecated
    );

    for (const t of techniques) {
      const extRef = (t.external_references || []).find(
        (r) => r.source_name === 'mitre-attack'
      );
      if (!extRef) continue;

      const techniqueId = extRef.external_id;
      const url = extRef.url || null;

      // Extract tactics from kill chain phases
      const tactics = (t.kill_chain_phases || [])
        .filter((p) => p.kill_chain_name === 'mitre-attack')
        .map((p) => p.phase_name);

      const tactic = tactics.join(', ') || 'unknown';
      const platforms = t.x_mitre_platforms || [];
      const dataSources = (t.x_mitre_data_sources || []);

      const record = {
        technique_id: techniqueId,
        name: t.name,
        description: t.description || null,
        tactic,
        platform: `{${platforms.map((p) => `"${p}"`).join(',')}}`,
        data_sources: `{${dataSources.map((d) => `"${d.replace(/"/g, '\\"')}"`).join(',')}}`,
        url,
        updated_at: new Date(),
      };

      await db('attack_techniques')
        .insert({ ...record, created_at: new Date() })
        .onConflict('technique_id')
        .merge({
          name: record.name,
          description: record.description,
          tactic: record.tactic,
          platform: record.platform,
          data_sources: record.data_sources,
          url: record.url,
          updated_at: record.updated_at,
        });

      recordsSynced++;
    }

    await db('sync_log').insert({
      source: 'mitre',
      status: 'success',
      records_synced: recordsSynced,
    });

    syncRecordsTotal.labels('mitre').inc(recordsSynced);
    logger.info(`[MITRE] Synced ${recordsSynced} techniques in ${Date.now() - startTime}ms`);
    return { success: true, recordsSynced };
  } catch (err) {
    await db('sync_log').insert({
      source: 'mitre',
      status: 'error',
      records_synced: recordsSynced,
      error_message: err.message,
    });
    logger.error('[MITRE] Sync failed: %s', err.message);
    throw err;
  }
}

module.exports = { syncMitre };
