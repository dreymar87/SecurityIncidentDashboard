'use strict';
const nodemailer = require('nodemailer');
const { axiosWithRetry } = require('../utils/httpClient');
const db = require('../db');
const logger = require('../utils/logger');

const SEVERITY_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'ALL'];

function severityAtOrAbove(channelThreshold, alertSeverity) {
  if (channelThreshold === 'ALL') return true;
  const channelIdx = SEVERITY_ORDER.indexOf(channelThreshold);
  const alertIdx = SEVERITY_ORDER.indexOf(alertSeverity);
  if (channelIdx === -1 || alertIdx === -1) return false;
  return alertIdx <= channelIdx; // lower index = higher severity
}

async function sendSlack(config, alert) {
  const { webhook_url } = config;
  if (!webhook_url) throw new Error('Slack webhook_url missing');
  const color = alert.severity === 'CRITICAL' ? '#d9534f' : alert.severity === 'HIGH' ? '#f0ad4e' : '#5bc0de';
  const payload = {
    attachments: [{
      color,
      title: alert.title,
      text: alert.message || '',
      fields: [
        { title: 'Severity', value: alert.severity || 'UNKNOWN', short: true },
        { title: 'Type', value: alert.type || '', short: true },
      ],
      footer: 'SecureSight',
      ts: Math.floor(Date.now() / 1000),
    }],
  };
  await axiosWithRetry({ method: 'post', url: webhook_url, data: payload, timeout: 10000 });
}

async function sendTeams(config, alert) {
  const { webhook_url } = config;
  if (!webhook_url) throw new Error('Teams webhook_url missing');
  const themeColor = alert.severity === 'CRITICAL' ? 'D9534F' : alert.severity === 'HIGH' ? 'F0AD4E' : '5BC0DE';
  const payload = {
    '@type': 'MessageCard',
    '@context': 'http://schema.org/extensions',
    themeColor,
    summary: alert.title,
    sections: [{
      activityTitle: alert.title,
      activityText: alert.message || '',
      facts: [
        { name: 'Severity', value: alert.severity || 'UNKNOWN' },
        { name: 'Type', value: alert.type || '' },
      ],
    }],
  };
  await axiosWithRetry({ method: 'post', url: webhook_url, data: payload, timeout: 10000 });
}

async function sendPagerDuty(config, alert) {
  const { routing_key } = config;
  if (!routing_key) throw new Error('PagerDuty routing_key missing');
  const payload = {
    routing_key,
    event_action: 'trigger',
    payload: {
      summary: alert.title,
      source: 'SecureSight',
      severity: (alert.severity || 'critical').toLowerCase(),
      custom_details: { message: alert.message || '', type: alert.type || '' },
    },
    dedup_key: alert.reference_id || `securesight-${alert.id}`,
  };
  await axiosWithRetry({
    method: 'post',
    url: 'https://events.pagerduty.com/v2/enqueue',
    data: payload,
    timeout: 10000,
  });
}

async function sendSmtp(config, alert) {
  const { host, port, user, pass, from, to } = config;
  if (!host || !to) throw new Error('SMTP host and to address are required');
  const transporter = nodemailer.createTransport({
    host,
    port: port || 587,
    secure: (port || 587) === 465,
    auth: user ? { user, pass: pass || '' } : undefined,
  });
  await transporter.sendMail({
    from: from || user || 'securesight@localhost',
    to,
    subject: `[SecureSight] ${alert.severity || 'ALERT'}: ${alert.title}`,
    text: [
      `Severity: ${alert.severity || 'UNKNOWN'}`,
      `Type: ${alert.type || ''}`,
      ``,
      alert.message || '',
    ].join('\n'),
  });
}

async function dispatchToChannel(channel, alert) {
  const config = typeof channel.config === 'string' ? JSON.parse(channel.config) : channel.config;
  switch (channel.type) {
    case 'slack': return sendSlack(config, alert);
    case 'teams': return sendTeams(config, alert);
    case 'pagerduty': return sendPagerDuty(config, alert);
    case 'smtp': return sendSmtp(config, alert);
    default: throw new Error(`Unknown channel type: ${channel.type}`);
  }
}

async function dispatchAlerts(newAlerts) {
  if (!newAlerts || newAlerts.length === 0) return;

  let channels;
  try {
    channels = await db('notification_channels').where('enabled', true);
  } catch (err) {
    logger.error({ err }, '[Notifications] Failed to load channels');
    return;
  }

  if (!channels || channels.length === 0) return;

  for (const alert of newAlerts) {
    const eligible = channels.filter((ch) => severityAtOrAbove(ch.severity_threshold, alert.severity));
    await Promise.all(
      eligible.map((ch) =>
        dispatchToChannel(ch, alert).catch((err) =>
          logger.error({ err, channel: ch.name, channelType: ch.type }, '[Notifications] Dispatch failed')
        )
      )
    );
  }
}

async function sendTestNotification(channel) {
  const testAlert = {
    id: 0,
    type: 'test',
    title: 'SecureSight Test Notification',
    message: 'This is a test notification from SecureSight. If you received this, your channel is configured correctly.',
    severity: 'CRITICAL',
    reference_id: 'TEST-0',
  };
  await dispatchToChannel(channel, testAlert);
}

module.exports = { dispatchAlerts, sendTestNotification };
