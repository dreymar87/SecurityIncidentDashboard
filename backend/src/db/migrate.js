const knex = require('knex');
const config = require('./knexfile');
const logger = require('../utils/logger');

const env = process.env.NODE_ENV || 'development';

async function runMigrations(retries = 5, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    const db = knex(config[env]);
    try {
      await db.migrate.latest();
      logger.info('[Migrate] Migrations done');
      await db.destroy();
      return;
    } catch (err) {
      await db.destroy();
      if (i < retries - 1) {
        logger.error(`[Migrate] Attempt ${i + 1} failed: ${err.message}. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      } else {
        logger.error('[Migrate] Failed after all retries: %s', err.message);
        process.exit(1);
      }
    }
  }
}

runMigrations();
