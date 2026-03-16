'use strict';
require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const knex = require('knex');
const bcrypt = require('bcryptjs');
const config = require('./knexfile');
const logger = require('../utils/logger');

const env = process.env.NODE_ENV || 'development';

async function seedAdmin() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    logger.info('[Seed] ADMIN_USERNAME/ADMIN_PASSWORD not set — skipping admin seed');
    return;
  }

  const db = knex(config[env]);
  try {
    const count = await db('users').count('id as n').first();
    if (Number(count.n) > 0) {
      logger.info('[Seed] Users already exist — skipping admin seed');
      return;
    }

    const hash = await bcrypt.hash(password, 12);
    await db('users').insert({ username, password_hash: hash, role: 'admin' });
    logger.info(`[Seed] Admin user '${username}' created`);
  } catch (err) {
    logger.error('[Seed] Failed to seed admin user: %s', err.message);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

seedAdmin();
