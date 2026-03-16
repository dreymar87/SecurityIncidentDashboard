exports.up = function (knex) {
  return knex.schema.createTable('alerts', (table) => {
    table.increments('id').primary();
    table.string('type', 50).notNullable();
    table.string('title', 255).notNullable();
    table.text('message');
    table.string('reference_id', 50);
    table.string('severity', 20);
    table.boolean('read').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('read', 'idx_alerts_read');
    table.index('created_at', 'idx_alerts_created');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('alerts');
};
