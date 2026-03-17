const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../db');
const { parseImportFile } = require('../utils/importParser');
const logger = require('../utils/logger');
const { requireAuth, requireAdmin } = require('../utils/auth');
const { logAudit } = require('../utils/auditLog');

const upload = multer({
  dest: '/tmp/sid-imports/',
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.csv', '.json'].includes(ext)) cb(null, true);
    else cb(new Error('Only .csv and .json files are allowed'));
  },
});

// POST /api/imports/upload
router.post('/upload', requireAuth, requireAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const { type } = req.body; // vulnerabilities or breaches
  if (!['vulnerabilities', 'breaches'].includes(type)) {
    return res.status(400).json({ error: 'type must be "vulnerabilities" or "breaches"' });
  }

  const format = path.extname(req.file.originalname).toLowerCase().replace('.', '');

  let jobId;
  try {
    const [result] = await db('import_jobs').insert({
      filename: req.file.originalname,
      format,
      type,
      status: 'pending',
    }).returning('id');
    jobId = result.id;
  } catch (err) {
    logger.error('[Import] Failed to create job: %s', err.message);
    return res.status(500).json({ error: 'Failed to create import job' });
  }

  res.json({ jobId, message: 'Import started' });
  logAudit({ req, action: 'import_upload', resourceType: 'import', resourceId: String(jobId), details: { filename: req.file.originalname, type, format } });

  // Process asynchronously
  setImmediate(async () => {
    try {
      await db('import_jobs').where('id', jobId).update({ status: 'processing' });
      const result = await parseImportFile(req.file.path, format, type);

      await db('import_jobs').where('id', jobId).update({
        status: 'done',
        records_total: result.total,
        records_imported: result.imported,
        completed_at: new Date(),
      });
    } catch (err) {
      await db('import_jobs').where('id', jobId).update({
        status: 'failed',
        error_message: err.message,
        completed_at: new Date(),
      });
      logger.error('[Import] Failed: %s', err.message);
    }
  });
});

// GET /api/imports/:jobId/status
router.get('/:jobId/status', async (req, res) => {
  try {
    const job = await db('import_jobs').where('id', req.params.jobId).first();
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch job status' });
  }
});

// GET /api/imports/:jobId/stream — SSE endpoint for real-time import status
router.get('/:jobId/stream', async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const jobId = req.params.jobId;

  const sendStatus = async () => {
    try {
      const job = await db('import_jobs').where('id', jobId).first();
      if (!job) {
        res.write(`data: ${JSON.stringify({ error: 'Job not found' })}\n\n`);
        clearInterval(interval);
        res.end();
        return;
      }
      res.write(`data: ${JSON.stringify(job)}\n\n`);
      if (job.status === 'done' || job.status === 'failed') {
        clearInterval(interval);
        res.end();
      }
    } catch (err) {
      clearInterval(interval);
      res.end();
    }
  };

  // Send initial status immediately
  await sendStatus();

  const interval = setInterval(sendStatus, 1000);

  req.on('close', () => {
    clearInterval(interval);
  });
});

// GET /api/imports — list recent import jobs
router.get('/', async (req, res) => {
  try {
    const jobs = await db('import_jobs').orderBy('created_at', 'desc').limit(20);
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch import jobs' });
  }
});

module.exports = router;
