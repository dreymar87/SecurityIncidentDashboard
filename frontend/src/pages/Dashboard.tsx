import { useStats } from '../api/hooks';
import { MetricsPanel } from '../components/dashboard/MetricsPanel';
import { SeverityChart } from '../components/dashboard/SeverityChart';
import { WorldMap } from '../components/dashboard/WorldMap';
import { ActivityFeed } from '../components/dashboard/ActivityFeed';
import { TrendChart } from '../components/dashboard/TrendChart';
import { PrintHeader } from '../components/dashboard/PrintHeader';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { SkeletonMetric, SkeletonCard, SkeletonTable } from '../components/SkeletonLoader';
import { TopBar } from '../components/layout/TopBar';
import { RefreshCw, Zap, Printer } from 'lucide-react';
import { api } from '../api/client';
import { useQueryClient } from '@tanstack/react-query';

interface PageProps {
  onMobileMenuToggle?: () => void;
  isMobile?: boolean;
}

export function Dashboard({ onMobileMenuToggle, isMobile }: PageProps) {
  const { data: stats, isLoading, error } = useStats();
  const queryClient = useQueryClient();

  const isEmpty = stats && stats.overview.totalVulnerabilities === 0
    && stats.overview.totalBreaches === 0
    && stats.overview.threatIps === 0;

  async function handleFirstSync() {
    await api.post('/sync/trigger/cisa');
    await api.post('/sync/trigger/nvd');
    await api.post('/sync/trigger/hibp');
    setTimeout(() => queryClient.invalidateQueries(), 5000);
  }

  if (isLoading) {
    return (
      <div>
        <TopBar title="Dashboard" onMobileMenuToggle={onMobileMenuToggle} isMobile={isMobile} />
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
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
      <TopBar title="Dashboard" onMobileMenuToggle={onMobileMenuToggle} isMobile={isMobile} />
      <div className="p-6 space-y-6">
        {/* Print-only header */}
        <PrintHeader />

        {/* Export Report button */}
        <div className="flex justify-end no-print">
          <button
            onClick={() => window.print()}
            className="btn-secondary text-xs py-1.5 flex items-center gap-1.5"
            aria-label="Export dashboard as PDF"
          >
            <Printer size={13} /> Export Report
          </button>
        </div>

        <ErrorBoundary label="Metrics">
          <MetricsPanel stats={stats} />
        </ErrorBoundary>

        {isEmpty && (
          <div className="card border-sky-600/30 bg-sky-600/5">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-sky-600/20 flex items-center justify-center shrink-0">
                <Zap size={20} className="text-sky-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Welcome to SecureSight</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-faint)' }}>
                  Run your first sync to fetch vulnerability, breach, and threat intelligence data from connected sources.
                </p>
              </div>
              <button onClick={handleFirstSync} className="btn-primary text-xs flex items-center gap-2 shrink-0">
                <RefreshCw size={13} /> Run First Sync
              </button>
            </div>
          </div>
        )}

        <ErrorBoundary label="Trend Chart">
          <TrendChart />
        </ErrorBoundary>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ErrorBoundary label="Severity Chart">
              <SeverityChart stats={stats} />
            </ErrorBoundary>
          </div>
          <ErrorBoundary label="Activity Feed">
            <ActivityFeed stats={stats} />
          </ErrorBoundary>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
          <ErrorBoundary label="Threat Intel Map">
            <WorldMap
              countryData={stats.topThreatCountries}
              title="Threat IPs by Country"
              color="#a855f7"
            />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
