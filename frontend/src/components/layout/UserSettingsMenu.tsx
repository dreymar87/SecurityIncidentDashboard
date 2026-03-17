import { useRef, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Bell, Sliders, Lock, Shield, LogOut, LogIn, ChevronUp } from 'lucide-react';
import { useCurrentUser, useLogout } from '../../api/hooks';

interface UserSettingsMenuProps {
  collapsed: boolean;
}

export function UserSettingsMenu({ collapsed }: UserSettingsMenuProps) {
  const { data: currentUser } = useCurrentUser();
  const logout = useLogout();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isAdmin = currentUser?.role === 'admin';
  const initials = currentUser?.username?.charAt(0).toUpperCase() ?? '?';

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  async function handleLogout() {
    setOpen(false);
    try {
      await logout.mutateAsync();
      window.location.reload();
    } catch { /* ignore */ }
  }

  function handleNavLink(to: string) {
    setOpen(false);
    navigate(to);
  }

  if (!currentUser) {
    return (
      <Link
        to="/login"
        className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
      >
        <LogIn size={12} />
        {!collapsed && <span>Log in</span>}
      </Link>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Popup panel */}
      {open && (
        <div
          className="absolute bottom-full mb-2 left-0 w-56 rounded-xl border shadow-xl z-50 py-1"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            borderColor: 'var(--color-border)',
          }}
        >
          {/* Header */}
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-sky-600 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-white">{initials}</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                {currentUser.username}
              </p>
              <span
                className="text-[10px] capitalize px-1.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: isAdmin ? 'rgba(14,165,233,0.15)' : 'rgba(107,114,128,0.2)',
                  color: isAdmin ? '#38bdf8' : 'var(--color-text-muted)',
                }}
              >
                {currentUser.role}
              </span>
            </div>
          </div>

          <div className="border-t my-1" style={{ borderColor: 'var(--color-border)' }} />

          {/* Settings links */}
          <button
            onClick={() => handleNavLink('/settings')}
            className="w-full flex items-center gap-3 px-4 py-2 text-xs text-left transition-colors hover:bg-gray-800/60"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <User size={13} />
            Profile Settings
          </button>
          <button
            onClick={() => handleNavLink('/settings')}
            className="w-full flex items-center gap-3 px-4 py-2 text-xs text-left transition-colors hover:bg-gray-800/60"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <Bell size={13} />
            Alert Preferences
          </button>
          {isAdmin && (
            <button
              onClick={() => handleNavLink('/settings')}
              className="w-full flex items-center gap-3 px-4 py-2 text-xs text-left transition-colors hover:bg-gray-800/60"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <Sliders size={13} />
              Notification Channels
            </button>
          )}

          <div className="border-t my-1" style={{ borderColor: 'var(--color-border)' }} />

          {/* Security section */}
          <p className="px-4 pt-1 pb-0.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-faint)' }}>
            Security
          </p>
          <button
            onClick={() => handleNavLink('/settings')}
            className="w-full flex items-center gap-3 px-4 py-2 text-xs text-left transition-colors hover:bg-gray-800/60"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <Lock size={13} />
            Change Password
          </button>
          <button
            disabled
            className="w-full flex items-center gap-3 px-4 py-2 text-xs text-left opacity-50 cursor-not-allowed"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <Shield size={13} />
            <span>Two-Factor Auth</span>
            <span
              className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: 'rgba(107,114,128,0.25)', color: 'var(--color-text-faint)' }}
            >
              Soon
            </span>
          </button>

          <div className="border-t my-1" style={{ borderColor: 'var(--color-border)' }} />

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-xs text-left transition-colors hover:bg-red-500/10"
            style={{ color: '#f87171' }}
          >
            <LogOut size={13} />
            Sign Out
          </button>
        </div>
      )}

      {/* Trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 rounded-lg px-1 py-1.5 transition-colors hover:bg-gray-800/60"
        aria-label="User settings"
        aria-expanded={open}
      >
        <div className="w-7 h-7 rounded-full bg-sky-600 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-white">{initials}</span>
        </div>
        {!collapsed && (
          <>
            <div className="flex-1 text-left min-w-0">
              <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text-secondary)' }}>
                {currentUser.username}
              </p>
              <p className="text-[10px] capitalize" style={{ color: 'var(--color-text-faint)' }}>
                {currentUser.role}
              </p>
            </div>
            <ChevronUp
              size={12}
              className="shrink-0 transition-transform"
              style={{
                color: 'var(--color-text-faint)',
                transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            />
          </>
        )}
      </button>
    </div>
  );
}
