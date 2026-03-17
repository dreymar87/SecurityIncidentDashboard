import { X } from 'lucide-react';

export interface WidgetDef {
  id: string;
  label: string;
  description: string;
  defaultW: number;
  defaultH: number;
}

export const WIDGET_CATALOG: WidgetDef[] = [
  { id: 'metrics',    label: 'Key Metrics',              description: 'Total CVEs, exploits, breaches, records, and threat IPs at a glance.',  defaultW: 12, defaultH: 3 },
  { id: 'trend',      label: 'Trend Chart',              description: 'Daily activity trend over time for vulnerabilities and breaches.',       defaultW: 12, defaultH: 4 },
  { id: 'severity',   label: 'Severity Breakdown',       description: 'Bar chart showing CVE severity distribution.',                          defaultW: 8,  defaultH: 5 },
  { id: 'activity',   label: 'Activity Feed',            description: 'Recent events across all data sources.',                                defaultW: 4,  defaultH: 5 },
  { id: 'vuln-map',   label: 'Vulnerabilities by Country', description: 'Choropleth map of vulnerability counts per country.',               defaultW: 4,  defaultH: 5 },
  { id: 'breach-map', label: 'Breaches by Country',      description: 'Choropleth map of data breach counts per country.',                    defaultW: 4,  defaultH: 5 },
  { id: 'threat-map', label: 'Threat IPs by Country',    description: 'Choropleth map of malicious IP origins per country.',                  defaultW: 4,  defaultH: 5 },
];

interface WidgetPickerProps {
  activeWidgets: string[];
  onAdd: (id: string) => void;
  onClose: () => void;
}

export function WidgetPicker({ activeWidgets, onAdd, onClose }: WidgetPickerProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="rounded-xl border shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Add Widget</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-faint)' }}>Click a widget to add it to your dashboard</p>
          </div>
          <button onClick={onClose} className="icon-btn" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-2">
          {WIDGET_CATALOG.map((widget) => {
            const active = activeWidgets.includes(widget.id);
            return (
              <button
                key={widget.id}
                onClick={() => { if (!active) { onAdd(widget.id); onClose(); } }}
                disabled={active}
                className="w-full text-left px-4 py-3 rounded-lg border transition-colors"
                style={{
                  borderColor: active ? 'var(--color-border)' : 'var(--color-border-input)',
                  backgroundColor: active ? 'var(--color-bg-tertiary)' : 'var(--color-bg-secondary)',
                  opacity: active ? 0.5 : 1,
                  cursor: active ? 'default' : 'pointer',
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {widget.label}
                  </span>
                  {active && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-sky-600/20 text-sky-400 border border-sky-600/30">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-faint)' }}>{widget.description}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
