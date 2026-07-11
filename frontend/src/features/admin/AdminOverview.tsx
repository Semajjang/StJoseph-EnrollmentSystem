import { useMemo } from 'react';
import type { ReactNode } from 'react';
import type { EnrollmentData } from '../../context/EnrollmentContext';
import type { PerformanceMetric } from '../../lib/performanceMonitor';
import { Card, CardBody, CardHeader } from '../../components/ui';
import { cn } from '../../lib/cn';
import type { ActivityLog } from './activityLog';
import { formatDateTime } from './activityLog';
import { getNextBackupTime } from './backup';
import {
  ChartItem,
  computeLogVolumeItems,
  computeOperationalSummary,
  computePerformanceSummary,
  computeSectionChartItems,
  computeStatusSummary,
} from './overviewMetrics';

interface AdminOverviewProps {
  enrollments: EnrollmentData[];
  activityLogs: ActivityLog[];
  performanceMetrics: PerformanceMetric[];
  backupTime: string;
}

/** Read-only operational snapshot: enrollment health, audit volume, latency. */
export function AdminOverview({
  enrollments,
  activityLogs,
  performanceMetrics,
  backupTime,
}: AdminOverviewProps) {
  const statusSummary = useMemo(() => computeStatusSummary(enrollments), [enrollments]);
  const sectionChartItems = useMemo(() => computeSectionChartItems(enrollments), [enrollments]);
  const logVolumeItems = useMemo(() => computeLogVolumeItems(activityLogs), [activityLogs]);
  const operationalSummary = useMemo(
    () =>
      computeOperationalSummary(
        activityLogs,
        enrollments.length,
        sectionChartItems,
        statusSummary.pending,
      ),
    [activityLogs, enrollments.length, sectionChartItems, statusSummary.pending],
  );
  const performanceSummary = useMemo(
    () => computePerformanceSummary(performanceMetrics),
    [performanceMetrics],
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total enrollments" value={statusSummary.total} helper="All indexed child records." />
        <StatCard label="Pending review" value={statusSummary.pending} helper="Applications awaiting staff action." tone="warning" />
        <StatCard label="Recent logs" value={operationalSummary.recentLogs} helper="Audit entries in the last 24 hours." tone="brand" />
        <StatCard label="Next backup window" value={getNextBackupTime(backupTime)} helper="Preferred developer backup time." small />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card padding="none" className="xl:col-span-1">
          <CardHeader
            eyebrow="Operational readiness"
            title="Capacity at a glance"
            description="Keep review turnaround healthy through peak enrollment."
          />
          <CardBody className="space-y-4">
            <div className="rounded-xl border border-line bg-surface-sunk p-4">
              <p className="text-2xs font-bold uppercase tracking-[0.1em] text-muted">Readiness note</p>
              <p className="mt-1.5 text-sm font-medium text-ink-soft">{operationalSummary.readiness}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <MiniStat label="Approved" value={statusSummary.approved} tone="success" />
              <MiniStat label="Waitlisted" value={statusSummary.waitlisted} tone="warning" />
              <MiniStat label="Indexed records" value={operationalSummary.indexedRecords} tone="brand" />
              <MiniStat label="Avg / section" value={operationalSummary.averageStudentsPerSection} tone="accent" />
            </div>
          </CardBody>
        </Card>

        <div className="grid grid-cols-1 gap-6 xl:col-span-2 xl:grid-cols-2">
          <ChartPanel
            title="Audit log volume"
            subtitle="Daily audit activity across the last week."
            items={logVolumeItems}
            tone="brand"
          />
          <ChartPanel
            title="Students per section"
            subtitle="Distribution by section, including unassigned records."
            items={sectionChartItems}
            tone="accent"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Avg read time"
          value={performanceSummary.readAverageMs > 0 ? `${performanceSummary.readAverageMs} ms` : 'No data'}
          status={performanceSummary.readTargetStatus}
          helper="Targets record retrieval under 2–3 seconds."
        />
        <MetricCard
          label="Avg submit time"
          value={performanceSummary.writeAverageMs > 0 ? `${performanceSummary.writeAverageMs} ms` : 'No data'}
          status={performanceSummary.writeTargetStatus}
          helper="Tracks submissions and record updates."
        />
        <MetricCard
          label="Health checks"
          value={`${performanceSummary.healthSuccessRate}%`}
          status={performanceSummary.uptimeStatus}
          helper="Availability from recurring Supabase probes."
        />
        <MetricCard
          label="Last health probe"
          value={performanceSummary.lastHealthCheck ? `${Math.round(performanceSummary.lastHealthCheck.durationMs)} ms` : 'Not available'}
          status={performanceSummary.lastHealthCheck?.status === 'error' ? 'Last check failed' : 'Last check passed'}
          helper={performanceSummary.lastHealthCheck ? formatDateTime(performanceSummary.lastHealthCheck.recordedAt) : 'No recent probe recorded.'}
        />
      </div>
    </div>
  );
}

const toneText: Record<string, string> = {
  ink: 'text-ink',
  brand: 'text-brand-strong',
  warning: 'text-warning',
  success: 'text-success',
  accent: 'text-accent-strong',
};

function StatCard({
  label,
  value,
  helper,
  tone = 'ink',
  small,
}: {
  label: string;
  value: ReactNode;
  helper: string;
  tone?: keyof typeof toneText;
  small?: boolean;
}) {
  return (
    <Card padding="sm" className="flex flex-col gap-1">
      <p className="text-2xs font-bold uppercase tracking-[0.1em] text-muted">{label}</p>
      <p className={cn('font-display font-bold tabular-nums', small ? 'text-base leading-snug' : 'text-3xl', toneText[tone])}>
        {value}
      </p>
      <p className="text-xs text-muted">{helper}</p>
    </Card>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: number; tone: keyof typeof toneText }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3">
      <p className="text-2xs font-bold uppercase tracking-[0.08em] text-muted">{label}</p>
      <p className={cn('mt-1 font-display text-2xl font-bold tabular-nums', toneText[tone])}>{value}</p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  status,
  helper,
}: {
  label: string;
  value: string;
  status: string;
  helper: string;
}) {
  return (
    <Card padding="sm" className="flex flex-col gap-1">
      <p className="text-2xs font-bold uppercase tracking-[0.1em] text-muted">{label}</p>
      <p className="font-display text-2xl font-bold text-ink">{value}</p>
      <p className="text-sm font-semibold text-brand-strong">{status}</p>
      <p className="text-xs text-muted">{helper}</p>
    </Card>
  );
}

function ChartPanel({
  title,
  subtitle,
  items,
  tone,
}: {
  title: string;
  subtitle: string;
  items: ChartItem[];
  tone: 'brand' | 'accent';
}) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);
  const barClass = tone === 'brand' ? 'bg-brand' : 'bg-accent';

  return (
    <Card padding="none">
      <CardHeader title={title} description={subtitle} />
      <CardBody className="space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-muted">No data available yet.</p>
        ) : (
          items.map((item) => (
            <div key={item.label}>
              <div className="mb-1 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink-soft">{item.label}</p>
                  {item.helper ? <p className="truncate text-xs text-muted">{item.helper}</p> : null}
                </div>
                <span className="text-sm font-bold text-ink tabular-nums">{item.value}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-surface-sunk">
                <div
                  className={cn('h-2.5 rounded-full', barClass)}
                  style={{
                    width: `${Math.max((item.value / maxValue) * 100, item.value > 0 ? 12 : 0)}%`,
                  }}
                />
              </div>
            </div>
          ))
        )}
      </CardBody>
    </Card>
  );
}
