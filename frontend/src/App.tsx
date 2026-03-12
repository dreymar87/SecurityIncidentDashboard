import { Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Vulnerabilities } from './pages/Vulnerabilities';
import { Breaches } from './pages/Breaches';
import { ThreatIntelPage } from './pages/ThreatIntel';
import { Import } from './pages/Import';

export default function App() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/vulnerabilities" element={<Vulnerabilities />} />
          <Route path="/breaches" element={<Breaches />} />
          <Route path="/threat-intel" element={<ThreatIntelPage />} />
          <Route path="/import" element={<Import />} />
        </Routes>
      </main>
    </div>
  );
}
