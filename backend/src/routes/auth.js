'use strict';
const express = require('express');
const router = express.Router();
const passport = require('passport');

// POST /auth/login
router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ error: info?.message || 'Invalid credentials' });
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
