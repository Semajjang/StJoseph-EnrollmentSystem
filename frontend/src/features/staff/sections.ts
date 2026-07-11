import type { EnrollmentData } from '../../context/EnrollmentContext';

/**
 * Section catalog + program helpers for the enrollment workqueue.
 *
 * All logic here is ported verbatim from the original StaffDashboard so the
 * data behavior (localStorage catalogs, time-range parsing, auto-assignment
 * ordering) stays identical after the decomposition.
 */

export const programOptions = [
  'All',
  'ITEd (Infant/Toddler)',
  'Pre-Kindergarten 1',
  'Pre-Kindergarten 2',
] as const;

export const managedPrograms = [
  'ITEd (Infant/Toddler)',
  'Pre-Kindergarten 1',
  'Pre-Kindergarten 2',
] as const;

export type ProgramOption = (typeof programOptions)[number];
export type ManagedProgram = (typeof managedPrograms)[number];
export type SectionCatalog = Record<ManagedProgram, string[]>;
export type AutoAssignCatalog = Record<ManagedProgram, boolean>;

export const sectionCapacity = 20;
const sectionStorageKey = 'staff-dashboard-sections';
const autoAssignStorageKey = 'staff-dashboard-auto-assign';

/** Tint token per managed program, drawn from the design-system program chips. */
export const programChipTone: Record<ManagedProgram, string> = {
  'ITEd (Infant/Toddler)': 'bg-program-ited/12 text-program-ited border-program-ited/30',
  'Pre-Kindergarten 1': 'bg-program-prek1/12 text-program-prek1 border-program-prek1/30',
  'Pre-Kindergarten 2': 'bg-program-prek2/15 text-[#b07d1e] border-program-prek2/40',
};

export const programAliases: Record<ProgramOption, string[]> = {
  All: [],
  'ITEd (Infant/Toddler)': ['ITEd (Infant/Toddler)', 'Infant Room', 'Toddler Room'],
  'Pre-Kindergarten 1': ['Pre-Kindergarten 1'],
  'Pre-Kindergarten 2': ['Pre-Kindergarten 2', 'Pre-K Room'],
};

export const emptySectionCatalog = (): SectionCatalog => ({
  'ITEd (Infant/Toddler)': [],
  'Pre-Kindergarten 1': [],
  'Pre-Kindergarten 2': [],
});

export const emptyAutoAssignCatalog = (): AutoAssignCatalog => ({
  'ITEd (Infant/Toddler)': false,
  'Pre-Kindergarten 1': false,
  'Pre-Kindergarten 2': false,
});

export const normalizeSectionName = (value: string) => value.trim().replace(/\s+/g, ' ');

const formatSectionTime = (value: string) => {
  const [hourText = '', minuteText = ''] = value.split(':');
  const hours = Number(hourText);
  const minutes = Number(minuteText);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return '';
  }

  const meridiem = hours >= 12 ? 'PM' : 'AM';
  const normalizedHour = hours % 12 || 12;
  return `${normalizedHour}:${String(minutes).padStart(2, '0')} ${meridiem}`;
};

export const isValidSectionTimeRange = (startTime: string, endTime: string) => {
  if (!startTime || !endTime) {
    return false;
  }

  return startTime < endTime;
};

export const formatSectionTimeRange = (startTime: string, endTime: string) => {
  if (!isValidSectionTimeRange(startTime, endTime)) {
    return '';
  }

  const formattedStartTime = formatSectionTime(startTime);
  const formattedEndTime = formatSectionTime(endTime);

  if (!formattedStartTime || !formattedEndTime) {
    return '';
  }

  return `${formattedStartTime} - ${formattedEndTime}`;
};

export const buildSectionLabel = (sectionName: string, startTime: string, endTime: string) => {
  const formattedTime = formatSectionTimeRange(startTime, endTime);

  if (!formattedTime) {
    return sectionName;
  }

  return `${sectionName} (${formattedTime})`;
};

const parseSectionTimeToInput = (value: string) => {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (!match) {
    return '';
  }

  const [, hourText, minuteText, meridiemText] = match;
  const meridiem = meridiemText.toUpperCase();
  let hours = Number(hourText);
  const minutes = Number(minuteText);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 1 || hours > 12) {
    return '';
  }

  if (meridiem === 'AM') {
    hours = hours === 12 ? 0 : hours;
  } else {
    hours = hours === 12 ? 12 : hours + 12;
  }

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

