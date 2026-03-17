const db = require('../db');
const logger = require('./logger');
const { dispatchAlerts } = require('../services/notification.service');

async function generateAlerts(source, records) {
  if (!records || records.length === 0) return;

  const alerts = [];

  for (const r of records) {
    // Pre-formed alert objects (e.g. from failed_login, hibp breach) pass through directly
    if (r.type && r.title && r.severity && r.reference_id) {
      alerts.push({ type: r.type, title: r.title, message: r.message || null, reference_id: r.reference_id, severity: r.severity });
    } else if (r.cisa_kev) {
      alerts.push({
        type: 'cisa_kev',
        title: `New CISA KEV: ${r.cve_id}`,
        message: r.title || r.description?.slice(0, 200) || null,
        reference_id: r.cve_id,
        severity: 'CRITICAL',
      });
    } else if (r.severity === 'CRITICAL') {
      alerts.push({
        type: 'critical_vuln',
        title: `Critical vulnerability: ${r.cve_id}`,
        message: r.title || r.description?.slice(0, 200) || null,
        reference_id: r.cve_id,
        severity: 'CRITICAL',
      });
    } else if (r.breach_key) {
      // HIBP breach records
      const count = r.records_affected ? r.records_affected.toLocaleString() : 'unknown';
      alerts.push({
        type: 'breach',
        title: `New data breach: ${r.organization || r.domain || r.breach_key}`,
        message: `${count} records affected${r.domain ? ` — ${r.domain}` : ''}`,
        reference_id: r.breach_key,
        severity: r.records_affected >= 10000000 ? 'CRITICAL' : 'HIGH',
      });
    }
  }

  if (alerts.length === 0) return;

  // Avoid duplicates by checking existing reference_ids
  const existingIds = await db('alerts')
    .whereIn('reference_id', alerts.map((a) => a.reference_id))
    .select('reference_id');
  const existingSet = new Set(existingIds.map((r) => r.reference_id));

  const newAlerts = alerts.filter((a) => !existingSet.has(a.reference_id));
  if (newAlerts.length > 0) {
    await db('alerts').insert(newAlerts);
    logger.info(`[Alerts] Generated ${newAlerts.length} new alerts from ${source}`);
    dispatchAlerts(newAlerts).catch((err) =>
      logger.error({ err }, '[Alerts] Notification dispatch failed')
    );
  }
}

module.exports = { generateAlerts };
