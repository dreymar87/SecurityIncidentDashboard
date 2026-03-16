const express = require('express');
const router = express.Router();
const db = require('../db');
const logger = require('../utils/logger');

// GET /api/stats
router.get('/', async (req, res) => {
  try {
    const [
      vulnTotal,
      kevTotal,
      breachTotal,
      threatTotal,
      severityDist,
      topBreachCountries,
      topVulnCountries,
      topThreatCountries,
      recentActivity,
      lastSync,
    ] = await Promise.all([
      db('vulnerabilities').count('id as count').first(),
      db('vulnerabilities').where('cisa_kev', true).count('id as count').first(),
      db('breaches').count('id as count').first(),
      db('threat_intel').count('id as count').first(),

      db('vulnerabilities')
        .select('severity')
        .count('id as count')
        .whereNotNull('severity')
        .groupBy('severity')
        .orderBy('count', 'desc'),

      db('breaches')
        .select('country')
        .count('id as count')
        .whereNotNull('country')
        .groupBy('country')
        .orderBy('count', 'desc')
        .limit(10),

      db.raw(`
        SELECT unnest(countries) AS country, COUNT(*) AS count
        FROM vulnerabilities
        WHERE countries IS NOT NULL AND array_length(countries, 1) > 0
        GROUP BY country
        ORDER BY count DESC
        LIMIT 10
      `),

      db('threat_intel')
        .select('country')
        .count('id as count')
        .whereNotNull('country')
        .groupBy('country')
        .orderBy('count', 'desc')
        .limit(10),

      db.raw(`
        (SELECT 'vulnerability' AS type, cve_id AS identifier, severity AS detail,
                published_at AS event_time FROM vulnerabilities
         WHERE published_at IS NOT NULL ORDER BY published_at DESC LIMIT 5)
        UNION ALL
        (SELECT 'breach' AS type, organization AS identifier, records_affected::text AS detail,
                breach_date AS event_time FROM breaches
         WHERE breach_date IS NOT NULL ORDER BY breach_date DESC LIMIT 5)
        ORDER BY event_time DESC LIMIT 10
      `),

      db('sync_log')
        .select('source')
        .max('ran_at as last_ran')
        .where('status', 'success')
        .groupBy('source'),
    ]);

    // Aggregate breach records
    const { rows: totalBreachRecords } = await db.raw(
      'SELECT COALESCE(SUM(records_affected), 0) AS total FROM breaches'
    );

    res.json({
      overview: {
        totalVulnerabilities: parseInt(vulnTotal.count),
        activeExploits: parseInt(kevTotal.count),
        totalBreaches: parseInt(breachTotal.count),
        totalBreachRecords: parseInt(totalBreachRecords[0].total),
        threatIps: parseInt(threatTotal.count),
      },
      severityDistribution: severityDist,
      topBreachCountries: topBreachCountries,
      topVulnCountries: topVulnCountries.rows,
      topThreatCountries: topThreatCountries,
      recentActivity: recentActivity.rows,
      lastSync,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to fetch stats');
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/stats/trends?range=7d|30d|90d
router.get('/trends', async (req, res) => {
  try {
    const rangeParam = req.query.range || '30d';
    const days = rangeParam === '7d' ? 7 : rangeParam === '90d' ? 90 : 30;

    const [vulnTrends, breachTrends, threatTrends] = await Promise.all([
      db.raw(`
        SELECT DATE(published_at) AS date, COUNT(*) AS count
        FROM vulnerabilities
        WHERE published_at >= NOW() - INTERVAL '${days} days'
          AND published_at IS NOT NULL
        GROUP BY DATE(published_at)
        ORDER BY date
      `),
      db.raw(`
        SELECT DATE(breach_date) AS date, COUNT(*) AS count
        FROM breaches
        WHERE breach_date >= NOW() - INTERVAL '${days} days'
          AND breach_date IS NOT NULL
        GROUP BY DATE(breach_date)
        ORDER BY date
      `),
      db.raw(`
        SELECT DATE(created_at) AS date, COUNT(*) AS count
        FROM threat_intel
        WHERE created_at >= NOW() - INTERVAL '${days} days'
        GROUP BY DATE(created_at)
        ORDER BY date
      `),
    ]);

    res.json({
      vulnerabilities: vulnTrends.rows,
      breaches: breachTrends.rows,
      threatIntel: threatTrends.rows,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to fetch trends');
    res.status(500).json({ error: 'Failed to fetch trends' });
  }
});

module.exports = router;
