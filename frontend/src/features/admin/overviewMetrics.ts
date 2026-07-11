import type { EnrollmentData } from '../../context/EnrollmentContext';
import type { PerformanceMetric } from '../../lib/performanceMonitor';
import type { ActivityLog } from './activityLog';

export interface ChartItem {
  label: string;
  value: number;
  helper?: string;
}

export interface StatusSummary {
  total: number;
  approved: number;
  pending: number;
  waitlisted: number;
  rejected: number;
  assignedSections: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export const computeStatusSummary = (enrollments: EnrollmentData[]): StatusSummary => ({
  total: enrollments.length,
  approved: enrollments.filter((enrollment) => enrollment.status === 'Approved').length,
  pending: enrollments.filter((enrollment) => enrollment.status === 'Pending').length,
  waitlisted: enrollments.filter((enrollment) => enrollment.status === 'Waitlisted').length,
  rejected: enrollments.filter((enrollment) => enrollment.status === 'Rejected').length,
  assignedSections: enrollments.filter((enrollment) => !!enrollment.section).length,
});

export const computeSectionChartItems = (enrollments: EnrollmentData[]): ChartItem[] => {
  const sectionCounts = new Map<string, { value: number; programLabel: string }>();

  enrollments.forEach((enrollment) => {
    const sectionName = enrollment.section?.trim() || 'Unassigned';
    const currentEntry = sectionCounts.get(sectionName);
    const programLabel = enrollment.program || 'No Program Assigned';

    if (!currentEntry) {
      sectionCounts.set(sectionName, {
        value: 1,
        programLabel: sectionName === 'Unassigned' ? 'No section assigned yet' : programLabel,
      });
      return;
    }

    sectionCounts.set(sectionName, {
      value: currentEntry.value + 1,
      programLabel:
        currentEntry.programLabel === programLabel || sectionName === 'Unassigned'
          ? currentEntry.programLabel
          : 'Multiple Programs',
    });
  });

  return Array.from(sectionCounts.entries())
    .map(([label, entry]) => ({ label, value: entry.value, helper: entry.programLabel }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 8);
};

export const computeLogVolumeItems = (activityLogs: ActivityLog[]): ChartItem[] => {
  const dayCounts = new Map<string, number>();

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    const label = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    dayCounts.set(label, 0);
  }

  activityLogs.forEach((log) => {
    const label = new Date(log.createdAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });

    if (dayCounts.has(label)) {
      dayCounts.set(label, (dayCounts.get(label) || 0) + 1);
    }
  });

  return Array.from(dayCounts.entries()).map(([label, value]) => ({
    label,
    value,
    helper: value > 0 ? 'Recent audit activity' : 'No entries',
  }));
};

export const computeOperationalSummary = (
  activityLogs: ActivityLog[],
  enrollmentCount: number,
  sectionChartItems: ChartItem[],
  pending: number,
) => {
  const recentLogs = activityLogs.filter(
    (log) => Date.now() - new Date(log.createdAt).getTime() <= DAY_MS,
  ).length;

  const averageStudentsPerSection =
    sectionChartItems.length > 0
      ? Math.round(
          sectionChartItems.reduce((sum, item) => sum + item.value, 0) / sectionChartItems.length,
        )
      : 0;

  return {
    recentLogs,
    indexedRecords: enrollmentCount + activityLogs.length,
    averageStudentsPerSection,
    readiness:
      pending > 25
        ? 'High review load. Consider scheduling extra reviewers during peak enrollment hours.'
        : 'Enrollment load is within the current review capacity.',
  };
};

export const computePerformanceSummary = (performanceMetrics: PerformanceMetric[]) => {
  const cutoffTime = Date.now() - DAY_MS;
  const recent = performanceMetrics.filter(
    (metric) => new Date(metric.recordedAt).getTime() >= cutoffTime,
  );

  const readMetrics = recent.filter(
    (metric) => metric.category === 'data-read' || metric.category === 'page-load',
  );
  const writeMetrics = recent.filter(
    (metric) => metric.category === 'data-write' || metric.category === 'form-submit',
  );
  const healthMetrics = recent.filter((metric) => metric.category === 'health-check');

  const average = (metrics: PerformanceMetric[]) => {
    if (metrics.length === 0) {
      return 0;
    }
    return Math.round(metrics.reduce((sum, metric) => sum + metric.durationMs, 0) / metrics.length);
  };

  const successfulHealthChecks = healthMetrics.filter((metric) => metric.status === 'success').length;
  const healthSuccessRate =
    healthMetrics.length > 0 ? Math.round((successfulHealthChecks / healthMetrics.length) * 100) : 100;
  const readAverageMs = average(readMetrics);
  const writeAverageMs = average(writeMetrics);

  const targetStatus = (value: number) =>
    value === 0 || value <= 2000 ? 'Within target' : value <= 3000 ? 'Watch closely' : 'Above target';

  return {
    readAverageMs,
    writeAverageMs,
    healthSuccessRate,
    lastHealthCheck: healthMetrics[0] || null,
    readTargetStatus: targetStatus(readAverageMs),
    writeTargetStatus: targetStatus(writeAverageMs),
    uptimeStatus:
      healthSuccessRate >= 99 ? 'Healthy' : healthSuccessRate >= 95 ? 'Degraded' : 'Unstable',
  };
};
