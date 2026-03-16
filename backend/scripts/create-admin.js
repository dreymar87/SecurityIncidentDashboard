'use strict';
const bcrypt = require('bcryptjs');
const db = require('../src/db');

async function main() {
  const [,, username, password] = process.argv;
  if (!username || !password) {
    console.error('Usage: node scripts/create-admin.js <username> <password>');
    process.exit(1);
  }
  const hash = await bcrypt.hash(password, 12);
  await db('users')
    .insert({ username, password_hash: hash, role: 'admin' })
    .onConflict('username')
    .merge({ password_hash: hash });
  console.log(`User '${username}' created/updated.`);
  await db.destroy();
}

main().catch((e) => { console.error(e); process.exit(1); });
