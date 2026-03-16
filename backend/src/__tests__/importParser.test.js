'use strict';

const fs = require('fs');
const path = require('path');

// Mock the db module before importing importParser
jest.mock('../db', () => {
  const mockTrx = jest.fn();
  const db = jest.fn(() => ({}));
  db.transaction = jest.fn(async (callback) => callback(mockTrx));
  db._mockTrx = mockTrx;
  return db;
});

const db = require('../db');
const { parseImportFile } = require('../utils/importParser');

const TMP_DIR = '/tmp/sid-imports';

// Default trx query chain returned per table call
function makeDefaultTrxChain() {
  return {
    insert: jest.fn().mockReturnThis(),
    onConflict: jest.fn().mockReturnThis(),
    merge: jest.fn().mockResolvedValue([]),
    ignore: jest.fn().mockResolvedValue([]),
  };
}

beforeAll(() => {
  fs.mkdirSync(TMP_DIR, { recursive: true });
});

beforeEach(() => {
  jest.clearAllMocks();
  // Re-apply implementations wiped by clearAllMocks
  db.transaction.mockImplementation(async (callback) => callback(db._mockTrx));
  db._mockTrx.mockImplementation(() => makeDefaultTrxChain());
});

function writeTmp(filename, content) {
  const filePath = path.join(TMP_DIR, filename);
  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
}

describe('parseImportFile — JSON vulnerabilities', () => {
  test('maps cve/score field aliases and returns correct counts', async () => {
    const rows = [
      { cve: 'CVE-2024-0001', name: 'Test Vuln', score: '7.5', severity: 'HIGH' },
      { cve: 'CVE-2024-0002', name: 'Another', score: '9.0', severity: 'CRITICAL' },
    ];
    const filePath = writeTmp('vuln-test.json', JSON.stringify(rows));

    const result = await parseImportFile(filePath, 'json', 'vulnerabilities');

    expect(result.total).toBe(2);
    expect(result.imported).toBe(2);
  });

  test('skips rows missing required cve_id field', async () => {
    const rows = [
      { name: 'No CVE here', severity: 'HIGH' },           // no cve_id → skipped
      { cve_id: 'CVE-2024-1111', name: 'Valid', severity: 'LOW' },
    ];
    const filePath = writeTmp('vuln-missing-id.json', JSON.stringify(rows));

    const result = await parseImportFile(filePath, 'json', 'vulnerabilities');

    expect(result.total).toBe(2);
    expect(result.imported).toBe(1);
  });

  test('coerces boolean string values correctly', async () => {
    const rows = [
      { cve_id: 'CVE-2024-2000', patched: 'yes' },
      { cve_id: 'CVE-2024-2001', patched: '1' },
      { cve_id: 'CVE-2024-2002', patched: 'true' },
      { cve_id: 'CVE-2024-2003', patched: 'false' },
    ];
    const filePath = writeTmp('vuln-booleans.json', JSON.stringify(rows));

    const insertedRecords = [];
    db._mockTrx.mockImplementation(() => ({
      insert: jest.fn((record) => {
        insertedRecords.push(record);
        return {
          onConflict: jest.fn().mockReturnThis(),
          merge: jest.fn().mockResolvedValue([]),
        };
      }),
    }));

    await parseImportFile(filePath, 'json', 'vulnerabilities');

    const patchValues = insertedRecords.map((r) => r.patch_available);
    expect(patchValues[0]).toBe(true);   // 'yes'
    expect(patchValues[1]).toBe(true);   // '1'
    expect(patchValues[2]).toBe(true);   // 'true'
    expect(patchValues[3]).toBe(false);  // 'false'
  });
});

describe('parseImportFile — CSV vulnerabilities', () => {
  test('maps csv field aliases and returns correct counts', async () => {
    const csv = [
      'cve,title,cvss,severity',
      'CVE-2024-0010,Test One,6.5,MEDIUM',
      'CVE-2024-0011,Test Two,8.0,HIGH',
    ].join('\n');
    const filePath = writeTmp('vuln-csv.csv', csv);

    const result = await parseImportFile(filePath, 'csv', 'vulnerabilities');

    expect(result.total).toBe(2);
    expect(result.imported).toBe(2);
  });

  test('converts array/csv field to postgres array literal', async () => {
    // Use quoted CSV so "US,UK" is one column value
    const csvQuoted = ['cve_id,country', '"CVE-2024-5000","US,UK"'].join('\n');
    const filePath = writeTmp('vuln-arrays.csv', csvQuoted);

    const insertedRecords = [];
    db._mockTrx.mockImplementation(() => ({
      insert: jest.fn((record) => {
        insertedRecords.push(record);
        return {
          onConflict: jest.fn().mockReturnThis(),
          merge: jest.fn().mockResolvedValue([]),
        };
      }),
    }));

    await parseImportFile(filePath, 'csv', 'vulnerabilities');

    expect(insertedRecords.length).toBeGreaterThan(0);
    const countries = insertedRecords[0].countries;
    // Should be a postgres array literal: {"US","UK"}
    expect(countries).toMatch(/^\{/);
    expect(countries).toMatch(/\}$/);
    expect(countries).toContain('US');
    expect(countries).toContain('UK');
  });
});

describe('parseImportFile — JSON breaches', () => {
  test('maps breach field aliases and returns correct counts', async () => {
    const rows = [
      { org: 'Acme Corp', domain: 'acme.com', country: 'US', date: '2023-01-01', records: '5000' },
      { company: 'Beta Ltd', domain: 'beta.io', country: 'UK', date: '2023-06-01', pwn_count: '12000' },
    ];
    const filePath = writeTmp('breach-test.json', JSON.stringify(rows));

    const result = await parseImportFile(filePath, 'json', 'breaches');

    expect(result.total).toBe(2);
    expect(result.imported).toBe(2);
  });
});

describe('parseImportFile — transaction rollback', () => {
  test('throws when db.transaction rejects', async () => {
    db.transaction.mockRejectedValue(new Error('DB connection failed'));

    const rows = [{ cve_id: 'CVE-2024-9999', title: 'Test' }];
    const filePath = writeTmp('vuln-fail.json', JSON.stringify(rows));

    await expect(parseImportFile(filePath, 'json', 'vulnerabilities')).rejects.toThrow(
      'DB connection failed'
    );
  });
});
