import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EnrollmentData } from '../../context/EnrollmentContext';
import {
  AutoAssignCatalog,
  ManagedProgram,
  SectionCatalog,
  buildSectionLabel,
  compareSectionLabels,
  emptySectionCatalog,
  formatSectionTimeRange,
  getManagedProgram,
  getSectionStudents,
  managedPrograms,
  normalizeSectionName,
  programAliases,
  readStoredAutoAssign,
  readStoredSections,
  saveStoredAutoAssign,
  saveStoredSections,
  sectionCapacity,
} from './sections';

interface SectionCatalogNotifier {
  error: (message: string) => void;
}

interface UseSectionCatalogArgs {
  enrollments: EnrollmentData[];
  updateSection: (id: string, section: string | null) => Promise<{ error: string | null }>;
  notify: SectionCatalogNotifier;
}

export interface MutationResult {
  error: string | null;
}

/**
 * Owns the per-program section catalog (persisted to localStorage), the
 * derive-from-enrollments sync, automatic assignment, and section CRUD. All
 * behavior is ported verbatim from the original StaffDashboard.
 */
export function useSectionCatalog({ enrollments, updateSection, notify }: UseSectionCatalogArgs) {
  const [sectionsByProgram, setSectionsByProgram] = useState<SectionCatalog>(() =>
    readStoredSections(),
  );
  const [autoAssignByProgram, setAutoAssignByProgram] = useState<AutoAssignCatalog>(() =>
    readStoredAutoAssign(),
  );
  const autoAssignInFlightRef = useRef<Set<string>>(new Set());

  // Fold any sections that already exist on enrollment records into the catalog.
  useEffect(() => {
    const derivedCatalog = emptySectionCatalog();

    enrollments.forEach((enrollment) => {
      const program = getManagedProgram(enrollment.program);
      const section = normalizeSectionName(enrollment.section || '');

      if (program && section && !derivedCatalog[program].includes(section)) {
        derivedCatalog[program] = [...derivedCatalog[program], section].sort(compareSectionLabels);
      }
    });

    setSectionsByProgram((currentCatalog) => {
      const nextCatalog = emptySectionCatalog();

      managedPrograms.forEach((program) => {
        nextCatalog[program] = Array.from(
          new Set([...currentCatalog[program], ...derivedCatalog[program]]),
        ).sort(compareSectionLabels);
      });

      const hasChanged = managedPrograms.some(
        (program) =>
          nextCatalog[program].length !== currentCatalog[program].length ||
          nextCatalog[program].some((section, index) => section !== currentCatalog[program][index]),
      );

      if (hasChanged) {
        saveStoredSections(nextCatalog);
        return nextCatalog;
      }

      return currentCatalog;
    });
  }, [enrollments]);

  // Automatically place approved-but-unassigned learners into open sections.
  useEffect(() => {
    const assignStudentsAutomatically = async () => {
      for (const program of managedPrograms) {
        if (!autoAssignByProgram[program]) {
          continue;
        }

        const sectionPool = sectionsByProgram[program];

        if (sectionPool.length === 0) {
          continue;
        }

        const approvedStudents = enrollments.filter(
          (enrollment) =>
            programAliases[program].includes(enrollment.program) &&
            enrollment.status === 'Approved',
        );

        const sectionCounts = new Map<string, number>();
        sectionPool.forEach((section) => sectionCounts.set(section, 0));

        approvedStudents.forEach((student) => {
          if (student.section && sectionCounts.has(student.section)) {
            sectionCounts.set(student.section, (sectionCounts.get(student.section) || 0) + 1);
          }
        });

        const unassignedStudents = approvedStudents.filter(
          (student) => !student.section && !autoAssignInFlightRef.current.has(student.id),
        );

        for (const student of unassignedStudents) {
          const nextSection = [...sectionCounts.entries()]
            .filter(([, count]) => count < sectionCapacity)
            .sort((left, right) => compareSectionLabels(left[0], right[0]))[0]?.[0];

          if (!nextSection) {
            continue;
          }

          autoAssignInFlightRef.current.add(student.id);
          sectionCounts.set(nextSection, (sectionCounts.get(nextSection) || 0) + 1);

          const result = await updateSection(student.id, nextSection);

          autoAssignInFlightRef.current.delete(student.id);

          if (result.error) {
            notify.error(result.error);
            break;
          }
        }
      }
    };

    void assignStudentsAutomatically();
  }, [autoAssignByProgram, enrollments, sectionsByProgram, updateSection, notify]);

  const sectionLoadByProgram = useMemo(() => {
    const nextLoad = managedPrograms.reduce(
      (catalog, program) => {
        catalog[program] = Object.fromEntries(
          sectionsByProgram[program].map((section) => [section, 0]),
        );
        return catalog;
      },
      {} as Record<ManagedProgram, Record<string, number>>,
    );

    enrollments.forEach((enrollment) => {
      const program = getManagedProgram(enrollment.program);

      if (!program || !enrollment.section) {
        return;
      }

      if (!(enrollment.section in nextLoad[program])) {
        nextLoad[program][enrollment.section] = 0;
      }

      nextLoad[program][enrollment.section] += 1;
    });

    return nextLoad;
  }, [enrollments, sectionsByProgram]);

  const toggleAutoAssign = useCallback((program: ManagedProgram) => {
    setAutoAssignByProgram((current) => {
      const nextCatalog = { ...current, [program]: !current[program] };
      saveStoredAutoAssign(nextCatalog);
      return nextCatalog;
    });
  }, []);

  const addSection = useCallback(
    (program: ManagedProgram, name: string, startTime: string, endTime: string): boolean => {
      const normalizedSectionName = normalizeSectionName(name);
      const formattedSectionTimeRange = formatSectionTimeRange(startTime, endTime);

      if (!normalizedSectionName || !formattedSectionTimeRange) {
        return false;
      }

      const nextSectionLabel = buildSectionLabel(normalizedSectionName, startTime, endTime);

      setSectionsByProgram((current) => {
        const nextSections = Array.from(
          new Set([...current[program], nextSectionLabel]),
        ).sort(compareSectionLabels);
        const nextCatalog = { ...current, [program]: nextSections };
        saveStoredSections(nextCatalog);
        return nextCatalog;
      });

      return true;
    },
    [],
  );

  const renameSection = useCallback(
    async (
      program: ManagedProgram,
      currentLabel: string,
      name: string,
      startTime: string,
      endTime: string,
    ): Promise<MutationResult & { nextLabel?: string }> => {
      const normalizedSectionName = normalizeSectionName(name);
      const formattedSectionTimeRange = formatSectionTimeRange(startTime, endTime);

      if (!normalizedSectionName || !formattedSectionTimeRange) {
        return { error: 'Enter a section name and a valid time range.' };
      }

      const nextSectionLabel = buildSectionLabel(normalizedSectionName, startTime, endTime);

      if (nextSectionLabel === currentLabel) {
        return { error: null, nextLabel: currentLabel };
      }

      if (sectionsByProgram[program].includes(nextSectionLabel)) {
        return { error: 'A section with that name and time already exists.' };
      }

      const sectionStudents = getSectionStudents(enrollments, program, currentLabel);
      const results = await Promise.all(
        sectionStudents.map((enrollment) => updateSection(enrollment.id, nextSectionLabel)),
      );
      const firstError = results.find((result) => result.error);

      if (firstError?.error) {
        return { error: firstError.error };
      }

      setSectionsByProgram((current) => {
        const nextCatalog = {
          ...current,
          [program]: current[program]
            .map((section) => (section === currentLabel ? nextSectionLabel : section))
            .sort(compareSectionLabels),
        };
        saveStoredSections(nextCatalog);
        return nextCatalog;
      });

      return { error: null, nextLabel: nextSectionLabel };
    },
    [enrollments, sectionsByProgram, updateSection],
  );

  const deleteSection = useCallback(
    async (program: ManagedProgram, label: string): Promise<MutationResult> => {
      const sectionStudents = getSectionStudents(enrollments, program, label);
      const results = await Promise.all(
        sectionStudents.map((enrollment) => updateSection(enrollment.id, null)),
      );
      const firstError = results.find((result) => result.error);

      if (firstError?.error) {
        return { error: firstError.error };
      }

      setSectionsByProgram((current) => {
        const nextCatalog = {
          ...current,
          [program]: current[program].filter((section) => section !== label),
        };
        saveStoredSections(nextCatalog);
        return nextCatalog;
      });

      return { error: null };
    },
    [enrollments, updateSection],
  );

  return {
    sectionsByProgram,
    autoAssignByProgram,
    sectionLoadByProgram,
    toggleAutoAssign,
    addSection,
    renameSection,
    deleteSection,
  };
}
