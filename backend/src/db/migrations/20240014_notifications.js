exports.up = async function (knex) {
  // notification_channels: configurable outbound webhook/email channels
  await knex.schema.createTable('notification_channels', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable();
    table.string('type', 20).notNullable(); // slack | teams | pagerduty | smtp
    table.jsonb('config').notNullable().defaultTo('{}'); // webhook_url, routing_key, smtp fields
    table.boolean('enabled').notNullable().defaultTo(true);
    table.string('severity_threshold', 20).notNullable().defaultTo('CRITICAL'); // CRITICAL|HIGH|MEDIUM|LOW|ALL
    table.timestamps(true, true);
  });

  // failed_login_attempts: used for P7-3 brute-force detection
  await knex.schema.createTable('failed_login_attempts', (table) => {
    table.increments('id').primary();
    table.string('username', 255).notNullable();
    table.string('ip_address', 45).notNullable();
    table.timestamp('attempted_at').notNullable().defaultTo(knex.fn.now());
    table.index(['username', 'attempted_at'], 'idx_failed_login_username');
    table.index(['ip_address', 'attempted_at'], 'idx_failed_login_ip');
  });

  // Seed default failed-login threshold in app_settings
  await knex('app_settings').insert({
    key: 'failed_login_threshold',
    value: JSON.stringify({ attempts: 5, window_minutes: 15 }),
    updated_at: knex.fn.now(),
  }).onConflict('key').ignore();
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('failed_login_attempts');
  await knex.schema.dropTableIfExists('notification_channels');
  await knex('app_settings').where('key', 'failed_login_threshold').delete();
};
