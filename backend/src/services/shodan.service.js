const { axiosWithRetry } = require('../utils/httpClient');
const logger = require('../utils/logger');

/**
 * Enrich an IP address with Shodan data.
 * Returns normalized data object or null if no data / API key missing / error.
 */
async function enrichWithShodan(ip) {
  const apiKey = process.env.SHODAN_API_KEY;
  if (!apiKey) {
    return { success: false, reason: 'missing_api_key' };
  }

  try {
    const { data } = await axiosWithRetry({
      url: `https://api.shodan.io/shodan/host/${encodeURIComponent(ip)}`,
      params: { key: apiKey },
      timeout: 10000,
    });

    return {
      ports: data.ports || [],
      vulns: Object.keys(data.vulns || {}),
      org: data.org || null,
      isp: data.isp || null,
      country: data.country_name || null,
      asn: data.asn || null,
      hostnames: data.hostnames || [],
      last_update: data.last_update || null,
    };
  } catch (err) {
    if (err.response?.status === 404) {
      return null; // IP not in Shodan — not an error
    }
    logger.warn({ ip, status: err.response?.status }, '[Shodan] Enrichment failed for IP');
    return null;
  }
}

module.exports = { enrichWithShodan };
