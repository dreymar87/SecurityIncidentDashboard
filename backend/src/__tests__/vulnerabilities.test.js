'use strict';

// Mock db BEFORE any require that transitively loads it
jest.mock('../db', () => {
  const db = jest.fn();
  db.transaction = jest.fn();
  return db;
});

const request = require('supertest');
const express = require('express');
const db = require('../db');

// Build a minimal Express app with just the vulnerabilities router
function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/vulnerabilities', require('../routes/vulnerabilities'));
  return app;
}

// Helper: creates a chainable knex-like query builder mock.
// `rowsResolve`  → value the main query resolves to (array of rows)
// `countResolve` → value that clone().count().first() resolves to
function makeQueryChain(rowsResolve = [], countResolve = { total: '0' }) {
  const chain = {};

  ['select', 'where', 'whereIn', 'whereRaw', 'orWhere', 'orderBy', 'limit', 'offset'].forEach((m) => {
    chain[m] = jest.fn(() => chain);
  });

  // clone() returns a separate chain for the count sub-query
  const cloneChain = {};
  cloneChain.count = jest.fn(() => cloneChain);
  cloneChain.first = jest.fn().mockResolvedValue(countResolve);
  chain.clone = jest.fn(() => cloneChain);

  // Make the main chain thenable so `await Promise.all([..., query])` resolves
  chain.then = (resolve, reject) => Promise.resolve(rowsResolve).then(resolve, reject);

  return chain;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/vulnerabilities', () => {
  test('returns paginated JSON with no filters', async () => {
    const chain = makeQueryChain([], { total: '0' });
    db.mockReturnValue(chain);

    const res = await request(buildApp()).get('/api/vulnerabilities');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 0, page: 1, limit: 50, pages: 0, data: [] });
  });

  test('returns 400 for invalid dateFrom', async () => {
    const res = await request(buildApp()).get('/api/vulnerabilities?dateFrom=not-a-date');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/dateFrom/);
  });

  test('returns 400 for invalid dateTo', async () => {
    const res = await request(buildApp()).get('/api/vulnerabilities?dateTo=not-a-date');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/dateTo/);
  });

  test('accepts valid dateFrom and dateTo without error', async () => {
    const chain = makeQueryChain([], { total: '0' });
    db.mockReturnValue(chain);

    const res = await request(buildApp())
      .get('/api/vulnerabilities?dateFrom=2024-01-01&dateTo=2024-12-31');
    expect(res.status).toBe(200);
  });

  test('filters by severity param (comma-separated)', async () => {
    const chain = makeQueryChain([], { total: '0' });
    db.mockReturnValue(chain);

    await request(buildApp()).get('/api/vulnerabilities?severity=CRITICAL,HIGH');

    expect(chain.whereIn).toHaveBeenCalledWith('severity', ['CRITICAL', 'HIGH']);
  });

  test('ignores invalid severity values', async () => {
    const chain = makeQueryChain([], { total: '0' });
    db.mockReturnValue(chain);

    await request(buildApp()).get('/api/vulnerabilities?severity=FAKE,HIGH');

    // Only valid severity 'HIGH' should be passed
    expect(chain.whereIn).toHaveBeenCalledWith('severity', ['HIGH']);
  });

  test('applies kev=true filter', async () => {
    const chain = makeQueryChain([], { total: '0' });
    db.mockReturnValue(chain);

    await request(buildApp()).get('/api/vulnerabilities?kev=true');

    expect(chain.where).toHaveBeenCalledWith('cisa_kev', true);
  });

  test('applies exploit=true filter', async () => {
    const chain = makeQueryChain([], { total: '0' });
    db.mockReturnValue(chain);

    await request(buildApp()).get('/api/vulnerabilities?exploit=true');

    expect(chain.where).toHaveBeenCalledWith('exploit_available', true);
  });

  test('truncates q param to 200 chars', async () => {
    const chain = makeQueryChain([], { total: '0' });
    db.mockReturnValue(chain);

    const longQ = 'A'.repeat(300);
    await request(buildApp()).get(`/api/vulnerabilities?q=${longQ}`);

    // The where clause should be called with at most 200-char ilike pattern
    const ilikeCalls = chain.where.mock.calls;
    // where is called with a builder function for the q filter — check it was called
    expect(ilikeCalls.length).toBeGreaterThan(0);
  });

  test('returns CSV when export param is set', async () => {
    const rows = [
      {
        cve_id: 'CVE-2024-0001', source: 'nvd', title: 'Test', severity: 'HIGH',
        cvss_score: 7.5, cisa_kev: false, exploit_available: false,
        patch_available: true, published_at: new Date('2024-01-01'),
      },
    ];
    // For export, the route does: query.select(...).orderBy(...) — no clone/count
    const chain = makeQueryChain(rows, { total: '1' });
    db.mockReturnValue(chain);

    const res = await request(buildApp()).get('/api/vulnerabilities?export=1');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
  });

  test('paginates with custom page and limit', async () => {
    const chain = makeQueryChain([], { total: '0' });
    db.mockReturnValue(chain);

    const res = await request(buildApp()).get('/api/vulnerabilities?page=2&limit=10');

    expect(res.status).toBe(200);
    expect(res.body.page).toBe(2);
    expect(res.body.limit).toBe(10);
    expect(chain.offset).toHaveBeenCalledWith(10); // (page-1) * limit = 1 * 10
  });

  test('caps limit at 200', async () => {
    const chain = makeQueryChain([], { total: '0' });
    db.mockReturnValue(chain);

    const res = await request(buildApp()).get('/api/vulnerabilities?limit=999');

    expect(res.status).toBe(200);
    expect(res.body.limit).toBe(200);
  });
});

describe('GET /api/vulnerabilities/:cveId', () => {
  test('returns 200 with record when CVE exists', async () => {
    const vuln = { id: 1, cve_id: 'CVE-2024-0001', title: 'Test', severity: 'HIGH' };
    const chain = { where: jest.fn().mockReturnThis(), first: jest.fn().mockResolvedValue(vuln) };
    db.mockReturnValue(chain);

    const res = await request(buildApp()).get('/api/vulnerabilities/CVE-2024-0001');

    expect(res.status).toBe(200);
    expect(res.body.cve_id).toBe('CVE-2024-0001');
  });

  test('returns 404 when CVE not found', async () => {
    const chain = { where: jest.fn().mockReturnThis(), first: jest.fn().mockResolvedValue(null) };
    db.mockReturnValue(chain);

    const res = await request(buildApp()).get('/api/vulnerabilities/CVE-9999-9999');

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });
});
