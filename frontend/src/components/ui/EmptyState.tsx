import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** An empty screen is an invitation to act — always offer the next step. */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong bg-surface-sunk/60 px-6 py-12 text-center', className)}>
      {icon ? (
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-tint text-brand [&>svg]:h-7 [&>svg]:w-7">
          {icon}
        </span>
      ) : null}
      <h3 className="text-base font-bold text-ink">{title}</h3>
      {description ? <p className="mt-1.5 max-w-sm text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
