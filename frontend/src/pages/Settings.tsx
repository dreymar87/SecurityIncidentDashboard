import { useState } from 'react';
import { TopBar } from '../components/layout/TopBar';
import { useSettings } from '../api/hooks';
import { api } from '../api/client';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw, CheckCircle, XCircle, Clock, Key } from 'lucide-react';
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

interface PageProps {
  onMobileMenuToggle?: () => void;
  isMobile?: boolean;
}

export function Settings({ onMobileMenuToggle, isMobile }: PageProps) {
  const { data: settings, isLoading } = useSettings();
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});

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
      </div>
    </>
  );
}
