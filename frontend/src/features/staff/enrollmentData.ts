import type { EnrollmentData } from '../../context/EnrollmentContext';

/**
 * Reading + exporting helpers for a learner's enrollment record. Ported from
 * the original StaffDashboard so masterlist columns, file-reference parsing,
 * and field labels stay byte-for-byte compatible.
 */

export type ParsedFileReference = {
  fileName: string;
  storagePath?: string;
  publicUrl?: string;
};

export type ViewableRequirement = {
  id: string;
  label: string;
  fileName: string;
  storagePath?: string;
  publicUrl?: string;
  bucketName: 'requirements' | 'enrollment-files';
};

const legacyRequirementFields = [
  { key: 'incomeProof', label: 'Income Proof' },
  { key: 'income_proof', label: 'Income Proof' },
] as const;

export const fileFieldKeysToHide = new Set<string>([
  'idPicture',
  'id_picture',
  'learnerIdPicture',
  'regionCode',
  'provinceCode',
  'municipalityCode',
  ...legacyRequirementFields.map((field) => field.key),
]);

const submittedFieldLabels: Record<string, string> = {
  childFirstName: 'Child First Name',
  childMiddleName: 'Child Middle Name',
  childLastName: 'Child Last Name',
  childPhilSysNumber: 'Child PhilSys Number',
  sex: 'Sex',
  dateOfBirth: 'Birthday',
  age: 'Age',
  region: 'Region',
  streetAddress: 'Street Address',
  barangay: 'Barangay',
  municipality: 'City / Municipality',
  province: 'Province',
  address: 'Full Address',
  healthConcerns: 'Health Concerns / Allergies',
  financialProgram: 'Beneficiary Program',
  financialProgramOther: 'Beneficiary Program Details',
  enrolledSiblings: 'Enrolled Siblings',
  enrolledSiblingDetails: 'Enrolled Sibling Details',
  motherName: "Mother's Name",
  fatherName: "Father's Name",
  guardianName: "Guardian's Name",
  relationship: 'Relationship',
  relationshipOther: 'Relationship Details',
  guardianOccupation: "Guardian's Occupation",
  motherOccupation: "Mother's Occupation",
  fatherOccupation: "Father's Occupation",
  motherContact: "Mother's Contact No.",
  fatherContact: "Father's Contact No.",
  guardianContact: "Guardian's Contact No.",
  soloParentStatus: 'Solo Parent Status',
  parentGuardianPhilSysNumber: 'Parent/Guardian PhilSys Number',
  incomeSourceCategory: 'Source of Income',
  incomeSourceCategoryOther: 'Source of Income Details',
  parentGuardianSpecialStatus: 'Parent/Guardian Disability or Senior Citizen Status',
  monthlyIncome: 'Monthly Family Income',
  program: 'Program Placement',
  schoolYear: 'School Year',
  schedule: 'Schedule',
};

