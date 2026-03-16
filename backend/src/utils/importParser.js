const fs = require('fs');
const csv = require('csv-parser');
const db = require('../db');
const logger = require('./logger');

// Field mapping: user column name -> internal field
const VULN_FIELD_MAP = {
  cve_id: 'cve_id', cveid: 'cve_id', cve: 'cve_id',
  title: 'title', name: 'title', vulnerability_name: 'title',
  description: 'description', desc: 'description',
  severity: 'severity',
  cvss_score: 'cvss_score', cvss: 'cvss_score', score: 'cvss_score',
  countries: 'countries', country: 'countries',
  published_at: 'published_at', date: 'published_at', published: 'published_at',
  patch_available: 'patch_available', patched: 'patch_available',
};

const BREACH_FIELD_MAP = {
  organization: 'organization', org: 'organization', company: 'organization', name: 'organization',
  domain: 'domain',
  country: 'country',
  breach_date: 'breach_date', date: 'breach_date', breachdate: 'breach_date',
  records_affected: 'records_affected', records: 'records_affected', count: 'records_affected', pwn_count: 'records_affected',
  breach_types: 'breach_types', types: 'breach_types', data_classes: 'breach_types',
  description: 'description', desc: 'description',
  is_verified: 'is_verified', verified: 'is_verified',
};

function normalizeKey(key) {
  return key.toLowerCase().replace(/[\s\-]/g, '_'); // eslint-disable-line no-useless-escape
}

function pgArrayLiteral(csv) {
  return `{${String(csv).split(',').map((t) => {
    const v = t.trim().replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `"${v}"`;
  }).join(',')}}`;
}

function mapRow(row, fieldMap) {
  const normalized = {};
  for (const [rawKey, value] of Object.entries(row)) {
    const mappedKey = fieldMap[normalizeKey(rawKey)];
    if (mappedKey) normalized[mappedKey] = value;
  }
  return normalized;
}

function parseJsonRows(raw) {
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : parsed.data || parsed.vulnerabilities || parsed.breaches || [parsed];
}

async function parseCsvRows(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

async function parseImportFile(filePath, format, type) {
  let rawRows;
  if (format === 'json') {
    const content = fs.readFileSync(filePath, 'utf8');
    rawRows = parseJsonRows(content);
  } else {
    rawRows = await parseCsvRows(filePath);
  }

  const fieldMap = type === 'vulnerabilities' ? VULN_FIELD_MAP : BREACH_FIELD_MAP;
  const total = rawRows.length;
  let imported = 0;

  await db.transaction(async (trx) => {
    for (const rawRow of rawRows) {
      const row = mapRow(rawRow, fieldMap);

      try {
        if (type === 'vulnerabilities') {
          if (!row.cve_id) continue;
          const record = {
            cve_id: row.cve_id,
            source: 'imported',
            title: row.title || row.cve_id,
            description: row.description || null,
            severity: row.severity ? row.severity.toUpperCase() : null,
            cvss_score: row.cvss_score ? parseFloat(row.cvss_score) : null,
            countries: row.countries ? pgArrayLiteral(row.countries) : '{}',
            published_at: row.published_at ? new Date(row.published_at) : null,
            patch_available: ['true', '1', 'yes'].includes(String(row.patch_available).toLowerCase()),
            cisa_kev: false,
            exploit_available: false,
          };
          await trx('vulnerabilities').insert(record).onConflict('cve_id').merge({
            source: 'imported',
            title: record.title,
            description: record.description,
            severity: record.severity,
            cvss_score: record.cvss_score,
          });
        } else {
          const record = {
            source: 'imported',
            breach_key: `imported:${row.organization || ''}:${row.breach_date || Date.now()}`,
            organization: row.organization || null,
            domain: row.domain || null,
            country: row.country || null,
            breach_date: row.breach_date ? new Date(row.breach_date) : null,
            records_affected: row.records_affected ? parseInt(row.records_affected) : null,
            breach_types: row.breach_types ? pgArrayLiteral(row.breach_types) : '{}',
            description: row.description || null,
            is_verified: ['true', '1', 'yes'].includes(String(row.is_verified || '').toLowerCase()),
          };
          await trx('breaches').insert(record).onConflict('breach_key').ignore();
        }
        imported++;
      } catch (err) {
        logger.warn('[Import] Skipped row: %s', err.message);
      }
    }
  });

  // Cleanup temp file
  try { fs.unlinkSync(filePath); } catch (_) {} // eslint-disable-line no-empty

  return { total, imported };
}

module.exports = { parseImportFile };
