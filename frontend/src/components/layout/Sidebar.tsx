import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Shield, AlertTriangle, Radar, Upload, Settings, Activity, Crosshair, X, Users, LogOut, LogIn
} from 'lucide-react';
import { useCurrentUser, useLogout } from '../../api/hooks';

const baseNavItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/vulnerabilities', icon: Shield, label: 'Vulnerabilities' },
  { to: '/breaches', icon: AlertTriangle, label: 'Data Breaches' },
  { to: '/threat-intel', icon: Radar, label: 'Threat Intel' },
  { to: '/attack', icon: Crosshair, label: 'ATT&CK' },
  { to: '/import', icon: Upload, label: 'Import Data' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ collapsed, mobileOpen, onMobileClose }: SidebarProps) {
  const { data: currentUser } = useCurrentUser();
  const logout = useLogout();
  const isAdmin = currentUser?.role === 'admin';

  const navItems = [
    ...baseNavItems,
    ...(isAdmin ? [{ to: '/admin/users', icon: Users, label: 'Users' }] : []),
  ];

  async function handleLogout() {
    try {
      await logout.mutateAsync();
      window.location.reload();
    } catch { /* ignore */ }
  }

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={onMobileClose} />
      )}

      <aside
        className={`
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          fixed inset-y-0 left-0 z-50 md:translate-x-0 md:static md:z-auto
          ${collapsed ? 'md:w-16' : 'md:w-60'}
          w-60 min-h-screen bg-gray-900 border-r border-gray-800 flex flex-col
          transition-all duration-200 ease-in-out shrink-0
        `}
      >
        <div className={`py-6 border-b border-gray-800 ${collapsed ? 'px-3' : 'px-5'}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-sky-600 rounded-lg flex items-center justify-center shrink-0">
              <Shield size={18} className="text-white" />
            </div>
            {!collapsed && (
              <div>
                <h1 className="text-sm font-bold text-white tracking-tight">SecureSight</h1>
                <p className="text-xs text-gray-500">Threat Intelligence</p>
              </div>
            )}
            {/* Mobile close button */}
            <button
              onClick={onMobileClose}
              className="ml-auto md:hidden text-gray-400 hover:text-gray-200"
              aria-label="Close navigation menu"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <nav aria-label="Main navigation" className={`flex-1 py-4 space-y-1 ${collapsed ? 'px-2' : 'px-3'}`}>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onMobileClose}
              aria-label={collapsed ? label : undefined}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `flex items-center ${collapsed ? 'justify-center' : 'gap-3'} ${collapsed ? 'px-0 py-2.5' : 'px-3 py-2.5'} rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-sky-600/20 text-sky-400 border border-sky-600/30'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                }`
              }
            >
              <Icon size={17} />
              {!collapsed && label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-gray-800">
          {!collapsed && currentUser && (
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-medium text-gray-300">{currentUser.username}</p>
                <p className="text-xs text-gray-500 capitalize">{currentUser.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-gray-300 transition-colors"
                aria-label="Log out"
                title="Log out"
              >
                <LogOut size={14} />
              </button>
            </div>
          )}
          {!collapsed && !currentUser && (
            <NavLink
              to="/login"
              className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors mb-3"
            >
              <LogIn size={12} />
              <span>Log in</span>
            </NavLink>
          )}
          {!collapsed && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Activity size={12} className="text-green-400" />
              <span>Live monitoring active</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