export const formatSubmittedFieldLabel = (key: string) => {
  if (submittedFieldLabels[key]) {
    return submittedFieldLabels[key];
  }

  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

export const parseFileReference = (
  rawValue: unknown,
  fallbackFileName: string,
): ParsedFileReference | null => {
  if (!rawValue) {
    return null;
  }

  if (typeof rawValue === 'string') {
    const trimmedValue = rawValue.trim();

    if (!trimmedValue) {
      return null;
    }

    if (trimmedValue.startsWith('{') || trimmedValue.startsWith('[')) {
      try {
        return parseFileReference(JSON.parse(trimmedValue), fallbackFileName);
      } catch {
        return {
          fileName: fallbackFileName,
          publicUrl: trimmedValue,
        };
      }
    }

    return /^https?:\/\//i.test(trimmedValue)
      ? {
          fileName: fallbackFileName,
          publicUrl: trimmedValue,
        }
      : {
          fileName: fallbackFileName,
          storagePath: trimmedValue,
        };
  }

  if (typeof rawValue !== 'object') {
    return null;
  }

  const fileValue = rawValue as {
    fileName?: unknown;
    filename?: unknown;
    name?: unknown;
    storagePath?: unknown;
    path?: unknown;
    publicUrl?: unknown;
    url?: unknown;
  };

  const fileName =
    typeof fileValue.fileName === 'string' && fileValue.fileName.trim()
      ? fileValue.fileName.trim()
      : typeof fileValue.filename === 'string' && fileValue.filename.trim()
        ? fileValue.filename.trim()
        : typeof fileValue.name === 'string' && fileValue.name.trim()
          ? fileValue.name.trim()
          : fallbackFileName;

  const storagePath =
    typeof fileValue.storagePath === 'string' && fileValue.storagePath.trim()
      ? fileValue.storagePath.trim()
      : typeof fileValue.path === 'string' && fileValue.path.trim()
        ? fileValue.path.trim()
        : undefined;

  const publicUrl =
    typeof fileValue.publicUrl === 'string' && fileValue.publicUrl.trim()
      ? fileValue.publicUrl.trim()
      : typeof fileValue.url === 'string' && fileValue.url.trim()
        ? fileValue.url.trim()
        : undefined;

  if (!storagePath && !publicUrl) {
    return null;
  }

  return {
    fileName,
    storagePath,
    publicUrl,
  };
};

export const mergeEnrollmentRequirements = (enrollment: EnrollmentData): ViewableRequirement[] => {
  const normalizedRequirements = enrollment.requirements
    .filter((requirement) => requirement.storagePath || requirement.publicUrl)
    .map((requirement) => ({
      ...requirement,
      bucketName: 'requirements' as const,
    }));
  const seenRequirementKeys = new Set(
    normalizedRequirements.map(
      (requirement) =>
        `${requirement.storagePath || ''}|${requirement.publicUrl || ''}|${requirement.fileName}`,
    ),
  );

  if (!enrollment.formData || typeof enrollment.formData !== 'object') {
    return normalizedRequirements;
  }

  const formData = enrollment.formData as Record<string, unknown>;
  const legacyRequirements = legacyRequirementFields.flatMap((field) => {
    const parsedReference = parseFileReference(formData[field.key], field.label);

    if (!parsedReference) {
      return [];
    }

    const requirementKey = `${parsedReference.storagePath || ''}|${parsedReference.publicUrl || ''}|${parsedReference.fileName}`;

    if (seenRequirementKeys.has(requirementKey)) {
      return [];
    }

    seenRequirementKeys.add(requirementKey);

    return [
      {
        id: field.key,
        label: field.label,
        fileName: parsedReference.fileName,
        storagePath: parsedReference.storagePath,
        publicUrl: parsedReference.publicUrl,
        bucketName: 'enrollment-files' as const,
      },
    ];
  });

  return [...normalizedRequirements, ...legacyRequirements];
};

export const hasViewableDocuments = (enrollment: EnrollmentData) =>
  mergeEnrollmentRequirements(enrollment).length > 0;

export const getEnrollmentIdPicture = (enrollment: EnrollmentData): ParsedFileReference | null => {
  if (!enrollment.formData || typeof enrollment.formData !== 'object') {
    return null;
  }

  const formData = enrollment.formData as Record<string, unknown>;
  const rawValue = formData.idPicture || formData.id_picture || formData.learnerIdPicture || null;

  if (!rawValue) {
    return null;
  }

  return parseFileReference(rawValue, 'Uploaded ID Photo');
};

const getEnrollmentFormValue = (enrollment: EnrollmentData, key: string) => {
  const value = enrollment.formData?.[key];
  return typeof value === 'string' ? value.trim() : '';
};

const getExportAddress = (enrollment: EnrollmentData) => {
  const directAddress = getEnrollmentFormValue(enrollment, 'address');

  if (directAddress) {
    return directAddress;
  }

  return [
    getEnrollmentFormValue(enrollment, 'streetAddress'),
    getEnrollmentFormValue(enrollment, 'barangay'),
    getEnrollmentFormValue(enrollment, 'municipality'),
    getEnrollmentFormValue(enrollment, 'province'),
    getEnrollmentFormValue(enrollment, 'region'),
  ]
    .filter(Boolean)
    .join(', ');
};

const getGuardianParentName = (enrollment: EnrollmentData) =>
  [
    getEnrollmentFormValue(enrollment, 'motherName'),
    getEnrollmentFormValue(enrollment, 'fatherName'),
    getEnrollmentFormValue(enrollment, 'guardianName'),
  ]
    .filter(Boolean)
    .join(' / ');

const getGuardianParentContact = (enrollment: EnrollmentData) =>
  [
    getEnrollmentFormValue(enrollment, 'motherContact'),
    getEnrollmentFormValue(enrollment, 'fatherContact'),
    getEnrollmentFormValue(enrollment, 'guardianContact'),
  ]
    .filter(Boolean)
    .join(' / ');

const getSourceOfIncome = (enrollment: EnrollmentData) => {
  const categorizedIncomeSource = getEnrollmentFormValue(enrollment, 'incomeSourceCategory');

  if (categorizedIncomeSource) {
    return categorizedIncomeSource;
  }

  return [
    getEnrollmentFormValue(enrollment, 'motherOccupation'),
    getEnrollmentFormValue(enrollment, 'fatherOccupation'),
    getEnrollmentFormValue(enrollment, 'guardianOccupation'),
  ]
    .filter(Boolean)
    .join(' / ');
};

const getSiblingDetails = (enrollment: EnrollmentData) => {
  const rawValue = enrollment.formData?.enrolledSiblingDetails;

  if (!Array.isArray(rawValue)) {
    return [] as Array<Record<string, unknown>>;
  }

  return rawValue.filter(
    (entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object',
  );
};

const getSiblingNames = (enrollment: EnrollmentData) =>
  getSiblingDetails(enrollment)
    .map((sibling) => (typeof sibling.name === 'string' ? sibling.name.trim() : ''))
    .filter(Boolean)
    .join(' / ');

const getSiblingPrograms = (enrollment: EnrollmentData) =>
  getSiblingDetails(enrollment)
    .map((sibling) => (typeof sibling.program === 'string' ? sibling.program.trim() : ''))
    .filter(Boolean)
    .join(' / ');

const escapeCsvValue = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const masterlistHeaders = [
  'Last Name',
  'First Name',
  'Program',
  'Section',
  'Role',
  'Status',
  'Date Enrolled',
  'Gender',
  'Date of Birth',
  'Guardian / Parent Name',
  'Address',
  'Contact Number',
  'Source of Income',
  'Allergies / Health Conditions',
  'Number of Siblings',
  'Sibling Name',
  'Sibling Program',
];

const buildMasterlistExportRow = (enrollment: EnrollmentData) => [
  enrollment.childLastName,
  enrollment.childFirstName,
  enrollment.program,
  enrollment.section || '',
  enrollment.role,
  enrollment.status,
  new Date(enrollment.submittedAt).toLocaleDateString(),
  getEnrollmentFormValue(enrollment, 'sex'),
  getEnrollmentFormValue(enrollment, 'dateOfBirth'),
  getGuardianParentName(enrollment),
  getExportAddress(enrollment),
  getGuardianParentContact(enrollment),
  getSourceOfIncome(enrollment),
  getEnrollmentFormValue(enrollment, 'healthConcerns'),
  String(enrollment.formData?.enrolledSiblings ?? getSiblingDetails(enrollment).length ?? 0),
  getSiblingNames(enrollment),
  getSiblingPrograms(enrollment),
];

/** Build the masterlist CSV text for a set of enrollment records. */
export const buildMasterlistCsv = (enrollments: EnrollmentData[]) => {
  const rows = enrollments.map(buildMasterlistExportRow);
  return [
    masterlistHeaders.map(escapeCsvValue).join(','),
    ...rows.map((row) => row.map(escapeCsvValue).join(',')),
  ].join('\n');
};

/** Trigger a client-side download of a text blob. */
export const downloadCsv = (fileName: string, csvContent: string) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/** Human-readable value for a single submitted form field. */
export const formatFieldValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') {
    return 'N/A';
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return 'N/A';
    }

    return value
      .map((entry) => (typeof entry === 'object' ? JSON.stringify(entry) : String(entry)))
      .join(', ');
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
};

export const getSiblingEntries = getSiblingDetails;
