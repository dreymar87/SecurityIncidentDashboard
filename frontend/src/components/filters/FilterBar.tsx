import { useState, useRef, useEffect } from 'react';
import { Search, X, Save, ChevronDown, Trash2 } from 'lucide-react';

const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'NONE'];
const TRIAGE_STATUSES = ['new', 'watching', 'reviewed', 'dismissed'];
const SOURCES_VULN = ['nvd', 'cisa', 'osv', 'ghsa', 'imported'];
const SOURCES_BREACH = ['hibp', 'imported'];

const PRESETS_KEY = 'securesight-filter-presets';

interface FilterPreset {
  name: string;
  mode: string;
  filters: Record<string, string | boolean | undefined>;
}

function loadPresets(): FilterPreset[] {
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePresets(presets: FilterPreset[]) {
  localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
}

interface FilterBarProps {
  mode: 'vulnerabilities' | 'breaches' | 'threat-intel';
  filters: Record<string, string | boolean | undefined>;
  onChange: (key: string, value: string | boolean | undefined) => void;
  onClear: () => void;
}

export function FilterBar({ mode, filters, onChange, onClear }: FilterBarProps) {
  const hasFilters = Object.values(filters).some((v) => v !== undefined && v !== '' && v !== false);
  const [presets, setPresets] = useState<FilterPreset[]>(loadPresets);
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [savingName, setSavingName] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const presetsRef = useRef<HTMLDivElement>(null);

  const modePresets = presets.filter((p) => p.mode === mode);

  useEffect(() => {
    if (savingName !== null && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [savingName]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (presetsRef.current && !presetsRef.current.contains(e.target as Node)) {
        setPresetsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleSave() {
    if (savingName === null) {
      setSavingName('');
      return;
    }
    const name = savingName.trim();
    if (!name) return;
    const updated = [...presets, { name, mode, filters }];
    setPresets(updated);
    savePresets(updated);
    setSavingName(null);
  }

  function handleLoad(preset: FilterPreset) {
    onClear();
    for (const [key, value] of Object.entries(preset.filters)) {
      if (value !== undefined && value !== '' && value !== false) {
        onChange(key, value);
      }
    }
    setPresetsOpen(false);
  }

  function handleDelete(index: number) {
    // index is within the full presets array for this mode
    const globalIndex = presets.findIndex((p, i) => {
      const modeMatches = presets.slice(0, i + 1).filter((pp) => pp.mode === mode);
      return modeMatches.length === index + 1;
    });
    if (globalIndex >= 0) {
      const updated = presets.filter((_, i) => i !== globalIndex);
      setPresets(updated);
      savePresets(updated);
    }
  }

  return (
    <div className="card flex flex-wrap gap-3 items-center">
      {/* Search */}
      <div className="relative flex-1 min-w-48">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          className="input pl-8 w-full"
          placeholder={mode === 'vulnerabilities' ? 'Search CVE ID, description…' : 'Search organization, domain…'}
          value={(filters.q as string) || ''}
          onChange={(e) => onChange('q', e.target.value || undefined)}
        />
      </div>

      {/* Severity (vulnerabilities only) */}
      {mode === 'vulnerabilities' && (
        <select
          className="input"
          value={(filters.severity as string) || ''}
          onChange={(e) => onChange('severity', e.target.value || undefined)}
        >
          <option value="">All Severities</option>
          {SEVERITIES.map((s) => <option key={s}>{s}</option>)}
        </select>
      )}

      {/* Source */}
      <select
        className="input"
        value={(filters.source as string) || ''}
        onChange={(e) => onChange('source', e.target.value || undefined)}
      >
        <option value="">All Sources</option>
        {(mode === 'vulnerabilities' ? SOURCES_VULN : SOURCES_BREACH).map((s) => (
          <option key={s} value={s}>{s.toUpperCase()}</option>
        ))}
      </select>

      {/* Country */}
      <input
        className="input w-36"
        placeholder="Country"
        value={(filters.country as string) || ''}
        onChange={(e) => onChange('country', e.target.value || undefined)}
      />

      {/* Date range */}
      <input
        type="date"
        className="input"
        value={(filters.dateFrom as string) || ''}
        onChange={(e) => onChange('dateFrom', e.target.value || undefined)}
      />
      <input
        type="date"
        className="input"
        value={(filters.dateTo as string) || ''}
        onChange={(e) => onChange('dateTo', e.target.value || undefined)}
      />

      {/* Toggles and extra filters for vulnerabilities */}
      {mode === 'vulnerabilities' && (
        <>
          <select
            className="input"
            value={(filters.triage as string) || ''}
            onChange={(e) => onChange('triage', e.target.value || undefined)}
          >
            <option value="">All Triage</option>
            {TRIAGE_STATUSES.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer select-none">
            <input
              type="checkbox"
              className="accent-yellow-500"
              checked={!!(filters.watched)}
              onChange={(e) => onChange('watched', e.target.checked || undefined)}
            />
            ★ Watched only
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer select-none">
            <input
              type="checkbox"
              className="accent-sky-500"
              checked={!!(filters.kev)}
              onChange={(e) => onChange('kev', e.target.checked || undefined)}
            />
            CISA KEV only
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer select-none">
            <input
              type="checkbox"
              className="accent-sky-500"
              checked={!!(filters.exploit)}
              onChange={(e) => onChange('exploit', e.target.checked || undefined)}
            />
            Exploit available
          </label>
        </>
      )}

      {/* Presets */}
      <div ref={presetsRef} className="relative">
        <button
          onClick={() => setPresetsOpen(!presetsOpen)}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors btn-secondary py-1.5 px-3"
        >
          <ChevronDown size={12} /> Presets{modePresets.length > 0 && ` (${modePresets.length})`}
        </button>

        {presetsOpen && (
          <div
            className="absolute right-0 top-full mt-1 w-56 rounded-lg border shadow-xl overflow-hidden z-30"
            style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
          >
            {modePresets.length === 0 && (
              <div className="px-3 py-3 text-xs text-gray-500 text-center">No saved presets.</div>
            )}
            {modePresets.map((preset, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-800/50 transition-colors group">
                <button
                  onClick={() => handleLoad(preset)}
                  className="flex-1 text-left text-xs font-medium truncate"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {preset.name}
                </button>
                <button
                  onClick={() => handleDelete(i)}
                  className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            <div className="border-t px-3 py-2" style={{ borderColor: 'var(--color-border)' }}>
              {savingName !== null ? (
                <div className="flex gap-1.5">
                  <input
                    ref={nameInputRef}
                    className="input text-xs py-1 flex-1"
                    placeholder="Preset name"
                    value={savingName}
                    onChange={(e) => setSavingName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setSavingName(null); }}
                  />
                  <button onClick={handleSave} className="btn-primary text-xs py-1 px-2">Save</button>
                </div>
              ) : (
                <button
                  onClick={() => { if (hasFilters) setSavingName(''); }}
                  disabled={!hasFilters}
                  className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 disabled:text-gray-600 disabled:cursor-not-allowed"
                >
                  <Save size={12} /> Save current filters
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {hasFilters && (
        <button onClick={onClear} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors ml-auto">
          <X size={13} /> Clear filters
        </button>
      )}
    </div>
  );
}
