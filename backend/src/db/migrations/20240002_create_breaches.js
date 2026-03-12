exports.up = function (knex) {
  return knex.schema.createTable('breaches', (table) => {
    table.increments('id').primary();
    table.string('source', 50).notNullable().defaultTo('hibp');
    table.string('breach_key', 255).unique(); // unique identifier per source (e.g. HIBP breach name)
    table.string('organization', 255);
    table.string('domain', 255);
    table.string('country', 100);
    table.date('breach_date');
    table.bigInteger('records_affected');
    table.specificType('breach_types', 'TEXT[]').defaultTo('{}');
    table.text('description');
    table.boolean('is_verified').defaultTo(false);
    table.boolean('is_sensitive').defaultTo(false);
    table.boolean('is_fabricated').defaultTo(false);
    table.jsonb('raw_data');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index(['country'], 'idx_breach_country');
    table.index(['breach_date'], 'idx_breach_date');
    table.index(['source'], 'idx_breach_source');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('breaches');
};
