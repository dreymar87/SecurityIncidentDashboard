import { useState } from 'react';
import { TopBar } from '../components/layout/TopBar';
import { useAttackTechniques } from '../api/hooks';
import { AttackTechnique } from '../api/client';
import { Search, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';

const TACTIC_LABELS: Record<string, string> = {
  'reconnaissance': 'Reconnaissance',
  'resource-development': 'Resource Development',
  'initial-access': 'Initial Access',
  'execution': 'Execution',
  'persistence': 'Persistence',
  'privilege-escalation': 'Privilege Escalation',
  'defense-evasion': 'Defense Evasion',
  'credential-access': 'Credential Access',
  'discovery': 'Discovery',
  'lateral-movement': 'Lateral Movement',
  'collection': 'Collection',
  'command-and-control': 'Command and Control',
  'exfiltration': 'Exfiltration',
  'impact': 'Impact',
};

interface PageProps {
  onMobileMenuToggle?: () => void;
  isMobile?: boolean;
}

export function Attack({ onMobileMenuToggle, isMobile }: PageProps) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const { data: grouped, isLoading } = useAttackTechniques(search ? { q: search } : {});

  const toggleTactic = (tactic: string) => {
    setExpanded((e) => ({ ...e, [tactic]: !e[tactic] }));
  };

  return (
    <>
      <TopBar title="MITRE ATT&CK" onMobileMenuToggle={onMobileMenuToggle} isMobile={isMobile} />
      <div className="p-6 space-y-4">
        {/* Search */}
        <div className="relative max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-faint)' }} />
          <input
            className="input pl-8 w-full"
            placeholder="Search techniques by ID, name, or description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="card animate-pulse h-14" />)}
          </div>
        ) : grouped && Object.keys(grouped).length > 0 ? (
          <div className="space-y-2">
            {Object.entries(grouped).map(([tactic, techniques]) => (
              <div key={tactic} className="card p-0 overflow-hidden">
                <button
                  onClick={() => toggleTactic(tactic)}
                  className="w-full flex items-center justify-between px-5 py-3.5 text-left transition-colors"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  <div className="flex items-center gap-3">
                    {expanded[tactic] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <span className="text-sm font-semibold">
                      {TACTIC_LABELS[tactic] || tactic}
                    </span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-muted)' }}>
                      {(techniques as AttackTechnique[]).length}
                    </span>
                  </div>
                </button>
                {expanded[tactic] && (
                  <div className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                    <div className="grid gap-px" style={{ backgroundColor: 'var(--color-border)' }}>
                      {(techniques as AttackTechnique[]).map((t) => (
                        <div key={t.technique_id} className="px-5 py-3 flex items-start gap-4" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                          <span className="text-xs font-mono text-sky-400 shrink-0 mt-0.5 w-20">{t.technique_id}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{t.name}</span>
                              {t.url && (
                                <a href={t.url} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300">
                                  <ExternalLink size={12} />
                                </a>
                              )}
                            </div>
                            {t.description && (
                              <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--color-text-faint)' }}>
                                {t.description.slice(0, 200)}
                              </p>
                            )}
                            {t.platform.length > 0 && (
                              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                                {t.platform.map((p) => (
                                  <span key={p} className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-muted)' }}>
                                    {p}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center py-10">
            <p className="text-sm" style={{ color: 'var(--color-text-faint)' }}>
              No techniques found. Trigger a MITRE ATT&CK sync from Settings to populate data.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
