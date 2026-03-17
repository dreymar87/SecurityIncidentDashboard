import { ThreatIntel } from '../../api/client';
import { Wifi, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown, Radio } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { EmptyState } from '../EmptyState';

interface ThreatPanelProps {
  data: ThreatIntel[];
  total: number;
  page: number;
  pages: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
  sort?: string;
  order?: 'asc' | 'desc';
  onSort?: (field: string) => void;
  onSelect?: (id: number) => void;
  selectedId?: number | null;
}

function SortIcon({ field, sort, order }: { field: string; sort?: string; order?: 'asc' | 'desc' }) {
  if (sort === field) {
    return order === 'asc' ? <ChevronUp className="w-3 h-3 shrink-0" /> : <ChevronDown className="w-3 h-3 shrink-0" />;
  }
  return <ChevronsUpDown className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-50" />;
}

function RiskBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  const color = pct >= 70 ? 'bg-red-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-gray-400">{score}</span>
    </div>
  );
}

export function ThreatPanel({ data, total, page, pages, onPageChange, loading, sort, order, onSort, onSelect, selectedId }: ThreatPanelProps) {
  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
        <Wifi size={15} className="text-yellow-400" />
        <h3 className="text-sm font-semibold text-gray-300">
          Threat Intelligence <span className="text-gray-500 font-normal ml-1">({total.toLocaleString()} IPs)</span>
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-gray-800">
              <th scope="col" className="table-header px-4 py-3 text-left">IP Address</th>
              <th scope="col" className="table-header px-4 py-3 text-left">Country</th>
              <th scope="col" className="table-header px-4 py-3 text-left">Organization</th>
              <th scope="col" className="table-header px-4 py-3 text-left">Tags</th>
              <th scope="col" className="table-header px-4 py-3 text-left cursor-pointer select-none group" onClick={() => onSort?.('risk_score')}>
                <span className="flex items-center gap-1">Risk <SortIcon field="risk_score" sort={sort} order={order} /></span>
              </th>
              <th scope="col" className="table-header px-4 py-3 text-left">Source</th>
              <th scope="col" className="table-header px-4 py-3 text-left cursor-pointer select-none group" onClick={() => onSort?.('last_seen')}>
                <span className="flex items-center gap-1">Last Seen <SortIcon field="last_seen" sort={sort} order={order} /></span>
              </th>
            </tr>
          </thead>
          <tbody className={loading ? 'opacity-50' : ''}>
            {data.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    icon={Radio}
                    title="No threat intel data"
                    description="Set a GreyNoise API key in your .env file and trigger a sync to fetch threat intelligence."
                  />
                </td>
              </tr>
            )}
            {data.map((item) => (
              <tr
                key={item.id}
                className={`table-row cursor-pointer ${selectedId === item.id ? 'bg-sky-500/5' : ''}`}
                onClick={() => onSelect?.(item.id)}
              >
                <td className="table-cell font-mono text-xs text-yellow-400">{item.ip_address}</td>
                <td className="table-cell">{item.country || '—'}</td>
                <td className="table-cell text-xs text-gray-400 max-w-xs truncate">{item.org || '—'}</td>
                <td className="table-cell">
                  <div className="flex flex-wrap gap-1">
                    {(item.tags || []).slice(0, 3).map((tag) => (
                      <span key={tag} className="text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-1.5 py-0.5 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="table-cell"><RiskBar score={item.risk_score} /></td>
                <td className="table-cell">
                  <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded uppercase">
                    {item.source}
                  </span>
                </td>
                <td className="table-cell text-xs text-gray-500">
                  {item.last_seen
                    ? formatDistanceToNow(new Date(item.last_seen), { addSuffix: true })
                    : '—'}
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
