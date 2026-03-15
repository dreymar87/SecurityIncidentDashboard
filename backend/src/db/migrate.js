const knex = require('knex');
const config = require('./knexfile');

const env = process.env.NODE_ENV || 'development';
const db = knex(config[env]);

db.migrate.latest()
  .then(() => {
    console.log('[Migrate] Migrations done');
    return db.destroy();
  })
  .catch((err) => {
    console.error('[Migrate] Failed:', err.message);
    process.exit(1);
  });
