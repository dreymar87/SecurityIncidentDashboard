import { useState } from 'react';
import { TopBar } from '../components/layout/TopBar';
import { useSettings, useCurrentUser, useUserPreferences, useUpdatePreferences, useAuditLog, useChangePassword, useUpdateProfile, useRiskWeights, useUpdateRiskWeights } from '../api/hooks';
import { api } from '../api/client';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw, CheckCircle, XCircle, Clock, Key, Bell, ChevronLeft, ChevronRight, User, Lock, BarChart2 } from 'lucide-react';
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
