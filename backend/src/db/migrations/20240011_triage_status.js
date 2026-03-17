exports.up = async function (knex) {
  await knex.schema.alterTable('vulnerabilities', (table) => {
    table.string('triage_status', 20).notNullable().defaultTo('new');
    table.index(['triage_status'], 'idx_vuln_triage_status');
  });

  // Add check constraint
  await knex.raw(`
    ALTER TABLE vulnerabilities
    ADD CONSTRAINT chk_triage_status
    CHECK (triage_status IN ('new', 'watching', 'reviewed', 'dismissed'))
  `);
};

exports.down = async function (knex) {
  await knex.raw('ALTER TABLE vulnerabilities DROP CONSTRAINT IF EXISTS chk_triage_status');
  await knex.schema.alterTable('vulnerabilities', (table) => {
    table.dropIndex([], 'idx_vuln_triage_status');
    table.dropColumn('triage_status');
  });
};
