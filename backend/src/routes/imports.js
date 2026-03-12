const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../db');
const { parseImportFile } = require('../utils/importParser');

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
router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const { type } = req.body; // vulnerabilities or breaches
  if (!['vulnerabilities', 'breaches'].includes(type)) {
    return res.status(400).json({ error: 'type must be "vulnerabilities" or "breaches"' });
  }

  const format = path.extname(req.file.originalname).toLowerCase().replace('.', '');

  const [jobId] = await db('import_jobs').insert({
    filename: req.file.originalname,
    format,
    type,
    status: 'pending',
  }).returning('id');

  res.json({ jobId: jobId.id || jobId, message: 'Import started' });

  // Process asynchronously
  setImmediate(async () => {
    try {
      await db('import_jobs').where('id', jobId.id || jobId).update({ status: 'processing' });
      const result = await parseImportFile(req.file.path, format, type);

      await db('import_jobs').where('id', jobId.id || jobId).update({
        status: 'done',
        records_total: result.total,
        records_imported: result.imported,
        completed_at: new Date(),
      });
    } catch (err) {
      await db('import_jobs').where('id', jobId.id || jobId).update({
        status: 'failed',
        error_message: err.message,
        completed_at: new Date(),
      });
      console.error('[Import] Failed:', err.message);
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
