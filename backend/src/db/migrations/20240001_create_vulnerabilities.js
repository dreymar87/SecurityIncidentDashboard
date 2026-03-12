exports.up = function (knex) {
  return knex.schema.createTable('vulnerabilities', (table) => {
    table.increments('id').primary();
    table.string('cve_id', 30).unique().notNullable();
    table.string('source', 50).notNullable().defaultTo('nvd');
    table.text('title');
    table.text('description');
    table.string('severity', 20); // CRITICAL, HIGH, MEDIUM, LOW, NONE
    table.decimal('cvss_score', 3, 1);
    table.text('cvss_vector');
    table.jsonb('affected_products').defaultTo('[]');
    table.boolean('patch_available').defaultTo(false);
    table.text('patch_url');
    table.boolean('cisa_kev').defaultTo(false);
    table.boolean('exploit_available').defaultTo(false);
    table.specificType('countries', 'TEXT[]').defaultTo('{}');
    table.timestamp('published_at');
    table.timestamp('last_modified');
    table.jsonb('raw_data');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index(['severity'], 'idx_vuln_severity');
    table.index(['cisa_kev'], 'idx_vuln_kev');
    table.index(['published_at'], 'idx_vuln_published');
    table.index(['source'], 'idx_vuln_source');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('vulnerabilities');
};
