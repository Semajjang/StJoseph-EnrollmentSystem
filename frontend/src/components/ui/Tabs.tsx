import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface TabItem {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  count?: number;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}

/** Underline tabs for switching primary views within a page. */
export function Tabs({ items, value, onChange, className }: TabsProps) {
  return (
    <div role="tablist" className={cn('flex gap-1 overflow-x-auto border-b border-line', className)}>
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(item.id)}
            className={cn(
              'relative inline-flex items-center gap-2 whitespace-nowrap px-3.5 py-3 text-sm font-semibold transition-colors',
              active ? 'text-brand-strong' : 'text-muted hover:text-ink',
            )}
          >
            {item.icon}
            {item.label}
            {typeof item.count === 'number' ? (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-2xs font-bold',
                  active ? 'bg-brand-tint text-brand-strong' : 'bg-surface-sunk text-muted',
                )}
              >
                {item.count}
              </span>
            ) : null}
            {active ? <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand" /> : null}
          </button>
        );
      })}
    </div>
  );
}

export interface SegmentedControlProps<T extends string> {
  options: Array<{ value: T; label: ReactNode }>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}

/** Compact pill toggle for 2–4 mutually exclusive options (e.g. filters). */
export function SegmentedControl<T extends string>({ options, value, onChange, className, size = 'md' }: SegmentedControlProps<T>) {
  return (
    <div className={cn('inline-flex rounded-xl border border-line bg-surface-sunk p-1', className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-lg font-semibold transition-all',
              size === 'sm' ? 'px-3 py-1 text-xs' : 'px-3.5 py-1.5 text-sm',
              active ? 'bg-surface text-brand-strong shadow-sm' : 'text-muted hover:text-ink',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
