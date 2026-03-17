exports.up = async function (knex) {
  // ── P8-1: MFA/TOTP columns on users ──────────────────────────────────────
  await knex.schema.alterTable('users', (table) => {
    table.string('totp_secret', 255).nullable();
    table.boolean('totp_enabled').notNullable().defaultTo(false);
    table.boolean('mfa_required').notNullable().defaultTo(false);
  });

  // ── P8-2: API keys ────────────────────────────────────────────────────────
  await knex.schema.createTable('api_keys', (table) => {
    table.increments('id').primary();
    table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('name', 100).notNullable();
    table.string('key_hash', 64).notNullable().unique(); // SHA-256 hex of raw key
    table.timestamp('last_used_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.boolean('active').notNullable().defaultTo(true);
    table.index(['user_id', 'active'], 'idx_api_keys_user_active');
  });

  // ── P8-3: Session tracking ────────────────────────────────────────────────
  // Note: session_id is NOT a FK to connect-pg-simple's session table —
  // that table is managed by the library. We track metadata separately.
  await knex.schema.createTable('active_sessions', (table) => {
    table.increments('id').primary();
    table.string('session_id', 255).notNullable().unique();
    table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('ip_address', 45).nullable();
    table.text('user_agent').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('last_activity').notNullable().defaultTo(knex.fn.now());
    table.index(['user_id'], 'idx_active_sessions_user');
  });

  // ── P8-4: Shodan/Censys enrichment columns on threat_intel ───────────────
  await knex.schema.alterTable('threat_intel', (table) => {
    table.jsonb('shodan_data').nullable();
    table.jsonb('censys_data').nullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('active_sessions');
  await knex.schema.dropTableIfExists('api_keys');
  await knex.schema.alterTable('threat_intel', (table) => {
    table.dropColumn('shodan_data');
    table.dropColumn('censys_data');
  });
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('totp_secret');
    table.dropColumn('totp_enabled');
    table.dropColumn('mfa_required');
  });
};
