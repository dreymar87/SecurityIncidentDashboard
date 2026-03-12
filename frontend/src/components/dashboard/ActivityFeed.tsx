import { formatDistanceToNow } from 'date-fns';
import { Shield, AlertTriangle } from 'lucide-react';
import { DashboardStats } from '../../api/client';

export function ActivityFeed({ stats }: { stats: DashboardStats }) {
  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-gray-300 mb-4">Recent Activity</h3>
      <div className="space-y-3">
        {stats.recentActivity.length === 0 && (
          <p className="text-xs text-gray-500 text-center py-4">No activity yet. Trigger a sync to fetch data.</p>
        )}
        {stats.recentActivity.map((item, i) => (
          <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-gray-800/40 hover:bg-gray-800/70 transition-colors">
            <div className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
              item.type === 'vulnerability'
                ? 'bg-red-600/20 text-red-400'
                : 'bg-orange-600/20 text-orange-400'
            }`}>
              {item.type === 'vulnerability'
                ? <Shield size={13} />
                : <AlertTriangle size={13} />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-mono text-gray-200 truncate">{item.identifier}</p>
              <p className="text-xs text-gray-500 mt-0.5 truncate">{item.detail}</p>
            </div>
            <span className="text-xs text-gray-600 flex-shrink-0 whitespace-nowrap">
              {item.event_time
                ? formatDistanceToNow(new Date(item.event_time), { addSuffix: true })
                : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
