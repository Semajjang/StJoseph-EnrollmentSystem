import { useCallback, useEffect, useMemo, useState } from 'react';
import { DownloadIcon, ScrollTextIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  Select,
  Table,
  TableWrap,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '../components/ui';
import {
  ACTIVITY_LOG_COLUMNS,
  ActivityLog,
  ActivityLogRow,
  AuditEntityFilter,
  auditFilterOptions,
  formatActivityAction,
  formatActivityDetails,
  formatActivityEntity,
  mapActivityLog,
} from '../features/admin/activityLog';

interface ActivityRealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: ActivityLogRow | null;
  old: ActivityLogRow | null;
}

const escapeCsvValue = (value: string) => `"${value.replace(/"/g, '""')}"`;

const summaryTiles: Array<{ key: 'total' | 'enrollment' | 'siteContent' | 'contact' | 'staffAccess'; label: string }> = [
  { key: 'total', label: 'Total events' },
  { key: 'enrollment', label: 'Enrollment' },
  { key: 'siteContent', label: 'Site content' },
  { key: 'contact', label: 'Contact messages' },
  { key: 'staffAccess', label: 'Staff access' },
];

export function ActivityLogsPage() {
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [activityFilter, setActivityFilter] = useState<AuditEntityFilter>('all');
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [activityError, setActivityError] = useState('');

  const filteredActivityLogs = useMemo(() => {
    if (activityFilter === 'all') {
      return activityLogs;
    }
    return activityLogs.filter((log) => log.entityType === activityFilter);
  }, [activityFilter, activityLogs]);

  const activitySummary = useMemo(
    () => ({
      total: activityLogs.length,
      enrollment: activityLogs.filter((log) => log.entityType === 'enrollment').length,
      siteContent: activityLogs.filter((log) => log.entityType === 'site_content').length,
      contact: activityLogs.filter((log) => log.entityType === 'contact_message').length,
      staffAccess: activityLogs.filter((log) => log.entityType === 'staff_access').length,
    }),
    [activityLogs],
  );

  const loadActivityLogs = useCallback(async (showLoader = true) => {
    if (showLoader) {
      setIsLoadingActivities(true);
    }
    setActivityError('');

    const { data, error } = await supabase
      .from('activity_logs')
      .select(ACTIVITY_LOG_COLUMNS)
      .order('created_at', { ascending: false })
      .limit(100);

    if (showLoader) {
      setIsLoadingActivities(false);
    }

    if (error || !data) {
      setActivityError(error?.message || 'Unable to load activity logs.');
      return;
    }

    setActivityLogs((data as ActivityLogRow[]).map(mapActivityLog));
  }, []);

  const handleDownloadCsv = () => {
    const headers = ['Time', 'Staff/Admin', 'Role', 'Action', 'Entity', 'Entity ID', 'Details'];
    const rows = filteredActivityLogs.map((log) => [
      new Date(log.createdAt).toLocaleString(),
      log.actorName,
      log.actorRole,
      formatActivityAction(log.action),
      formatActivityEntity(log.entityType),
      log.entityId,
      formatActivityDetails(log),
    ]);

    const csvContent = [
      headers.map(escapeCsvValue).join(','),
      ...rows.map((row) => row.map((value) => escapeCsvValue(String(value))).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const suffix = activityFilter === 'all' ? 'all' : activityFilter;

    link.href = url;
    link.setAttribute('download', `activity-logs-${suffix}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    void loadActivityLogs();
  }, [loadActivityLogs]);

  useEffect(() => {
    const activityChannel = supabase
      .channel('activity-logs-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activity_logs' },
        (payload) => {
          const eventPayload = payload as unknown as ActivityRealtimePayload;

          setActivityLogs((previousLogs) => {
            if (eventPayload.eventType === 'INSERT' && eventPayload.new) {
              const nextLog = mapActivityLog(eventPayload.new);
              const withoutDuplicate = previousLogs.filter((log) => log.id !== nextLog.id);
              return [nextLog, ...withoutDuplicate]
                .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
                .slice(0, 100);
            }

            if (eventPayload.eventType === 'UPDATE' && eventPayload.new) {
              const nextLog = mapActivityLog(eventPayload.new);
              return previousLogs
                .map((log) => (log.id === nextLog.id ? nextLog : log))
                .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
                .slice(0, 100);
            }

            if (eventPayload.eventType === 'DELETE' && eventPayload.old) {
              return previousLogs.filter((log) => log.id !== eventPayload.old?.id);
            }

            return previousLogs;
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(activityChannel);
    };
  }, []);

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <PageHeader
        eyebrow="Audit trail"
        title="Activity log"
        description="A live record of staff and admin changes across enrollment, homepage, contact, and staff access."
        actions={
          <>
            <div className="w-full sm:w-44">
              <Select
                value={activityFilter}
                onChange={(event) => setActivityFilter(event.target.value as AuditEntityFilter)}
                aria-label="Filter activity"
              >
                {auditFilterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            <Button
              variant="subtle"
              leftIcon={<DownloadIcon className="h-4 w-4" />}
              onClick={handleDownloadCsv}
              disabled={filteredActivityLogs.length === 0}
            >
              Download CSV
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {summaryTiles.map((tile) => (
          <Card key={tile.key} padding="sm" className="flex flex-col gap-1">
            <p className="text-2xs font-bold uppercase tracking-[0.1em] text-muted">{tile.label}</p>
            <p className="font-display text-2xl font-bold text-ink tabular-nums">
              {activitySummary[tile.key]}
            </p>
          </Card>
        ))}
      </div>

      {activityError ? (
        <div className="rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
          {activityError}
        </div>
      ) : null}

      {isLoadingActivities ? (
        <Card>
          <p className="py-8 text-center text-sm text-muted">Loading activity logs…</p>
        </Card>
      ) : filteredActivityLogs.length === 0 ? (
        <EmptyState
          icon={<ScrollTextIcon />}
          title="No activity yet"
          description="Staff and admin changes will stream in here as they happen."
        />
      ) : (
        <TableWrap>
          <Table>
            <THead>
              <TR>
                <TH>Time</TH>
                <TH>Staff / admin</TH>
                <TH>Action</TH>
                <TH>Entity</TH>
                <TH>Details</TH>
              </TR>
            </THead>
            <TBody>
              {filteredActivityLogs.map((log) => (
                <TR key={log.id} className="hover:bg-surface-sunk">
                  <TD className="whitespace-nowrap text-muted">
                    {new Date(log.createdAt).toLocaleString()}
                  </TD>
                  <TD className="whitespace-nowrap">
                    <span className="font-semibold text-ink">{log.actorName}</span>
                    <Badge tone="neutral" className="ml-2">
                      {log.actorRole}
                    </Badge>
                  </TD>
                  <TD className="whitespace-nowrap font-semibold text-ink-soft">
                    {formatActivityAction(log.action)}
                  </TD>
                  <TD className="whitespace-nowrap">
                    <span className="font-medium text-ink-soft">{formatActivityEntity(log.entityType)}</span>
                    <span className="ml-2 text-xs text-faint">#{log.entityId.slice(0, 8)}</span>
                  </TD>
                  <TD className="max-w-md">
                    <p className="whitespace-pre-wrap break-words text-xs leading-5 text-muted">
                      {formatActivityDetails(log)}
                    </p>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </TableWrap>
      )}
    </div>
  );
}
