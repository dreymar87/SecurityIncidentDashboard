import { ThreatIntelDetail as ThreatIntelDetailType } from '../../api/client';
import { useEnrichThreatIntel } from '../../api/hooks';
import { X, RefreshCw, Wifi } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  data: ThreatIntelDetailType;
  onClose: () => void;
}

function RiskBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  const color = pct >= 70 ? 'bg-red-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-gray-400">{score}</span>
    </div>
  );
}

export function ThreatIntelDetail({ data, onClose }: Props) {
  const enrichMutation = useEnrichThreatIntel();

  const tags: string[] = Array.isArray(data.tags) ? data.tags : (typeof data.tags === 'string' ? JSON.parse(data.tags) : []);
  const ports: number[] = Array.isArray(data.open_ports) ? data.open_ports : (typeof data.open_ports === 'string' ? JSON.parse(data.open_ports) : []);

  return (
    <div className="card p-0 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-2">
          <Wifi size={15} className="text-yellow-400" />
          <span className="font-mono text-sm text-yellow-400">{data.ip_address}</span>
          <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded uppercase">{data.source}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => enrichMutation.mutate(data.id)}
            disabled={enrichMutation.isPending}
            className="flex items-center gap-1.5 text-xs px-2 py-1 rounded border border-sky-500/30 text-sky-400 hover:bg-sky-500/10 transition-colors disabled:opacity-50"
            title="Enrich with Shodan & Censys"
          >
            <RefreshCw size={11} className={enrichMutation.isPending ? 'animate-spin' : ''} />
            Enrich
          </button>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors p-1" aria-label="Close">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto max-h-[70vh]">
        {/* Basic info */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--color-text-faint)' }}>Country</p>
            <p style={{ color: 'var(--color-text-secondary)' }}>{data.country || '—'}</p>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--color-text-faint)' }}>Organization</p>
            <p className="truncate" style={{ color: 'var(--color-text-secondary)' }}>{data.org || '—'}</p>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--color-text-faint)' }}>Risk Score</p>
            <RiskBar score={data.risk_score} />
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--color-text-faint)' }}>Last Seen</p>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {data.last_seen ? formatDistanceToNow(new Date(data.last_seen), { addSuffix: true }) : '—'}
            </p>
          </div>
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div>
            <p className="text-xs mb-2" style={{ color: 'var(--color-text-faint)' }}>Tags</p>
            <div className="flex flex-wrap gap-1">
              {tags.map((tag) => (
                <span key={tag} className="text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-1.5 py-0.5 rounded">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Open ports */}
        {ports.length > 0 && (
          <div>
            <p className="text-xs mb-2" style={{ color: 'var(--color-text-faint)' }}>Open Ports (from threat intel)</p>
            <div className="flex flex-wrap gap-1">
              {ports.map((port) => (
                <span key={port} className="text-xs font-mono bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded">{port}</span>
              ))}
            </div>
          </div>
        )}

        {/* Shodan enrichment */}
        <div className="border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2 mb-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-faint)' }}>Shodan</h4>
            {data.shodan_data && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">Enriched</span>}
          </div>
          {data.shodan_data ? (
            <div className="space-y-2 text-sm">
              {data.shodan_data.org && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs mb-0.5" style={{ color: 'var(--color-text-faint)' }}>Organization</p>
                    <p style={{ color: 'var(--color-text-secondary)' }}>{data.shodan_data.org}</p>
                  </div>
                  {data.shodan_data.isp && (
                    <div>
                      <p className="text-xs mb-0.5" style={{ color: 'var(--color-text-faint)' }}>ISP</p>
                      <p style={{ color: 'var(--color-text-secondary)' }}>{data.shodan_data.isp}</p>
                    </div>
                  )}
                  {data.shodan_data.asn && (
                    <div>
                      <p className="text-xs mb-0.5" style={{ color: 'var(--color-text-faint)' }}>ASN</p>
                      <p className="font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>{data.shodan_data.asn}</p>
                    </div>
                  )}
                </div>
              )}
              {data.shodan_data.ports.length > 0 && (
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--color-text-faint)' }}>Open Ports (Shodan)</p>
                  <div className="flex flex-wrap gap-1">
                    {data.shodan_data.ports.map((p) => (
                      <span key={p} className="text-xs font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded">{p}</span>
                    ))}
                  </div>
                </div>
              )}
              {data.shodan_data.vulns.length > 0 && (
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--color-text-faint)' }}>CVEs from Shodan</p>
                  <div className="flex flex-wrap gap-1">
                    {data.shodan_data.vulns.slice(0, 10).map((cve) => (
                      <span key={cve} className="text-xs font-mono bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded">{cve}</span>
                    ))}
                    {data.shodan_data.vulns.length > 10 && (
                      <span className="text-xs text-gray-500">+{data.shodan_data.vulns.length - 10} more</span>
                    )}
                  </div>
                </div>
              )}
              {data.shodan_data.hostnames.length > 0 && (
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--color-text-faint)' }}>Hostnames</p>
                  <div className="flex flex-wrap gap-1">
                    {data.shodan_data.hostnames.slice(0, 5).map((h) => (
                      <span key={h} className="text-xs font-mono bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded">{h}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs" style={{ color: 'var(--color-text-faint)' }}>
              Not enriched via Shodan. Click <strong>Enrich</strong> to fetch data (requires SHODAN_API_KEY).
            </p>
          )}
        </div>

        {/* Censys enrichment */}
        <div className="border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2 mb-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-faint)' }}>Censys</h4>
            {data.censys_data && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">Enriched</span>}
          </div>
          {data.censys_data ? (
            <div className="space-y-2 text-sm">
              {data.censys_data.autonomous_system && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs mb-0.5" style={{ color: 'var(--color-text-faint)' }}>AS Name</p>
                    <p style={{ color: 'var(--color-text-secondary)' }}>{data.censys_data.autonomous_system.name}</p>
                  </div>
                  <div>
                    <p className="text-xs mb-0.5" style={{ color: 'var(--color-text-faint)' }}>ASN</p>
                    <p className="font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>AS{data.censys_data.autonomous_system.asn}</p>
                  </div>
                  <div>
                    <p className="text-xs mb-0.5" style={{ color: 'var(--color-text-faint)' }}>Country</p>
                    <p style={{ color: 'var(--color-text-secondary)' }}>{data.censys_data.autonomous_system.country_code}</p>
                  </div>
                  <div>
                    <p className="text-xs mb-0.5" style={{ color: 'var(--color-text-faint)' }}>BGP Prefix</p>
                    <p className="font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>{data.censys_data.autonomous_system.bgp_prefix}</p>
                  </div>
                </div>
              )}
              {data.censys_data.ports.length > 0 && (
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--color-text-faint)' }}>Open Ports (Censys)</p>
                  <div className="flex flex-wrap gap-1">
                    {data.censys_data.ports.map((p) => (
                      <span key={p} className="text-xs font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20 px-1.5 py-0.5 rounded">{p}</span>
                    ))}
                  </div>
                </div>
              )}
              {data.censys_data.labels.length > 0 && (
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--color-text-faint)' }}>Labels</p>
                  <div className="flex flex-wrap gap-1">
                    {data.censys_data.labels.map((l) => (
                      <span key={l} className="text-xs bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded">{l}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs" style={{ color: 'var(--color-text-faint)' }}>
              Not enriched via Censys. Click <strong>Enrich</strong> to fetch data (requires CENSYS_API_ID and CENSYS_API_SECRET).
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
