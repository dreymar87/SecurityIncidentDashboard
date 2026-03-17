import { useState } from 'react';
import { TopBar } from '../components/layout/TopBar';
import { useSettings, useCurrentUser, useUserPreferences, useUpdatePreferences, useAuditLog, useChangePassword, useUpdateProfile, useRiskWeights, useUpdateRiskWeights, useNotificationChannels, useCreateNotificationChannel, useUpdateNotificationChannel, useDeleteNotificationChannel, useTestNotificationChannel, useMfaEnroll, useMfaVerify, useMfaDisable, useApiKeys, useCreateApiKey, useRevokeApiKey, useActiveSessions, useRevokeSession } from '../api/hooks';
import { NotificationChannel, ApiKeyCreated } from '../api/client';
import { api } from '../api/client';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw, CheckCircle, XCircle, Clock, Key, Bell, ChevronLeft, ChevronRight, User, Lock, BarChart2, Plus, Trash2, Send, Webhook, Shield, QrCode, Monitor, Copy, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const SOURCE_LABELS: Record<string, string> = {
  nvd: 'NVD (National Vulnerability Database)',
  cisa: 'CISA Known Exploited Vulnerabilities',
  hibp: 'Have I Been Pwned',
  greynoise: 'GreyNoise Threat Intelligence',
  osv: 'OSV (Open Source Vulnerabilities)',
  ghsa: 'GitHub Security Advisories',
  exploitdb: 'Exploit-DB',
  mitre: 'MITRE ATT&CK',
};

const KEY_LABELS: Record<string, string> = {
  NVD_API_KEY: 'NVD API Key',
  HIBP_API_KEY: 'HIBP API Key',
  GREYNOISE_API_KEY: 'GreyNoise API Key',
  GITHUB_TOKEN: 'GitHub Token',
};

const SEVERITY_OPTIONS = [
  { value: 'CRITICAL', label: 'Critical only', description: 'Only critical severity alerts' },
  { value: 'HIGH', label: 'High and above', description: 'Critical + High severity alerts' },
  { value: 'MEDIUM', label: 'Medium and above', description: 'Critical + High + Medium alerts' },
  { value: 'LOW', label: 'Low and above', description: 'All severity levels except informational' },
  { value: 'ALL', label: 'All alerts', description: 'Receive all alerts regardless of severity' },
];

const ACTION_LABELS: Record<string, string> = {
  sync_trigger: 'Sync Triggered',
  import_upload: 'File Imported',
  user_create: 'User Created',
  user_delete: 'User Deleted',
  password_reset: 'Password Reset',
  role_change: 'Role Changed',
};

interface PageProps {
  onMobileMenuToggle?: () => void;
  isMobile?: boolean;
}

