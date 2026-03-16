import { useState } from 'react';
import { useBreaches } from '../api/hooks';
import { FilterBar } from '../components/filters/FilterBar';
import { BreachTable } from '../components/breaches/BreachTable';
import { SkeletonTable } from '../components/SkeletonLoader';
import { TopBar } from '../components/layout/TopBar';

interface PageProps {
  onMobileMenuToggle?: () => void;
  isMobile?: boolean;
}

export function Breaches({ onMobileMenuToggle, isMobile }: PageProps) {
  const [filters, setFilters] = useState<Record<string, string | undefined>>({});
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('breach_date');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  const { data, isLoading } = useBreaches({ ...filters, page, limit: 50, sort, order });

  function handleFilterChange(key: string, value: string | boolean | undefined) {
    setFilters((prev) => ({ ...prev, [key]: value as string }));
    setPage(1);
  }

  function handleSort(field: string) {
    if (field === sort) {
      setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSort(field);
      setOrder('desc');
    }
    setPage(1);
  }

  return (
    <div>
      <TopBar title="Data Breaches" onMobileMenuToggle={onMobileMenuToggle} isMobile={isMobile} />
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
            loading={isLoading}
            sort={sort}
            order={order}
            onSort={handleSort}
          />
        )}
        {!data && isLoading && <SkeletonTable rows={10} cols={6} />}
      </div>
    </div>
  );
}
