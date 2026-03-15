import { X, CheckCircle, Lock, Zap, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { useBreachRelatedVulns } from '../../api/hooks';
import { Breach } from '../../api/client';
import { SeverityBadge } from '../vulnerabilities/SeverityBadge';

interface BreachDetailProps {
  breach: Breach;
  onClose: () => void;
}

function formatRecords(n: number | null) {
  if (!n) return '—';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

export function BreachDetail({ breach, onClose }: BreachDetailProps) {
  const { data: relatedVulns, isLoading: vulnsLoading } = useBreachRelatedVulns(breach.id);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end" onClick={onClose}>
      <div
        className="w-full max-w-xl h-full bg-gray-900 border-l border-gray-800 overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
          <h2 className="text-sm font-semibold text-gray-200 truncate pr-4">
            {breach.organization || 'Unknown Organization'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Flags */}
          {(breach.is_verified || breach.is_sensitive) && (
            <div className="flex gap-2 flex-wrap">
              {breach.is_verified && (
                <span className="flex items-center gap-1 text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-1 rounded-full">
                  <CheckCircle size={11} /> Verified
                </span>
              )}
              {breach.is_sensitive && (
                <span className="flex items-center gap-1 text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-1 rounded-full">
                  <Lock size={11} /> Sensitive
                </span>
              )}
            </div>
          )}

          {/* Metadata grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-800/50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Domain</p>
              <p className="text-sm text-gray-200 font-mono">{breach.domain || '—'}</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Country</p>
              <p className="text-sm text-gray-200">{breach.country || '—'}</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Breach Date</p>
              <p className="text-sm text-gray-200">
                {breach.breach_date ? format(new Date(breach.breach_date), 'MMM d, yyyy') : '—'}
              </p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Records Affected</p>
              <p className="text-sm font-mono font-semibold text-orange-400">
                {formatRecords(breach.records_affected)}
              </p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Source</p>
              <p className="text-sm text-gray-200 uppercase">{breach.source}</p>
            </div>
          </div>

          {/* Data Types */}
          {(breach.breach_types || []).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Data Types</p>
              <div className="flex flex-wrap gap-1.5">
                {(breach.breach_types || []).map((type) => (
                  <span key={type} className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded">
                    {type}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Related Vulnerabilities */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Related Vulnerabilities
              {breach.country && <span className="normal-case font-normal text-gray-600 ml-1">— country: {breach.country}</span>}
            </p>

            {!breach.country && (
              <p className="text-sm text-gray-600">No country data — cannot correlate.</p>
            )}

            {breach.country && vulnsLoading && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                Loading…
              </div>
            )}

            {breach.country && !vulnsLoading && (relatedVulns || []).length === 0 && (
              <p className="text-sm text-gray-600">No CRITICAL/HIGH CVEs found for {breach.country}.</p>
            )}

            {(relatedVulns || []).length > 0 && (
              <div className="space-y-2">
                {relatedVulns!.map((vuln) => (
                  <div key={vuln.id} className="bg-gray-800/50 rounded-lg px-3 py-2 flex items-center gap-3">
                    <SeverityBadge severity={vuln.severity} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono text-sky-400">{vuln.cve_id}</p>
                      <p className="text-xs text-gray-400 truncate">{vuln.title || vuln.cve_id}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {vuln.cvss_score != null && (
                        <span className="text-xs font-mono font-semibold text-white">
                          {Number(vuln.cvss_score).toFixed(1)}
                        </span>
                      )}
                      {vuln.cisa_kev && <Zap size={12} className="text-red-400" />}
                      {vuln.patch_available && <Shield size={12} className="text-green-400" />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
