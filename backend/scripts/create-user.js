'use strict';
const bcrypt = require('bcryptjs');
const db = require('../src/db');

const VALID_ROLES = ['admin', 'viewer'];

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--username' && argv[i + 1]) args.username = argv[++i];
    else if (argv[i] === '--password' && argv[i + 1]) args.password = argv[++i];
    else if (argv[i] === '--role' && argv[i + 1]) args.role = argv[++i];
    else if (argv[i] === '--email' && argv[i + 1]) args.email = argv[++i];
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);

  if (!args.username || !args.password) {
    console.error('Usage: node scripts/create-user.js --username <name> --password <pass> [--role admin|viewer] [--email user@example.com]');
    console.error('\nOptions:');
    console.error('  --username  (required) Username for the new account');
    console.error('  --password  (required) Password for the new account');
    console.error('  --role      (optional) Role: admin or viewer (default: viewer)');
    console.error('  --email     (optional) Email address');
    process.exit(1);
  }

  const role = args.role || 'viewer';
  if (!VALID_ROLES.includes(role)) {
    console.error(`Invalid role: "${role}". Valid roles: ${VALID_ROLES.join(', ')}`);
    process.exit(1);
  }

  const hash = await bcrypt.hash(args.password, 12);
  const userData = {
    username: args.username,
    password_hash: hash,
    role,
  };
  if (args.email) userData.email = args.email;

  await db('users')
    .insert(userData)
    .onConflict('username')
    .merge({ password_hash: hash, role });

  console.log(`User '${args.username}' created with role '${role}'.`);
  await db.destroy();
}

main().catch((e) => { console.error(e.message); process.exit(1); });
