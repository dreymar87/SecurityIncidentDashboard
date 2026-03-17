exports.up = async function (knex) {
  // Add risk_score column to vulnerabilities
  await knex.schema.alterTable('vulnerabilities', (table) => {
    table.decimal('risk_score', 5, 2).nullable();
    table.index(['risk_score'], 'idx_vuln_risk_score');
  });

  // Create app_settings table for global config (risk weights, etc.)
  await knex.schema.createTable('app_settings', (table) => {
    table.string('key', 100).primary();
    table.jsonb('value').notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Seed default risk weights
  await knex('app_settings').insert({
    key: 'risk_weights',
    value: JSON.stringify({ cvss: 0.6, exploit: 0.25, kev: 0.15 }),
    updated_at: knex.fn.now(),
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('app_settings');
  await knex.schema.alterTable('vulnerabilities', (table) => {
    table.dropIndex([], 'idx_vuln_risk_score');
    table.dropColumn('risk_score');
  });
};