export const parseSectionLabel = (label: string) => {
  const normalizedLabel = normalizeSectionName(label);
  const match = normalizedLabel.match(
    /^(.*?)\s*\((\d{1,2}:\d{2}\s*[AP]M)\s*-\s*(\d{1,2}:\d{2}\s*[AP]M)\)$/i,
  );

  if (!match) {
    return {
      sectionName: normalizedLabel,
      startTime: '',
      endTime: '',
    };
  }

  const [, sectionName, startTimeText, endTimeText] = match;

  return {
    sectionName: normalizeSectionName(sectionName),
    startTime: parseSectionTimeToInput(startTimeText),
    endTime: parseSectionTimeToInput(endTimeText),
  };
};

const getSectionSortTime = (label: string) => {
  const parsedSection = parseSectionLabel(label);

  if (!parsedSection.startTime) {
    return Number.POSITIVE_INFINITY;
  }

  const [hourText = '0', minuteText = '0'] = parsedSection.startTime.split(':');
  return Number(hourText) * 60 + Number(minuteText);
};

export const compareSectionLabels = (left: string, right: string) => {
  const leftTime = getSectionSortTime(left);
  const rightTime = getSectionSortTime(right);

  if (leftTime !== rightTime) {
    return leftTime - rightTime;
  }

  const leftSection = parseSectionLabel(left).sectionName;
  const rightSection = parseSectionLabel(right).sectionName;
  const sectionNameComparison = leftSection.localeCompare(rightSection);

  if (sectionNameComparison !== 0) {
    return sectionNameComparison;
  }

  return left.localeCompare(right);
};

export const getManagedProgram = (program: string): ManagedProgram | null => {
  for (const managedProgram of managedPrograms) {
    if (programAliases[managedProgram].includes(program)) {
      return managedProgram;
    }
  }

  return null;
};

export const readStoredSections = (): SectionCatalog => {
  if (typeof window === 'undefined') {
    return emptySectionCatalog();
  }

  try {
    const rawValue = window.localStorage.getItem(sectionStorageKey);

    if (!rawValue) {
      return emptySectionCatalog();
    }

    const parsedValue = JSON.parse(rawValue) as Partial<Record<ManagedProgram, unknown>>;
    const nextCatalog = emptySectionCatalog();

    managedPrograms.forEach((program) => {
      const programSections = parsedValue[program];

      if (Array.isArray(programSections)) {
        nextCatalog[program] = programSections
          .filter((value): value is string => typeof value === 'string')
          .map(normalizeSectionName)
          .filter(Boolean)
          .sort(compareSectionLabels);
      }
    });

    return nextCatalog;
  } catch {
    return emptySectionCatalog();
  }
};

export const saveStoredSections = (catalog: SectionCatalog) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(sectionStorageKey, JSON.stringify(catalog));
  }
};

export const readStoredAutoAssign = (): AutoAssignCatalog => {
  if (typeof window === 'undefined') {
    return emptyAutoAssignCatalog();
  }

  try {
    const rawValue = window.localStorage.getItem(autoAssignStorageKey);

    if (!rawValue) {
      return emptyAutoAssignCatalog();
    }

    const parsedValue = JSON.parse(rawValue) as Partial<Record<ManagedProgram, unknown>>;
    const nextCatalog = emptyAutoAssignCatalog();

    managedPrograms.forEach((program) => {
      if (typeof parsedValue[program] === 'boolean') {
        nextCatalog[program] = parsedValue[program] as boolean;
      }
    });

    return nextCatalog;
  } catch {
    return emptyAutoAssignCatalog();
  }
};

export const saveStoredAutoAssign = (catalog: AutoAssignCatalog) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(autoAssignStorageKey, JSON.stringify(catalog));
  }
};

/** Students matching a managed program + exact section label. */
export const getSectionStudents = (
  enrollments: EnrollmentData[],
  program: ManagedProgram,
  section: string,
) =>
  enrollments.filter(
    (enrollment) =>
      programAliases[program].includes(enrollment.program) && enrollment.section === section,
  );
