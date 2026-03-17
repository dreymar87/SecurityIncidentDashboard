'use strict';
const db = require('../db');
const logger = require('./logger');

/**
 * Compute a risk score (0–10) for a vulnerability row.
 * Formula: (cvss_score * cvss_weight) + (exploit_bonus * exploit_weight) + (kev_bonus * kev_weight)
 * Exploit/KEV bonuses are each worth 10 points at full weight.
 */
function computeRiskScore(vuln, weights) {
  const cvssComponent = (parseFloat(vuln.cvss_score) || 0) * weights.cvss;
  const exploitComponent = vuln.exploit_available ? 10 * weights.exploit : 0;
  const kevComponent = vuln.cisa_kev ? 10 * weights.kev : 0;
  const raw = cvssComponent + exploitComponent + kevComponent;
  return Math.min(10, Math.max(0, Math.round(raw * 100) / 100));
}

/**
 * Load current risk weights from app_settings.
 * Returns default weights if not found.
 */
async function loadRiskWeights() {
  try {
    const row = await db('app_settings').where('key', 'risk_weights').first();
    if (row) {
      const val = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
      return val;
    }
  } catch (err) {
    logger.error({ err }, 'Failed to load risk weights, using defaults');
  }
  return { cvss: 0.6, exploit: 0.25, kev: 0.15 };
}

/**
 * Batch-recalculate risk_score for all vulnerabilities using current weights.
 * Runs in batches of 500 to avoid locking the table.
 */
async function recalculateAllRiskScores(weights) {
  const w = weights || (await loadRiskWeights());
  logger.info({ weights: w }, '[RiskScore] Starting batch recalculation');

  let offset = 0;
  const batchSize = 500;
  let totalUpdated = 0;
  let hasMore = true;

  while (hasMore) {
    const rows = await db('vulnerabilities')
      .select('id', 'cvss_score', 'exploit_available', 'cisa_kev')
      .limit(batchSize)
      .offset(offset);

    if (rows.length === 0) { hasMore = false; break; }

    await Promise.all(
      rows.map((row) =>
        db('vulnerabilities')
          .where('id', row.id)
          .update({ risk_score: computeRiskScore(row, w) })
      )
    );

    totalUpdated += rows.length;
    offset += batchSize;
  }

  logger.info({ totalUpdated }, '[RiskScore] Batch recalculation complete');
  return totalUpdated;
}

module.exports = { computeRiskScore, loadRiskWeights, recalculateAllRiskScores };
