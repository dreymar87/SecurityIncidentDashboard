export function SeverityBadge({ severity }: { severity: string | null }) {
  if (!severity) return <span className="badge-none">UNKNOWN</span>;
  const cls = `badge-${severity.toLowerCase()}`;
  return <span className={cls}>{severity}</span>;
}
