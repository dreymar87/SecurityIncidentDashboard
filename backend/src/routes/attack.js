const express = require('express');
const router = express.Router();
const db = require('../db');

const TACTIC_ORDER = [
  'reconnaissance',
  'resource-development',
  'initial-access',
  'execution',
  'persistence',
  'privilege-escalation',
  'defense-evasion',
  'credential-access',
  'discovery',
  'lateral-movement',
  'collection',
  'command-and-control',
  'exfiltration',
  'impact',
];

// GET /api/attack
router.get('/', async (req, res) => {
  try {
    const { tactic, platform, q } = req.query;

    let query = db('attack_techniques');

    if (tactic) {
      query = query.where('tactic', 'ilike', `%${tactic}%`);
    }
    if (platform) {
      query = query.whereRaw('? = ANY(platform)', [platform]);
    }
    if (q) {
      const search = String(q).slice(0, 200);
      query = query.where((b) =>
        b.where('technique_id', 'ilike', `%${search}%`)
          .orWhere('name', 'ilike', `%${search}%`)
          .orWhere('description', 'ilike', `%${search}%`)
      );
    }

    const rows = await query
      .select('id', 'technique_id', 'name', 'description', 'tactic', 'platform', 'data_sources', 'url')
      .orderBy('technique_id');

    // Group by tactic, maintaining standard order
    const grouped = {};
    for (const tacticName of TACTIC_ORDER) {
      grouped[tacticName] = [];
    }

    for (const row of rows) {
      const tactics = row.tactic.split(', ');
      for (const t of tactics) {
        const key = t.trim();
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(row);
      }
    }

    // Remove empty tactics
    for (const key of Object.keys(grouped)) {
      if (grouped[key].length === 0) delete grouped[key];
    }

    res.json(grouped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch ATT&CK techniques' });
  }
});

module.exports = router;
