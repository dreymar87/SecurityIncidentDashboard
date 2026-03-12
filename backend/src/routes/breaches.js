const express = require('express');
const router = express.Router();
const db = require('../db');
const { Parser } = require('json2csv');

// GET /api/breaches
router.get('/', async (req, res) => {
  try {
    const {
      country, source, dateFrom, dateTo, type,
      q, page = 1, limit = 50, export: exportFormat,
    } = req.query;

    let query = db('breaches');

    if (country) query = query.where('country', 'ilike', `%${country}%`);
    if (source) {
      const sources = source.split(',').map((s) => s.trim());
      query = query.whereIn('source', sources);
    }
    if (dateFrom) query = query.where('breach_date', '>=', new Date(dateFrom));
    if (dateTo) query = query.where('breach_date', '<=', new Date(dateTo));
    if (type) query = query.whereRaw('? = ANY(breach_types)', [type]);
    if (q) {
      query = query.where((b) =>
        b.where('organization', 'ilike', `%${q}%`)
          .orWhere('domain', 'ilike', `%${q}%`)
          .orWhere('description', 'ilike', `%${q}%`)
      );
    }

    if (exportFormat) {
      const rows = await query
        .select('organization', 'domain', 'country', 'breach_date',
          'records_affected', 'breach_types', 'source', 'is_verified')
        .orderBy('breach_date', 'desc');
      const parser = new Parser();
      const csv = parser.parse(rows);
      res.set('Content-Type', 'text/csv');
      res.set('Content-Disposition', 'attachment; filename="breaches.csv"');
      return res.send(csv);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const [{ total }, rows] = await Promise.all([
      query.clone().count('id as total').first(),
      query
        .select('id', 'source', 'organization', 'domain', 'country',
          'breach_date', 'records_affected', 'breach_types',
          'is_verified', 'is_sensitive', 'created_at')
        .orderBy('breach_date', 'desc')
        .limit(parseInt(limit))
        .offset(offset),
    ]);

    res.json({
      total: parseInt(total),
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(parseInt(total) / parseInt(limit)),
      data: rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch breaches' });
  }
});

module.exports = router;
