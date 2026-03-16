const { axiosWithRetry } = require('../utils/httpClient');
const db = require('../db');
const { generateAlerts } = require('../utils/alertGenerator');

const OSV_API = 'https://api.osv.dev/v1/query';
const ECOSYSTEMS = ['npm', 'PyPI', 'Go', 'Maven'];

function mapSeverity(severity) {
  if (!severity) return null;
  const upper = severity.toUpperCase();
  if (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'NONE'].includes(upper)) return upper;
  return null;
}

function extractCvssScore(vuln) {
  const sv = vuln.severity || [];
  for (const s of sv) {
    if (s.type === 'CVSS_V3' && s.score) return parseFloat(s.score);
  }
  return null;
}

function severityFromScore(score) {
  if (score === null || score === undefined) return null;
  if (score >= 9.0) return 'CRITICAL';
  if (score >= 7.0) return 'HIGH';
  if (score >= 4.0) return 'MEDIUM';
  if (score > 0) return 'LOW';
  return 'NONE';
}

async function syncOsv() {
  const startTime = Date.now();
  let recordsSynced = 0;
  const syncedRecords = [];

  try {
    for (const ecosystem of ECOSYSTEMS) {
      let pageToken;

      do {
        const body = {
          package: { ecosystem },
          ...(pageToken && { page_token: pageToken }),
        };

        const { data } = await axiosWithRetry({
          method: 'POST',
          url: OSV_API,
          data: body,
          timeout: 30000,
        });

        const vulns = data.vulns || [];
        pageToken = data.next_page_token || null;

        for (const v of vulns) {
          const aliases = v.aliases || [];
          const cveId = aliases.find((a) => a.startsWith('CVE-')) || v.id;
          const cvssScore = extractCvssScore(v);
          const dbSeverity = v.database_specific?.severity;
          const severity = mapSeverity(dbSeverity) || severityFromScore(cvssScore);

          const affectedProducts = (v.affected || []).map((a) => ({
            vendor: a.package?.ecosystem || null,
            product: a.package?.name || null,
          }));

          const record = {
            cve_id: cveId,
            source: 'osv',
            title: v.summary || cveId,
            description: v.details || null,
            severity,
            cvss_score: cvssScore,
            cvss_vector: null,
            affected_products: JSON.stringify(affectedProducts),
            patch_available: (v.affected || []).some((a) =>
              (a.ranges || []).some((r) => r.events?.some((e) => e.fixed))
            ),
            cisa_kev: false,
            exploit_available: false,
            published_at: v.published ? new Date(v.published) : null,
            last_modified: v.modified ? new Date(v.modified) : new Date(),
            raw_data: JSON.stringify(v),
          };

          await db('vulnerabilities')
            .insert(record)
            .onConflict('cve_id')
            .merge({
              title: record.title,
              description: record.description,
              severity: record.severity,
              cvss_score: record.cvss_score,
              affected_products: record.affected_products,
              patch_available: record.patch_available,
              last_modified: record.last_modified,
              raw_data: record.raw_data,
            });

          syncedRecords.push(record);
          recordsSynced++;
        }

        // Rate limiting — be polite to the free API
        await new Promise((r) => setTimeout(r, 500));
      } while (pageToken);
    }

    await db('sync_log').insert({
      source: 'osv',
      status: 'success',
      records_synced: recordsSynced,
    });

    await generateAlerts('osv', syncedRecords).catch((e) => console.error('[OSV] Alert generation failed:', e.message));
    console.log(`[OSV] Synced ${recordsSynced} vulnerabilities in ${Date.now() - startTime}ms`);
    return { success: true, recordsSynced };
  } catch (err) {
    await db('sync_log').insert({
      source: 'osv',
      status: 'error',
      records_synced: recordsSynced,
      error_message: err.message,
    });
    console.error('[OSV] Sync failed:', err.message);
    throw err;
  }
}

module.exports = { syncOsv };
