import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Shield, AlertTriangle, Radar, Upload, Settings, Activity, Crosshair
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/vulnerabilities', icon: Shield, label: 'Vulnerabilities' },
  { to: '/breaches', icon: AlertTriangle, label: 'Data Breaches' },
  { to: '/threat-intel', icon: Radar, label: 'Threat Intel' },
  { to: '/attack', icon: Crosshair, label: 'ATT&CK' },
  { to: '/import', icon: Upload, label: 'Import Data' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  return (
    <aside className="w-60 min-h-screen bg-gray-900 border-r border-gray-800 flex flex-col">
      <div className="px-5 py-6 border-b border-gray-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-sky-600 rounded-lg flex items-center justify-center">
            <Shield size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight">SecureSight</h1>
            <p className="text-xs text-gray-500">Threat Intelligence</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-sky-600/20 text-sky-400 border border-sky-600/30'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              }`
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-gray-800">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Activity size={12} className="text-green-400" />
          <span>Live monitoring active</span>
        </div>
      </div>
    </aside>
  );
}
