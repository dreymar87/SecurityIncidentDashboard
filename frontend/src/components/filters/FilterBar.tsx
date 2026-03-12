import { Search, X } from 'lucide-react';

const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'NONE'];
const SOURCES_VULN = ['nvd', 'cisa', 'imported'];
const SOURCES_BREACH = ['hibp', 'imported'];

interface FilterBarProps {
  mode: 'vulnerabilities' | 'breaches' | 'threat-intel';
  filters: Record<string, string | boolean | undefined>;
  onChange: (key: string, value: string | boolean | undefined) => void;
  onClear: () => void;
}

export function FilterBar({ mode, filters, onChange, onClear }: FilterBarProps) {
  const hasFilters = Object.values(filters).some((v) => v !== undefined && v !== '' && v !== false);

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

      {/* Toggles for vulnerabilities */}
      {mode === 'vulnerabilities' && (
        <>
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

      {hasFilters && (
        <button onClick={onClear} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors ml-auto">
          <X size={13} /> Clear filters
        </button>
      )}
    </div>
  );
}
