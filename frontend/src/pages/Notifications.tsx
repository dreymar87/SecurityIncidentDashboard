import { useState } from 'react';
import { Bell, CheckCheck, Filter } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useAlertsFeed, useMarkAlertRead, useMarkAllAlertsRead } from '../api/hooks';
import { TopBar } from '../components/layout/TopBar';
import { SkeletonTable } from '../components/SkeletonLoader';
import type { Alert } from '../api/client';

function getAlertPath(alert: Alert): string | null {
  const type = (alert.type ?? '').toLowerCase();
  if (alert.reference_id) {
    if (type.includes('cve') || type.includes('vuln')) {
      return `/vulnerabilities/${alert.reference_id}`;
    }
    if (type.includes('breach')) {
      return `/breaches/${alert.reference_id}`;
    }
  }
  return null;
}

interface PageProps {
  onMobileMenuToggle?: () => void;
  isMobile?: boolean;
}

const SEVERITIES = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const SOURCES = ['', 'critical_vuln', 'cisa_kev', 'breach', 'failed_login', 'test'];

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-500/20 text-red-400 border-red-500/30',
  HIGH: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  MEDIUM: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  LOW: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

const SEVERITY_DOT: Record<string, string> = {
  CRITICAL: 'bg-red-500',
  HIGH: 'bg-orange-500',
  MEDIUM: 'bg-yellow-500',
  LOW: 'bg-blue-500',
};

export function Notifications({ onMobileMenuToggle, isMobile }: PageProps) {
  const navigate = useNavigate();
  const [severity, setSeverity] = useState('');
  const [source, setSource] = useState('');
  const [readFilter, setReadFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const filters = {
    ...(severity && severity !== 'ALL' ? { severity } : {}),
    ...(source ? { source } : {}),
    ...(readFilter ? { read: readFilter as 'true' | 'false' } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    page,
    limit: 50,
  };

  const { data, isLoading } = useAlertsFeed(filters);
  const markRead = useMarkAlertRead();
  const markAllRead = useMarkAllAlertsRead();

  const alerts = data?.alerts ?? [];
  const total = data?.total ?? 0;
  const totalPages = data ? Math.ceil(data.total / data.limit) : 1;

  function clearFilters() {
    setSeverity('');
    setSource('');
    setReadFilter('');
    setFrom('');
    setTo('');
    setPage(1);
  }

  return (
    <div>
      <TopBar title="Notification Center" onMobileMenuToggle={onMobileMenuToggle} isMobile={isMobile} />
      <div className="p-6 space-y-4">
        {/* Filter bar */}
        <div
          className="rounded-xl border p-4"
          style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex flex-wrap gap-3 items-center">
            <Filter size={15} className="text-gray-400 shrink-0" />

            <select
              value={severity}
              onChange={(e) => { setSeverity(e.target.value); setPage(1); }}
              className="text-sm rounded-lg px-3 py-1.5 border"
              style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
              aria-label="Filter by severity"
            >
              <option value="">All severities</option>
              {SEVERITIES.filter((s) => s !== 'ALL').map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select
              value={source}
              onChange={(e) => { setSource(e.target.value); setPage(1); }}
              className="text-sm rounded-lg px-3 py-1.5 border"
              style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
              aria-label="Filter by source"
            >
              <option value="">All types</option>
              {SOURCES.filter(Boolean).map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>

            <select
              value={readFilter}
              onChange={(e) => { setReadFilter(e.target.value); setPage(1); }}
              className="text-sm rounded-lg px-3 py-1.5 border"
              style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
              aria-label="Filter by read status"
            >
              <option value="">All</option>
              <option value="false">Unread</option>
              <option value="true">Read</option>
            </select>

            <input
              type="date"
              value={from}
              onChange={(e) => { setFrom(e.target.value); setPage(1); }}
              className="text-sm rounded-lg px-3 py-1.5 border"
              style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
              aria-label="From date"
            />
            <input
              type="date"
              value={to}
              onChange={(e) => { setTo(e.target.value); setPage(1); }}
              className="text-sm rounded-lg px-3 py-1.5 border"
              style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
              aria-label="To date"
            />

            <button
              onClick={clearFilters}
              className="text-xs px-3 py-1.5 rounded-lg border transition-colors hover:opacity-80"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
            >
              Clear
            </button>

            <div className="ml-auto">
              <button
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white transition-colors disabled:opacity-50"
              >
                <CheckCheck size={14} />
                Mark all read
              </button>
            </div>
          </div>
        </div>

        {/* Alerts table */}
        <div
          className="rounded-xl border overflow-hidden"
          style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-2">
              <Bell size={15} className="text-sky-400" />
              <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Alerts
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-300">
                {total}
              </span>
            </div>
          </div>

          {isLoading && <SkeletonTable rows={10} cols={4} />}

          {!isLoading && alerts.length === 0 && (
            <div className="px-4 py-16 text-center">
              <Bell size={32} className="mx-auto mb-3 text-gray-600" />
              <p className="text-sm" style={{ color: 'var(--color-text-faint)' }}>No alerts match your filters.</p>
            </div>
          )}

          {!isLoading && alerts.length > 0 && (
            <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
              {alerts.map((alert) => (
                <button
                  key={alert.id}
                  onClick={() => {
                    if (!alert.read) markRead.mutate(alert.id);
                    const path = getAlertPath(alert);
                    if (path) navigate(path);
                  }}
                  className="w-full text-left px-4 py-3 transition-colors hover:opacity-80 flex items-start gap-3"
                  style={{
                    backgroundColor: alert.read ? 'transparent' : 'rgba(14, 165, 233, 0.04)',
                  }}
                >
                  <span
                    className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${SEVERITY_DOT[alert.severity ?? ''] ?? 'bg-gray-500'}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        {alert.title}
                      </p>
                      {alert.severity && (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${SEVERITY_COLORS[alert.severity] ?? ''}`}>
                          {alert.severity}
                        </span>
                      )}
                      {!alert.read && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
                          NEW
                        </span>
                      )}
                    </div>
                    {alert.message && (
                      <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-secondary)' }}>
                        {alert.message}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs" style={{ color: 'var(--color-text-faint)' }}>
                        {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--color-text-faint)' }}>
                        {alert.type.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <span className="text-xs" style={{ color: 'var(--color-text-faint)' }}>
                Page {page} of {totalPages} ({total} total)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="text-xs px-3 py-1.5 rounded-lg border disabled:opacity-40 hover:opacity-80"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="text-xs px-3 py-1.5 rounded-lg border disabled:opacity-40 hover:opacity-80"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
