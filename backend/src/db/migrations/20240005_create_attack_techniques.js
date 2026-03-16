exports.up = function (knex) {
  return knex.schema.createTable('attack_techniques', (table) => {
    table.increments('id').primary();
    table.string('technique_id', 20).unique().notNullable();
    table.string('name', 255).notNullable();
    table.text('description');
    table.string('tactic', 100);
    table.specificType('platform', 'TEXT[]').defaultTo('{}');
    table.specificType('data_sources', 'TEXT[]').defaultTo('{}');
    table.text('url');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index('tactic', 'idx_attack_tactic');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('attack_techniques');
};
