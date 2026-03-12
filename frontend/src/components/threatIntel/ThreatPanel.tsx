import { ThreatIntel } from '../../api/client';
import { Wifi, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ThreatPanelProps {
  data: ThreatIntel[];
  total: number;
  page: number;
  pages: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
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

export function ThreatPanel({ data, total, page, pages, onPageChange, loading }: ThreatPanelProps) {
  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
        <Wifi size={15} className="text-yellow-400" />
        <h3 className="text-sm font-semibold text-gray-300">
          Threat Intelligence <span className="text-gray-500 font-normal ml-1">({total.toLocaleString()} IPs)</span>
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="table-header px-4 py-3 text-left">IP Address</th>
              <th className="table-header px-4 py-3 text-left">Country</th>
              <th className="table-header px-4 py-3 text-left">Organization</th>
              <th className="table-header px-4 py-3 text-left">Tags</th>
              <th className="table-header px-4 py-3 text-left">Risk</th>
              <th className="table-header px-4 py-3 text-left">Source</th>
              <th className="table-header px-4 py-3 text-left">Last Seen</th>
            </tr>
          </thead>
          <tbody className={loading ? 'opacity-50' : ''}>
            {data.length === 0 && (
              <tr>
                <td colSpan={7} className="table-cell text-center text-gray-500 py-12">
                  No threat intel data. Set a GreyNoise API key and trigger sync.
                </td>
              </tr>
            )}
            {data.map((item) => (
              <tr key={item.id} className="table-row">
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
