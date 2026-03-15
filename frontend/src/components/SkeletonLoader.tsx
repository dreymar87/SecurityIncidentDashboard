/** Reusable skeleton loader components using Tailwind's animate-pulse */

export function SkeletonMetric() {
  return (
    <div className="card animate-pulse space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-3 w-24 bg-gray-700 rounded" />
        <div className="h-8 w-8 bg-gray-700 rounded-lg" />
      </div>
      <div className="h-7 w-20 bg-gray-700 rounded" />
      <div className="h-2.5 w-16 bg-gray-800 rounded" />
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="card animate-pulse space-y-3">
      <div className="h-3 w-32 bg-gray-700 rounded" />
      <div className="space-y-2">
        <div className="h-2.5 bg-gray-800 rounded w-full" />
        <div className="h-2.5 bg-gray-800 rounded w-4/5" />
        <div className="h-2.5 bg-gray-800 rounded w-3/5" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 8, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="card animate-pulse">
      {/* header */}
      <div className="flex gap-4 pb-3 border-b border-gray-800 mb-3">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-3 bg-gray-700 rounded flex-1" />
        ))}
      </div>
      {/* rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 py-2.5 border-b border-gray-800/50 last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={c}
              className="h-2.5 bg-gray-800 rounded flex-1"
              style={{ opacity: 1 - c * 0.08 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
