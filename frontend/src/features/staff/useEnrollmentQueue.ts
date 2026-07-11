import { useMemo } from 'react';
import type { EnrollmentData } from '../../context/EnrollmentContext';
import type { QueueFilters } from './EnrollmentFilterBar';
import {
  ManagedProgram,
  ProgramOption,
  compareSectionLabels,
  getSectionStudents,
  managedPrograms,
  programAliases,
} from './sections';
import { hasViewableDocuments } from './enrollmentData';
import { useDebouncedValue } from './useDebouncedValue';

/** Builds the lowercased haystack a search query is matched against. */
const buildSearchHaystack = (enrollment: EnrollmentData) => {
  const philSysNumber = enrollment.formData?.childPhilSysNumber;
  return [
    enrollment.childFirstName,
    enrollment.childLastName,
    typeof philSysNumber === 'string' ? philSysNumber : '',
  ]
    .join(' ')
    .toLowerCase();
};

interface UseEnrollmentQueueArgs {
  enrollments: EnrollmentData[];
  selectedProgram: ProgramOption;
  selectedSection: string | null;
  activeManagedProgram: ManagedProgram | null;
  filters: QueueFilters;
}

/** Derives every list + summary the workqueue renders from the raw enrollments. */
export function useEnrollmentQueue({
  enrollments,
  selectedProgram,
  selectedSection,
  activeManagedProgram,
  filters,
}: UseEnrollmentQueueArgs) {
  const debouncedSearch = useDebouncedValue(filters.searchQuery, 200);

  // Memoized so a fresh keystroke (which only changes filters.searchQuery) does
  // not recompute the scoped lists — that keeps the debounced search effective
  // and avoids re-rendering the queue on every character typed.
  const scopedEnrollments = useMemo(() => {
    const matchesScope = (enrollment: EnrollmentData) =>
      (selectedProgram === 'All' || programAliases[selectedProgram].includes(enrollment.program)) &&
      (!selectedSection || enrollment.section === selectedSection);
    return enrollments.filter(matchesScope);
  }, [enrollments, selectedProgram, selectedSection]);

  const reviewableEnrollments = useMemo(
    () => scopedEnrollments.filter(hasViewableDocuments),
    [scopedEnrollments],
  );

  const aggregateSummary = useMemo(
    () => ({
      totalEnrolled: scopedEnrollments.length,
      pending: scopedEnrollments.filter((enrollment) => enrollment.status === 'Pending').length,
      approved: scopedEnrollments.filter((enrollment) => enrollment.status === 'Approved').length,
      waitlisted: scopedEnrollments.filter((enrollment) => enrollment.status === 'Waitlisted').length,
      rejected: scopedEnrollments.filter((enrollment) => enrollment.status === 'Rejected').length,
    }),
    [scopedEnrollments],
  );

  const programCounts = useMemo(() => {
    const counts: Record<string, number> = { All: enrollments.length };
    managedPrograms.forEach((program) => {
      counts[program] = enrollments.filter((enrollment) =>
        programAliases[program].includes(enrollment.program),
      ).length;
    });
    return counts;
  }, [enrollments]);

  const masterlistSectionOptions = useMemo(() => {
    const sectionSet = new Set<string>();
    reviewableEnrollments.forEach((enrollment) => {
      if (enrollment.section) {
        sectionSet.add(enrollment.section);
      }
    });
    return Array.from(sectionSet).sort(compareSectionLabels);
  }, [reviewableEnrollments]);

  const normalizedSearch = debouncedSearch.trim().toLowerCase();

  const filteredMasterlist = useMemo(() => {
    return reviewableEnrollments
      .filter((enrollment) => {
        const matchesAssignment =
          selectedProgram !== 'All' ||
          filters.assignmentFilter === 'all' ||
          (filters.assignmentFilter === 'assigned' ? !!enrollment.section : !enrollment.section);
        const matchesProgram =
          selectedProgram !== 'All' ||
          filters.programFilter === 'all' ||
          enrollment.program === filters.programFilter;
        const matchesSection =
          selectedProgram === 'All' || selectedSection
            ? true
            : filters.sectionFilter === 'all' ||
              (filters.sectionFilter === '__unassigned__'
                ? !enrollment.section
                : enrollment.section === filters.sectionFilter);
        const matchesStatus =
          selectedProgram !== 'All' ||
          filters.statusFilter === 'all' ||
          enrollment.status === filters.statusFilter;
        const matchesSearch =
          !normalizedSearch || buildSearchHaystack(enrollment).includes(normalizedSearch);

        return matchesProgram && matchesAssignment && matchesSection && matchesStatus && matchesSearch;
      })
      .sort((left, right) => {
        const direction = filters.lastNameSortOrder === 'a-z' ? 1 : -1;
        const lastNameCompare = left.childLastName.localeCompare(right.childLastName) * direction;
        if (lastNameCompare !== 0) {
          return lastNameCompare;
        }
        return left.childFirstName.localeCompare(right.childFirstName) * direction;
      });
  }, [
    reviewableEnrollments,
    selectedProgram,
    selectedSection,
    filters.assignmentFilter,
    filters.programFilter,
    filters.sectionFilter,
    filters.statusFilter,
    filters.lastNameSortOrder,
    normalizedSearch,
  ]);

  const selectedSectionStudents = useMemo(() => {
    if (!activeManagedProgram || !selectedSection) {
      return [] as EnrollmentData[];
    }
    return getSectionStudents(enrollments, activeManagedProgram, selectedSection);
  }, [activeManagedProgram, enrollments, selectedSection]);

  const selectedProgramLabel = selectedProgram === 'All' ? 'All programs' : selectedProgram;
  const scopeLabel = selectedSection
    ? `${selectedSection} · ${selectedProgramLabel}`
    : selectedProgramLabel;

  return {
    reviewableEnrollments,
    aggregateSummary,
    programCounts,
    masterlistSectionOptions,
    filteredMasterlist,
    selectedSectionStudents,
    scopeLabel,
  };
}
