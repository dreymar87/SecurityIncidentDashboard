import { useState } from 'react';
import { useThreatIntel, useThreatIntelDetail } from '../api/hooks';
import { ThreatPanel } from '../components/threatIntel/ThreatPanel';
import { ThreatIntelDetail } from '../components/threatIntel/ThreatIntelDetail';
import { TopBar } from '../components/layout/TopBar';
import { Search, X } from 'lucide-react';

interface PageProps {
  onMobileMenuToggle?: () => void;
  isMobile?: boolean;
}

export function ThreatIntelPage({ onMobileMenuToggle, isMobile }: PageProps) {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('risk_score');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data, isLoading } = useThreatIntel({ ...filters, page: String(page), sort, order });
  const { data: detail } = useThreatIntelDetail(selectedId);

  function handleSort(field: string) {
    if (field === sort) {
      setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSort(field);
      setOrder('desc');
    }
    setPage(1);
  }

  function handleSelect(id: number) {
    setSelectedId((prev) => (prev === id ? null : id));
  }

  return (
    <div>
      <TopBar title="Threat Intelligence" onMobileMenuToggle={onMobileMenuToggle} isMobile={isMobile} />
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

        <div className={selectedId ? 'grid grid-cols-1 lg:grid-cols-2 gap-4' : ''}>
          {data ? (
            <ThreatPanel
              data={data.data}
              total={data.total}
              page={data.page}
              pages={data.pages}
              onPageChange={setPage}
              loading={isLoading}
              sort={sort}
              order={order}
              onSort={handleSort}
              onSelect={handleSelect}
              selectedId={selectedId}
            />
          ) : (
            <div className="card flex items-center justify-center h-48 text-gray-500">
              {isLoading ? 'Loading threat intel…' : 'No data'}
            </div>
          )}

          {selectedId && detail && (
            <ThreatIntelDetail
              data={detail}
              onClose={() => setSelectedId(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
