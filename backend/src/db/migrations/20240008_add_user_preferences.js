exports.up = function (knex) {
  return knex.schema.alterTable('users', (table) => {
    table.jsonb('preferences').defaultTo('{}');
    table.string('email', 255).nullable();
    table.boolean('active').defaultTo(true);
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('users', (table) => {
    table.dropColumn('preferences');
    table.dropColumn('email');
    table.dropColumn('active');
  });
};
