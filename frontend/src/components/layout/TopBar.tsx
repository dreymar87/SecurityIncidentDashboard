import { RefreshCw, Sun, Moon } from 'lucide-react';
import { useSyncStatus } from '../../api/hooks';
import { formatDistanceToNow } from 'date-fns';
import { api } from '../../api/client';
import { useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { AlertBell } from './AlertBell';

function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  return { theme, toggle };
}

export function TopBar({ title }: { title: string }) {
  const { data: syncStatus } = useSyncStatus();
  const queryClient = useQueryClient();
  const lastSync = syncStatus?.[0]?.ran_at;
  const { theme, toggle: toggleTheme } = useTheme();

  async function triggerSync() {
    await api.post('/sync/trigger/cisa');
    await api.post('/sync/trigger/nvd');
    setTimeout(() => queryClient.invalidateQueries(), 3000);
  }

  return (
    <header className="h-14 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-950/80 backdrop-blur sticky top-0 z-20" style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border)' }}>
      <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>{title}</h2>
      <div className="flex items-center gap-4">
        {lastSync && (
          <span className="text-xs" style={{ color: 'var(--color-text-faint)' }}>
            Last sync {formatDistanceToNow(new Date(lastSync), { addSuffix: true })}
          </span>
        )}
        <AlertBell />
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-lg transition-colors hover:bg-gray-800"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={15} className="text-gray-400" /> : <Moon size={15} className="text-gray-500" />}
        </button>
        <button
          onClick={triggerSync}
          className="flex items-center gap-2 btn-secondary text-xs py-1.5"
        >
          <RefreshCw size={13} />
          Sync Now
        </button>
      </div>
    </header>
  );
}
