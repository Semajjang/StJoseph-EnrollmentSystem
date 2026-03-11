import React, { createElement, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { EnrollmentData, useEnrollment } from '../context/EnrollmentContext';
import { DownloadIcon, InfoIcon, Trash2Icon } from 'lucide-react';
import { supabase } from '../lib/supabase';

const programOptions = [
  'All',
  'ITEd (Infant/Toddler)',
  'Pre-Kindergarten 1',
  'Pre-Kindergarten 2'
] as const;

const managedPrograms = [
  'ITEd (Infant/Toddler)',
  'Pre-Kindergarten 1',
  'Pre-Kindergarten 2'
] as const;

const sectionCapacity = 20;
const sectionStorageKey = 'staff-dashboard-sections';
const autoAssignStorageKey = 'staff-dashboard-auto-assign';

type ManagedProgram = (typeof managedPrograms)[number];
type SectionCatalog = Record<ManagedProgram, string[]>;
type AutoAssignCatalog = Record<ManagedProgram, boolean>;

const programAliases: Record<(typeof programOptions)[number], string[]> = {
  All: [],
  'ITEd (Infant/Toddler)': ['ITEd (Infant/Toddler)', 'Infant Room', 'Toddler Room'],
  'Pre-Kindergarten 1': ['Pre-Kindergarten 1'],
  'Pre-Kindergarten 2': ['Pre-Kindergarten 2', 'Pre-K Room']
};

const emptySectionCatalog = (): SectionCatalog => ({
  'ITEd (Infant/Toddler)': [],
  'Pre-Kindergarten 1': [],
  'Pre-Kindergarten 2': []
});

const emptyAutoAssignCatalog = (): AutoAssignCatalog => ({
  'ITEd (Infant/Toddler)': false,
  'Pre-Kindergarten 1': false,
  'Pre-Kindergarten 2': false
});

const normalizeSectionName = (value: string) => value.trim().replace(/\s+/g, ' ');

const getStudentAddress = (enrollment: EnrollmentData) => {
  const address = enrollment.formData?.address;
  return typeof address === 'string' ? address : '';
};

const getStudentSex = (enrollment: EnrollmentData) => {
  const sex = enrollment.formData?.sex;
  return typeof sex === 'string' ? sex : '';
};

const getManagedProgram = (program: string): ManagedProgram | null => {
  for (const managedProgram of managedPrograms) {
    if (programAliases[managedProgram].includes(program)) {
      return managedProgram;
    }
  }

  return null;
};

const readStoredSections = (): SectionCatalog => {
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
          .filter(Boolean);
      }
    });

    return nextCatalog;
  } catch {
    return emptySectionCatalog();
  }
};

const saveStoredSections = (catalog: SectionCatalog) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(sectionStorageKey, JSON.stringify(catalog));
  }
};

const readStoredAutoAssign = (): AutoAssignCatalog => {
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

const saveStoredAutoAssign = (catalog: AutoAssignCatalog) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(autoAssignStorageKey, JSON.stringify(catalog));
  }
};

