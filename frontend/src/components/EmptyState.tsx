import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
        <Icon size={24} style={{ color: 'var(--color-text-faint)' }} />
      </div>
      <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>{title}</h3>
      <p className="text-xs max-w-xs" style={{ color: 'var(--color-text-faint)' }}>{description}</p>
      {action && (
        <button onClick={action.onClick} className="btn-primary text-xs mt-4">
          {action.label}
        </button>
      )}
    </div>
  );
}
