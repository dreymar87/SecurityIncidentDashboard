import { Shield, AlertTriangle, Database, Wifi, Zap } from 'lucide-react';
import { DashboardStats } from '../../api/client';

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  sub?: string;
}

function MetricCard({ label, value, icon: Icon, color, sub }: MetricCardProps) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-white font-mono">{value.toLocaleString()}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export function MetricsPanel({ stats }: { stats: DashboardStats }) {
  const { overview } = stats;
  return (
    <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
      <MetricCard
        label="Total CVEs"
        value={overview.totalVulnerabilities}
        icon={Shield}
        color="bg-sky-600/20 text-sky-400"
      />
      <MetricCard
        label="Active Exploits"
        value={overview.activeExploits}
        icon={Zap}
        color="bg-red-600/20 text-red-400"
        sub="CISA KEV"
      />
      <MetricCard
        label="Data Breaches"
        value={overview.totalBreaches}
        icon={AlertTriangle}
        color="bg-orange-600/20 text-orange-400"
      />
      <MetricCard
        label="Records Exposed"
        value={overview.totalBreachRecords > 1_000_000
          ? `${(overview.totalBreachRecords / 1_000_000).toFixed(1)}M`
          : overview.totalBreachRecords.toLocaleString()}
        icon={Database}
        color="bg-purple-600/20 text-purple-400"
        sub="across all breaches"
      />
      <MetricCard
        label="Threat IPs"
        value={overview.threatIps}
        icon={Wifi}
        color="bg-yellow-600/20 text-yellow-400"
        sub="flagged malicious"
      />
    </div>
  );
}
