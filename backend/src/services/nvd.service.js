const { axiosWithRetry } = require('../utils/httpClient');
const db = require('../db');
const { generateAlerts } = require('../utils/alertGenerator');

const NVD_BASE = 'https://services.nvd.nist.gov/rest/json/cves/2.0';

function severityFromScore(score) {
  if (score === null || score === undefined) return null;
  if (score >= 9.0) return 'CRITICAL';
  if (score >= 7.0) return 'HIGH';
  if (score >= 4.0) return 'MEDIUM';
  if (score > 0) return 'LOW';
  return 'NONE';
}

function extractCvss(metrics) {
  // Try CVSS v3.1 first, then v3.0, then v2
  const v31 = metrics?.cvssMetricV31?.[0]?.cvssData;
  const v30 = metrics?.cvssMetricV30?.[0]?.cvssData;
  const v2 = metrics?.cvssMetricV2?.[0]?.cvssData;
  const data = v31 || v30 || v2;
  return {
    score: data?.baseScore ?? null,
    vector: data?.vectorString ?? null,
    severity: v31?.baseSeverity || v30?.baseSeverity || severityFromScore(data?.baseScore),
  };
}

async function syncNvd({ daysBack = 7 } = {}) {
  const apiKey = process.env.NVD_API_KEY;
  const headers = apiKey ? { apiKey } : {};
  const startTime = Date.now();
  let recordsSynced = 0;
  let startIndex = 0;
  const pageSize = 2000;
  const syncedRecords = [];

  const pubStartDate = new Date(Date.now() - daysBack * 86400000).toISOString();
  const pubEndDate = new Date().toISOString();

  try {
    while (true) {
      const params = {
        pubStartDate,
        pubEndDate,
        startIndex,
        resultsPerPage: pageSize,
      };

      const { data } = await axiosWithRetry({ url: NVD_BASE, params, headers, timeout: 60000 });
      const items = data.vulnerabilities || [];

      for (const item of items) {
        const cve = item.cve;
        const { score, vector, severity } = extractCvss(cve.metrics);
        const desc = cve.descriptions?.find((d) => d.lang === 'en')?.value || null;
        const configs = cve.configurations || [];

        const affectedProducts = [];
        for (const config of configs) {
          for (const node of config.nodes || []) {
            for (const match of node.cpeMatch || []) {
              if (match.criteria) affectedProducts.push({ cpe: match.criteria });
            }
          }
        }

        const record = {
          cve_id: cve.id,
          source: 'nvd',
          title: cve.id,
          description: desc,
          severity,
          cvss_score: score,
          cvss_vector: vector,
          affected_products: JSON.stringify(affectedProducts),
          patch_available: (cve.references || []).some((r) =>
            (r.tags || []).includes('Patch')
          ),
          cisa_kev: false,
          exploit_available: false,
          published_at: cve.published ? new Date(cve.published) : null,
          last_modified: cve.lastModified ? new Date(cve.lastModified) : null,
          raw_data: JSON.stringify(cve),
        };

        await db('vulnerabilities')
          .insert(record)
          .onConflict('cve_id')
          .merge({
            title: record.title,
            description: record.description,
            severity: record.severity,
            cvss_score: record.cvss_score,
            cvss_vector: record.cvss_vector,
            affected_products: record.affected_products,
            patch_available: record.patch_available,
            last_modified: record.last_modified,
            raw_data: record.raw_data,
          });

        syncedRecords.push(record);
        recordsSynced++;
      }

      if (startIndex + items.length >= data.totalResults) break;
      startIndex += pageSize;

      // Respect rate limits: 5 req/30s without key, 50/30s with key
      await new Promise((r) => setTimeout(r, apiKey ? 700 : 7000));
    }

    await db('sync_log').insert({ source: 'nvd', status: 'success', records_synced: recordsSynced });
    await generateAlerts('nvd', syncedRecords).catch((e) => console.error('[NVD] Alert generation failed:', e.message));
    console.log(`[NVD] Synced ${recordsSynced} CVEs in ${Date.now() - startTime}ms`);
    return { success: true, recordsSynced };
  } catch (err) {
    await db('sync_log').insert({
      source: 'nvd',
      status: 'error',
      records_synced: recordsSynced,
      error_message: err.message,
    });
    console.error('[NVD] Sync failed:', err.message);
    throw err;
  }
}

module.exports = { syncNvd };
