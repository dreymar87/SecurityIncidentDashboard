import { formatDistanceToNow } from 'date-fns';
import { Shield, AlertTriangle, Wifi } from 'lucide-react';
import { DashboardStats } from '../../api/client';
import { SeverityBadge } from '../vulnerabilities/SeverityBadge';

const TYPE_CONFIG = {
  vulnerability: {
    icon: Shield,
    iconClass: 'bg-red-600/20 text-red-400',
  },
  breach: {
    icon: AlertTriangle,
    iconClass: 'bg-orange-600/20 text-orange-400',
  },
  threat: {
    icon: Wifi,
    iconClass: 'bg-purple-600/20 text-purple-400',
  },
} as const;

function formatDetail(type: string, detail: string | null): React.ReactNode {
  if (!detail) return <span className="text-gray-600">—</span>;
  if (type === 'vulnerability') {
    // detail is a severity string — render as a badge
    return <SeverityBadge severity={detail} />;
  }
  if (type === 'breach') {
    // detail may be a raw number string (records affected) or org name
    const num = parseInt(detail.replace(/[^0-9]/g, ''));
    if (!isNaN(num) && num > 0) {
      return <span className="text-orange-400">{num.toLocaleString()} records</span>;
    }
  }
  return <span className="text-gray-500 truncate">{detail}</span>;
}

export function ActivityFeed({ stats }: { stats: DashboardStats }) {
  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-gray-300 mb-4">Recent Activity</h3>
      <div className="space-y-3">
        {stats.recentActivity.length === 0 && (
          <p className="text-xs text-gray-500 text-center py-4">No activity yet. Trigger a sync to fetch data.</p>
        )}
        {stats.recentActivity.map((item, i) => {
          const config = TYPE_CONFIG[item.type as keyof typeof TYPE_CONFIG] ?? TYPE_CONFIG.vulnerability;
          const Icon = config.icon;
          return (
            <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-gray-800/40 hover:bg-gray-800/70 transition-colors">
              <div className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${config.iconClass}`}>
                <Icon size={13} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-mono text-gray-200 truncate">{item.identifier}</p>
                <div className="text-xs mt-0.5">
                  {formatDetail(item.type, item.detail)}
                </div>
              </div>
              <span className="text-xs text-gray-600 flex-shrink-0 whitespace-nowrap">
                {item.event_time
                  ? formatDistanceToNow(new Date(item.event_time), { addSuffix: true })
                  : '—'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
