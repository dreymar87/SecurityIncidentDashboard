const { axiosWithRetry } = require('../utils/httpClient');
const logger = require('../utils/logger');

/**
 * Enrich an IP address with Censys data.
 * Returns normalized data object or null if no data / API key missing / error.
 */
async function enrichWithCensys(ip) {
  const apiId = process.env.CENSYS_API_ID;
  const apiSecret = process.env.CENSYS_API_SECRET;

  if (!apiId || !apiSecret) {
    return { success: false, reason: 'missing_api_key' };
  }

  const credentials = Buffer.from(`${apiId}:${apiSecret}`).toString('base64');

  try {
    const { data } = await axiosWithRetry({
      url: `https://search.censys.io/api/v2/hosts/${encodeURIComponent(ip)}`,
      headers: {
        Authorization: `Basic ${credentials}`,
        Accept: 'application/json',
      },
      timeout: 10000,
    });

    const result = data.result || {};
    return {
      ports: (result.services || []).map((s) => s.port).filter(Boolean),
      autonomous_system: result.autonomous_system || null,
      labels: result.labels || [],
      last_updated_at: result.last_updated_at || null,
    };
  } catch (err) {
    if (err.response?.status === 404) {
      return null; // IP not in Censys — not an error
    }
    logger.warn({ ip, status: err.response?.status }, '[Censys] Enrichment failed for IP');
    return null;
  }
}

module.exports = { enrichWithCensys };
