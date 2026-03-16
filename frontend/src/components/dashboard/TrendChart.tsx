import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format, parseISO } from 'date-fns';
import { useTrends } from '../../api/hooks';
import { TrendingUp } from 'lucide-react';

type Range = '7d' | '30d' | '90d';

export function TrendChart() {
  const [range, setRange] = useState<Range>('30d');
  const { data: trends, isLoading } = useTrends(range);

  // Merge all three series into a single array keyed by date
  const merged = new Map<string, { date: string; vulns: number; breaches: number; threats: number }>();

  if (trends) {
    for (const row of trends.vulnerabilities) {
      const d = row.date.slice(0, 10);
      const existing = merged.get(d) || { date: d, vulns: 0, breaches: 0, threats: 0 };
      existing.vulns = parseInt(row.count);
      merged.set(d, existing);
    }
    for (const row of trends.breaches) {
      const d = row.date.slice(0, 10);
      const existing = merged.get(d) || { date: d, vulns: 0, breaches: 0, threats: 0 };
      existing.breaches = parseInt(row.count);
      merged.set(d, existing);
    }
    for (const row of trends.threatIntel) {
      const d = row.date.slice(0, 10);
      const existing = merged.get(d) || { date: d, vulns: 0, breaches: 0, threats: 0 };
      existing.threats = parseInt(row.count);
      merged.set(d, existing);
    }
  }

  const chartData = Array.from(merged.values()).sort((a, b) => a.date.localeCompare(b.date));

  const ranges: { value: Range; label: string }[] = [
    { value: '7d', label: '7D' },
    { value: '30d', label: '30D' },
    { value: '90d', label: '90D' },
  ];

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={15} className="text-sky-400" />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Trends</h3>
        </div>
        <div className="flex gap-1">
          {ranges.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                range === r.value
                  ? 'bg-sky-600/20 text-sky-400'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="h-48 flex items-center justify-center text-gray-500 text-sm">Loading…</div>
      ) : chartData.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
          No trend data available for this range.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              dataKey="date"
              tick={{ fill: 'var(--color-text-faint)', fontSize: 11 }}
              tickFormatter={(d) => format(parseISO(d), range === '7d' ? 'EEE' : 'MMM d')}
            />
            <YAxis tick={{ fill: 'var(--color-text-faint)', fontSize: 11 }} width={40} />
            <Tooltip
              contentStyle={{
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                fontSize: 12,
              }}
              labelFormatter={(d) => format(parseISO(d as string), 'MMM d, yyyy')}
            />
            <Line type="monotone" dataKey="vulns" name="Vulnerabilities" stroke="#0ea5e9" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="breaches" name="Breaches" stroke="#f97316" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="threats" name="Threat Intel" stroke="#22c55e" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}

      {/* Legend */}
      <div className="flex gap-4 mt-3 justify-center">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <div className="w-3 h-0.5 bg-sky-500 rounded" /> Vulnerabilities
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <div className="w-3 h-0.5 bg-orange-500 rounded" /> Breaches
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <div className="w-3 h-0.5 bg-green-500 rounded" /> Threat Intel
        </div>
      </div>
    </div>
  );
}
