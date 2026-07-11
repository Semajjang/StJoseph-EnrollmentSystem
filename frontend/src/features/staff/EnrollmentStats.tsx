import { Card } from '../../components/ui';
import { cn } from '../../lib/cn';

export interface EnrollmentSummary {
  totalEnrolled: number;
  pending: number;
  approved: number;
  waitlisted: number;
  rejected: number;
}

interface EnrollmentStatsProps {
  summary: EnrollmentSummary;
  isLoading: boolean;
  scopeLabel: string;
}

const tiles: Array<{ key: keyof EnrollmentSummary; label: string; valueClass: string }> = [
  { key: 'totalEnrolled', label: 'Total records', valueClass: 'text-ink' },
  { key: 'pending', label: 'Pending', valueClass: 'text-warning' },
  { key: 'approved', label: 'Approved', valueClass: 'text-success' },
  { key: 'waitlisted', label: 'Waitlisted', valueClass: 'text-brand-strong' },
  { key: 'rejected', label: 'Rejected', valueClass: 'text-danger' },
];

/** The aggregate snapshot for the currently scoped program / section. */
export function EnrollmentStats({ summary, isLoading, scopeLabel }: EnrollmentStatsProps) {
  return (
    <section aria-label="Enrollment snapshot" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-2xs font-bold uppercase tracking-[0.16em] text-brand">Enrollment snapshot</p>
        <p className="truncate text-xs font-medium text-muted">{scopeLabel}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {tiles.map((tile) => (
          <Card key={tile.key} padding="sm" className="flex flex-col gap-1">
            <p className="text-2xs font-bold uppercase tracking-[0.1em] text-muted">{tile.label}</p>
            <p className={cn('font-display text-3xl font-bold tabular-nums', tile.valueClass)}>
              {isLoading ? '—' : summary[tile.key]}
            </p>
          </Card>
        ))}
      </div>
    </section>
  );
}
