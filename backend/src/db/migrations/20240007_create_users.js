exports.up = function (knex) {
  return knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('username', 100).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.string('role', 20).defaultTo('admin');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index('username', 'idx_users_username');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('users');
};
