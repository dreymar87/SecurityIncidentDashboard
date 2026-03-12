const axios = require('axios');
const db = require('../db');

const GN_BASE = 'https://api.greynoise.io/v3';

async function syncGreyNoise() {
  const apiKey = process.env.GREYNOISE_API_KEY;
  if (!apiKey) {
    console.warn('[GreyNoise] No API key set — skipping sync. Set GREYNOISE_API_KEY in .env');
    return { success: false, reason: 'missing_api_key' };
  }

  const startTime = Date.now();
  let recordsSynced = 0;

  try {
    // Fetch community noise data (malicious IPs seen in last 24h)
    const { data } = await axios.get(`${GN_BASE}/community/query`, {
      params: { ip: '0.0.0.0/0', size: 100 },
      headers: { key: apiKey },
      timeout: 30000,
    }).catch(async () => {
      // Fallback: use GNQL query for riot + noise
      return axios.get(`${GN_BASE}/experimental/gnql`, {
        params: { query: 'classification:malicious', size: 100 },
        headers: { key: apiKey },
        timeout: 30000,
      });
    });

    const ips = data.data || data.records || [];

    for (const ip of ips) {
      const record = {
        source: 'greynoise',
        ip_address: ip.ip || ip.ip_address,
        country: ip.country || ip.metadata?.country || null,
        org: ip.organization || ip.metadata?.organization || null,
        open_ports: JSON.stringify(ip.ports || []),
        tags: JSON.stringify(ip.tags || [ip.classification].filter(Boolean)),
        risk_score: ip.classification === 'malicious' ? 80 : ip.noise ? 40 : 10,
        first_seen: ip.first_seen ? new Date(ip.first_seen) : null,
        last_seen: ip.last_seen || ip.last_updated
          ? new Date(ip.last_seen || ip.last_updated)
          : new Date(),
        raw_data: JSON.stringify(ip),
      };

      await db('threat_intel').insert(record).onConflict().ignore();
      recordsSynced++;
    }

    await db('sync_log').insert({ source: 'greynoise', status: 'success', records_synced: recordsSynced });
    console.log(`[GreyNoise] Synced ${recordsSynced} threat IPs in ${Date.now() - startTime}ms`);
    return { success: true, recordsSynced };
  } catch (err) {
    await db('sync_log').insert({
      source: 'greynoise',
      status: 'error',
      records_synced: recordsSynced,
      error_message: err.message,
    });
    console.error('[GreyNoise] Sync failed:', err.message);
    throw err;
  }
}

module.exports = { syncGreyNoise };
