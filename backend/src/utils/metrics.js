'use strict';

const client = require('prom-client');

// Enable default Node.js process metrics (CPU, memory, event loop, etc.)
client.collectDefaultMetrics({ prefix: 'securesight_' });

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests received',
  labelNames: ['method', 'route', 'status'],
});

const syncDurationSeconds = new client.Histogram({
  name: 'sync_duration_seconds',
  help: 'Duration of data source sync operations in seconds',
  labelNames: ['source', 'status'],
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 120, 300],
});

const syncRecordsTotal = new client.Counter({
  name: 'sync_records_total',
  help: 'Total number of records synced per data source',
  labelNames: ['source'],
});

function httpMetricsMiddleware(req, res, next) {
  res.on('finish', () => {
    const route = req.route ? req.baseUrl + req.route.path : req.path;
    httpRequestsTotal.labels(req.method, route, String(res.statusCode)).inc();
  });
  next();
}

module.exports = {
  client,
  httpRequestsTotal,
  syncDurationSeconds,
  syncRecordsTotal,
  httpMetricsMiddleware,
};
