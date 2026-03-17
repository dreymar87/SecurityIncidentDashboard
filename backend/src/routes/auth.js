'use strict';
const express = require('express');
const router = express.Router();
const passport = require('passport');
const db = require('../db');
const logger = require('../utils/logger');
const { generateAlerts } = require('../utils/alertGenerator');

// POST /auth/login
router.post('/login', (req, res, next) => {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const username = req.body?.username || '';

  passport.authenticate('local', async (err, user, info) => {
    if (err) return next(err);

    if (!user) {
      // Record failed login attempt and potentially fire an alert
      try {
        await db('failed_login_attempts').insert({ username, ip_address: ip });

        // Load threshold config
        const row = await db('app_settings').where('key', 'failed_login_threshold').first();
        const { attempts: threshold = 5, window_minutes: windowMins = 15 } =
          row ? (typeof row.value === 'string' ? JSON.parse(row.value) : row.value) : {};

        const windowStart = new Date(Date.now() - windowMins * 60 * 1000);
        const [{ count: usernameCount }] = await db('failed_login_attempts')
          .where('username', username)
          .where('attempted_at', '>=', windowStart)
          .count('id as count');

        const [{ count: ipCount }] = await db('failed_login_attempts')
          .where('ip_address', ip)
          .where('attempted_at', '>=', windowStart)
          .count('id as count');

        const maxCount = Math.max(parseInt(usernameCount), parseInt(ipCount));

        if (maxCount >= threshold) {
          // Only generate alert if one doesn't already exist for this username/IP within the window
          const existingAlert = await db('alerts')
            .where('type', 'failed_login')
            .where('reference_id', `failed_login:${username}:${ip}`)
            .where('created_at', '>=', windowStart)
            .first();

          if (!existingAlert) {
            await generateAlerts('auth', [{
              type: 'failed_login',
              title: `Brute-force detected: ${maxCount} failed logins for "${username || 'unknown'}" from ${ip}`,
              description: `${maxCount} failed login attempts within ${windowMins} minutes.`,
              severity: 'HIGH',
              cve_id: null,
              cisa_kev: false,
              reference_id: `failed_login:${username}:${ip}`,
            }]);
          }
        }
      } catch (trackErr) {
        logger.error({ trackErr }, 'Failed to track login attempt');
      }

      return res.status(401).json({ error: info?.message || 'Invalid credentials' });
    }

    req.logIn(user, (loginErr) => {
      if (loginErr) return next(loginErr);
      res.json({ id: user.id, username: user.username, role: user.role });
    });
  })(req, res, next);
});

// POST /auth/logout
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    res.json({ message: 'Logged out' });
  });
});

// GET /auth/me
router.get('/me', (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
  res.json({ id: req.user.id, username: req.user.username, role: req.user.role });
});

module.exports = router;
