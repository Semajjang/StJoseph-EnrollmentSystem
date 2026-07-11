import type { RefObject } from 'react';
import type { AgeBreakdown, AgeRule } from '../../lib/ageRules';
import type { PhilippineAddressOption } from '../../lib/philippineAddress';

export const ENROLLMENT_DRAFT_STORAGE_KEY = 'enrollment-form-draft';

export const MAX_UPLOAD_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const allowedUploadMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];
export const allowedUploadExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];

export const beneficiaryProgramOptions = [
  'None / Not currently enrolled in a beneficiary program',
  '4Ps (Pantawid Pamilyang Pilipino Program)',
  'AICS (Assistance to Individuals in Crisis Situation)',
  'AKAP (Ayuda para sa Kapos ang Kita Program)',
  'UCT (Unconditional Cash Transfer)',
  'Social Pension for Indigent Senior Citizens',
  'Solo Parent Cash Assistance / Solo Parent Benefits',
  'PWD Assistance Program',
  'Supplementary Feeding Program',
  'SLP (Sustainable Livelihood Program)',
  'TUPAD',
  'DOLE Integrated Livelihood Program (Kabuhayan)',
  'Government Internship Program (GIP)',
  'JobStart Philippines',
  'TES (Tertiary Education Subsidy)',
  'Tulong Dunong Program',
  'Educational Assistance Program',
  'ESGP-PA (Expanded Students\' Grants-in-Aid Program for Poverty Alleviation)',
  'PhilHealth Sponsored Program',
  'Walang Gutom Program / Food Stamp Program',
  'Rice Assistance / Rice Subsidy Program',
  'Medical Assistance Program',
  'Burial / Funeral Assistance Program',
  'Other National or LGU Assistance Program'
] as const;

export const incomeSourceOptions = [
  { value: 'Salary/Wages', label: 'Salary / wages' },
  { value: 'Business', label: 'Business' },
  { value: 'Both', label: 'Both' },
  { value: 'Other', label: 'Other' },
] as const;

export const monthlyIncomeOptions = [
  { value: 'Below 10k', label: 'Below ₱10,000' },
  { value: '10k-20k', label: '₱10,000 – ₱20,000' },
  { value: '20k-50k', label: '₱20,000 – ₱50,000' },
  { value: 'Above 50k', label: 'Above ₱50,000' },
] as const;

export interface EnrolledSiblingInfo {
  name: string;
  sex: 'Male' | 'Female' | '';
  dateOfBirth: string;
  age: number;
  program: string;
}

export interface FormData {
  enrolledSiblingDetails: EnrolledSiblingInfo[];
  // Learner Info
  childFirstName: string;
  childMiddleName: string;
  childLastName: string;
  childPhilSysNumber: string;
  sex: 'Male' | 'Female' | '';
  dateOfBirth: string;
  age: number;
  region: string;
  regionCode: string;
  streetAddress: string;
  barangay: string;
  municipalityCode: string;
  municipality: string;
  provinceCode: string;
  province: string;
  address: string;
  healthConcerns: string;
  financialProgram: string;
  financialProgramOther: string;
  enrolledSiblings: number;
  idPicture: File | null;
  // Guardian Info
  motherName: string;
  fatherName: string;
  guardianName: string;
  relationship: string;
  relationshipOther: string;
  guardianOccupation: string;
  motherOccupation: string;
  fatherOccupation: string;
  motherContact: string;
  fatherContact: string;
  guardianContact: string;
  soloParentStatus: 'Yes' | 'No' | '';
  parentGuardianPhilSysNumber: string;
  incomeSourceCategory: 'Salary/Wages' | 'Business' | 'Both' | 'Other' | '';
  incomeSourceCategoryOther: string;
  parentGuardianSpecialStatus: 'None' | 'Person with Disability' | 'Senior Citizen' | 'Both' | '';
  monthlyIncome: string;
  incomeProof: File | null;
  // Program Info
  program: string;
  schoolYear: string;
  schedule: string[];
}

