import { useStats } from '../api/hooks';
import { MetricsPanel } from '../components/dashboard/MetricsPanel';
import { SeverityChart } from '../components/dashboard/SeverityChart';
import { WorldMap } from '../components/dashboard/WorldMap';
import { ActivityFeed } from '../components/dashboard/ActivityFeed';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { SkeletonMetric, SkeletonCard, SkeletonTable } from '../components/SkeletonLoader';
import { TopBar } from '../components/layout/TopBar';

export function Dashboard() {
  const { data: stats, isLoading, error } = useStats();

  if (isLoading) {
    return (
      <div>
        <TopBar title="Dashboard" />
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonMetric key={i} />)}
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2"><SkeletonTable rows={6} cols={4} /></div>
            <SkeletonCard />
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-500">
        Failed to load dashboard data. Check backend connection.
      </div>
    );
  }

  return (
    <div>
      <TopBar title="Dashboard" />
      <div className="p-6 space-y-6">
        <ErrorBoundary label="Metrics">
          <MetricsPanel stats={stats} />
        </ErrorBoundary>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <ErrorBoundary label="Severity Chart">
              <SeverityChart stats={stats} />
            </ErrorBoundary>
          </div>
          <ErrorBoundary label="Activity Feed">
            <ActivityFeed stats={stats} />
          </ErrorBoundary>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <ErrorBoundary label="Vulnerability Map">
            <WorldMap
              countryData={stats.topVulnCountries}
              title="Vulnerabilities by Country"
              color="#0ea5e9"
            />
          </ErrorBoundary>
          <ErrorBoundary label="Breach Map">
            <WorldMap
              countryData={stats.topBreachCountries}
              title="Breaches by Country"
              color="#f97316"
            />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
