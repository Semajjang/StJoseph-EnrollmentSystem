import { RotateCcwIcon, SearchIcon } from 'lucide-react';
import { Button, Input, Select } from '../../components/ui';
import { ProgramOption, managedPrograms } from './sections';

export interface QueueFilters {
  lastNameSortOrder: 'a-z' | 'z-a';
  programFilter: string;
  assignmentFilter: string;
  sectionFilter: string;
  statusFilter: string;
  searchQuery: string;
}

interface EnrollmentFilterBarProps {
  filters: QueueFilters;
  onChange: (patch: Partial<QueueFilters>) => void;
  onReset: () => void;
  selectedProgram: ProgramOption;
  selectedSection: string | null;
  sectionOptions: string[];
}

const cell = 'min-w-0';

/** Filter controls for the masterlist. Which controls show depends on scope. */
export function EnrollmentFilterBar({
  filters,
  onChange,
  onReset,
  selectedProgram,
  selectedSection,
  sectionOptions,
}: EnrollmentFilterBarProps) {
  const showProgramScopeFilters = selectedProgram === 'All';
  const showSectionFilter = selectedProgram !== 'All' && !selectedSection;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-bold text-ink">Masterlist</h3>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<RotateCcwIcon className="h-3.5 w-3.5" />}
          onClick={onReset}
        >
          Reset filters
        </Button>
      </div>
      <Input
        type="search"
        leftIcon={<SearchIcon />}
        value={filters.searchQuery}
        onChange={(event) => onChange({ searchQuery: event.target.value })}
        placeholder="Search by child name or PhilSys number"
        aria-label="Search applicants by name or PhilSys number"
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className={cell}>
          <Select
            aria-label="Sort by last name"
            value={filters.lastNameSortOrder}
            onChange={(event) => onChange({ lastNameSortOrder: event.target.value as 'a-z' | 'z-a' })}
          >
            <option value="a-z">Last name: A–Z</option>
            <option value="z-a">Last name: Z–A</option>
          </Select>
        </div>

        {showProgramScopeFilters ? (
          <>
            <div className={cell}>
              <Select
                aria-label="Filter by program"
                value={filters.programFilter}
                onChange={(event) => onChange({ programFilter: event.target.value })}
              >
                <option value="all">All programs</option>
                {managedPrograms.map((program) => (
                  <option key={program} value={program}>
                    {program}
                  </option>
                ))}
              </Select>
            </div>
            <div className={cell}>
              <Select
                aria-label="Filter by section assignment"
                value={filters.assignmentFilter}
                onChange={(event) => onChange({ assignmentFilter: event.target.value })}
              >
                <option value="all">All assignments</option>
                <option value="assigned">Assigned</option>
                <option value="unassigned">Unassigned</option>
              </Select>
            </div>
            <div className={cell}>
              <Select
                aria-label="Filter by status"
                value={filters.statusFilter}
                onChange={(event) => onChange({ statusFilter: event.target.value })}
              >
                <option value="all">All statuses</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Waitlisted">Waitlisted</option>
                <option value="Rejected">Rejected</option>
              </Select>
            </div>
          </>
        ) : null}

        {showSectionFilter ? (
          <div className={cell}>
            <Select
              aria-label="Filter by section"
              value={filters.sectionFilter}
              onChange={(event) => onChange({ sectionFilter: event.target.value })}
            >
              <option value="all">All sections</option>
              <option value="__unassigned__">Unassigned</option>
              {sectionOptions.map((section) => (
                <option key={section} value={section}>
                  {section}
                </option>
              ))}
            </Select>
          </div>
        ) : null}
      </div>
    </div>
  );
}
