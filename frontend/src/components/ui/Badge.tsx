import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

export type BadgeTone = 'neutral' | 'brand' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-surface-sunk text-ink-soft border-line',
  brand: 'bg-brand-tint text-brand-strong border-brand/20',
  accent: 'bg-accent-soft text-accent-strong border-accent/25',
  success: 'bg-success-soft text-success border-success/20',
  warning: 'bg-warning-soft text-warning border-warning/25',
  danger: 'bg-danger-soft text-danger border-danger/20',
  info: 'bg-info-soft text-brand-strong border-info/20',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  dot?: boolean;
  icon?: ReactNode;
}

export function Badge({ tone = 'neutral', dot, icon, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        tones[tone],
        className,
      )}
      {...props}
    >
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden /> : null}
      {icon}
      {children}
    </span>
  );
}

/** Maps known enrollment / message statuses to a consistent tone. */
const statusTone: Record<string, BadgeTone> = {
  Pending: 'warning',
  Approved: 'success',
  Enrolled: 'success',
  Rejected: 'danger',
  Waitlisted: 'info',
  New: 'brand',
  Replied: 'success',
  Closed: 'neutral',
};

export function StatusPill({ status, className }: { status: string; className?: string }) {
  return (
    <Badge tone={statusTone[status] ?? 'neutral'} dot className={className}>
      {status}
    </Badge>
  );
}
