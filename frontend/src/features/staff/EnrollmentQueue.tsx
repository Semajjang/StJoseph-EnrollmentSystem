import { useEffect, useState } from 'react';
import { InboxIcon } from 'lucide-react';
import type { EnrollmentData } from '../../context/EnrollmentContext';
import {
  Avatar,
  Button,
  EmptyState,
  Select,
  Skeleton,
  StatusPill,
  Table,
  TableWrap,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '../../components/ui';
import {
  ManagedProgram,
  SectionCatalog,
  getManagedProgram,
  sectionCapacity,
} from './sections';
import { SelectionCheckbox } from './SelectionCheckbox';

type EnrollmentStatus = EnrollmentData['status'];

interface EnrollmentQueueProps {
  rows: EnrollmentData[];
  isLoading: boolean;
  hasReviewable: boolean;
  sectionsByProgram: SectionCatalog;
  sectionLoadByProgram: Record<ManagedProgram, Record<string, number>>;
  onSelect: (student: EnrollmentData) => void;
  onChangeStatus: (student: EnrollmentData, status: EnrollmentStatus) => void;
  onChangeSection: (student: EnrollmentData, section: string | null) => void;
  selectedIds: Set<string>;
  allSelected: boolean;
  someSelected: boolean;
  onToggleRow: (id: string) => void;
  onToggleAll: (shouldSelectAll: boolean) => void;
  /** Changes whenever the active filter/program/section changes, to reset paging. */
  filterSignature: string;
}

const statusOptions: EnrollmentStatus[] = ['Pending', 'Approved', 'Waitlisted', 'Rejected'];
const PAGE_SIZE = 50;

/** The editable masterlist: inline status + section changes, row opens details. */
export function EnrollmentQueue({
  rows,
  isLoading,
  hasReviewable,
  sectionsByProgram,
  sectionLoadByProgram,
  onSelect,
  onChangeStatus,
  onChangeSection,
  selectedIds,
  allSelected,
  someSelected,
  onToggleRow,
  onToggleAll,
  filterSignature,
}: EnrollmentQueueProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Reset to the first page when the filter scope changes (not on data mutations).
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filterSignature]);

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<InboxIcon />}
          title={hasReviewable ? 'No records match these filters' : 'No applications under review yet'}
          description={
            hasReviewable
              ? 'Try clearing a filter or switching programs to see more learners.'
              : 'Applications appear here once families submit their requirements for review.'
          }
        />
      </div>
    );
  }

  const visibleRows = rows.slice(0, visibleCount);
  const remaining = rows.length - visibleRows.length;

  return (
    <>
      <TableWrap className="border-0">
        <Table>
          <THead>
            <TR>
              <TH className="w-12">
                <SelectionCheckbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={onToggleAll}
                  aria-label="Select all filtered learners"
                />
              </TH>
              <TH className="w-12">#</TH>
              <TH>Learner</TH>
              <TH>Program</TH>
              <TH>Section</TH>
              <TH>Status</TH>
              <TH>Submitted</TH>
              <TH className="w-24 text-right">
                <span className="sr-only">Actions</span>
              </TH>
            </TR>
          </THead>
          <TBody>
            {visibleRows.map((student, index) => {
              const managedProgram = getManagedProgram(student.program);
              const sectionOptions = managedProgram ? sectionsByProgram[managedProgram] : [];
              const mergedOptions =
                student.section && !sectionOptions.includes(student.section)
                  ? [...sectionOptions, student.section]
                  : sectionOptions;
              const canAssignSection = student.status === 'Approved';
              const isSelected = selectedIds.has(student.id);

              return (
                <TR
                  key={student.id}
                  className={isSelected ? 'bg-brand-tint/40' : 'hover:bg-surface-sunk'}
                >
                  <TD>
                    <SelectionCheckbox
                      checked={isSelected}
                      onChange={() => onToggleRow(student.id)}
                      aria-label={`Select ${student.childFirstName} ${student.childLastName}`}
                    />
                  </TD>
                  <TD className="text-muted tabular-nums">{index + 1}</TD>
                  <TD>
                    <span className="flex items-center gap-2.5">
                      <Avatar name={`${student.childFirstName} ${student.childLastName}`} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-ink">
                          {student.childLastName}, {student.childFirstName}
                        </span>
                      </span>
                    </span>
                  </TD>
                  <TD className="whitespace-nowrap text-muted">{student.program}</TD>
                  <TD>
                    <div className="w-[190px]">
                      <Select
                        aria-label={`Section for ${student.childFirstName} ${student.childLastName}`}
                        value={student.section || ''}
                        disabled={!canAssignSection}
                        className="h-9 text-[13px]"
                        onChange={(event) => onChangeSection(student, event.target.value || null)}
                      >
                        <option value="">Unassigned</option>
                        {mergedOptions.map((section) => {
                          const load = managedProgram
                            ? sectionLoadByProgram[managedProgram][section] || 0
                            : 0;
                          const suffix =
                            load > sectionCapacity
                              ? ` (Overloaded ${load}/${sectionCapacity})`
                              : load === sectionCapacity
                                ? ` (Full ${load}/${sectionCapacity})`
                                : '';
                          return (
                            <option key={section} value={section}>
                              {section}
                              {suffix}
                            </option>
                          );
                        })}
                      </Select>
                      {!canAssignSection ? (
                        <p className="mt-1 text-2xs text-faint">Approve first to assign a section.</p>
                      ) : null}
                    </div>
                  </TD>
                  <TD>
                    <div className="flex items-center gap-2">
                      <StatusPill status={student.status} />
                      <div className="w-[130px]">
                        <Select
                          aria-label={`Status for ${student.childFirstName} ${student.childLastName}`}
                          value={student.status}
                          className="h-9 text-[13px]"
                          onChange={(event) =>
                            onChangeStatus(student, event.target.value as EnrollmentStatus)
                          }
                        >
                          {statusOptions.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </div>
                  </TD>
                  <TD className="whitespace-nowrap text-muted">
                    {new Date(student.submittedAt).toLocaleDateString()}
                  </TD>
                  <TD className="text-right">
                    <Button
                      variant="subtle"
                      size="sm"
                      className="h-11"
                      onClick={() => onSelect(student)}
                      aria-label={`Open ${student.childFirstName} ${student.childLastName}'s record`}
                    >
                      Open
                    </Button>
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      </TableWrap>
      {remaining > 0 ? (
        <div className="flex flex-col items-center gap-2 border-t border-line px-4 py-4">
          <p className="text-2xs text-muted">
            Showing {visibleRows.length} of {rows.length}
          </p>
          <Button
            variant="outline"
            onClick={() => setVisibleCount((current) => current + PAGE_SIZE)}
          >
            Show {Math.min(PAGE_SIZE, remaining)} more
          </Button>
        </div>
      ) : null}
    </>
  );
}
