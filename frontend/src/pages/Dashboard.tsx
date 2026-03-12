import { useStats } from '../api/hooks';
import { MetricsPanel } from '../components/dashboard/MetricsPanel';
import { SeverityChart } from '../components/dashboard/SeverityChart';
import { WorldMap } from '../components/dashboard/WorldMap';
import { ActivityFeed } from '../components/dashboard/ActivityFeed';
import { TopBar } from '../components/layout/TopBar';
import { Loader } from 'lucide-react';

export function Dashboard() {
  const { data: stats, isLoading, error } = useStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="animate-spin text-sky-500" size={28} />
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
        <MetricsPanel stats={stats} />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <SeverityChart stats={stats} />
          </div>
          <ActivityFeed stats={stats} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <WorldMap
            countryData={stats.topVulnCountries}
            title="Vulnerabilities by Country"
            color="#0ea5e9"
          />
          <WorldMap
            countryData={stats.topBreachCountries}
            title="Breaches by Country"
            color="#f97316"
          />
        </div>
      </div>
    </div>
  );
}
