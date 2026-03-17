exports.up = function (knex) {
  return knex.schema.createTable('watchlist', (table) => {
    table.increments('id').primary();
    table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('cve_id', 30).notNullable().references('cve_id').inTable('vulnerabilities').onDelete('CASCADE');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.unique(['user_id', 'cve_id'], 'uq_watchlist_user_cve');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('watchlist');
};
