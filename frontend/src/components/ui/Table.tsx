import type { HTMLAttributes, ReactNode, ThHTMLAttributes } from 'react';
import { ChevronDownIcon, ChevronsUpDownIcon, ChevronUpIcon } from 'lucide-react';
import { cn } from '../../lib/cn';

/** Scroll-safe table shell. Always wrap tables so wide data scrolls in-place. */
export function TableWrap({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('w-full overflow-x-auto rounded-2xl border border-line bg-surface', className)}>
      {children}
    </div>
  );
}

export function Table({ className, children, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <table className={cn('w-full border-collapse text-sm', className)} {...props}>
      {children}
    </table>
  );
}

export function THead({ className, children, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={cn('bg-surface-sunk', className)} {...props}>
      {children}
    </thead>
  );
}

export function TBody({ className, children, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={cn('divide-y divide-line', className)} {...props}>
      {children}
    </tbody>
  );
}

export function TR({ className, children, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cn('transition-colors', className)} {...props}>
      {children}
    </tr>
  );
}

type SortDirection = 'asc' | 'desc' | null;

export interface THProps extends ThHTMLAttributes<HTMLTableCellElement> {
  sortable?: boolean;
  sortDirection?: SortDirection;
  onSort?: () => void;
}

export function TH({ sortable, sortDirection = null, onSort, className, children, ...props }: THProps) {
  const content = (
    <span className="inline-flex items-center gap-1.5">
      {children}
      {sortable ? (
        sortDirection === 'asc' ? (
          <ChevronUpIcon className="h-3.5 w-3.5" />
        ) : sortDirection === 'desc' ? (
          <ChevronDownIcon className="h-3.5 w-3.5" />
        ) : (
          <ChevronsUpDownIcon className="h-3.5 w-3.5 text-faint" />
        )
      ) : null}
    </span>
  );
  return (
    <th
      scope="col"
      className={cn(
        'whitespace-nowrap px-4 py-3 text-left text-2xs font-bold uppercase tracking-[0.08em] text-muted',
        sortable && 'cursor-pointer select-none hover:text-ink',
        className,
      )}
      {...props}
    >
      {sortable ? (
        <button type="button" onClick={onSort} className="inline-flex items-center gap-1.5">
          {content}
        </button>
      ) : (
        content
      )}
    </th>
  );
}

export function TD({ className, children, ...props }: HTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn('px-4 py-3 align-middle text-ink-soft', className)} {...props}>
      {children}
    </td>
  );
}
