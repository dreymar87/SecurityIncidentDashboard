'use strict';

const cron = require('node-cron');
const logger = require('../utils/logger');
const { syncDurationSeconds } = require('../utils/metrics');
const { syncCisaKev } = require('../services/cisa.service');
const { syncNvd } = require('../services/nvd.service');
const { syncHibpBreaches } = require('../services/hibp.service');
const { syncGreyNoise } = require('../services/greynoise.service');
const { syncOsv } = require('../services/osv.service');
const { syncExploitDb } = require('../services/exploitdb.service');
const { syncGhsa } = require('../services/ghsa.service');
const { syncMitre } = require('../services/mitre.service');

async function runSync(source, fn) {
  logger.info(`[Scheduler] Running ${source} sync`);
  const end = syncDurationSeconds.startTimer({ source });
  try {
    await fn();
    end({ status: 'success' });
  } catch (e) {
    end({ status: 'error' });
    // Error details are logged inside each service
  }
}

function startScheduler() {
  // CISA KEV — every 12 hours
  cron.schedule('0 */12 * * *', () => runSync('cisa', syncCisaKev));

  // NVD CVEs — every 6 hours
  cron.schedule('0 */6 * * *', () => runSync('nvd', () => syncNvd({ daysBack: 7 })));

  // HIBP Breaches — daily at 2am
  cron.schedule('0 2 * * *', () => runSync('hibp', syncHibpBreaches));

  // GreyNoise — every 4 hours
  cron.schedule('0 */4 * * *', () => runSync('greynoise', syncGreyNoise));

  // OSV — daily at 3am
  cron.schedule('0 3 * * *', () => runSync('osv', syncOsv));

  // Exploit-DB — daily at 4am
  cron.schedule('0 4 * * *', () => runSync('exploitdb', syncExploitDb));

  // GitHub Advisory DB — every 6 hours
  cron.schedule('30 */6 * * *', () => runSync('ghsa', syncGhsa));

  // MITRE ATT&CK — weekly on Sunday at midnight
  cron.schedule('0 0 * * 0', () => runSync('mitre', syncMitre));

  logger.info('[Scheduler] All cron jobs registered');
}

module.exports = { startScheduler };
