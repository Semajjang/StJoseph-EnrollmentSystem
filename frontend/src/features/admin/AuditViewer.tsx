import { useEffect, useMemo, useState } from 'react';
import { SearchIcon } from 'lucide-react';
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Input,
  Select,
  Table,
  TableWrap,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '../../components/ui';
import {
  ActivityLog,
  AuditEntityFilter,
  auditFilterOptions,
  formatActivityAction,
  formatActivityDetails,
  formatActivityEntity,
  formatDateTime,
} from './activityLog';

interface AuditViewerProps {
  activityLogs: ActivityLog[];
  isLoading: boolean;
  error: string;
}

/** Filterable audit table with a detail panel for the selected entry. */
export function AuditViewer({ activityLogs, isLoading, error }: AuditViewerProps) {
  const [filter, setFilter] = useState<AuditEntityFilter>('all');
  const [search, setSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);

  const auditLogs = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();

    return activityLogs.filter((log) => {
      if (filter !== 'all' && log.entityType !== filter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [
        log.actorName,
        log.actorRole,
        log.action,
        log.entityType,
        log.entityId,
        JSON.stringify(log.details),
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [activityLogs, filter, search]);

  useEffect(() => {
    if (!selectedLog) {
      return;
    }
    if (!auditLogs.some((log) => log.id === selectedLog.id)) {
      setSelectedLog(auditLogs[0] || null);
    }
  }, [auditLogs, selectedLog]);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
      <Card padding="none">
        <CardHeader
          eyebrow="Audit trail"
          title="Activity log viewer"
          description="Filter, search, and inspect staff and admin changes."
          actions={
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
              <div className="w-full sm:w-56">
                <Input
                  leftIcon={<SearchIcon />}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search entries"
                  aria-label="Search audit log"
                  className="h-9"
                />
              </div>
              <div className="w-full sm:w-40">
                <Select
                  value={filter}
                  onChange={(event) => setFilter(event.target.value as AuditEntityFilter)}
                  aria-label="Filter audit log"
                  className="h-9 text-[13px]"
                >
                  {auditFilterOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          }
        />
        {error ? (
          <div className="border-b border-danger/20 bg-danger-soft px-6 py-3 text-sm font-medium text-danger">
            {error}
          </div>
        ) : null}
        <div className="max-h-[520px] overflow-y-auto">
          <TableWrap className="rounded-none border-0">
            <Table>
              <THead className="sticky top-0 z-10">
                <TR>
                  <TH>Time</TH>
                  <TH>Actor</TH>
                  <TH>Action</TH>
                  <TH>Entity</TH>
                  <TH>Summary</TH>
                </TR>
              </THead>
              <TBody>
                {isLoading ? (
                  <TR>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted">
                      Loading audit logs…
                    </td>
                  </TR>
                ) : auditLogs.length === 0 ? (
                  <TR>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted">
                      No audit entries match the current filters.
                    </td>
                  </TR>
                ) : (
                  auditLogs.map((log) => (
                    <TR
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      tabIndex={0}
                      role="button"
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedLog(log);
                        }
                      }}
                      className={
                        selectedLog?.id === log.id
                          ? 'cursor-pointer bg-brand-tint'
                          : 'cursor-pointer hover:bg-surface-sunk'
                      }
                    >
                      <TD className="whitespace-nowrap text-muted">{formatDateTime(log.createdAt)}</TD>
                      <TD className="whitespace-nowrap">
                        <span className="font-semibold text-ink">{log.actorName}</span>
                        <Badge tone="neutral" className="ml-2">
                          {log.actorRole}
                        </Badge>
                      </TD>
                      <TD className="whitespace-nowrap font-semibold text-ink-soft">
                        {formatActivityAction(log.action)}
                      </TD>
                      <TD className="whitespace-nowrap">{formatActivityEntity(log.entityType)}</TD>
                      <TD className="text-xs text-muted">{formatActivityDetails(log)}</TD>
                    </TR>
                  ))
                )}
              </TBody>
            </Table>
          </TableWrap>
        </div>
      </Card>

      <Card padding="none">
        <CardHeader title="Detailed log view" description="Inspect the actor, event payload, and context." />
        <CardBody>
          {selectedLog ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-line bg-surface-sunk p-4">
                <p className="text-2xs font-bold uppercase tracking-[0.1em] text-muted">Selected event</p>
                <p className="mt-1 text-base font-bold text-ink">{formatActivityAction(selectedLog.action)}</p>
                <p className="text-sm text-muted">{formatDateTime(selectedLog.createdAt)}</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-line p-4">
                  <p className="text-2xs font-bold uppercase tracking-[0.08em] text-muted">Actor</p>
                  <p className="mt-1 text-sm font-semibold text-ink">{selectedLog.actorName}</p>
                  <p className="text-xs text-muted">{selectedLog.actorRole}</p>
                </div>
                <div className="rounded-xl border border-line p-4">
                  <p className="text-2xs font-bold uppercase tracking-[0.08em] text-muted">Entity</p>
                  <p className="mt-1 text-sm font-semibold text-ink">{formatActivityEntity(selectedLog.entityType)}</p>
                  <p className="break-all text-xs text-muted">{selectedLog.entityId}</p>
                </div>
              </div>
              <div className="rounded-xl border border-line p-4">
                <p className="text-2xs font-bold uppercase tracking-[0.08em] text-muted">Human summary</p>
                <p className="mt-1 text-sm font-medium leading-6 text-ink-soft">
                  {formatActivityDetails(selectedLog)}
                </p>
              </div>
              <div className="rounded-xl border border-line bg-ink p-4">
                <p className="text-2xs font-bold uppercase tracking-[0.08em] text-white/60">Raw details</p>
                <pre className="mt-2 overflow-auto whitespace-pre-wrap break-words text-xs leading-6 text-white/90">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <EmptyState
              title="No entry selected"
              description="Choose an audit entry from the table to open its detailed view."
            />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
