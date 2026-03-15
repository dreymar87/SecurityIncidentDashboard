require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const fs = require('fs');

// ── Startup guards ────────────────────────────────────────────────────────────

// Ensure upload temp directory exists before any request can arrive
fs.mkdirSync('/tmp/sid-imports', { recursive: true });

// Validate required environment variables
const REQUIRED_ENV = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const OPTIONAL_ENV = ['NVD_API_KEY', 'HIBP_API_KEY', 'GREYNOISE_API_KEY'];

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`[Config] FATAL: Required environment variable ${key} is not set. Check your .env file.`);
    process.exit(1);
  }
}
for (const key of OPTIONAL_ENV) {
  if (!process.env[key]) {
    console.warn(`[Config] Optional environment variable ${key} is not set — related sync will be skipped.`);
  }
}

const vulnerabilitiesRouter = require('./routes/vulnerabilities');
const breachesRouter = require('./routes/breaches');
const threatIntelRouter = require('./routes/threatIntel');
const statsRouter = require('./routes/stats');
const syncRouter = require('./routes/sync');
const importsRouter = require('./routes/imports');
const { startScheduler } = require('./jobs/scheduler');

const app = express();
const PORT = process.env.PORT || 4000;

// ── Rate limiters ─────────────────────────────────────────────────────────────

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const syncLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Sync trigger rate limit exceeded. Please wait before triggering again.' },
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Upload rate limit exceeded. Please wait before uploading again.' },
});

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(morgan('dev'));
app.use(express.json());

app.use('/api', generalLimiter);
app.use('/api/sync/trigger', syncLimiter);
app.use('/api/imports/upload', uploadLimiter);

app.use('/api/vulnerabilities', vulnerabilitiesRouter);
app.use('/api/breaches', breachesRouter);
app.use('/api/threat-intel', threatIntelRouter);
app.use('/api/stats', statsRouter);
app.use('/api/sync', syncRouter);
app.use('/api/imports', importsRouter);

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

app.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT}`);
  if (process.env.ENABLE_SCHEDULER !== 'false') {
    startScheduler();
  }
});

module.exports = app;
