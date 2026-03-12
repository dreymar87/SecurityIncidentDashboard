exports.up = function (knex) {
  return knex.schema.createTable('import_jobs', (table) => {
    table.increments('id').primary();
    table.string('filename', 255);
    table.string('format', 20); // csv, json
    table.string('type', 50);  // vulnerabilities, breaches
    table.string('status', 20).defaultTo('pending'); // pending, processing, done, failed
    table.integer('records_total').defaultTo(0);
    table.integer('records_imported').defaultTo(0);
    table.text('error_message');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('completed_at');
  }).then(() =>
    knex.schema.createTable('sync_log', (table) => {
      table.increments('id').primary();
      table.string('source', 50);
      table.string('status', 20);
      table.integer('records_synced').defaultTo(0);
      table.text('error_message');
      table.timestamp('ran_at').defaultTo(knex.fn.now());
      table.index(['source', 'ran_at'], 'idx_sync_source_time');
    })
  );
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('sync_log')
    .then(() => knex.schema.dropTableIfExists('import_jobs'));
};
