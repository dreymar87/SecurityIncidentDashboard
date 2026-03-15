import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, ExternalLink, CheckCircle, Lock } from 'lucide-react';
import { Breach } from '../../api/client';

interface BreachTableProps {
  data: Breach[];
  total: number;
  page: number;
  pages: number;
  onPageChange: (page: number) => void;
  onSelect: (breach: Breach) => void;
  loading?: boolean;
}

function formatRecords(n: number | null) {
  if (!n) return '—';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

export function BreachTable({ data, total, page, pages, onPageChange, onSelect, loading }: BreachTableProps) {
  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300">
          Data Breaches <span className="text-gray-500 font-normal ml-1">({total.toLocaleString()} total)</span>
        </h3>
        <a
          href="/api/breaches?export=csv"
          className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1"
        >
          <ExternalLink size={12} /> Export CSV
        </a>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="table-header px-4 py-3 text-left">Organization</th>
              <th className="table-header px-4 py-3 text-left">Domain</th>
              <th className="table-header px-4 py-3 text-left">Country</th>
              <th className="table-header px-4 py-3 text-left">Date</th>
              <th className="table-header px-4 py-3 text-right">Records</th>
              <th className="table-header px-4 py-3 text-left">Data Types</th>
              <th className="table-header px-4 py-3 text-left">Source</th>
              <th className="table-header px-4 py-3 text-left">Flags</th>
            </tr>
          </thead>
          <tbody className={loading ? 'opacity-50' : ''}>
            {data.length === 0 && (
              <tr>
                <td colSpan={8} className="table-cell text-center text-gray-500 py-12">
                  No breaches found. Trigger a sync or import data.
                </td>
              </tr>
            )}
            {data.map((breach) => (
              <tr key={breach.id} className="table-row cursor-pointer" onClick={() => onSelect(breach)}>
                <td className="table-cell font-medium text-gray-200">{breach.organization || '—'}</td>
                <td className="table-cell text-xs font-mono text-gray-400">{breach.domain || '—'}</td>
                <td className="table-cell">{breach.country || '—'}</td>
                <td className="table-cell text-xs text-gray-500">
                  {breach.breach_date ? format(new Date(breach.breach_date), 'MMM d, yyyy') : '—'}
                </td>
                <td className="table-cell text-right font-mono text-sm font-semibold text-orange-400">
                  {formatRecords(breach.records_affected)}
                </td>
                <td className="table-cell">
                  <div className="flex flex-wrap gap-1">
                    {(breach.breach_types || []).slice(0, 3).map((type) => (
                      <span key={type} className="text-xs bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">
                        {type}
                      </span>
                    ))}
                    {(breach.breach_types || []).length > 3 && (
                      <span className="text-xs text-gray-500">+{(breach.breach_types || []).length - 3}</span>
                    )}
                  </div>
                </td>
                <td className="table-cell">
                  <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded uppercase">
                    {breach.source}
                  </span>
                </td>
                <td className="table-cell">
                  <div className="flex gap-1.5">
                    {breach.is_verified && (
                      <span title="Verified" className="text-green-400"><CheckCircle size={13} /></span>
                    )}
                    {breach.is_sensitive && (
                      <span title="Sensitive" className="text-red-400"><Lock size={13} /></span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="px-4 py-3 border-t border-gray-800 flex items-center justify-between">
          <span className="text-xs text-gray-500">Page {page} of {pages}</span>
          <div className="flex gap-2">
            <button className="btn-secondary py-1 px-2 disabled:opacity-40" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
              <ChevronLeft size={15} />
            </button>
            <button className="btn-secondary py-1 px-2 disabled:opacity-40" disabled={page >= pages} onClick={() => onPageChange(page + 1)}>
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