export function Settings({ onMobileMenuToggle, isMobile }: PageProps) {
  const { data: settings, isLoading } = useSettings();
  const { data: currentUser } = useCurrentUser();
  const { data: preferences } = useUserPreferences();
  const updatePreferences = useUpdatePreferences();
  const changePassword = useChangePassword();
  const updateProfile = useUpdateProfile();
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});
  const [auditPage, setAuditPage] = useState(1);
  const { data: auditLog } = useAuditLog(auditPage);

  const [profileEmail, setProfileEmail] = useState('');
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { data: riskWeights } = useRiskWeights();
  const updateRiskWeights = useUpdateRiskWeights();
  const [riskForm, setRiskForm] = useState<{ cvss: string; exploit: string; kev: string } | null>(null);
  const [riskMsg, setRiskMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // MFA state
  const mfaEnroll = useMfaEnroll();
  const mfaVerify = useMfaVerify();
  const mfaDisable = useMfaDisable();
  const [mfaStep, setMfaStep] = useState<'idle' | 'enrolling' | 'verifying'>('idle');
  const [mfaEnrollData, setMfaEnrollData] = useState<{ qr_code_data_url: string; otpauth_url: string } | null>(null);
  const [mfaToken, setMfaToken] = useState('');
  const [mfaMsg, setMfaMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // API keys state
  const { data: apiKeys } = useApiKeys();
  const createApiKey = useCreateApiKey();
  const revokeApiKey = useRevokeApiKey();
  const [newKeyName, setNewKeyName] = useState('');
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<ApiKeyCreated | null>(null);
  const [keyMsg, setKeyMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sessions state
  const { data: activeSessions } = useActiveSessions();
  const revokeSession = useRevokeSession();

  // Notification channels
  const { data: channels } = useNotificationChannels();
  const createChannel = useCreateNotificationChannel();
  const updateChannel = useUpdateNotificationChannel();
  const deleteChannel = useDeleteNotificationChannel();
  const testChannel = useTestNotificationChannel();
  const [showChannelForm, setShowChannelForm] = useState(false);
  const [channelForm, setChannelForm] = useState<{
    name: string; type: NotificationChannel['type']; enabled: boolean;
    severity_threshold: NotificationChannel['severity_threshold'];
    webhook_url: string; routing_key: string;
    smtp_host: string; smtp_port: string; smtp_user: string; smtp_pass: string; smtp_from: string; smtp_to: string;
  }>({ name: '', type: 'slack', enabled: true, severity_threshold: 'CRITICAL', webhook_url: '', routing_key: '', smtp_host: '', smtp_port: '587', smtp_user: '', smtp_pass: '', smtp_from: '', smtp_to: '' });
  const [channelMsg, setChannelMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [testMsg, setTestMsg] = useState<Record<number, { type: 'success' | 'error'; text: string }>>({});

  const activeRisk = riskForm ?? {
    cvss: String(riskWeights?.cvss ?? 0.6),
    exploit: String(riskWeights?.exploit ?? 0.25),
    kev: String(riskWeights?.kev ?? 0.15),
  };
  const riskSum = (parseFloat(activeRisk.cvss) || 0) + (parseFloat(activeRisk.exploit) || 0) + (parseFloat(activeRisk.kev) || 0);
  const riskSumOk = Math.abs(riskSum - 1.0) <= 0.01;

  const isAdmin = currentUser?.role === 'admin';

  async function triggerSync(source: string) {
    setSyncing((s) => ({ ...s, [source]: true }));
    try {
      await api.post(`/sync/trigger/${source}`);
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['settings'] });
        setSyncing((s) => ({ ...s, [source]: false }));
      }, 3000);
    } catch {
      setSyncing((s) => ({ ...s, [source]: false }));
    }
  }

  function handleThresholdChange(value: string) {
    updatePreferences.mutate({ alertThreshold: value as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'ALL' });
  }

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileMsg(null);
    try {
      await updateProfile.mutateAsync({ email: profileEmail });
      setProfileMsg({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to update profile';
      setProfileMsg({ type: 'error', text: msg });
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    try {
      await changePassword.mutateAsync({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setPwMsg({ type: 'success', text: 'Password changed successfully.' });
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to change password';
      setPwMsg({ type: 'error', text: msg });
    }
  }

  async function handleChannelSubmit(e: React.FormEvent) {
    e.preventDefault();
    setChannelMsg(null);
    const config: Record<string, string> = {};
    if (channelForm.type === 'slack' || channelForm.type === 'teams') {
      config.webhook_url = channelForm.webhook_url;
    } else if (channelForm.type === 'pagerduty') {
      config.routing_key = channelForm.routing_key;
    } else if (channelForm.type === 'smtp') {
      config.host = channelForm.smtp_host;
      config.port = channelForm.smtp_port;
      config.user = channelForm.smtp_user;
      config.pass = channelForm.smtp_pass;
      config.from = channelForm.smtp_from;
      config.to = channelForm.smtp_to;
    }
    try {
      await createChannel.mutateAsync({ name: channelForm.name, type: channelForm.type, config, enabled: channelForm.enabled, severity_threshold: channelForm.severity_threshold });
      setChannelMsg({ type: 'success', text: 'Channel created successfully.' });
      setShowChannelForm(false);
      setChannelForm({ name: '', type: 'slack', enabled: true, severity_threshold: 'CRITICAL', webhook_url: '', routing_key: '', smtp_host: '', smtp_port: '587', smtp_user: '', smtp_pass: '', smtp_from: '', smtp_to: '' });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to create channel';
      setChannelMsg({ type: 'error', text: msg });
    }
  }

  async function handleToggleChannel(id: number, enabled: boolean) {
    await updateChannel.mutateAsync({ id, enabled });
  }

  async function handleDeleteChannel(id: number) {
    if (!confirm('Delete this notification channel?')) return;
    await deleteChannel.mutateAsync(id);
  }

  async function handleTestChannel(id: number) {
    setTestingId(id);
    setTestMsg((m) => ({ ...m, [id]: { type: 'success', text: 'Sending...' } }));
    try {
      await testChannel.mutateAsync(id);
      setTestMsg((m) => ({ ...m, [id]: { type: 'success', text: 'Test sent!' } }));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Test failed';
      setTestMsg((m) => ({ ...m, [id]: { type: 'error', text: msg } }));
    } finally {
      setTestingId(null);
    }
  }

  async function handleRiskWeightsSave(e: React.FormEvent) {
    e.preventDefault();
    setRiskMsg(null);
    const weights = {
      cvss: parseFloat(activeRisk.cvss),
      exploit: parseFloat(activeRisk.exploit),
      kev: parseFloat(activeRisk.kev),
    };
    try {
      await updateRiskWeights.mutateAsync(weights);
      setRiskMsg({ type: 'success', text: 'Risk weights saved. Recalculating scores in background.' });
      setRiskForm(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to save risk weights';
      setRiskMsg({ type: 'error', text: msg });
    }
  }

  async function handleMfaStartEnroll() {
    setMfaMsg(null);
    try {
      const enrollment = await mfaEnroll.mutateAsync();
      setMfaEnrollData(enrollment);
      setMfaStep('enrolling');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to start enrollment';
      setMfaMsg({ type: 'error', text: msg });
    }
  }

  async function handleMfaVerify(e: React.FormEvent) {
    e.preventDefault();
    setMfaMsg(null);
    try {
      await mfaVerify.mutateAsync({ token: mfaToken });
      setMfaMsg({ type: 'success', text: 'Two-factor authentication enabled successfully.' });
      setMfaStep('idle');
      setMfaToken('');
      setMfaEnrollData(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Invalid code';
      setMfaMsg({ type: 'error', text: msg });
      setMfaToken('');
    }
  }

  async function handleMfaDisable() {
    if (!confirm('Disable two-factor authentication? You can re-enroll at any time.')) return;
    setMfaMsg(null);
    try {
      await mfaDisable.mutateAsync();
      setMfaMsg({ type: 'success', text: 'Two-factor authentication disabled.' });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to disable MFA';
      setMfaMsg({ type: 'error', text: msg });
    }
  }

  async function handleCreateApiKey(e: React.FormEvent) {
    e.preventDefault();
    setKeyMsg(null);
    try {
      const created = await createApiKey.mutateAsync({ name: newKeyName });
      setNewlyCreatedKey(created);
      setNewKeyName('');
      setShowKeyForm(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to create API key';
      setKeyMsg({ type: 'error', text: msg });
    }
  }

  function parseUserAgent(ua: string | null): string {
    if (!ua) return 'Unknown browser';
    if (ua.includes('curl')) return 'API / curl';
    if (ua.includes('python')) return 'Python script';
    const browser = ua.includes('Edg') ? 'Edge'
      : ua.includes('Chrome') ? 'Chrome'
      : ua.includes('Firefox') ? 'Firefox'
      : ua.includes('Safari') ? 'Safari'
      : 'Browser';
    const os = ua.includes('Windows') ? 'Windows'
      : ua.includes('Mac') ? 'macOS'
      : ua.includes('Linux') ? 'Linux'
      : ua.includes('Android') ? 'Android'
      : ua.includes('iPhone') || ua.includes('iPad') ? 'iOS'
      : null;
    return os ? `${browser} on ${os}` : browser;
  }

  return (
    <>
      <TopBar title="Settings" onMobileMenuToggle={onMobileMenuToggle} isMobile={isMobile} />
      <div className="p-6 space-y-6 max-w-4xl">
        {/* Sync Sources */}
        <div>
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text-muted)' }}>Data Sources</h3>
          <div className="grid gap-3">
            {isLoading ? (
              <div className="card animate-pulse h-20" />
            ) : (
              Object.keys(SOURCE_LABELS).map((source) => {
                const info = settings?.sources.find((s) => s.name === source);
                return (
                  <div key={source} className="card flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      {info?.status === 'success' ? (
                        <CheckCircle size={16} className="text-green-400 shrink-0" />
                      ) : info?.status === 'error' ? (
                        <XCircle size={16} className="text-red-400 shrink-0" />
                      ) : (
                        <Clock size={16} className="shrink-0" style={{ color: 'var(--color-text-faint)' }} />
                      )}
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                          {SOURCE_LABELS[source]}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--color-text-faint)' }}>
                          {info
                            ? `Last sync ${formatDistanceToNow(new Date(info.lastSync), { addSuffix: true })} — ${info.recordsSynced} records`
                            : 'Never synced'}
                          {info?.status === 'error' && info.errorMessage && (
                            <span className="text-red-400 ml-2">Error: {info.errorMessage}</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => triggerSync(source)}
                      disabled={syncing[source]}
                      className="btn-secondary text-xs py-1.5 flex items-center gap-1.5"
                    >
                      <RefreshCw size={12} className={syncing[source] ? 'animate-spin' : ''} />
                      Sync
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* API Keys */}
        <div>
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text-muted)' }}>API Keys</h3>
          <div className="card">
            <div className="grid gap-3">
              {settings?.keys && Object.entries(settings.keys).map(([key, configured]) => (
                <div key={key} className="flex items-center justify-between py-2 border-b last:border-b-0" style={{ borderColor: 'var(--color-border)' }}>
                  <div className="flex items-center gap-3">
                    <Key size={14} style={{ color: 'var(--color-text-faint)' }} />
                    <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      {KEY_LABELS[key] || key}
                    </span>
                  </div>
                  <span className={`text-xs font-medium ${configured ? 'text-green-400' : 'text-red-400'}`}>
                    {configured ? 'Configured' : 'Not set'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Alert Preferences */}
        {currentUser && (
          <div>
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
              <Bell size={14} />
              Alert Preferences
            </h3>
            <div className="card p-4">
              <p className="text-xs mb-3" style={{ color: 'var(--color-text-faint)' }}>
                Choose the minimum severity level for alerts shown in your notification bell.
              </p>
              <div className="grid gap-2">
                {SEVERITY_OPTIONS.map(({ value, label, description }) => (
                  <label
                    key={value}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      preferences?.alertThreshold === value
                        ? 'border-sky-500/50 bg-sky-500/5'
                        : 'hover:bg-gray-800/50'
                    }`}
                    style={{ borderColor: preferences?.alertThreshold === value ? undefined : 'var(--color-border)' }}
                  >
                    <input
                      type="radio"
                      name="alertThreshold"
                      value={value}
                      checked={preferences?.alertThreshold === value}
                      onChange={() => handleThresholdChange(value)}
                      className="accent-sky-500"
                    />
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{label}</p>
                      <p className="text-xs" style={{ color: 'var(--color-text-faint)' }}>{description}</p>
                    </div>
                  </label>
                ))}
              </div>
              {updatePreferences.isPending && (
                <p className="text-xs text-sky-400 mt-2">Saving...</p>
              )}
            </div>
          </div>
        )}

        {/* Profile */}
        {currentUser && (
          <div>
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
              <User size={14} />
              Profile
            </h3>
            <div className="card p-4">
              {profileMsg && (
                <div className={`mb-3 text-xs px-3 py-2 rounded-lg border ${profileMsg.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                  {profileMsg.text}
                </div>
              )}
              <form onSubmit={handleProfileSave} className="flex flex-col gap-3">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Username</label>
                  <input className="input w-full text-sm" value={currentUser.username} disabled />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Email address</label>
                  <input
                    type="email"
                    className="input w-full text-sm"
                    placeholder="your@email.com"
                    value={profileEmail || currentUser.email || ''}
                    onChange={(e) => setProfileEmail(e.target.value)}
                  />
                </div>
                <button type="submit" disabled={updateProfile.isPending} className="btn-primary text-xs py-1.5 self-start">
                  {updateProfile.isPending ? 'Saving...' : 'Save Profile'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Change Password */}
        {currentUser && (
          <div>
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
              <Lock size={14} />
              Change Password
            </h3>
            <div className="card p-4">
              {pwMsg && (
                <div className={`mb-3 text-xs px-3 py-2 rounded-lg border ${pwMsg.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                  {pwMsg.text}
                </div>
              )}
              <form onSubmit={handlePasswordChange} className="flex flex-col gap-3">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Current password</label>
                  <input
                    type="password"
                    className="input w-full text-sm"
                    value={pwForm.currentPassword}
                    onChange={(e) => setPwForm((f) => ({ ...f, currentPassword: e.target.value }))}
                    required
                    autoComplete="current-password"
                  />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>New password</label>
                  <input
                    type="password"
                    className="input w-full text-sm"
                    placeholder="Min 8 chars, include a number or symbol"
                    value={pwForm.newPassword}
                    onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))}
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Confirm new password</label>
                  <input
                    type="password"
                    className="input w-full text-sm"
                    value={pwForm.confirmPassword}
                    onChange={(e) => setPwForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>
                <button type="submit" disabled={changePassword.isPending} className="btn-primary text-xs py-1.5 self-start">
                  {changePassword.isPending ? 'Changing...' : 'Change Password'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Two-Factor Authentication */}
        {currentUser && (
          <div id="two-factor">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
              <Shield size={14} />
              Two-Factor Authentication
            </h3>
            <div className="card p-4 space-y-3">
              {mfaMsg && (
                <div className={`text-xs px-3 py-2 rounded-lg border ${mfaMsg.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                  {mfaMsg.text}
                </div>
              )}

              {mfaStep === 'idle' && (
                <>
                  {currentUser?.totp_enabled ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                          Two-factor authentication is <span className="text-green-400">active</span>
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-faint)' }}>
                          Your account is protected with an authenticator app.
                        </p>
                      </div>
                      <button onClick={handleMfaDisable} disabled={mfaDisable.isPending} className="btn-secondary text-xs py-1.5 text-red-400 hover:text-red-300">
                        {mfaDisable.isPending ? 'Disabling…' : 'Disable'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                          Two-factor authentication is <span style={{ color: 'var(--color-text-faint)' }}>not enabled</span>
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-faint)' }}>
                          Add an extra layer of security with an authenticator app.
                        </p>
                      </div>
                      <button onClick={handleMfaStartEnroll} disabled={mfaEnroll.isPending} className="btn-primary text-xs py-1.5">
                        {mfaEnroll.isPending ? 'Starting…' : 'Enable 2FA'}
                      </button>
                    </div>
                  )}
                </>
              )}

              {mfaStep === 'enrolling' && mfaEnrollData && (
                <div className="space-y-3">
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.), then enter the 6-digit code to confirm.
                  </p>
                  <div className="flex flex-col items-center gap-3">
                    <div className="bg-white p-2 rounded-lg">
                      <img src={mfaEnrollData.qr_code_data_url} alt="TOTP QR Code" className="w-36 h-36" />
                    </div>
                    <details className="w-full text-xs">
                      <summary className="cursor-pointer" style={{ color: 'var(--color-text-faint)' }}>
                        <QrCode size={12} className="inline mr-1" />
                        Can't scan? Show setup key
                      </summary>
                      <code className="block mt-1 p-2 rounded text-xs break-all" style={{ background: 'var(--color-bg-base)', color: 'var(--color-text-secondary)' }}>
                        {mfaEnrollData.otpauth_url}
                      </code>
                    </details>
                  </div>
                  <form onSubmit={handleMfaVerify} className="flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={mfaToken}
                      onChange={(e) => setMfaToken(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="input flex-1 text-center font-mono tracking-widest text-sm"
                      autoFocus
                    />
                    <button type="submit" disabled={mfaVerify.isPending || mfaToken.length !== 6} className="btn-primary text-xs py-1.5">
                      {mfaVerify.isPending ? 'Verifying…' : 'Confirm'}
                    </button>
                    <button type="button" onClick={() => { setMfaStep('idle'); setMfaToken(''); setMfaEnrollData(null); }} className="btn-secondary text-xs py-1.5">
                      Cancel
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}

        {/* API Keys */}
        {currentUser && (
          <div>
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
              <Key size={14} />
              Personal API Keys
            </h3>
            <div className="card p-4 space-y-3">
              <p className="text-xs" style={{ color: 'var(--color-text-faint)' }}>
                API keys let external tools authenticate to the dashboard using the <code className="font-mono px-1 rounded" style={{ background: 'var(--color-bg-base)' }}>X-API-Key</code> header. Keys are shown once at creation.
              </p>

              {keyMsg && (
                <div className={`text-xs px-3 py-2 rounded-lg border ${keyMsg.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                  {keyMsg.text}
                </div>
              )}

              {/* Newly created key banner */}
              {newlyCreatedKey && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-semibold text-amber-400">Key created — copy it now, it won't be shown again</p>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={newlyCreatedKey.key}
                      className="input flex-1 font-mono text-xs"
                    />
                    <button
                      onClick={() => { navigator.clipboard.writeText(newlyCreatedKey.key); }}
                      className="btn-secondary text-xs py-1.5 flex items-center gap-1"
                      title="Copy to clipboard"
                    >
                      <Copy size={12} /> Copy
                    </button>
                    <button onClick={() => setNewlyCreatedKey(null)} className="text-gray-400 hover:text-gray-200 p-1" title="Dismiss">
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* Existing keys */}
              {apiKeys && apiKeys.length > 0 && (
                <div className="space-y-2">
                  {apiKeys.map((k) => (
                    <div key={k.id} className="flex items-center gap-3 p-3 rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
                      <Key size={14} style={{ color: 'var(--color-text-faint)' }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{k.name}</p>
                        <p className="text-xs" style={{ color: 'var(--color-text-faint)' }}>
                          Created {formatDistanceToNow(new Date(k.created_at), { addSuffix: true })}
                          {' · '}
                          {k.last_used_at ? `Last used ${formatDistanceToNow(new Date(k.last_used_at), { addSuffix: true })}` : 'Never used'}
                        </p>
                      </div>
                      <button
                        onClick={() => { if (confirm(`Revoke key "${k.name}"?`)) revokeApiKey.mutate(k.id); }}
                        className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/10 transition-colors"
                        title="Revoke key"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {!showKeyForm ? (
                <button
                  onClick={() => setShowKeyForm(true)}
                  className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-dashed transition-colors hover:opacity-80"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                >
                  <Plus size={14} />
                  Generate new API key
                </button>
              ) : (
                <form onSubmit={handleCreateApiKey} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Key name (e.g. CI pipeline)"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    required
                    maxLength={100}
                    className="input flex-1 text-sm"
                    autoFocus
                  />
                  <button type="submit" disabled={createApiKey.isPending} className="btn-primary text-xs py-1.5">
                    {createApiKey.isPending ? 'Creating…' : 'Create'}
                  </button>
                  <button type="button" onClick={() => { setShowKeyForm(false); setNewKeyName(''); }} className="btn-secondary text-xs py-1.5">
                    Cancel
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Active Sessions */}
        {currentUser && (
          <div>
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
              <Monitor size={14} />
              Active Sessions
            </h3>
            <div className="card p-4 space-y-2">
              <p className="text-xs" style={{ color: 'var(--color-text-faint)' }}>
                All sessions currently logged in to your account. Revoke any session you don't recognize.
              </p>
              {activeSessions && activeSessions.length > 0 ? (
                activeSessions.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
                    <Monitor size={14} style={{ color: 'var(--color-text-faint)' }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                          {parseUserAgent(s.user_agent)}
                        </p>
                        {s.is_current && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30">
                            current
                          </span>
                        )}
                      </div>
                      <p className="text-xs" style={{ color: 'var(--color-text-faint)' }}>
                        {s.ip_address || 'Unknown IP'}
                        {' · '}
                        Last seen {formatDistanceToNow(new Date(s.last_activity), { addSuffix: true })}
                      </p>
                    </div>
                    <button
                      onClick={() => revokeSession.mutate(s.id)}
                      disabled={s.is_current || revokeSession.isPending}
                      className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title={s.is_current ? 'Cannot revoke current session — use Sign Out' : 'Revoke session'}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-xs text-center py-4" style={{ color: 'var(--color-text-faint)' }}>No active sessions found</p>
              )}
            </div>
          </div>
        )}

        {/* Risk Score Weights (admin only) */}
        {isAdmin && (
          <div>
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
              <BarChart2 size={14} />
              Risk Score Weights
            </h3>
            <div className="card p-4">
              <p className="text-xs mb-3" style={{ color: 'var(--color-text-faint)' }}>
                Customize how vulnerability risk scores are calculated. Weights must sum to 1.0.
                Risk score = (CVSS × weight) + (Exploit bonus × weight) + (KEV bonus × weight), clamped to 0–10.
              </p>
              {riskMsg && (
                <div className={`mb-3 text-xs px-3 py-2 rounded-lg border ${riskMsg.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                  {riskMsg.text}
                </div>
              )}
              <form onSubmit={handleRiskWeightsSave} className="flex flex-col gap-3">
                {[
                  { key: 'cvss', label: 'CVSS Score Weight', hint: 'Weight of the CVSS base score (0–10)' },
                  { key: 'exploit', label: 'Exploit Available Weight', hint: 'Bonus weight when an exploit is known' },
                  { key: 'kev', label: 'CISA KEV Weight', hint: 'Bonus weight for actively exploited (CISA KEV)' },
                ].map(({ key, label, hint }) => (
                  <div key={key}>
                    <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>
                      {label}
                    </label>
                    <input
                      type="number"
                      className="input w-32 text-sm"
                      min="0"
                      max="1"
                      step="0.05"
                      value={activeRisk[key as keyof typeof activeRisk]}
                      onChange={(e) => setRiskForm({ ...activeRisk, [key]: e.target.value })}
                    />
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-faint)' }}>{hint}</p>
                  </div>
                ))}
                <div className={`text-xs font-mono ${riskSumOk ? 'text-green-400' : 'text-red-400'}`}>
                  Sum: {riskSum.toFixed(2)} {riskSumOk ? '✓' : '(must equal 1.00)'}
                </div>
                <button
                  type="submit"
                  disabled={!riskSumOk || updateRiskWeights.isPending}
                  className="btn-primary text-xs py-1.5 self-start disabled:opacity-50"
                >
                  {updateRiskWeights.isPending ? 'Saving...' : 'Save Weights'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Notification Channels (admin only) */}
        {isAdmin && (
          <div>
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
              <Webhook size={14} />
              Notification Channels
            </h3>
            <div className="card p-4 space-y-4">
              <p className="text-xs" style={{ color: 'var(--color-text-faint)' }}>
                Configure outbound alerts to Slack, Teams, PagerDuty, or email when critical events are detected.
              </p>

              {channelMsg && (
                <div className={`text-xs px-3 py-2 rounded-lg border ${channelMsg.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                  {channelMsg.text}
                </div>
              )}

              {/* Existing channels */}
              {channels && channels.length > 0 && (
                <div className="space-y-2">
                  {channels.map((ch) => (
                    <div
                      key={ch.id}
                      className="flex items-center gap-3 p-3 rounded-lg border"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{ch.name}</span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-700 text-gray-300 uppercase">{ch.type}</span>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${ch.enabled ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-gray-700 text-gray-500 border-gray-600'}`}>
                            {ch.enabled ? 'Active' : 'Disabled'}
                          </span>
                          <span className="text-[10px] text-gray-500">min: {ch.severity_threshold}</span>
                        </div>
                        {testMsg[ch.id] && (
                          <p className={`text-xs mt-0.5 ${testMsg[ch.id].type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                            {testMsg[ch.id].text}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleToggleChannel(ch.id, !ch.enabled)}
                        className="text-xs px-2 py-1 rounded border transition-colors hover:opacity-80"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                      >
                        {ch.enabled ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => handleTestChannel(ch.id)}
                        disabled={testingId === ch.id}
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-sky-500/30 text-sky-400 hover:bg-sky-500/10 transition-colors disabled:opacity-50"
                        title="Send test notification"
                      >
                        <Send size={11} />
                        Test
                      </button>
                      <button
                        onClick={() => handleDeleteChannel(ch.id)}
                        className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/10 transition-colors"
                        title="Delete channel"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {!showChannelForm ? (
                <button
                  onClick={() => setShowChannelForm(true)}
                  className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-dashed transition-colors hover:opacity-80"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                >
                  <Plus size={14} />
                  Add notification channel
                </button>
              ) : (
                <form onSubmit={handleChannelSubmit} className="border rounded-lg p-4 space-y-3" style={{ borderColor: 'var(--color-border)' }}>
                  <h4 className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>New Channel</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Channel name</label>
                      <input className="input w-full text-sm" placeholder="e.g. #security-alerts" value={channelForm.name} onChange={(e) => setChannelForm((f) => ({ ...f, name: e.target.value }))} required />
                    </div>
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Type</label>
                      <select className="input w-full text-sm" value={channelForm.type} onChange={(e) => setChannelForm((f) => ({ ...f, type: e.target.value as NotificationChannel['type'] }))}>
                        <option value="slack">Slack</option>
                        <option value="teams">Microsoft Teams</option>
                        <option value="pagerduty">PagerDuty</option>
                        <option value="smtp">Email (SMTP)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Min severity</label>
                      <select className="input w-full text-sm" value={channelForm.severity_threshold} onChange={(e) => setChannelForm((f) => ({ ...f, severity_threshold: e.target.value as NotificationChannel['severity_threshold'] }))}>
                        <option value="CRITICAL">Critical only</option>
                        <option value="HIGH">High and above</option>
                        <option value="MEDIUM">Medium and above</option>
                        <option value="LOW">All severities</option>
                      </select>
                    </div>
                  </div>

                  {(channelForm.type === 'slack' || channelForm.type === 'teams') && (
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Webhook URL</label>
                      <input className="input w-full text-sm" type="url" placeholder="https://hooks.slack.com/..." value={channelForm.webhook_url} onChange={(e) => setChannelForm((f) => ({ ...f, webhook_url: e.target.value }))} required />
                    </div>
                  )}

                  {channelForm.type === 'pagerduty' && (
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Routing Key</label>
                      <input className="input w-full text-sm" placeholder="PagerDuty integration routing key" value={channelForm.routing_key} onChange={(e) => setChannelForm((f) => ({ ...f, routing_key: e.target.value }))} required />
                    </div>
                  )}

                  {channelForm.type === 'smtp' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>SMTP Host</label>
                        <input className="input w-full text-sm" placeholder="smtp.example.com" value={channelForm.smtp_host} onChange={(e) => setChannelForm((f) => ({ ...f, smtp_host: e.target.value }))} required />
                      </div>
                      <div>
                        <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Port</label>
                        <input className="input w-full text-sm" type="number" value={channelForm.smtp_port} onChange={(e) => setChannelForm((f) => ({ ...f, smtp_port: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Username</label>
                        <input className="input w-full text-sm" value={channelForm.smtp_user} onChange={(e) => setChannelForm((f) => ({ ...f, smtp_user: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Password</label>
                        <input className="input w-full text-sm" type="password" value={channelForm.smtp_pass} onChange={(e) => setChannelForm((f) => ({ ...f, smtp_pass: e.target.value }))} autoComplete="new-password" />
                      </div>
                      <div>
                        <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>From address</label>
                        <input className="input w-full text-sm" type="email" placeholder="alerts@example.com" value={channelForm.smtp_from} onChange={(e) => setChannelForm((f) => ({ ...f, smtp_from: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>To address</label>
                        <input className="input w-full text-sm" type="email" placeholder="team@example.com" value={channelForm.smtp_to} onChange={(e) => setChannelForm((f) => ({ ...f, smtp_to: e.target.value }))} required />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button type="submit" disabled={createChannel.isPending} className="btn-primary text-xs py-1.5">
                      {createChannel.isPending ? 'Saving...' : 'Save Channel'}
                    </button>
                    <button type="button" onClick={() => { setShowChannelForm(false); setChannelMsg(null); }} className="btn-secondary text-xs py-1.5">
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Audit Log (admin only) */}
        {isAdmin && (
          <div>
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text-muted)' }}>Audit Log</h3>
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <th scope="col" className="text-left py-3 px-4 font-medium" style={{ color: 'var(--color-text-muted)' }}>Time</th>
                    <th scope="col" className="text-left py-3 px-4 font-medium" style={{ color: 'var(--color-text-muted)' }}>User</th>
                    <th scope="col" className="text-left py-3 px-4 font-medium" style={{ color: 'var(--color-text-muted)' }}>Action</th>
                    <th scope="col" className="text-left py-3 px-4 font-medium" style={{ color: 'var(--color-text-muted)' }}>Resource</th>
                  </tr>
                </thead>
                <tbody>
                  {!auditLog?.data?.length ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center" style={{ color: 'var(--color-text-faint)' }}>
                        No audit log entries yet
                      </td>
                    </tr>
                  ) : (
                    auditLog.data.map((entry) => (
                      <tr key={entry.id} className="border-b last:border-b-0" style={{ borderColor: 'var(--color-border)' }}>
                        <td className="py-2.5 px-4 text-xs" style={{ color: 'var(--color-text-faint)' }}>
                          {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                        </td>
                        <td className="py-2.5 px-4 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          {entry.username || 'system'}
                        </td>
                        <td className="py-2.5 px-4 text-xs" style={{ color: 'var(--color-text-primary)' }}>
                          {ACTION_LABELS[entry.action] || entry.action}
                        </td>
                        <td className="py-2.5 px-4 text-xs" style={{ color: 'var(--color-text-faint)' }}>
                          {entry.resource_id || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {auditLog && auditLog.pages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <span className="text-xs" style={{ color: 'var(--color-text-faint)' }}>
                    Page {auditLog.page} of {auditLog.pages}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                      disabled={auditPage <= 1}
                      className="p-1 rounded hover:bg-gray-800 disabled:opacity-30"
                      aria-label="Previous page"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      onClick={() => setAuditPage((p) => Math.min(auditLog.pages, p + 1))}
                      disabled={auditPage >= auditLog.pages}
                      className="p-1 rounded hover:bg-gray-800 disabled:opacity-30"
                      aria-label="Next page"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
