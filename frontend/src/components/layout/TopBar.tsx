import { RefreshCw } from 'lucide-react';
import { useSyncStatus } from '../../api/hooks';
import { formatDistanceToNow } from 'date-fns';
import { api } from '../../api/client';
import { useQueryClient } from '@tanstack/react-query';

export function TopBar({ title }: { title: string }) {
  const { data: syncStatus } = useSyncStatus();
  const queryClient = useQueryClient();
  const lastSync = syncStatus?.[0]?.ran_at;

  async function triggerSync() {
    await api.post('/sync/trigger/cisa');
    await api.post('/sync/trigger/nvd');
    setTimeout(() => queryClient.invalidateQueries(), 3000);
  }

  return (
    <header className="h-14 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-950/80 backdrop-blur sticky top-0 z-20">
      <h2 className="text-base font-semibold text-gray-100">{title}</h2>
      <div className="flex items-center gap-4">
        {lastSync && (
          <span className="text-xs text-gray-500">
            Last sync {formatDistanceToNow(new Date(lastSync), { addSuffix: true })}
          </span>
        )}
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
