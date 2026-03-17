import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAlerts, useUnreadAlertCount } from '../../api/hooks';
import { api } from '../../api/client';
import { useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import type { Alert } from '../../api/client';

function getAlertPath(alert: Alert): string {
  const type = (alert.type ?? '').toLowerCase();
  if (alert.reference_id) {
    if (type.includes('cve') || type.includes('vuln')) {
      return `/vulnerabilities/${alert.reference_id}`;
    }
    if (type.includes('breach')) {
      return `/breaches/${alert.reference_id}`;
    }
  }
  return '/notifications';
}

export function AlertBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: alerts } = useAlerts();
  const { data: unread } = useUnreadAlertCount();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const count = unread?.count ?? 0;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function markAllRead() {
    await api.patch('/alerts/read-all');
    queryClient.invalidateQueries({ queryKey: ['alerts'] });
    queryClient.invalidateQueries({ queryKey: ['alerts-unread'] });
  }

  async function handleAlertClick(alert: Alert) {
    if (!alert.read) {
      await api.patch(`/alerts/${alert.id}/read`);
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['alerts-unread'] });
    }
    setOpen(false);
    navigate(getAlertPath(alert));
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="icon-btn relative"
        aria-label={count > 0 ? `Alerts (${count} unread)` : 'Alerts'}
        aria-expanded={open}
      >
        <Bell size={15} />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-10 w-80 max-h-96 overflow-auto rounded-xl border shadow-xl z-50"
          style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Alerts</span>
            <div className="flex items-center gap-3">
              {count > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-sky-400 hover:text-sky-300"
                >
                  Mark all read
                </button>
              )}
              <Link
                to="/notifications"
                onClick={() => setOpen(false)}
                className="text-xs text-gray-400 hover:text-gray-200"
              >
                View all →
              </Link>
            </div>
          </div>

          {!alerts || alerts.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-xs" style={{ color: 'var(--color-text-faint)' }}>No alerts yet</p>
            </div>
          ) : (
            <div>
              {alerts.slice(0, 20).map((alert) => (
                <button
                  key={alert.id}
                  onClick={() => handleAlertClick(alert)}
                  className="w-full text-left px-4 py-3 border-b transition-colors hover:opacity-80"
                  style={{
                    borderColor: 'var(--color-border)',
                    backgroundColor: alert.read ? 'transparent' : 'rgba(14, 165, 233, 0.05)',
                  }}
                >
                  <div className="flex items-start gap-2">
                    <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      alert.severity === 'CRITICAL' ? 'bg-red-500' : 'bg-orange-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                        {alert.title}
                      </p>
                      {alert.message && (
                        <p className="text-xs truncate mt-0.5" style={{ color: 'var(--color-text-faint)' }}>
                          {alert.message}
                        </p>
                      )}
                      <p className="text-xs mt-1" style={{ color: 'var(--color-text-faint)' }}>
                        {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
