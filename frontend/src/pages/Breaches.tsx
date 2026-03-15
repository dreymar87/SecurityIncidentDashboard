import { useState } from 'react';
import { useBreaches } from '../api/hooks';
import { Breach } from '../api/client';
import { FilterBar } from '../components/filters/FilterBar';
import { BreachTable } from '../components/breaches/BreachTable';
import { BreachDetail } from '../components/breaches/BreachDetail';
import { TopBar } from '../components/layout/TopBar';

export function Breaches() {
  const [filters, setFilters] = useState<Record<string, string | undefined>>({});
  const [page, setPage] = useState(1);
  const [selectedBreach, setSelectedBreach] = useState<Breach | null>(null);

  const { data, isLoading } = useBreaches({ ...filters, page, limit: 50 });

  function handleFilterChange(key: string, value: string | boolean | undefined) {
    setFilters((prev) => ({ ...prev, [key]: value as string }));
    setPage(1);
  }

  return (
    <div>
      <TopBar title="Data Breaches" />
      <div className="p-6 space-y-4">
        <FilterBar
          mode="breaches"
          filters={filters}
          onChange={handleFilterChange}
          onClear={() => { setFilters({}); setPage(1); }}
        />
        {data && (
          <BreachTable
            data={data.data}
            total={data.total}
            page={data.page}
            pages={data.pages}
            onPageChange={setPage}
            onSelect={setSelectedBreach}
            loading={isLoading}
          />
        )}
        {!data && isLoading && (
          <div className="card flex items-center justify-center h-48 text-gray-500">
            Loading breaches…
          </div>
        )}
      </div>
      {selectedBreach && (
        <BreachDetail breach={selectedBreach} onClose={() => setSelectedBreach(null)} />
      )}
    </div>
  );
}