export function StaffDashboard() {
  const { enrollments, updateStatus, updateSection, deleteEnrollment } = useEnrollment();
  const [selectedStudent, setSelectedStudent] = useState<EnrollmentData | null>(
    null
  );
  const [selectedProgram, setSelectedProgram] = useState<(typeof programOptions)[number]>('All');
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [lastNameSortOrder, setLastNameSortOrder] = useState<'a-z' | 'z-a'>('a-z');
  const [programFilter, setProgramFilter] = useState('all');
  const [assignmentFilter, setAssignmentFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sectionsByProgram, setSectionsByProgram] = useState<SectionCatalog>(() =>
    readStoredSections()
  );
  const [autoAssignByProgram, setAutoAssignByProgram] = useState<AutoAssignCatalog>(() =>
    readStoredAutoAssign()
  );
  const [newSectionName, setNewSectionName] = useState('');
  const [isSectionInfoOpen, setIsSectionInfoOpen] = useState(false);
  const [isDeleteSectionConfirmOpen, setIsDeleteSectionConfirmOpen] = useState(false);
  const [isDeletingSection, setIsDeletingSection] = useState(false);
  const autoAssignInFlightRef = useRef<Set<string>>(new Set());
  const [loadingRequirementId, setLoadingRequirementId] = useState<string | null>(
    null
  );
  const [loadingIdPicturePath, setLoadingIdPicturePath] = useState<string | null>(
    null
  );
  const scopedEnrollments = enrollments.filter(
    (enrollment) =>
      (selectedProgram === 'All' ||
        programAliases[selectedProgram].includes(enrollment.program)) &&
      (!selectedSection || enrollment.section === selectedSection)
  );
  const reviewableEnrollments = enrollments.filter(
    (enrollment) =>
      enrollment.requirements.length > 0 &&
      (selectedProgram === 'All' ||
        programAliases[selectedProgram].includes(enrollment.program)) &&
      (!selectedSection || enrollment.section === selectedSection)
  );
  const aggregateSummary = useMemo(
    () => ({
      totalEnrolled: scopedEnrollments.length,
      pending: scopedEnrollments.filter((enrollment) => enrollment.status === 'Pending').length,
      approved: scopedEnrollments.filter((enrollment) => enrollment.status === 'Approved').length,
      rejected: scopedEnrollments.filter((enrollment) => enrollment.status === 'Rejected').length
    }),
    [scopedEnrollments]
  );
  const approvedStudentsCount = reviewableEnrollments.filter(
    (enrollment) => enrollment.status === 'Approved'
  ).length;
  const masterlistSectionOptions = useMemo(() => {
    const sectionSet = new Set<string>();

    reviewableEnrollments.forEach((enrollment) => {
      if (enrollment.section) {
        sectionSet.add(enrollment.section);
      }
    });

    return Array.from(sectionSet).sort((left, right) => left.localeCompare(right));
  }, [reviewableEnrollments]);
  const filteredMasterlist = useMemo(() => {
    return reviewableEnrollments.filter((enrollment) => {
      const matchesAssignment =
        selectedProgram !== 'All' ||
        assignmentFilter === 'all' ||
        (assignmentFilter === 'assigned' ? !!enrollment.section : !enrollment.section);
      const matchesProgram =
        selectedProgram !== 'All' ||
        programFilter === 'all' ||
        enrollment.program === programFilter;
      const matchesSection =
        selectedProgram === 'All' || selectedSection ?
          true :
        sectionFilter === 'all' ||
        (sectionFilter === '__unassigned__' ? !enrollment.section : enrollment.section === sectionFilter);
      const matchesStatus =
        selectedProgram !== 'All' || statusFilter === 'all' || enrollment.status === statusFilter;

      return (
        matchesProgram &&
        matchesAssignment &&
        matchesSection &&
        matchesStatus
      );
    }).sort((left, right) => {
      const lastNameCompare = left.childLastName.localeCompare(right.childLastName) *
        (lastNameSortOrder === 'a-z' ? 1 : -1);

      if (lastNameCompare !== 0) {
        return lastNameCompare;
      }

      return left.childFirstName.localeCompare(right.childFirstName) *
        (lastNameSortOrder === 'a-z' ? 1 : -1);
    });
  }, [
    assignmentFilter,
    lastNameSortOrder,
    programFilter,
    reviewableEnrollments,
    selectedProgram,
    selectedSection,
    sectionFilter,
    statusFilter
  ]);
  const heroTitle = selectedSection || (selectedProgram === 'All' ? 'Program Overview' : selectedProgram);
  const selectedProgramLabel =
    selectedProgram === 'All' ? 'All Programs' : selectedProgram;
  const activeManagedProgram = selectedProgram === 'All' ? null : selectedProgram;
  const activeSections = activeManagedProgram ? sectionsByProgram[activeManagedProgram] : [];
  const activeAutoAssign = activeManagedProgram ? autoAssignByProgram[activeManagedProgram] : false;
  const sectionLoadByProgram = useMemo(() => {
    const nextLoad = managedPrograms.reduce((catalog, program) => {
      catalog[program] = Object.fromEntries(
        sectionsByProgram[program].map((section) => [section, 0])
      );
      return catalog;
    }, {} as Record<ManagedProgram, Record<string, number>>);

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
  const selectedSectionStudents = useMemo(() => {
    if (!activeManagedProgram || !selectedSection) {
      return [] as EnrollmentData[];
    }

    return enrollments.filter(
      (enrollment) =>
        programAliases[activeManagedProgram].includes(enrollment.program) &&
        enrollment.section === selectedSection
    );
  }, [activeManagedProgram, enrollments, selectedSection]);
  const selectedSectionApprovedCount = selectedSectionStudents.filter(
    (enrollment) => enrollment.status === 'Approved'
  ).length;

  useEffect(() => {
    const derivedCatalog = emptySectionCatalog();

    enrollments.forEach((enrollment) => {
      const program = getManagedProgram(enrollment.program);
      const section = normalizeSectionName(enrollment.section || '');

      if (program && section && !derivedCatalog[program].includes(section)) {
        derivedCatalog[program] = [...derivedCatalog[program], section].sort((left, right) =>
          left.localeCompare(right)
        );
      }
    });

    setSectionsByProgram((currentCatalog) => {
      const nextCatalog = emptySectionCatalog();

      managedPrograms.forEach((program) => {
        nextCatalog[program] = Array.from(
          new Set([...currentCatalog[program], ...derivedCatalog[program]])
        ).sort((left, right) => left.localeCompare(right));
      });

      const hasChanged = managedPrograms.some(
        (program) =>
          nextCatalog[program].length !== currentCatalog[program].length ||
          nextCatalog[program].some((section, index) => section !== currentCatalog[program][index])
      );

      if (hasChanged) {
        saveStoredSections(nextCatalog);
        return nextCatalog;
      }

      return currentCatalog;
    });
  }, [enrollments]);

  useEffect(() => {
    if (!activeManagedProgram) {
      setSelectedSection(null);
      return;
    }

    if (selectedSection && !sectionsByProgram[activeManagedProgram].includes(selectedSection)) {
      setSelectedSection(null);
    }
  }, [activeManagedProgram, sectionsByProgram, selectedSection]);

  useEffect(() => {
    if (!selectedStudent) {
      return;
    }

    const latestSelectedStudent = enrollments.find(
      (enrollment) => enrollment.id === selectedStudent.id
    );

    if (!latestSelectedStudent) {
      setSelectedStudent(null);
      return;
    }

    setSelectedStudent(latestSelectedStudent);
  }, [enrollments, selectedStudent]);

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
            enrollment.status === 'Approved'
        );

        const sectionCounts = new Map<string, number>();
        sectionPool.forEach((section) => sectionCounts.set(section, 0));

        approvedStudents.forEach((student) => {
          if (student.section && sectionCounts.has(student.section)) {
            sectionCounts.set(student.section, (sectionCounts.get(student.section) || 0) + 1);
          }
        });

        const unassignedStudents = approvedStudents.filter(
          (student) => !student.section && !autoAssignInFlightRef.current.has(student.id)
        );

        for (const student of unassignedStudents) {
          const nextSection = [...sectionCounts.entries()]
            .filter(([, count]) => count < sectionCapacity)
            .sort((left, right) => {
              if (left[1] === right[1]) {
                return left[0].localeCompare(right[0]);
              }

              return left[1] - right[1];
            })[0]?.[0];

          if (!nextSection) {
            continue;
          }

          autoAssignInFlightRef.current.add(student.id);
          sectionCounts.set(nextSection, (sectionCounts.get(nextSection) || 0) + 1);

          const result = await updateSection(student.id, nextSection);

          autoAssignInFlightRef.current.delete(student.id);

          if (result.error) {
            window.alert(result.error);
            break;
          }
        }
      }
    };

    void assignStudentsAutomatically();
  }, [autoAssignByProgram, enrollments, sectionsByProgram, updateSection]);

  const selectedStudentEntries = useMemo(() => {
    if (!selectedStudent?.formData) {
      return [] as [string, unknown][];
    }

    return Object.entries(selectedStudent.formData) as [string, unknown][];
  }, [selectedStudent]);

  const selectedStudentIdPicture = useMemo(() => {
    if (!selectedStudent?.formData || typeof selectedStudent.formData !== 'object') {
      return null as null | {
        fileName: string;
        storagePath?: string;
        publicUrl?: string;
      };
    }

    const formData = selectedStudent.formData as Record<string, unknown>;
    const rawValue =
      formData.idPicture ||
      formData.id_picture ||
      formData.learnerIdPicture ||
      null;

    if (!rawValue) {
      return null;
    }

    if (typeof rawValue === 'string') {
      return {
        fileName: 'Uploaded ID Photo',
        publicUrl: rawValue
      };
    }

    if (typeof rawValue === 'object') {
      const pictureValue = rawValue as {
        fileName?: unknown;
        storagePath?: unknown;
        publicUrl?: unknown;
        url?: unknown;
      };

      const storagePath =
        typeof pictureValue.storagePath === 'string' ? pictureValue.storagePath : undefined;
      const publicUrl =
        typeof pictureValue.publicUrl === 'string' ? pictureValue.publicUrl :
        typeof pictureValue.url === 'string' ? pictureValue.url :
        undefined;

      if (!storagePath && !publicUrl) {
        return null;
      }

      return {
        fileName:
          typeof pictureValue.fileName === 'string' ?
          pictureValue.fileName :
          'Uploaded ID Photo',
        storagePath,
        publicUrl
      };
    }

    return null;
  }, [selectedStudent]);

  const formatValue = (value: unknown) => {
    if (value === null || value === undefined || value === '') {
      return 'N/A';
    }

    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(', ') : 'N/A';
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  };

  const openRequirementFile = async (
  requirement: {
    id: string;
    storagePath?: string;
    publicUrl?: string;
  }) =>
  {
    if (requirement.storagePath) {
      setLoadingRequirementId(requirement.id);

      const { data, error } = await supabase.storage
        .from('requirements')
        .createSignedUrl(requirement.storagePath, 60 * 10);

      setLoadingRequirementId(null);

      if (!error && data?.signedUrl) {
        window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
        return;
      }
    }

    if (requirement.publicUrl) {
      window.open(requirement.publicUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const openEnrollmentIdPicture = async (storagePath: string) => {
    setLoadingIdPicturePath(storagePath);

    const { data, error } = await supabase.storage
      .from('enrollment-files')
      .createSignedUrl(storagePath, 60 * 10);

    setLoadingIdPicturePath(null);

    if (!error && data?.signedUrl) {
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDeleteEnrollment = async (enrollment: EnrollmentData) => {
    const shouldDelete = window.confirm(
      `Delete enrollment record for ${enrollment.childFirstName} ${enrollment.childLastName}? This cannot be undone.`
    );

    if (!shouldDelete) {
      return;
    }

    const { error } = await deleteEnrollment(enrollment.id);
    if (error) {
      window.alert(error);
      return;
    }

    setSelectedStudent(null);
  };

  const handleDownloadCSV = () => {
    const headers = [
    'Last Name',
    'First Name',
    'Program',
    'Section',
    'Role',
    'Status',
    'Date Enrolled'];

    const rows = filteredMasterlist.map((e) => [
    e.childLastName,
    e.childFirstName,
    e.program,
    e.section || '',
    e.role,
    e.status,
    new Date(e.submittedAt).toLocaleDateString()]
    );
    const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(','))].
    join('\n');
    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'masterlist.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleResetFilters = () => {
    setLastNameSortOrder('a-z');
    setProgramFilter('all');
    setAssignmentFilter('all');
    setSectionFilter('all');
    setStatusFilter('all');
  };

  const handleDownloadSectionCSV = () => {
    if (!activeManagedProgram || !selectedSection) {
      return;
    }

    const headers = [
      'Last Name',
      'First Name',
      'Program',
      'Section',
      'Role',
      'Status',
      'Date Enrolled'
    ];

    const rows = selectedSectionStudents.map((student) => [
      student.childLastName,
      student.childFirstName,
      student.program,
      student.section || '',
      student.role,
      student.status,
      new Date(student.submittedAt).toLocaleDateString()
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeSectionName = selectedSection.replace(/[^a-z0-9]+/gi, '-').toLowerCase();

    link.href = url;
    link.setAttribute('download', `${safeSectionName}-masterlist.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddSection = () => {
    if (!activeManagedProgram) {
      return;
    }

    const normalizedSectionName = normalizeSectionName(newSectionName);

    if (!normalizedSectionName) {
      return;
    }

    const nextSections = Array.from(
      new Set([...sectionsByProgram[activeManagedProgram], normalizedSectionName])
    ).sort((left, right) => left.localeCompare(right));

    const nextCatalog = {
      ...sectionsByProgram,
      [activeManagedProgram]: nextSections
    };

    setSectionsByProgram(nextCatalog);
    saveStoredSections(nextCatalog);
    setNewSectionName('');
  };

  const handleToggleAutoAssign = (program: ManagedProgram) => {
    const nextCatalog = {
      ...autoAssignByProgram,
      [program]: !autoAssignByProgram[program]
    };

    setAutoAssignByProgram(nextCatalog);
    saveStoredAutoAssign(nextCatalog);
  };

  const handleUpdateStudentSection = async (
    enrollment: EnrollmentData,
    nextSection: string | null
  ) => {
    const normalizedSection = nextSection ? normalizeSectionName(nextSection) : null;
    const { error } = await updateSection(enrollment.id, normalizedSection);

    if (error) {
      window.alert(error);
      return;
    }

    if (selectedStudent?.id === enrollment.id) {
      setSelectedStudent({
        ...selectedStudent,
        section: normalizedSection,
        formData: {
          ...(selectedStudent.formData || {}),
          section: normalizedSection
        }
      });
    }
  };

  const handleDeleteSection = async () => {
    if (!activeManagedProgram || !selectedSection) {
      return;
    }

    setIsDeletingSection(true);

    try {
      const sectionStudents = enrollments.filter(
        (enrollment) =>
          programAliases[activeManagedProgram].includes(enrollment.program) &&
          enrollment.section === selectedSection
      );

      const results = await Promise.all(
        sectionStudents.map((enrollment) => updateSection(enrollment.id, null))
      );

      const firstError = results.find((result) => result.error);

      if (firstError?.error) {
        window.alert(firstError.error);
        return;
      }

      const nextCatalog = {
        ...sectionsByProgram,
        [activeManagedProgram]: sectionsByProgram[activeManagedProgram].filter(
          (section) => section !== selectedSection
        )
      };

      setSectionsByProgram(nextCatalog);
      saveStoredSections(nextCatalog);
      setSelectedSection(null);
      setIsSectionInfoOpen(false);
      setIsDeleteSectionConfirmOpen(false);
    } finally {
      setIsDeletingSection(false);
    }
  };

  return (
    <div className="p-8 pb-24">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-800">
            Staff Dashboard
          </h1>
          <p className="text-gray-500 mt-1">Manage students and enrollments.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleDownloadCSV}
            className="bg-[#BAE6FD] hover:bg-[#7DD3FC] px-6 py-3 rounded-xl font-bold text-gray-800 flex items-center gap-2 transition-colors shadow-sm"
          >
            <DownloadIcon className="w-5 h-5" />
            Download Masterlist
          </button>
        </div>
      </div>

      <div className="mb-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-600">
              Aggregate Summary Reports
            </p>
            <h2 className="mt-1 text-2xl font-extrabold text-gray-800">
              Enrollment Snapshot
            </h2>
          </div>
          <p className="text-sm font-medium text-gray-500">
            {selectedSection ? `${selectedSection} · ${selectedProgramLabel}` : selectedProgramLabel}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
              Total Enrolled
            </p>
            <p className="mt-3 text-4xl font-extrabold text-gray-800">
              {aggregateSummary.totalEnrolled}
            </p>
          </div>
          <div className="rounded-3xl border border-yellow-100 bg-[#FFFBEA] p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-700/80">
              Pending
            </p>
            <p className="mt-3 text-4xl font-extrabold text-yellow-800">
              {aggregateSummary.pending}
            </p>
          </div>
          <div className="rounded-3xl border border-green-100 bg-[#F0FDF4] p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-green-700/80">
              Approved
            </p>
            <p className="mt-3 text-4xl font-extrabold text-green-800">
              {aggregateSummary.approved}
            </p>
          </div>
          <div className="rounded-3xl border border-red-100 bg-[#FEF2F2] p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-700/80">
              Rejected
            </p>
            <p className="mt-3 text-4xl font-extrabold text-red-800">
              {aggregateSummary.rejected}
            </p>
          </div>
        </div>
      </div>

      {/* Hero Card */}
      <motion.div
        initial={{
          opacity: 0,
          y: 20
        }}
        animate={{
          opacity: 1,
          y: 0
        }}
        className="bg-gradient-to-r from-[#93C5FD] via-[#3B82F6] to-[#1D4ED8] rounded-3xl p-8 mb-10 text-white shadow-lg relative overflow-hidden">

        <div className="pointer-events-none absolute right-0 top-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-16 -mt-16" />
        <div className="relative z-10">
          <div className="flex flex-wrap gap-3 mb-6">
            {programOptions.map((program) => {
              const isActive = selectedProgram === program;

              return (
                <button
                  key={program}
                  type="button"
                  onClick={() => setSelectedProgram(program)}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition-all ${isActive ? 'bg-white text-gray-800 shadow-md' : 'bg-white/25 text-gray-800 hover:bg-white/40'}`}
                >
                  {program}
                </button>
              );
            })}
          </div>
          <div className="mb-2 flex flex-wrap items-center gap-3">
            <h2 className="text-4xl font-extrabold text-gray-800">
              {heroTitle}
            </h2>
            {activeManagedProgram && selectedSection ?
              <>
                <button
                  type="button"
                  onClick={() => setIsSectionInfoOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-gray-800 shadow-sm transition hover:bg-gray-100"
                >
                  <InfoIcon className="h-4 w-4" />
                  Section Info
                </button>
                <button
                  type="button"
                  onClick={handleDownloadSectionCSV}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-gray-800 shadow-sm transition hover:bg-gray-100"
                >
                  <DownloadIcon className="h-4 w-4" />
                  Download Section Masterlist
                </button>
              </> :
              null}
          </div>
          <p className="text-gray-800 font-medium opacity-80 text-lg mb-8">
            {selectedSection ? `${selectedProgramLabel} Section` : selectedProgramLabel}
          </p>

          <div className="mb-8 rounded-2xl bg-white/20 p-4 backdrop-blur-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-700/70">
                  Section Management
                </p>
                <h3 className="mt-1 text-xl font-bold text-gray-800">
                  {activeManagedProgram ? `${activeManagedProgram} Sections` : 'Select a program first'}
                </h3>
                {activeManagedProgram ?
                  <div className="mt-3 flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-700">
                      Automatic assignment
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleAutoAssign(activeManagedProgram)}
                      className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-bold transition ${activeAutoAssign ? 'bg-green-600 text-white hover:bg-green-500' : 'bg-gray-700 text-white hover:bg-gray-600'}`}
                    >
                      {activeAutoAssign ? 'ON' : 'OFF'}
                    </button>
                    <span className="text-xs font-medium text-gray-500">
                      Max {sectionCapacity} students per section
                    </span>
                  </div> :
                  null}
              </div>
              <div className="flex w-full flex-col gap-3 lg:w-auto lg:min-w-[360px] lg:flex-row">
                <input
                  type="text"
                  value={newSectionName}
                  onChange={(event) => setNewSectionName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleAddSection();
                    }
                  }}
                  disabled={!activeManagedProgram}
                  placeholder={
                    activeManagedProgram ? 'Add a section name' : 'Choose a program to add sections'
                  }
                  className="w-full rounded-full border border-white/40 bg-white/90 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition focus:border-white lg:w-[240px]"
                />
                <button
                  type="button"
                  onClick={handleAddSection}
                  disabled={!activeManagedProgram || !normalizeSectionName(newSectionName)}
                  className="rounded-full bg-gray-800 px-5 py-3 text-sm font-bold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-500"
                >
                  Add Section
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {activeManagedProgram ?
                activeSections.length > 0 ?
                  <>
                    <button
                      type="button"
                      onClick={() => setSelectedSection(null)}
                      className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${selectedSection === null ? 'bg-gray-800 text-white shadow-sm' : 'bg-white text-gray-800 shadow-sm hover:bg-gray-100'}`}
                    >
                      All Sections
                    </button>
                    {activeSections.map((section) => (
                      <button
                        key={section}
                        type="button"
                        onClick={() => setSelectedSection(section)}
                        className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${selectedSection === section ? 'bg-gray-800 text-white shadow-sm' : 'bg-white text-gray-800 shadow-sm hover:bg-gray-100'}`}
                      >
                        {section}
                      </button>
                    ))}
                  </> :
                  <p className="text-sm font-medium text-gray-700">
                    No sections added yet for this program.
                  </p> :
                <p className="text-sm font-medium text-gray-700">
                  Pick one of the three programs above to add and manage its sections.
                </p>}
            </div>

          </div>

          <div className="flex items-end gap-3">
            <motion.span
              initial={{
                opacity: 0,
                scale: 0.5
              }}
              animate={{
                opacity: 1,
                scale: 1
              }}
              transition={{
                type: 'spring',
                stiffness: 100,
                delay: 0.2
              }}
              className="text-7xl font-extrabold text-gray-800">

              {selectedSection ? `${selectedSectionApprovedCount}/${sectionCapacity}` : approvedStudentsCount}
            </motion.span>
            <span className="text-xl font-bold text-gray-800 mb-2 opacity-70">
              {selectedSection ? 'Section Capacity Used' : 'Total Approved Students'}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Masterlist Table */}
      <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-bold text-gray-800 text-lg">Masterlist</h3>
              <button
                type="button"
                onClick={handleResetFilters}
                className="rounded-full bg-gray-100 px-4 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-200"
              >
                Reset Filters
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <select
                value={lastNameSortOrder}
                onChange={(event) => setLastNameSortOrder(event.target.value as 'a-z' | 'z-a')}
                className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-800 outline-none transition focus:border-sky-300"
              >
                <option value="a-z">Last Name: A-Z</option>
                <option value="z-a">Last Name: Z-A</option>
              </select>
              {selectedProgram === 'All' ?
                <>
                  <select
                    value={programFilter}
                    onChange={(event) => setProgramFilter(event.target.value)}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-800 outline-none transition focus:border-sky-300"
                  >
                    <option value="all">All Programs</option>
                    {managedPrograms.map((program) => (
                      <option key={program} value={program}>
                        {program}
                      </option>
                    ))}
                  </select>
                  <select
                    value={assignmentFilter}
                    onChange={(event) => setAssignmentFilter(event.target.value)}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-800 outline-none transition focus:border-sky-300"
                  >
                    <option value="all">All Assignments</option>
                    <option value="assigned">Assigned</option>
                    <option value="unassigned">Unassigned</option>
                  </select>
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-800 outline-none transition focus:border-sky-300"
                  >
                    <option value="all">All Statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </> :
                null}
              {selectedProgram !== 'All' && !selectedSection ?
                <select
                  value={sectionFilter}
                  onChange={(event) => setSectionFilter(event.target.value)}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-800 outline-none transition focus:border-sky-300"
                >
                  <option value="all">All Sections</option>
                  <option value="__unassigned__">Unassigned</option>
                  {masterlistSectionOptions.map((section) => (
                    <option key={section} value={section}>
                      {section}
                    </option>
                  ))}
                </select> :
                null}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  #
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Last Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  First Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Program
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Section
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredMasterlist.length === 0 ?
              <tr>
                  <td
                  colSpan={7}
                  className="px-6 py-12 text-center text-gray-500">

                    {reviewableEnrollments.length === 0 ?
                      'No applications are under review yet.' :
                      'No student records match the current filters.'}
                  </td>
                </tr> :

              filteredMasterlist.map((student, index) =>
              <motion.tr
                key={student.id}
                initial={{
                  opacity: 0,
                  x: -20
                }}
                animate={{
                  opacity: 1,
                  x: 0
                }}
                transition={{
                  delay: index * 0.05
                }}
                onClick={() => setSelectedStudent(student)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSelectedStudent(student);
                  }
                }}
                tabIndex={0}
                role="button"
                className={`${index % 2 === 0 ? 'bg-white' : 'bg-[#FFFBEB]'} cursor-pointer hover:bg-[#F0F9FF] focus:outline-none focus:ring-2 focus:ring-sky-200`}>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">
                      {student.childLastName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                      {student.childFirstName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {student.program}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="relative w-fit min-w-[170px]">
                        <select
                          value={student.section || ''}
                          disabled={student.status !== 'Approved'}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) => {
                            const nextValue = event.target.value || null;
                            void handleUpdateStudentSection(student, nextValue);
                          }}
                          className={`w-full appearance-none rounded-full border-none px-3 py-2 pr-7 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-200 ${student.status === 'Approved' ? 'bg-slate-100 text-gray-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                        >
                          <option value="">Unassigned</option>
                          {(() => {
                            const managedProgram = getManagedProgram(student.program);
                            const sectionOptions = managedProgram ? sectionsByProgram[managedProgram] : [];
                            const mergedOptions = student.section && !sectionOptions.includes(student.section) ?
                              [...sectionOptions, student.section] :
                              sectionOptions;

                            return mergedOptions.map((section) => {
                              const sectionCount = managedProgram ? sectionLoadByProgram[managedProgram][section] || 0 : 0;
                              const isFull = sectionCount >= sectionCapacity && student.section !== section;

                              return (
                              <option key={section} value={section} disabled={isFull}>
                                {section}
                              </option>
                              );
                            });
                          })()}
                        </select>
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-current"
                        >
                          ▾
                        </span>
                      </div>
                      {student.status !== 'Approved' ?
                        <p className="mt-1 text-[11px] font-medium text-gray-400">
                          Approve first to assign a section.
                        </p> :
                        null}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-2">
                        <div className="relative w-fit">
                          <select
                            value={student.status}
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) =>
                            updateStatus(
                              student.id,
                              event.target.value as 'Pending' | 'Approved' | 'Rejected'
                            )
                            }
                            className={`px-3 py-1 pr-7 text-xs font-bold rounded-full border-none appearance-none w-fit cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-200 ${student.status === 'Approved' ? 'bg-[#BBF7D0] text-green-800' : student.status === 'Rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}
                          >
                            <option value="Pending" className="bg-yellow-50 text-yellow-800" style={{ backgroundColor: '#FEF9C3', color: '#854D0E' }}>
                              Pending
                            </option>
                            <option value="Approved" className="bg-green-50 text-green-800" style={{ backgroundColor: '#DCFCE7', color: '#166534' }}>
                              Approved
                            </option>
                            <option value="Rejected" className="bg-red-50 text-red-800" style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}>
                              Rejected
                            </option>
                          </select>
                          <span
                            aria-hidden="true"
                            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-current"
                          >
                            ▾
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(student.submittedAt).toLocaleDateString()}
                    </td>
                  </motion.tr>
              )
              }
            </tbody>
          </table>
        </div>
      </div>

      {isSectionInfoOpen && activeManagedProgram && selectedSection ?
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-5xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
                  Section Info
                </p>
                <h3 className="mt-1 text-3xl font-extrabold text-gray-800">{selectedSection}</h3>
                <p className="mt-1 text-sm font-medium text-gray-500">
                  {activeManagedProgram}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSectionInfoOpen(false)}
                className="rounded-full px-4 py-2 text-sm font-bold text-gray-600 transition hover:bg-gray-100"
              >
                Close
              </button>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gray-50 p-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                  Number Of Students
                </p>
                <p className="mt-2 text-4xl font-extrabold text-gray-800">
                  {selectedSectionStudents.length}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDeleteSectionConfirmOpen(true)}
                disabled={isDeletingSection}
                className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-red-300"
              >
                <Trash2Icon className="h-4 w-4" />
                {isDeletingSection ? 'Deleting...' : 'Delete Section'}
              </button>
            </div>
          </div>
        </div> :
        null}

      {isDeleteSectionConfirmOpen && selectedSection ?
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-extrabold text-gray-800">
              Delete Section
            </h3>
            <p className="mt-3 text-sm leading-6 text-gray-600">
              Delete section {selectedSection}? Assigned students will become unassigned.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteSectionConfirmOpen(false)}
                disabled={isDeletingSection}
                className="rounded-full px-4 py-2 text-sm font-bold text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteSection()}
                disabled={isDeletingSection}
                className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-red-300"
              >
                <Trash2Icon className="h-4 w-4" />
                {isDeletingSection ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div> :
        null}

      {selectedStudent ?
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-gray-100 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800">
                Student Information Card
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDeleteEnrollment(selectedStudent)}
                  className="px-3 py-1.5 rounded-lg text-sm font-bold text-red-700 bg-red-100 hover:bg-red-200"
                >
                  Delete
                </button>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="px-3 py-1.5 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-100">

                  Close
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
                    Last Name
                  </p>
                  <p className="text-sm font-bold text-gray-800">
                    {selectedStudent.childLastName}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
                    First Name
                  </p>
                  <p className="text-sm font-bold text-gray-800">
                    {selectedStudent.childFirstName}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
                    Program
                  </p>
                  <p className="text-sm text-gray-800">{selectedStudent.program}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
                    Section
                  </p>
                  <p className="text-sm text-gray-800">{selectedStudent.section || 'Unassigned'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
                    Role
                  </p>
                  <p className="text-sm text-gray-800">{selectedStudent.role}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
                    Status
                  </p>
                  <p className="text-sm text-gray-800">{selectedStudent.status}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
                    Submitted At
                  </p>
                  <p className="text-sm text-gray-800">
                    {new Date(selectedStudent.submittedAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
                    ID
                  </p>
                  <p className="text-sm text-gray-800 break-all">{selectedStudent.id}</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-gray-800 mb-3">Submitted Form Data</h4>
                {selectedStudentEntries.length === 0 ?
                <p className="text-sm text-gray-500">No additional form fields submitted.</p> :
                <div className="space-y-3">
                    {selectedStudentEntries.map(([key, value]) =>
                  key === 'idPicture' || key === 'id_picture' || key === 'learnerIdPicture' ?
                  null :
                  <div
                    key={key}
                    className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">

                        <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-1">
                          {key}
                        </p>
                        <p className="text-sm text-gray-800 break-words">
                          {formatValue(value)}
                        </p>
                      </div>
                  )}
                  </div>
                }
              </div>

              <div>
                <h4 className="text-sm font-bold text-gray-800 mb-3">Learner ID Picture</h4>
                {selectedStudentIdPicture ?
                <div className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                    <p className="text-sm text-gray-800 break-words">
                      {selectedStudentIdPicture.fileName}
                    </p>
                    {selectedStudentIdPicture.storagePath ?
                  <button
                    type="button"
                    onClick={() =>
                    openEnrollmentIdPicture(selectedStudentIdPicture.storagePath as string)
                    }
                    disabled={
                    loadingIdPicturePath === selectedStudentIdPicture.storagePath
                    }
                    className="text-xs font-bold text-blue-600 hover:underline mt-1 inline-block"
                  >
                        {loadingIdPicturePath === selectedStudentIdPicture.storagePath ?
                    'Preparing link...' :
                    'View ID Photo'}
                      </button> :
                  selectedStudentIdPicture.publicUrl ?
                  <button
                    type="button"
                    onClick={() =>
                    window.open(
                      selectedStudentIdPicture.publicUrl,
                      '_blank',
                      'noopener,noreferrer'
                    )
                    }
                    className="text-xs font-bold text-blue-600 hover:underline mt-1 inline-block"
                  >
                        View ID Photo
                      </button> :
                  null}
                  </div> :
                <p className="text-sm text-gray-500">No ID picture uploaded for this enrollment.</p>}
              </div>

              <div>
                <h4 className="text-sm font-bold text-gray-800 mb-3">
                  Requirements / Uploaded PDFs
                </h4>
                {selectedStudent.requirements.length === 0 ?
                <p className="text-sm text-gray-500">No uploaded requirement files yet.</p> :
                <div className="space-y-3">
                    {selectedStudent.requirements.map((requirement) =>
                  <div
                    key={requirement.id}
                    className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">

                        <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-1">
                          {requirement.label}
                        </p>
                        <p className="text-sm text-gray-800 break-words">
                          {requirement.fileName}
                        </p>
                        {requirement.storagePath || requirement.publicUrl ?
                      <button
                        type="button"
                        onClick={() => openRequirementFile(requirement)}
                        disabled={loadingRequirementId === requirement.id}
                        className="text-xs font-bold text-blue-600 hover:underline mt-1 inline-block"
                      >
                          {loadingRequirementId === requirement.id ?
                        'Preparing link...' :
                        'View Uploaded Document'}
                        </button> :
                      null}
                      </div>
                  )}
                  </div>
                }
              </div>
            </div>
          </div>
        </div> :
      null}
    </div>);

}