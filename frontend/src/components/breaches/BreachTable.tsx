import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown, ExternalLink, CheckCircle, Lock, DatabaseZap } from 'lucide-react';
import { Breach } from '../../api/client';
import { EmptyState } from '../EmptyState';

interface BreachTableProps {
  data: Breach[];
  total: number;
  page: number;
  pages: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
  sort?: string;
  order?: 'asc' | 'desc';
  onSort?: (field: string) => void;
}

function SortIcon({ field, sort, order }: { field: string; sort?: string; order?: 'asc' | 'desc' }) {
  if (sort === field) {
    return order === 'asc' ? <ChevronUp className="w-3 h-3 shrink-0" /> : <ChevronDown className="w-3 h-3 shrink-0" />;
  }
  return <ChevronsUpDown className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-50" />;
}

function formatRecords(n: number | null) {
  if (!n) return '—';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

export function BreachTable({ data, total, page, pages, onPageChange, loading, sort, order, onSort }: BreachTableProps) {
  const navigate = useNavigate();

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
        <table className="w-full min-w-[750px]">
          <thead>
            <tr className="border-b border-gray-800">
              <th scope="col" className="table-header px-4 py-3 text-left cursor-pointer select-none group" onClick={() => onSort?.('organization')}>
                <span className="flex items-center gap-1">Organization <SortIcon field="organization" sort={sort} order={order} /></span>
              </th>
              <th scope="col" className="table-header px-4 py-3 text-left">Domain</th>
              <th scope="col" className="table-header px-4 py-3 text-left">Country</th>
              <th scope="col" className="table-header px-4 py-3 text-left cursor-pointer select-none group" onClick={() => onSort?.('breach_date')}>
                <span className="flex items-center gap-1">Date <SortIcon field="breach_date" sort={sort} order={order} /></span>
              </th>
              <th scope="col" className="table-header px-4 py-3 text-right cursor-pointer select-none group" onClick={() => onSort?.('records_affected')}>
                <span className="flex items-center justify-end gap-1">Records <SortIcon field="records_affected" sort={sort} order={order} /></span>
              </th>
              <th scope="col" className="table-header px-4 py-3 text-left">Data Types</th>
              <th scope="col" className="table-header px-4 py-3 text-left">Source</th>
              <th scope="col" className="table-header px-4 py-3 text-left">Flags</th>
            </tr>
          </thead>
          <tbody className={loading ? 'opacity-50' : ''}>
            {data.length === 0 && (
              <tr>
                <td colSpan={8}>
                  <EmptyState
                    icon={DatabaseZap}
                    title="No breaches found"
                    description="Trigger a sync or import data to populate breach records."
                  />
                </td>
              </tr>
            )}
            {data.map((breach) => (
              <tr key={breach.id} className="table-row cursor-pointer" onClick={() => navigate(`/breaches/${breach.id}`)}>
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
