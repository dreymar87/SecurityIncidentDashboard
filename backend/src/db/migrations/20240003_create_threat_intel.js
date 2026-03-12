exports.up = function (knex) {
  return knex.schema.createTable('threat_intel', (table) => {
    table.increments('id').primary();
    table.string('source', 50).notNullable();
    table.string('ip_address', 45);
    table.string('country', 100);
    table.string('org', 255);
    table.specificType('open_ports', 'INTEGER[]').defaultTo('{}');
    table.specificType('tags', 'TEXT[]').defaultTo('{}');
    table.integer('risk_score');
    table.timestamp('first_seen');
    table.timestamp('last_seen');
    table.jsonb('raw_data');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index(['country'], 'idx_threat_country');
    table.index(['source'], 'idx_threat_source');
    table.index(['risk_score'], 'idx_threat_risk');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('threat_intel');
};
