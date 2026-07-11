import type { AgeBreakdown, AgeRule } from '../../lib/ageRules';
import { getProgramPlacement } from '../../lib/ageRules';
import {
  allowedUploadExtensions,
  allowedUploadMimeTypes,
  MAX_UPLOAD_FILE_SIZE_BYTES
} from './types';
import type { EnrolledSiblingInfo, FormData } from './types';

/**
 * Draft file handles kept at module scope so an uploaded ID / income proof
 * survives step navigation (Files can't be JSON-serialized into the draft).
 * Preserved verbatim from the original single-file form.
 */
export let enrollmentDraftFile: File | null = null;
export let enrollmentDraftPreviewUrl: string | null = null;
export let enrollmentDraftIncomeProofFile: File | null = null;

export const setEnrollmentDraftFile = (file: File | null) => {
  enrollmentDraftFile = file;
};

export const setEnrollmentDraftPreviewUrl = (url: string | null) => {
  enrollmentDraftPreviewUrl = url;
};

export const setEnrollmentDraftIncomeProofFile = (file: File | null) => {
  enrollmentDraftIncomeProofFile = file;
};

export const clearEnrollmentDraftFiles = () => {
  enrollmentDraftFile = null;
  enrollmentDraftPreviewUrl = null;
  enrollmentDraftIncomeProofFile = null;
};

export const getEffectiveIdPicture = (idPicture: File | null) => idPicture || enrollmentDraftFile;

export const getEffectiveIncomeProof = (incomeProof: File | null) =>
  incomeProof || enrollmentDraftIncomeProofFile;

export const inferProvinceFromRegion = (regionName: string) =>
  regionName.includes('National Capital Region') ? 'Metro Manila' : regionName;

export const composeAddress = (
  data: Pick<FormData, 'streetAddress' | 'barangay' | 'municipality' | 'province' | 'region'>
) =>
  [data.streetAddress, data.barangay, data.municipality, data.province, data.region]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(', ');

export const parseDateInput = (dateOfBirth: string) => {
  const [yearText = '', monthText = '', dayText = ''] = dateOfBirth.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (!year || !month || !day) {
    return null;
  }

  const parsedDate = new Date(year, month - 1, day);

  if (
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    return null;
  }

  return parsedDate;
};

export const getAgeBreakdown = (dateOfBirth: string): AgeBreakdown | null => {
  if (!dateOfBirth) {
    return null;
  }

  const birthDate = parseDateInput(dateOfBirth);

  if (!birthDate) {
    return null;
  }

  const today = new Date();
  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  const days = today.getDate() - birthDate.getDate();

  if (days < 0) {
    months -= 1;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const totalMonths = years * 12 + months;

  return {
    years,
    months,
    totalMonths
  };
};

export const validateUploadFile = (file: File, label: string) => {
  const normalizedName = file.name.toLowerCase();
  const hasAllowedMimeType = allowedUploadMimeTypes.includes(file.type);
  const hasAllowedExtension = allowedUploadExtensions.some((extension) =>
    normalizedName.endsWith(extension)
  );

  if (!hasAllowedMimeType || !hasAllowedExtension) {
    return `${label} must be a JPEG, PNG, or PDF file.`;
  }

  if (file.size > MAX_UPLOAD_FILE_SIZE_BYTES) {
    return `${label} must be 5MB or smaller.`;
  }

  return null;
};

export const createEmptySiblingInfo = (): EnrolledSiblingInfo => ({
  name: '',
  sex: '',
  dateOfBirth: '',
  age: 0,
  program: ''
});

export const syncSiblingDetailsCount = (
  siblingDetails: EnrolledSiblingInfo[],
  siblingCount: number
) => {
  const normalizedCount = Math.max(0, siblingCount);

  if (siblingDetails.length === normalizedCount) {
    return siblingDetails;
  }

  if (siblingDetails.length > normalizedCount) {
    return siblingDetails.slice(0, normalizedCount);
  }

  return [
    ...siblingDetails,
    ...Array.from({ length: normalizedCount - siblingDetails.length }, () => createEmptySiblingInfo())
  ];
};

export const buildSiblingDataFromBirthday = (
  sibling: EnrolledSiblingInfo,
  ageRules: AgeRule[]
): EnrolledSiblingInfo => {
  const nextAgeBreakdown = getAgeBreakdown(sibling.dateOfBirth);
  const nextProgram = getProgramPlacement(nextAgeBreakdown, ageRules);

  return {
    ...sibling,
    age: nextAgeBreakdown?.years ?? 0,
    program: nextProgram?.name || ''
  };
};

export const formatGuardianContact = (value: string) => {
  const digitsOnly = value.replace(/\D/g, '');

  if (!digitsOnly) {
    return '';
  }

  if (digitsOnly.startsWith('09')) {
    return digitsOnly.slice(0, 11);
  }

  if (digitsOnly.startsWith('9')) {
    return `0${digitsOnly}`.slice(0, 11);
  }

  if (digitsOnly.startsWith('0')) {
    const remainder = digitsOnly.slice(1);
    if (remainder.startsWith('9')) {
      return `0${remainder}`.slice(0, 11);
    }
    return `09${remainder}`.slice(0, 11);
  }

  return `09${digitsOnly}`.slice(0, 11);
};

export const normalizeDateOfBirthInput = (value: string) => {
  if (!value) {
    return '';
  }

  const [year = '', month = '', day = ''] = value.split('-');
  const normalizedYear = year.slice(0, 4);
  const normalizedMonth = month.slice(0, 2);
  const normalizedDay = day.slice(0, 2);

  return [normalizedYear, normalizedMonth, normalizedDay]
    .filter((segment) => segment.length > 0)
    .join('-');
};

export const isValidContactNumber = (value: string) => /^09\d{9}$/.test(value);
