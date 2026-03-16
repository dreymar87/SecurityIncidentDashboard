import { useState } from 'react';
import { TopBar } from '../components/layout/TopBar';
import { useSettings, useCurrentUser, useUserPreferences, useUpdatePreferences, useAuditLog } from '../api/hooks';
import { api } from '../api/client';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw, CheckCircle, XCircle, Clock, Key, Bell, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});
  const [auditPage, setAuditPage] = useState(1);
  const { data: auditLog } = useAuditLog(auditPage);

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
