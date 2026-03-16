'use strict';
const passport = require('passport');
const { Strategy: LocalStrategy } = require('passport-local');
const bcrypt = require('bcryptjs');
const db = require('../db');

passport.use(new LocalStrategy(async (username, password, done) => {
  try {
    const user = await db('users').where('username', username).first();
    if (!user) return done(null, false, { message: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return done(null, false, { message: 'Invalid credentials' });
    return done(null, { id: user.id, username: user.username, role: user.role });
  } catch (err) {
    return done(err);
  }
}));

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id, done) => {
  try {
    const user = await db('users').where('id', id).select('id', 'username', 'role').first();
    done(null, user || false);
  } catch (err) {
    done(err);
  }
});

function requireAuth(req, res, next) {
  if (!process.env.ENABLE_AUTH || process.env.ENABLE_AUTH !== 'true') return next();
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Authentication required' });
}

module.exports = { passport, requireAuth };
