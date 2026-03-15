import { useState } from 'react';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, ExternalLink, Zap, Shield } from 'lucide-react';
import { Vulnerability } from '../../api/client';
import { SeverityBadge } from './SeverityBadge';
import { VulnDetail } from './VulnDetail';

interface VulnTableProps {
  data: Vulnerability[];
  total: number;
  page: number;
  pages: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
}

export function VulnTable({ data, total, page, pages, onPageChange, loading }: VulnTableProps) {
  const [selectedCveId, setSelectedCveId] = useState<string | null>(null);

  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300">
          Vulnerabilities <span className="text-gray-500 font-normal ml-1">({total.toLocaleString()} total)</span>
        </h3>
        <a
          href="/api/vulnerabilities?export=csv"
          className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1"
        >
          <ExternalLink size={12} /> Export CSV
        </a>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="table-header px-4 py-3 text-left">CVE ID</th>
              <th className="table-header px-4 py-3 text-left">Severity</th>
              <th className="table-header px-4 py-3 text-left">CVSS</th>
              <th className="table-header px-4 py-3 text-left">Title</th>
              <th className="table-header px-4 py-3 text-left">Source</th>
              <th className="table-header px-4 py-3 text-left">Flags</th>
              <th className="table-header px-4 py-3 text-left">Published</th>
            </tr>
          </thead>
          <tbody className={loading ? 'opacity-50' : ''}>
            {data.length === 0 && (
              <tr>
                <td colSpan={7} className="table-cell text-center text-gray-500 py-12">
                  No vulnerabilities found. Try adjusting filters or trigger a sync.
                </td>
              </tr>
            )}
            {data.map((vuln) => (
              <tr
                key={vuln.id}
                className="table-row cursor-pointer"
                onClick={() => setSelectedCveId(vuln.cve_id)}
              >
                <td className="table-cell">
                  <span className="font-mono text-sky-400 text-xs hover:text-sky-300">
                    {vuln.cve_id}
                  </span>
                </td>
                <td className="table-cell">
                  <SeverityBadge severity={vuln.severity} />
                </td>
                <td className="table-cell font-mono text-xs">
                  {vuln.cvss_score != null ? Number(vuln.cvss_score).toFixed(1) : '—'}
                </td>
                <td className="table-cell max-w-xs">
                  <span className="truncate block text-gray-300">
                    {vuln.title || vuln.cve_id}
                  </span>
                </td>
                <td className="table-cell">
                  <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded uppercase">
                    {vuln.source}
                  </span>
                </td>
                <td className="table-cell">
                  <div className="flex gap-1">
                    {vuln.cisa_kev && (
                      <span title="CISA KEV" className="text-red-400">
                        <Zap size={13} />
                      </span>
                    )}
                    {vuln.patch_available && (
                      <span title="Patch available" className="text-green-400">
                        <Shield size={13} />
                      </span>
                    )}
                  </div>
                </td>
                <td className="table-cell text-xs text-gray-500">
                  {vuln.published_at ? format(new Date(vuln.published_at), 'MMM d, yyyy') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="px-4 py-3 border-t border-gray-800 flex items-center justify-between">
          <span className="text-xs text-gray-500">Page {page} of {pages}</span>
          <div className="flex gap-2">
            <button
              className="btn-secondary py-1 px-2 disabled:opacity-40"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft size={15} />
            </button>
            <button
              className="btn-secondary py-1 px-2 disabled:opacity-40"
              disabled={page >= pages}
              onClick={() => onPageChange(page + 1)}
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {selectedCveId && (
        <VulnDetail cveId={selectedCveId} onClose={() => setSelectedCveId(null)} />
      )}
    </div>
  );
}
