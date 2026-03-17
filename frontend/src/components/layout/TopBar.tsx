import { RefreshCw, Sun, Moon, Menu, Search, X } from 'lucide-react';
import { useSyncStatus, useGlobalSearch } from '../../api/hooks';
import { formatDistanceToNow } from 'date-fns';
import { api } from '../../api/client';
import { useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

interface TopBarProps {
  title: string;
  onMobileMenuToggle?: () => void;
  isMobile?: boolean;
}

export function TopBar({ title, onMobileMenuToggle, isMobile }: TopBarProps) {
  const { data: syncStatus } = useSyncStatus();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const lastSync = syncStatus?.[0]?.ran_at;
  const { theme, toggle: toggleTheme } = useTheme();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const debouncedQ = useDebounce(searchInput, 300);
  const { data: searchResults, isLoading: searchLoading } = useGlobalSearch(debouncedQ);
  const searchRef = useRef<HTMLDivElement>(null);

  const hasResults = searchResults && (
    searchResults.vulnerabilities.length > 0 ||
    searchResults.breaches.length > 0 ||
    searchResults.threatIntel.length > 0
  );
  const showDropdown = searchOpen && debouncedQ.length >= 2;

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleResultClick(path: string) {
    navigate(path);
    setSearchOpen(false);
    setSearchInput('');
  }

  async function triggerSync() {
    await api.post('/sync/trigger/cisa');
    await api.post('/sync/trigger/nvd');
    setTimeout(() => queryClient.invalidateQueries(), 3000);
  }

  return (
    <header id="topbar" className="h-14 border-b border-gray-800 flex items-center justify-between px-4 sm:px-6 bg-gray-950/80 backdrop-blur sticky top-0 z-20" style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border)' }}>
      <div className="flex items-center gap-3">
        {isMobile && (
          <button onClick={onMobileMenuToggle} className="icon-btn" aria-label="Open navigation menu">
            <Menu size={18} />
          </button>
        )}
        <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>{title}</h2>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Global Search */}
        <div ref={searchRef} className="relative hidden sm:block" role="search">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              className="input pl-8 pr-8 w-48 lg:w-64 py-1.5 text-xs"
              placeholder="Search across all data…"
              aria-label="Search across all data"
              value={searchInput}
              onChange={(e) => { setSearchInput(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={(e) => { if (e.key === 'Escape') { setSearchOpen(false); setSearchInput(''); } }}
            />
            {searchInput && (
              <button
                onClick={() => { setSearchInput(''); setSearchOpen(false); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {showDropdown && (
            <div
              className="absolute right-0 top-full mt-1 w-80 rounded-lg border shadow-xl overflow-hidden"
              style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
            >
              {searchLoading && (
                <div className="px-4 py-3 text-xs text-gray-500 text-center">Searching…</div>
              )}

              {!searchLoading && !hasResults && (
                <div className="px-4 py-3 text-xs text-gray-500 text-center">No results found.</div>
              )}

              {!searchLoading && hasResults && (
                <div className="max-h-80 overflow-y-auto">
                  {searchResults!.vulnerabilities.length > 0 && (
                    <div>
                      <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                        Vulnerabilities
                      </div>
                      {searchResults!.vulnerabilities.map((v) => (
                        <button
                          key={v.id}
                          onClick={() => handleResultClick(`/vulnerabilities/${v.cve_id}`)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-800/50 transition-colors flex items-center gap-2"
                        >
                          <span className="text-xs font-mono text-sky-400">{v.cve_id}</span>
                          <span className="text-xs text-gray-400 truncate flex-1">{v.title || ''}</span>
                          {v.severity && <span className={`text-xs px-1.5 py-0.5 rounded badge-${v.severity.toLowerCase()}`}>{v.severity}</span>}
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults!.breaches.length > 0 && (
                    <div>
                      <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                        Data Breaches
                      </div>
                      {searchResults!.breaches.map((b) => (
                        <button
                          key={b.id}
                          onClick={() => handleResultClick(`/breaches/${b.id}`)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-800/50 transition-colors flex items-center gap-2"
                        >
                          <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>{b.organization || '—'}</span>
                          <span className="text-xs text-gray-500 truncate flex-1">{b.domain}</span>
                          {b.country && <span className="text-xs text-gray-500">{b.country}</span>}
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults!.threatIntel.length > 0 && (
                    <div>
                      <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                        Threat Intel
                      </div>
                      {searchResults!.threatIntel.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => handleResultClick('/threat-intel')}
                          className="w-full text-left px-3 py-2 hover:bg-gray-800/50 transition-colors flex items-center gap-2"
                        >
                          <span className="text-xs font-mono text-yellow-400">{t.ip_address}</span>
                          <span className="text-xs text-gray-400 truncate flex-1">{t.org || ''}</span>
                          <span className="text-xs text-gray-500">{t.country}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {lastSync && !isMobile && (
          <span className="text-xs hidden lg:inline" style={{ color: 'var(--color-text-faint)' }}>
            Last sync {formatDistanceToNow(new Date(lastSync), { addSuffix: true })}
          </span>
        )}
        <AlertBell />
        <button
          onClick={toggleTheme}
          className="icon-btn"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
        <button
          onClick={triggerSync}
          className="flex items-center gap-2 btn-secondary text-xs py-1.5"
          aria-label="Sync data now"
        >
          <RefreshCw size={13} />
          <span className="hidden sm:inline">Sync Now</span>
        </button>
      </div>
    </header>
  );
}
