exports.up = function (knex) {
  return knex.schema.createTable('audit_log', (table) => {
    table.increments('id').primary();
    table.integer('user_id').nullable();
    table.string('username', 100).nullable();
    table.string('action', 50).notNullable();
    table.string('resource_type', 50).notNullable();
    table.string('resource_id', 100).nullable();
    table.jsonb('details').nullable();
    table.string('ip_address', 45).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index('created_at', 'idx_audit_log_created_at');
    table.index('action', 'idx_audit_log_action');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('audit_log');
};
