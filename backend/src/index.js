require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const pinoHttp = require('pino-http');
const rateLimit = require('express-rate-limit');
const fs = require('fs');

const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);

const logger = require('./utils/logger');
const { client, httpMetricsMiddleware } = require('./utils/metrics');
const { passport } = require('./utils/auth');

// ── Startup guards ────────────────────────────────────────────────────────────

// Ensure upload temp directory exists before any request can arrive
fs.mkdirSync('/tmp/sid-imports', { recursive: true });

// Validate required environment variables
const REQUIRED_ENV = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const OPTIONAL_ENV = ['NVD_API_KEY', 'HIBP_API_KEY', 'GREYNOISE_API_KEY', 'GITHUB_TOKEN', 'SHODAN_API_KEY', 'CENSYS_API_ID', 'CENSYS_API_SECRET'];

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    logger.fatal(`[Config] Required environment variable ${key} is not set. Check your .env file.`);
    process.exit(1);
  }
}
for (const key of OPTIONAL_ENV) {
  if (!process.env[key]) {
    logger.warn(`[Config] Optional environment variable ${key} is not set — related sync will be skipped.`);
  }
}

const vulnerabilitiesRouter = require('./routes/vulnerabilities');
const breachesRouter = require('./routes/breaches');
const threatIntelRouter = require('./routes/threatIntel');
const statsRouter = require('./routes/stats');
const syncRouter = require('./routes/sync');
const importsRouter = require('./routes/imports');
const settingsRouter = require('./routes/settings');
const attackRouter = require('./routes/attack');
const alertsRouter = require('./routes/alerts');
const searchRouter = require('./routes/search');
const usersRouter = require('./routes/users');
const auditLogRouter = require('./routes/auditLog');
const vulnerabilityNotesRouter = require('./routes/vulnerabilityNotes');
const watchlistRouter = require('./routes/watchlist');
const notificationChannelsRouter = require('./routes/notificationChannels');
const { startScheduler } = require('./jobs/scheduler');
const { recalculateAllRiskScores } = require('./utils/riskScore');
const { apiKeyMiddleware } = require('./utils/auth');
const sessionTracker = require('./middleware/sessionTracker');

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

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
});

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(pinoHttp({ logger }));
app.use(express.json());
app.use(httpMetricsMiddleware);

if (process.env.ENABLE_AUTH === 'true') {
  const insecureSecret = !process.env.SESSION_SECRET || process.env.SESSION_SECRET === 'change-me-in-production';
  if (insecureSecret && process.env.NODE_ENV === 'production') {
    logger.fatal('[Auth] SESSION_SECRET must be set to a strong random value in production. Generate one with: openssl rand -hex 32');
    process.exit(1);
  } else if (insecureSecret) {
    logger.warn('[Auth] SESSION_SECRET not set — using insecure default (never do this in production)');
  }
  app.use(session({
    store: new PgSession({
      conString: `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME}`,
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || 'change-me-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.COOKIE_SECURE === 'true',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    },
  }));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(sessionTracker);
}

app.use('/api', apiKeyMiddleware);

app.use('/api', generalLimiter);
app.use('/api/sync/trigger', syncLimiter);
app.use('/api/imports/upload', uploadLimiter);
app.use('/auth/login', loginLimiter);

app.use('/auth', require('./routes/auth'));

app.use('/api/vulnerabilities', vulnerabilitiesRouter);
app.use('/api/vulnerabilities', vulnerabilityNotesRouter);
app.use('/api/watchlist', watchlistRouter);
app.use('/api/breaches', breachesRouter);
app.use('/api/threat-intel', threatIntelRouter);
app.use('/api/stats', statsRouter);
app.use('/api/sync', syncRouter);
app.use('/api/imports', importsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/attack', attackRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/search', searchRouter);
app.use('/api/users', usersRouter);
app.use('/api/audit-log', auditLogRouter);
app.use('/api/notification-channels', notificationChannelsRouter);

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.contentType);
  res.end(await client.metrics());
});

app.listen(PORT, () => {
  logger.info(`[Server] Running on port ${PORT}`);
  if (process.env.ENABLE_SCHEDULER !== 'false') {
    startScheduler();
  }
  // Recalculate risk scores on startup to populate any null values
  recalculateAllRiskScores().catch((err) =>
    logger.error({ err }, 'Startup risk score recalculation failed')
  );
});

module.exports = app;
