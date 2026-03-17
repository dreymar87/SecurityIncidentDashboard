'use strict';
const express = require('express');
const router = express.Router();
const passport = require('passport');
const { generateSecret: totpGenerateSecret, generateURI: totpGenerateURI, verify: totpVerify } = require('otplib');
const QRCode = require('qrcode');
const db = require('../db');
const logger = require('../utils/logger');
const { requireAuth, encryptTotpSecret, decryptTotpSecret } = require('../utils/auth');
const { generateAlerts } = require('../utils/alertGenerator');
const { logAudit } = require('../utils/auditLog');

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

    // Credentials valid — check MFA status
    req.logIn(user, async (loginErr) => {
      if (loginErr) return next(loginErr);

      try {
        const fullUser = await db('users')
          .where('id', user.id)
          .select('totp_enabled', 'mfa_required')
          .first();

        // Record session in active_sessions
        await db('active_sessions').insert({
          session_id: req.session.id,
          user_id: user.id,
          ip_address: ip,
          user_agent: req.headers['user-agent'] || null,
        }).onConflict('session_id').ignore();

        if (fullUser.totp_enabled) {
          // MFA enrolled: challenge required
          req.session.mfa_pending = { userId: user.id };
          return res.status(202).json({ mfa_required: true, enrolled: true });
        }

        if (fullUser.mfa_required && !fullUser.totp_enabled) {
          // MFA required by admin but not yet enrolled
          req.session.mfa_pending = { userId: user.id, requiresEnrollment: true };
          return res.status(202).json({ mfa_required: true, enrolled: false });
        }

        // No MFA — fully authenticated
        res.json({ id: user.id, username: user.username, role: user.role });
      } catch (mfaErr) {
        logger.error({ mfaErr }, 'Failed to check MFA status after login');
        res.json({ id: user.id, username: user.username, role: user.role });
      }
    });
  })(req, res, next);
});

// POST /auth/logout
router.post('/logout', async (req, res) => {
  try {
    if (req.session?.id) {
      await db('active_sessions').where('session_id', req.session.id).del();
    }
  } catch (err) {
    logger.error({ err }, 'Failed to delete active session on logout');
  }
  req.logout((err) => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    res.json({ message: 'Logged out' });
  });
});

// GET /auth/me
router.get('/me', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
  if (req.session.mfa_pending) return res.status(401).json({ error: 'MFA verification required', mfa_pending: true });
  try {
    const user = await db('users').where('id', req.user.id).select('totp_enabled', 'mfa_required').first();
    res.json({ id: req.user.id, username: req.user.username, role: req.user.role, totp_enabled: user?.totp_enabled ?? false, mfa_required: user?.mfa_required ?? false });
  } catch (err) {
    logger.error({ err }, 'Failed to fetch user MFA state in /auth/me');
    res.json({ id: req.user.id, username: req.user.username, role: req.user.role, totp_enabled: false, mfa_required: false });
  }
});

// ── MFA endpoints ─────────────────────────────────────────────────────────────

// POST /auth/mfa/challenge — complete MFA login (user already passed password, session has mfa_pending)
router.post('/mfa/challenge', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Authentication required' });
  if (!req.session.mfa_pending) return res.status(400).json({ error: 'No MFA challenge in progress' });

  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'TOTP token is required' });

  try {
    const user = await db('users')
      .where('id', req.session.mfa_pending.userId)
      .select('id', 'username', 'role', 'totp_secret', 'totp_enabled')
      .first();

    if (!user || !user.totp_enabled || !user.totp_secret) {
      return res.status(400).json({ error: 'MFA not configured for this account' });
    }

    const secret = decryptTotpSecret(user.totp_secret);
    const { valid: isValid } = await totpVerify({ token, secret, algorithm: 'SHA1', digits: 6, period: 30 });

    if (!isValid) {
      // Track MFA failures in failed_login_attempts table using prefixed username
      const ip = req.ip || req.connection?.remoteAddress || 'unknown';
      await db('failed_login_attempts').insert({
        username: `mfa:${user.username}`,
        ip_address: ip,
      }).catch(() => {});
      return res.status(401).json({ error: 'Invalid MFA code' });
    }

    // MFA verified — clear pending flag
    delete req.session.mfa_pending;
    req.session.save((err) => {
      if (err) logger.error({ err }, 'Failed to save session after MFA challenge');
    });

    // Update last_activity on the session record
    db('active_sessions')
      .where('session_id', req.session.id)
      .update({ last_activity: new Date() })
      .catch(() => {});

    res.json({ id: user.id, username: user.username, role: user.role });
  } catch (err) {
    logger.error({ err }, 'MFA challenge failed');
    res.status(500).json({ error: 'MFA verification failed' });
  }
});

// POST /auth/mfa/enroll — generate TOTP secret and QR code for enrollment
// Note: intentionally allows mfa_pending sessions so enrollment works during the login flow
router.post('/mfa/enroll', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Authentication required' });

  try {
    const user = await db('users').where('id', req.user.id).select('username').first();
    const secret = totpGenerateSecret();
    const otpauthUrl = totpGenerateURI({ secret, label: user.username, issuer: 'SecurityDashboard', algorithm: 'SHA1', digits: 6, period: 30 });
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    // Store encrypted secret (not yet enabled — enabled after verify)
    const encryptedSecret = encryptTotpSecret(secret);
    await db('users').where('id', req.user.id).update({ totp_secret: encryptedSecret });

    res.json({ otpauth_url: otpauthUrl, qr_code_data_url: qrCodeDataUrl });
  } catch (err) {
    logger.error({ err }, 'MFA enrollment failed');
    res.status(500).json({ error: 'Failed to generate MFA enrollment' });
  }
});

// POST /auth/mfa/verify — confirm enrollment by verifying the first TOTP code
// Note: intentionally allows mfa_pending sessions so verify works during the login enrollment flow
router.post('/mfa/verify', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Authentication required' });

  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'TOTP token is required' });

  try {
    const user = await db('users')
      .where('id', req.user.id)
      .select('totp_secret', 'username')
      .first();

    if (!user?.totp_secret) {
      return res.status(400).json({ error: 'No pending MFA enrollment found. Start enrollment first.' });
    }

    const secret = decryptTotpSecret(user.totp_secret);
    const { valid: isValid } = await totpVerify({ token, secret, algorithm: 'SHA1', digits: 6, period: 30 });

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid TOTP code. Please try again.' });
    }

    // Enable MFA for the user
    await db('users').where('id', req.user.id).update({ totp_enabled: true });
    await logAudit({ req, action: 'mfa_enroll', resourceType: 'user', resourceId: String(req.user.id), details: { username: user.username } });

    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'MFA verify failed');
    res.status(500).json({ error: 'MFA verification failed' });
  }
});

// POST /auth/mfa/disable — disable MFA for the current user
router.post('/mfa/disable', requireAuth, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });

  try {
    const user = await db('users').where('id', req.user.id).select('username').first();
    await db('users').where('id', req.user.id).update({ totp_secret: null, totp_enabled: false });
    await logAudit({ req, action: 'mfa_disable', resourceType: 'user', resourceId: String(req.user.id), details: { username: user.username } });

    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'MFA disable failed');
    res.status(500).json({ error: 'Failed to disable MFA' });
  }
});

module.exports = router;
