import { InboxIcon } from 'lucide-react';
import type { EnrollmentData } from '../../context/EnrollmentContext';
import {
  Avatar,
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
}

const statusOptions: EnrollmentStatus[] = ['Pending', 'Approved', 'Waitlisted', 'Rejected'];

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
}: EnrollmentQueueProps) {
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

  return (
    <TableWrap className="border-0">
      <Table>
        <THead>
          <TR>
            <TH className="w-12">#</TH>
            <TH>Learner</TH>
            <TH>Program</TH>
            <TH>Section</TH>
            <TH>Status</TH>
            <TH>Submitted</TH>
          </TR>
        </THead>
        <TBody>
          {rows.map((student, index) => {
            const managedProgram = getManagedProgram(student.program);
            const sectionOptions = managedProgram ? sectionsByProgram[managedProgram] : [];
            const mergedOptions =
              student.section && !sectionOptions.includes(student.section)
                ? [...sectionOptions, student.section]
                : sectionOptions;
            const canAssignSection = student.status === 'Approved';

            return (
              <TR
                key={student.id}
                onClick={() => onSelect(student)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect(student);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`Open ${student.childFirstName} ${student.childLastName}'s record`}
                className="cursor-pointer hover:bg-surface-sunk focus:bg-surface-sunk focus:outline-none"
              >
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
                  <div className="w-[190px]" onClick={(event) => event.stopPropagation()}>
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
                  <div
                    className="flex items-center gap-2"
                    onClick={(event) => event.stopPropagation()}
                  >
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
              </TR>
            );
          })}
        </TBody>
      </Table>
    </TableWrap>
  );
}
