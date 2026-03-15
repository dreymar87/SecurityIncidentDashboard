import { useState } from 'react';
import { useThreatIntel } from '../api/hooks';
import { ThreatPanel } from '../components/threatIntel/ThreatPanel';
import { TopBar } from '../components/layout/TopBar';
import { Search, X } from 'lucide-react';

export function ThreatIntelPage() {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);

  const { data, isLoading } = useThreatIntel({ ...filters, page: String(page) });

  return (
    <div>
      <TopBar title="Threat Intelligence" />
      <div className="p-6 space-y-4">
        <div className="card flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              className="input pl-8 w-full"
              placeholder="Search IP, org, country…"
              value={filters.q || ''}
              onChange={(e) => { setFilters((f) => ({ ...f, q: e.target.value })); setPage(1); }}
            />
          </div>
          <input
            className="input w-36"
            placeholder="Country"
            value={filters.country || ''}
            onChange={(e) => { setFilters((f) => ({ ...f, country: e.target.value })); setPage(1); }}
          />
          <select
            className="input"
            value={filters.source || ''}
            onChange={(e) => { setFilters((f) => ({ ...f, source: e.target.value })); setPage(1); }}
          >
            <option value="">All Sources</option>
            <option value="greynoise">GreyNoise</option>
          </select>
          {Object.values(filters).some(Boolean) && (
            <button
              onClick={() => { setFilters({}); setPage(1); }}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200"
            >
              <X size={13} /> Clear
            </button>
          )}
        </div>

        {data ? (
          <ThreatPanel
            data={data.data}
            total={data.total}
            page={data.page}
            pages={data.pages}
            onPageChange={setPage}
            loading={isLoading}
          />
        ) : (
          <div className="card flex items-center justify-center h-48 text-gray-500">
            {isLoading ? 'Loading threat intel…' : 'No data'}
          </div>
        )}
      </div>
    </div>
  );
}