export const initialFormData: FormData = {
  enrolledSiblingDetails: [],
  childFirstName: '',
  childMiddleName: '',
  childLastName: '',
  childPhilSysNumber: '',
  sex: '',
  dateOfBirth: '',
  age: 0,
  region: '',
  regionCode: '',
  streetAddress: '',
  barangay: '',
  municipalityCode: '',
  municipality: '',
  provinceCode: '',
  province: '',
  address: '',
  healthConcerns: '',
  financialProgram: '',
  financialProgramOther: '',
  enrolledSiblings: 0,
  idPicture: null,
  motherName: '',
  fatherName: '',
  guardianName: '',
  relationship: '',
  relationshipOther: '',
  guardianOccupation: '',
  motherOccupation: '',
  fatherOccupation: '',
  motherContact: '',
  fatherContact: '',
  guardianContact: '',
  soloParentStatus: '',
  parentGuardianPhilSysNumber: '',
  incomeSourceCategory: '',
  incomeSourceCategoryOther: '',
  parentGuardianSpecialStatus: '',
  monthlyIncome: '',
  incomeProof: null,
  program: '',
  schoolYear: '2024-2025',
  schedule: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
};

export type StepId = 'child' | 'family' | 'household' | 'health' | 'program' | 'review';

export interface StepDef {
  id: StepId;
  label: string;
  description: string;
}

/**
 * Wizard order. Validation is attached per-step in `validation.ts`; the union of
 * every step's checks equals the original 3-step form's rules — just regrouped
 * into a clearer flow with a final Review summary.
 */
export const STEPS: StepDef[] = [
  { id: 'child', label: 'Child', description: 'Learner details and address' },
  { id: 'family', label: 'Family', description: 'Parents and guardian' },
  { id: 'household', label: 'Household', description: 'Income and siblings' },
  { id: 'health', label: 'Health', description: 'Allergies and conditions' },
  { id: 'program', label: 'Program', description: 'Auto-assigned placement' },
  { id: 'review', label: 'Review', description: 'Confirm and submit' }
];

/** Everything a step component needs, produced by `useEnrollmentForm`. */
export interface EnrollmentFormApi {
  currentStep: number;
  steps: StepDef[];
  formData: FormData;
  ageRules: AgeRule[];
  previewUrl: string | null;
  submitError: string | null;
  /** Per-field validation messages, keyed by FormData field. `_form` holds cross-field messages. */
  fieldErrors: Record<string, string>;
  isSubmitting: boolean;
  regionOptions: PhilippineAddressOption[];
  provinceOptions: PhilippineAddressOption[];
  municipalityOptions: PhilippineAddressOption[];
  barangayOptions: PhilippineAddressOption[];
  addressLookupError: string | null;
  isLoadingRegions: boolean;
  isLoadingProvinces: boolean;
  isLoadingMunicipalities: boolean;
  isLoadingBarangays: boolean;
  isRegionSelected: boolean;
  hasProvinceLevel: boolean;
  isProvinceSelected: boolean;
  isMunicipalitySelected: boolean;
  isProvinceAutoFilled: boolean;
  shouldAutoWaitlistForAddress: boolean;
  ageBreakdown: AgeBreakdown | null;
  assignedProgram: AgeRule | null;
  ageValidationMessage: string | null;
  exactAgeLabel: string;
  allowedBirthdateRange: { min: string; max: string };
  eligibilityNotification: string | null;
  siblingBirthdateRange: { min: string; max: string };
  effectiveIdPicture: File | null;
  effectiveIncomeProof: File | null;
  enrollmentNoticeRef: RefObject<HTMLDivElement>;
  updateFormData: (field: keyof FormData, value: unknown) => void;
  updateSiblingFormData: (siblingIndex: number, field: keyof EnrolledSiblingInfo, value: string) => void;
  addSibling: () => void;
  removeSibling: (siblingIndex: number) => void;
  handleRegionChange: (regionCode: string) => void;
  handleProvinceChange: (provinceCode: string) => void;
  handleMunicipalityChange: (municipalityCode: string) => void;
  handleBarangayChange: (barangay: string) => void;
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleIncomeProofChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  goToStep: (targetStep: number) => void;
  handleNext: () => void;
  handleBack: () => void;
  handleSubmit: () => void;
}
