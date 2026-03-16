const cron = require('node-cron');
const { syncCisaKev } = require('../services/cisa.service');
const { syncNvd } = require('../services/nvd.service');
const { syncHibpBreaches } = require('../services/hibp.service');
const { syncGreyNoise } = require('../services/greynoise.service');
const { syncOsv } = require('../services/osv.service');
const { syncExploitDb } = require('../services/exploitdb.service');
const { syncGhsa } = require('../services/ghsa.service');
const { syncMitre } = require('../services/mitre.service');

function startScheduler() {
  // CISA KEV — every 12 hours
  cron.schedule('0 */12 * * *', async () => {
    console.log('[Scheduler] Running CISA KEV sync');
    try { await syncCisaKev(); } catch (e) { /* logged inside service */ }
  });

  // NVD CVEs — every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    console.log('[Scheduler] Running NVD sync');
    try { await syncNvd({ daysBack: 7 }); } catch (e) { /* logged inside service */ }
  });

  // HIBP Breaches — daily at 2am
  cron.schedule('0 2 * * *', async () => {
    console.log('[Scheduler] Running HIBP breach sync');
    try { await syncHibpBreaches(); } catch (e) { /* logged inside service */ }
  });

  // GreyNoise — every 4 hours
  cron.schedule('0 */4 * * *', async () => {
    console.log('[Scheduler] Running GreyNoise sync');
    try { await syncGreyNoise(); } catch (e) { /* logged inside service */ }
  });

  // OSV — daily at 3am
  cron.schedule('0 3 * * *', async () => {
    console.log('[Scheduler] Running OSV sync');
    try { await syncOsv(); } catch (e) { /* logged inside service */ }
  });

  // Exploit-DB — daily at 4am
  cron.schedule('0 4 * * *', async () => {
    console.log('[Scheduler] Running Exploit-DB sync');
    try { await syncExploitDb(); } catch (e) { /* logged inside service */ }
  });

  // GitHub Advisory DB — every 6 hours
  cron.schedule('30 */6 * * *', async () => {
    console.log('[Scheduler] Running GHSA sync');
    try { await syncGhsa(); } catch (e) { /* logged inside service */ }
  });

  // MITRE ATT&CK — weekly on Sunday at midnight
  cron.schedule('0 0 * * 0', async () => {
    console.log('[Scheduler] Running MITRE ATT&CK sync');
    try { await syncMitre(); } catch (e) { /* logged inside service */ }
  });

  console.log('[Scheduler] All cron jobs registered');
}

module.exports = { startScheduler };
