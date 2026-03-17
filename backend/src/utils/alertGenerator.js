const db = require('../db');
const logger = require('./logger');
const { dispatchAlerts } = require('../services/notification.service');

async function generateAlerts(source, records) {
  if (!records || records.length === 0) return;

  const alerts = [];

  for (const r of records) {
    if (r.cisa_kev) {
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
