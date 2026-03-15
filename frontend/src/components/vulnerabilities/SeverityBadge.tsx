import { AlertOctagon, AlertTriangle, AlertCircle, Info, Minus } from 'lucide-react';

const SEVERITY_ICONS: Record<string, React.ElementType> = {
  CRITICAL: AlertOctagon,
  HIGH: AlertTriangle,
  MEDIUM: AlertCircle,
  LOW: Info,
  NONE: Minus,
  UNKNOWN: Minus,
};

export function SeverityBadge({ severity }: { severity: string | null }) {
  const level = severity?.toUpperCase() ?? 'UNKNOWN';
  const cls = `badge-${level.toLowerCase()}`;
  const Icon = SEVERITY_ICONS[level] ?? Minus;

  return (
    <span className={`${cls} inline-flex items-center gap-1`}>
      <Icon size={10} />
      {level}
    </span>
  );
}
