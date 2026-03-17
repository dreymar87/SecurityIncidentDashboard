import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useCurrentUser } from './api/hooks';
import { Sidebar } from './components/layout/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Vulnerabilities } from './pages/Vulnerabilities';
import { VulnerabilityDetail } from './pages/VulnerabilityDetail';
import { Breaches } from './pages/Breaches';
import { BreachDetailPage } from './pages/BreachDetailPage';
import { ThreatIntelPage } from './pages/ThreatIntel';
import { Import } from './pages/Import';
import { Settings } from './pages/Settings';
import { Attack } from './pages/Attack';
import { UserManagement } from './pages/UserManagement';
import { Notifications } from './pages/Notifications';
import { Login } from './pages/Login';

function AdminRoute({ element }: { element: React.ReactElement }) {
  const { data: currentUser, isLoading } = useCurrentUser();
  if (isLoading) return null;
  if (!currentUser) return <Navigate to="/login" replace />;
  if (currentUser.role !== 'admin') return <Navigate to="/" replace />;
  return element;
}

function useViewport() {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return width;
}

export default function App() {
  const width = useViewport();
  const isMobile = width < 768;
  const collapsed = width < 1024 && !isMobile;
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!isMobile) setMobileOpen(false);
  }, [isMobile]);

  const pageProps = { onMobileMenuToggle: () => setMobileOpen(true), isMobile };

  return (
    <div className="flex h-screen overflow-hidden">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <main id="main-content" className="flex-1 overflow-auto min-w-0">
        <Routes>
          <Route path="/" element={<Dashboard {...pageProps} />} />
          <Route path="/vulnerabilities" element={<Vulnerabilities {...pageProps} />} />
          <Route path="/vulnerabilities/:cveId" element={<VulnerabilityDetail {...pageProps} />} />
          <Route path="/breaches" element={<Breaches {...pageProps} />} />
          <Route path="/breaches/:id" element={<BreachDetailPage {...pageProps} />} />
          <Route path="/threat-intel" element={<ThreatIntelPage {...pageProps} />} />
          <Route path="/import" element={<AdminRoute element={<Import {...pageProps} />} />} />
          <Route path="/settings" element={<Settings {...pageProps} />} />
          <Route path="/attack" element={<Attack {...pageProps} />} />
          <Route path="/admin/users" element={<AdminRoute element={<UserManagement {...pageProps} />} />} />
          <Route path="/notifications" element={<Notifications {...pageProps} />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </main>
    </div>
  );
}
