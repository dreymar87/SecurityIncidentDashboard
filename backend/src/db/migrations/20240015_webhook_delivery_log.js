exports.up = async function (knex) {
  await knex.schema.createTable('webhook_delivery_log', (table) => {
    table.increments('id').primary();
    table.integer('channel_id').references('id').inTable('notification_channels').onDelete('SET NULL').nullable();
    table.string('channel_name', 100).notNullable(); // denormalized for log readability after deletion
    table.string('channel_type', 20).notNullable();
    table.string('alert_reference_id', 255).nullable();
    table.string('status', 20).notNullable(); // success | failed
    table.integer('http_status').nullable();
    table.text('error_message').nullable();
    table.timestamp('attempted_at').notNullable().defaultTo(knex.fn.now());
    table.index(['channel_id', 'attempted_at'], 'idx_delivery_log_channel');
    table.index(['status', 'attempted_at'], 'idx_delivery_log_status');
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('webhook_delivery_log');
};
