'use strict';

jest.mock('../db', () => {
  const db = jest.fn();
  db.transaction = jest.fn();
  return db;
});

// Mock parseImportFile so upload tests don't need real file processing
jest.mock('../utils/importParser', () => ({
  parseImportFile: jest.fn().mockResolvedValue({ total: 1, imported: 1 }),
}));

const request = require('supertest');
const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('../db');

// Make sure the upload temp dir exists
fs.mkdirSync('/tmp/sid-imports', { recursive: true });

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/imports', require('../routes/imports'));
  return app;
}

// Chainable query builder for simple queries (no clone/count needed)
function makeSimpleChain(resolveValue) {
  const chain = {};
  ['where', 'orderBy', 'limit', 'update', 'returning'].forEach((m) => {
    chain[m] = jest.fn(() => chain);
  });
  chain.insert = jest.fn(() => chain);
  chain.first = jest.fn().mockResolvedValue(resolveValue);
  chain.then = (resolve, reject) => Promise.resolve(resolveValue).then(resolve, reject);
  return chain;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/imports/upload', () => {
  test('returns 400 when no file is attached', async () => {
    const res = await request(buildApp())
      .post('/api/imports/upload')
      .field('type', 'vulnerabilities');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no file/i);
  });

  test('returns 400 for invalid type parameter', async () => {
    // db mock for insert
    db.mockReturnValue(makeSimpleChain([{ id: 1 }]));

    const csvContent = 'cve_id,title\nCVE-2024-0001,Test';
    const res = await request(buildApp())
      .post('/api/imports/upload')
      .attach('file', Buffer.from(csvContent), { filename: 'test.csv', contentType: 'text/csv' })
      .field('type', 'invalid_type');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/type/i);
  });

  test('returns 200 with jobId for valid CSV upload', async () => {
    const insertChain = makeSimpleChain([{ id: 42 }]);
    db.mockReturnValue(insertChain);

    const csvContent = 'cve_id,title\nCVE-2024-0001,Test';
    const res = await request(buildApp())
      .post('/api/imports/upload')
      .attach('file', Buffer.from(csvContent), { filename: 'vulns.csv', contentType: 'text/csv' })
      .field('type', 'vulnerabilities');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('jobId');
    expect(res.body.message).toBe('Import started');
  });

  test('returns 200 with jobId for valid JSON upload', async () => {
    const insertChain = makeSimpleChain([{ id: 7 }]);
    db.mockReturnValue(insertChain);

    const jsonContent = JSON.stringify([{ cve_id: 'CVE-2024-0001', title: 'Test' }]);
    const res = await request(buildApp())
      .post('/api/imports/upload')
      .attach('file', Buffer.from(jsonContent), { filename: 'vulns.json', contentType: 'application/json' })
      .field('type', 'vulnerabilities');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('jobId');
  });

  test('returns non-200 for unsupported file extension (.pdf)', async () => {
    const res = await request(buildApp())
      .post('/api/imports/upload')
      .attach('file', Buffer.from('dummy'), { filename: 'report.pdf', contentType: 'application/pdf' })
      .field('type', 'vulnerabilities');

    // Multer fileFilter rejects → next(err) → Express default error handler (500)
    expect(res.status).not.toBe(200);
  });
});

describe('GET /api/imports/:jobId/status', () => {
  test('returns 200 with job data when job exists', async () => {
    const job = { id: 1, status: 'done', records_total: 10, records_imported: 8 };
    db.mockReturnValue(makeSimpleChain(job));

    const res = await request(buildApp()).get('/api/imports/1/status');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');
  });

  test('returns 404 when job does not exist', async () => {
    db.mockReturnValue(makeSimpleChain(null));

    const res = await request(buildApp()).get('/api/imports/9999/status');

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });
});

describe('GET /api/imports', () => {
  test('returns an array of recent import jobs', async () => {
    const jobs = [
      { id: 1, filename: 'test.csv', status: 'done' },
      { id: 2, filename: 'other.json', status: 'pending' },
    ];
    db.mockReturnValue(makeSimpleChain(jobs));

    const res = await request(buildApp()).get('/api/imports');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
