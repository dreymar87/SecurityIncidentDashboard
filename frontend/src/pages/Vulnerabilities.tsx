import { useState } from 'react';
import { useVulnerabilities } from '../api/hooks';
import { FilterBar } from '../components/filters/FilterBar';
import { VulnTable } from '../components/vulnerabilities/VulnTable';
import { SkeletonTable } from '../components/SkeletonLoader';
import { TopBar } from '../components/layout/TopBar';

interface PageProps {
  onMobileMenuToggle?: () => void;
  isMobile?: boolean;
}

export function Vulnerabilities({ onMobileMenuToggle, isMobile }: PageProps) {
  const [filters, setFilters] = useState<Record<string, string | boolean | undefined>>({});
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('published_at');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  const { data, isLoading } = useVulnerabilities({
    ...filters as Record<string, string>,
    page,
    limit: 50,
    sort,
    order,
  });

  function handleFilterChange(key: string, value: string | boolean | undefined) {
    setFilters((prev) => ({ ...prev, [key]: value }));
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
      <TopBar title="Vulnerabilities" onMobileMenuToggle={onMobileMenuToggle} isMobile={isMobile} />
      <div className="p-6 space-y-4">
        <FilterBar
          mode="vulnerabilities"
          filters={filters}
          onChange={handleFilterChange}
          onClear={() => { setFilters({}); setPage(1); }}
        />
        {data && (
          <VulnTable
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
        {!data && isLoading && <SkeletonTable rows={10} cols={7} />}
      </div>
    </div>
  );
}
