import React from 'react';

type TriageStatus = 'new' | 'watching' | 'reviewed' | 'dismissed';

interface TriageBadgeProps {
  status: TriageStatus;
}

const CONFIG: Record<TriageStatus, { label: string; classes: string; icon: string }> = {
  new: {
    label: 'New',
    classes: 'bg-gray-700 text-gray-300',
    icon: '○',
  },
  watching: {
    label: 'Watching',
    classes: 'bg-blue-900 text-blue-300',
    icon: '👁',
  },
  reviewed: {
    label: 'Reviewed',
    classes: 'bg-green-900 text-green-300',
    icon: '✓',
  },
  dismissed: {
    label: 'Dismissed',
    classes: 'bg-red-900/50 text-red-400',
    icon: '✕',
  },
};

export default function TriageBadge({ status }: TriageBadgeProps) {
  const cfg = CONFIG[status] ?? CONFIG.new;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${cfg.classes}`}>
      <span aria-hidden="true">{cfg.icon}</span>
      {cfg.label}
    </span>
  );
}
