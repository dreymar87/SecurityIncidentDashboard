import { X, ExternalLink, Zap, Shield, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useVulnerability } from '../../api/hooks';
import { SeverityBadge } from './SeverityBadge';

interface VulnDetailProps {
  cveId: string;
  onClose: () => void;
}

export function VulnDetail({ cveId, onClose }: VulnDetailProps) {
  const { data: vuln, isLoading } = useVulnerability(cveId);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end" onClick={onClose}>
      <div
        className="w-full max-w-xl h-full bg-gray-900 border-l border-gray-800 overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
          <h2 className="text-sm font-semibold font-mono text-sky-400">{cveId}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
            <X size={18} />
          </button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {vuln && (
          <div className="p-5 space-y-5">
            {/* Severity & Score */}
            <div className="flex items-center gap-3">
              <SeverityBadge severity={vuln.severity} />
              {vuln.cvss_score != null && (
                <span className="text-2xl font-bold font-mono text-white">{Number(vuln.cvss_score).toFixed(1)}</span>
              )}
              {vuln.cvss_vector && (
                <span className="text-xs text-gray-500 font-mono truncate">{vuln.cvss_vector}</span>
              )}
            </div>

            {/* Flags */}
            <div className="flex gap-2 flex-wrap">
              {vuln.cisa_kev && (
                <span className="flex items-center gap-1 text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-1 rounded-full">
                  <Zap size={11} /> CISA KEV — Actively Exploited
                </span>
              )}
              {vuln.patch_available && (
                <span className="flex items-center gap-1 text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-1 rounded-full">
                  <Shield size={11} /> Patch Available
                </span>
              )}
              {vuln.exploit_available && !vuln.cisa_kev && (
                <span className="flex items-center gap-1 text-xs bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-1 rounded-full">
                  <AlertCircle size={11} /> Exploit Available
                </span>
              )}
            </div>

            {/* Description */}
            {vuln.description && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Description</p>
                <p className="text-sm text-gray-300 leading-relaxed">{vuln.description}</p>
              </div>
            )}

            {/* Affected Products */}
            {vuln.affected_products?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Affected Products</p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {vuln.affected_products.slice(0, 20).map((p, i) => (
                    <p key={i} className="text-xs font-mono text-gray-400 bg-gray-800 rounded px-2 py-1 truncate">
                      {p.vendor && p.product ? `${p.vendor} / ${p.product}` : p.cpe || '—'}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-800/50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Source</p>
                <p className="text-sm text-gray-200 uppercase">{vuln.source}</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Published</p>
                <p className="text-sm text-gray-200">
                  {vuln.published_at ? format(new Date(vuln.published_at), 'MMM d, yyyy') : '—'}
                </p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Last Modified</p>
                <p className="text-sm text-gray-200">
                  {vuln.last_modified ? format(new Date(vuln.last_modified), 'MMM d, yyyy') : '—'}
                </p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Countries</p>
                <p className="text-sm text-gray-200">{vuln.countries?.join(', ') || '—'}</p>
              </div>
            </div>

            <div className="pt-2">
              <a
                href={`https://nvd.nist.gov/vuln/detail/${cveId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-sky-400 hover:text-sky-300 transition-colors"
              >
                <ExternalLink size={13} /> View on NVD
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
