'use strict';
const passport = require('passport');
const { Strategy: LocalStrategy } = require('passport-local');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../db');
const logger = require('./logger');

// ── TOTP secret encryption ────────────────────────────────────────────────────
// Encrypts TOTP secrets at rest using AES-256-GCM.
// Key: TOTP_ENCRYPTION_KEY env var (32-byte hex, 64 chars).
// If unset, secrets are stored unencrypted (dev only).

const ENCRYPTION_KEY_HEX = process.env.TOTP_ENCRYPTION_KEY;
const ENCRYPTION_KEY = ENCRYPTION_KEY_HEX ? Buffer.from(ENCRYPTION_KEY_HEX, 'hex') : null;

if (!ENCRYPTION_KEY) {
  logger.warn('[Auth] TOTP_ENCRYPTION_KEY not set — TOTP secrets stored unencrypted. Set this in production.');
}

/**
 * Encrypt a TOTP secret string for storage.
 * Stored format: base64(iv):base64(authTag):base64(ciphertext)
 */
function encryptTotpSecret(plaintext) {
  if (!ENCRYPTION_KEY) return plaintext; // unencrypted fallback
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

/**
 * Decrypt a stored TOTP secret.
 */
function decryptTotpSecret(stored) {
  if (!ENCRYPTION_KEY) return stored; // unencrypted fallback
  const parts = stored.split(':');
  if (parts.length !== 3) return stored; // not encrypted format, return as-is
  const [ivB64, authTagB64, ciphertextB64] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  const ciphertext = Buffer.from(ciphertextB64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(ciphertext) + decipher.final('utf8');
}

// ── Passport local strategy ───────────────────────────────────────────────────

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

// ── API key middleware ────────────────────────────────────────────────────────
// Checks for X-API-Key header and populates req.user if valid.
// Runs before requireAuth; never blocks (always calls next).

async function apiKeyMiddleware(req, res, next) {
  const rawKey = req.headers['x-api-key'];
  if (!rawKey) return next();

  try {
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const row = await db('api_keys')
      .join('users', 'users.id', 'api_keys.user_id')
      .where('api_keys.key_hash', keyHash)
      .where('api_keys.active', true)
      .select('users.id', 'users.username', 'users.role', 'api_keys.id as key_id')
      .first();

    if (!row) return res.status(401).json({ error: 'Invalid API key' });

    req.user = { id: row.id, username: row.username, role: row.role };
    req.apiKeyAuthenticated = true;
    // Update last_used_at fire-and-forget
    db('api_keys').where('id', row.key_id).update({ last_used_at: new Date() }).catch(() => {});
  } catch (err) {
    logger.error({ err }, 'API key middleware error');
  }

  next();
}

// ── requireAuth / requireAdmin ────────────────────────────────────────────────

function requireAuth(req, res, next) {
  if (!process.env.ENABLE_AUTH || process.env.ENABLE_AUTH !== 'true') return next();
  // API key authentication bypasses session/MFA checks
  if (req.apiKeyAuthenticated) return next();
  // Session is authenticated but MFA challenge is still pending
  if (req.isAuthenticated() && req.session.mfa_pending) {
    return res.status(401).json({ error: 'MFA verification required' });
  }
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Authentication required' });
}

function requireAdmin(req, res, next) {
  if (!process.env.ENABLE_AUTH || process.env.ENABLE_AUTH !== 'true') return next();
  if (req.apiKeyAuthenticated) {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    return next();
  }
  if (!req.isAuthenticated() || req.session.mfa_pending) return res.status(401).json({ error: 'Authentication required' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
}

module.exports = { passport, requireAuth, requireAdmin, apiKeyMiddleware, encryptTotpSecret, decryptTotpSecret };
