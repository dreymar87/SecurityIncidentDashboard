require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const vulnerabilitiesRouter = require('./routes/vulnerabilities');
const breachesRouter = require('./routes/breaches');
const threatIntelRouter = require('./routes/threatIntel');
const statsRouter = require('./routes/stats');
const syncRouter = require('./routes/sync');
const importsRouter = require('./routes/imports');
const { startScheduler } = require('./jobs/scheduler');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(morgan('dev'));
app.use(express.json());

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
