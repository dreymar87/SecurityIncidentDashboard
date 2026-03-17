import { useState, useCallback, useRef, useEffect } from 'react';
import GridLayout from 'react-grid-layout';
import type { LayoutItem } from 'react-grid-layout';
import { Plus, Printer, RotateCcw, GripHorizontal, X } from 'lucide-react';
import { MetricsPanel } from './MetricsPanel';
import { TrendChart } from './TrendChart';
import { SeverityChart } from './SeverityChart';
import { ActivityFeed } from './ActivityFeed';
import { WorldMap } from './WorldMap';
import { ErrorBoundary } from '../ErrorBoundary';
import { WidgetPicker, WIDGET_CATALOG } from './WidgetPicker';
import type { DashboardStats } from '../../api/client';

const STORAGE_KEY_WIDGETS = 'dashboard-widgets';
const STORAGE_KEY_LAYOUT = 'dashboard-layout';

const DEFAULT_WIDGETS = ['metrics', 'trend', 'severity', 'activity', 'vuln-map', 'breach-map', 'threat-map'];

const DEFAULT_LAYOUT: LayoutItem[] = [
  { i: 'metrics',    x: 0,  y: 0,  w: 12, h: 3 },
  { i: 'trend',      x: 0,  y: 3,  w: 12, h: 4 },
  { i: 'severity',   x: 0,  y: 7,  w: 8,  h: 6 },
  { i: 'activity',   x: 8,  y: 7,  w: 4,  h: 6 },
  { i: 'vuln-map',   x: 0,  y: 13, w: 4,  h: 6 },
  { i: 'breach-map', x: 4,  y: 13, w: 4,  h: 6 },
  { i: 'threat-map', x: 8,  y: 13, w: 4,  h: 6 },
];

function loadWidgets(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_WIDGETS);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return DEFAULT_WIDGETS;
}

function loadLayout(): LayoutItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_LAYOUT);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return DEFAULT_LAYOUT;
}

interface DashboardGridProps {
  stats: DashboardStats;
}

export function DashboardGrid({ stats }: DashboardGridProps) {
  const [widgets, setWidgets] = useState<string[]>(loadWidgets);
  const [layout, setLayout] = useState<LayoutItem[]>(loadLayout);
  const [pickerOpen, setPickerOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1200);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setContainerWidth(el.offsetWidth);
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width;
      if (w) setContainerWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const saveWidgets = useCallback((w: string[]) => {
    setWidgets(w);
    localStorage.setItem(STORAGE_KEY_WIDGETS, JSON.stringify(w));
  }, []);

  const saveLayout = useCallback((l: LayoutItem[]) => {
    setLayout(l);
    localStorage.setItem(STORAGE_KEY_LAYOUT, JSON.stringify(l));
  }, []);

  function addWidget(id: string) {
    const def = WIDGET_CATALOG.find(w => w.id === id);
    if (!def) return;
    saveWidgets([...widgets, id]);
    const maxY = layout.length > 0 ? Math.max(...layout.map(l => l.y + l.h)) : 0;
    saveLayout([...layout, { i: id, x: 0, y: maxY, w: def.defaultW, h: def.defaultH }]);
  }

  function removeWidget(id: string) {
    saveWidgets(widgets.filter(w => w !== id));
    saveLayout(layout.filter(l => l.i !== id));
  }

  function resetLayout() {
    saveWidgets(DEFAULT_WIDGETS);
    saveLayout(DEFAULT_LAYOUT);
  }

  // Only include layout entries for active widgets
  const activeLayout = layout.filter(l => widgets.includes(l.i));

  return (
    <div ref={containerRef}>
      {/* Dashboard toolbar */}
      <div className="flex items-center justify-end gap-2 mb-4 no-print">
        <button
          onClick={resetLayout}
          className="btn-secondary text-xs py-1.5 flex items-center gap-1.5"
          title="Reset to default layout"
          aria-label="Reset dashboard layout"
        >
          <RotateCcw size={12} /> Reset
        </button>
        <button
          onClick={() => window.print()}
          className="btn-secondary text-xs py-1.5 flex items-center gap-1.5"
          aria-label="Export dashboard as PDF"
        >
          <Printer size={12} /> Export Report
        </button>
        <button
          onClick={() => setPickerOpen(true)}
          className="btn-primary text-xs py-1.5 flex items-center gap-1.5"
          aria-label="Add widget to dashboard"
        >
          <Plus size={13} /> Add Widget
        </button>
      </div>

      <GridLayout
        layout={activeLayout}
        width={containerWidth}
        gridConfig={{ cols: 12, rowHeight: 60, margin: [16, 16], containerPadding: [0, 0], maxRows: Infinity }}
        dragConfig={{ handle: '.drag-handle' }}
        onLayoutChange={(newLayout) => saveLayout([...newLayout])}
      >
        {widgets.map(id => (
          <div key={id}>
            <WidgetWrapper id={id} onRemove={removeWidget}>
              <WidgetContent id={id} stats={stats} />
            </WidgetWrapper>
          </div>
        ))}
      </GridLayout>

      {pickerOpen && (
        <WidgetPicker
          activeWidgets={widgets}
          onAdd={addWidget}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}

interface WidgetWrapperProps {
  id: string;
  onRemove: (id: string) => void;
  children: React.ReactNode;
}

function WidgetWrapper({ id, onRemove, children }: WidgetWrapperProps) {
  const def = WIDGET_CATALOG.find(w => w.id === id);
  return (
    <div
      className="flex flex-col h-full rounded-xl border overflow-hidden"
      style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
    >
      {/* Drag handle bar */}
      <div
        className="drag-handle flex items-center justify-between px-3 py-1.5 border-b shrink-0 select-none no-print"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-bg-tertiary)',
          cursor: 'grab',
        }}
      >
        <div className="flex items-center gap-1.5">
          <GripHorizontal size={13} style={{ color: 'var(--color-text-faint)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
            {def?.label ?? id}
          </span>
        </div>
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={() => onRemove(id)}
          className="p-0.5 rounded transition-colors hover:bg-red-500/20"
          style={{ color: 'var(--color-text-faint)' }}
          aria-label={`Remove ${def?.label ?? id} widget`}
        >
          <X size={12} />
        </button>
      </div>
      {/* Widget content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}

interface WidgetContentProps {
  id: string;
  stats: DashboardStats;
}

function WidgetContent({ id, stats }: WidgetContentProps) {
  switch (id) {
    case 'metrics':
      return <ErrorBoundary label="Metrics"><MetricsPanel stats={stats} /></ErrorBoundary>;
    case 'trend':
      return <ErrorBoundary label="Trend Chart"><TrendChart /></ErrorBoundary>;
    case 'severity':
      return <ErrorBoundary label="Severity Chart"><SeverityChart stats={stats} /></ErrorBoundary>;
    case 'activity':
      return <ErrorBoundary label="Activity Feed"><ActivityFeed stats={stats} /></ErrorBoundary>;
    case 'vuln-map':
      return <ErrorBoundary label="Vulnerability Map"><WorldMap countryData={stats.topVulnCountries} title="Vulnerabilities by Country" color="#0ea5e9" /></ErrorBoundary>;
    case 'breach-map':
      return <ErrorBoundary label="Breach Map"><WorldMap countryData={stats.topBreachCountries} title="Breaches by Country" color="#f97316" /></ErrorBoundary>;
    case 'threat-map':
      return <ErrorBoundary label="Threat Intel Map"><WorldMap countryData={stats.topThreatCountries} title="Threat IPs by Country" color="#a855f7" /></ErrorBoundary>;
    default:
      return null;
  }
}
