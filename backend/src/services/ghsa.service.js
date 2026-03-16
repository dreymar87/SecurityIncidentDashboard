const { axiosWithRetry } = require('../utils/httpClient');
const db = require('../db');
const { generateAlerts } = require('../utils/alertGenerator');
const logger = require('../utils/logger');
const { syncRecordsTotal } = require('../utils/metrics');

const GITHUB_GRAPHQL = 'https://api.github.com/graphql';

const SEVERITY_MAP = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MODERATE: 'MEDIUM',
  LOW: 'LOW',
};

const QUERY = `
query($cursor: String) {
  securityAdvisories(first: 100, orderBy: {field: UPDATED_AT, direction: DESC}, after: $cursor) {
    pageInfo { hasNextPage endCursor }
    nodes {
      ghsaId
      summary
      description
      severity
      publishedAt
      updatedAt
      cvss { score vectorString }
      identifiers { type value }
      vulnerabilities(first: 10) {
        nodes {
          package { ecosystem name }
        }
      }
    }
  }
}`;

async function syncGhsa() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    logger.warn('[GHSA] GITHUB_TOKEN not set, skipping sync');
    return { success: false, recordsSynced: 0 };
  }

  const startTime = Date.now();
  let recordsSynced = 0;
  let cursor = null;
  let pages = 0;
  const maxPages = 10; // Limit to ~1000 advisories per sync
  const syncedRecords = [];

  try {
    do {
      const { data } = await axiosWithRetry({
        method: 'POST',
        url: GITHUB_GRAPHQL,
        headers: {
          Authorization: `bearer ${token}`,
          'Content-Type': 'application/json',
        },
        data: JSON.stringify({ query: QUERY, variables: { cursor } }),
        timeout: 30000,
      });

      if (data.errors) {
        throw new Error(data.errors.map((e) => e.message).join('; '));
      }

      const advisories = data.data.securityAdvisories;
      const nodes = advisories.nodes || [];

      for (const adv of nodes) {
        // Prefer CVE identifier if available
        const cveIdent = (adv.identifiers || []).find((i) => i.type === 'CVE');
        const cveId = cveIdent ? cveIdent.value : adv.ghsaId;

        const affectedProducts = (adv.vulnerabilities?.nodes || []).map((v) => ({
          vendor: v.package?.ecosystem || null,
          product: v.package?.name || null,
        }));

        const record = {
          cve_id: cveId,
          source: 'ghsa',
          title: adv.summary || cveId,
          description: adv.description || null,
          severity: SEVERITY_MAP[adv.severity] || null,
          cvss_score: adv.cvss?.score || null,
          cvss_vector: adv.cvss?.vectorString || null,
          affected_products: JSON.stringify(affectedProducts),
          patch_available: false,
          cisa_kev: false,
          exploit_available: false,
          published_at: adv.publishedAt ? new Date(adv.publishedAt) : null,
          last_modified: adv.updatedAt ? new Date(adv.updatedAt) : new Date(),
          raw_data: JSON.stringify(adv),
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
            last_modified: record.last_modified,
            raw_data: record.raw_data,
          });

        syncedRecords.push(record);
        recordsSynced++;
      }

      cursor = advisories.pageInfo.hasNextPage ? advisories.pageInfo.endCursor : null;
      pages++;

      // Respect GitHub rate limits
      await new Promise((r) => setTimeout(r, 1000));
    } while (cursor && pages < maxPages);

    await db('sync_log').insert({
      source: 'ghsa',
      status: 'success',
      records_synced: recordsSynced,
    });

    await generateAlerts('ghsa', syncedRecords).catch((e) => logger.error('[GHSA] Alert generation failed: %s', e.message));
    syncRecordsTotal.labels('ghsa').inc(recordsSynced);
    logger.info(`[GHSA] Synced ${recordsSynced} advisories in ${Date.now() - startTime}ms`);
    return { success: true, recordsSynced };
  } catch (err) {
    await db('sync_log').insert({
      source: 'ghsa',
      status: 'error',
      records_synced: recordsSynced,
      error_message: err.message,
    });
    logger.error('[GHSA] Sync failed: %s', err.message);
    throw err;
  }
}

module.exports = { syncGhsa };
