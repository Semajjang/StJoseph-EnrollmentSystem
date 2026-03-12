import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEnrollment } from '../context/EnrollmentContext';
import {
  PhilippineAddressOption,
  fetchBarangaysByCityMunicipality,
  fetchCitiesMunicipalitiesByProvince,
  fetchCitiesMunicipalitiesByRegion,
  fetchProvincesByRegion,
  fetchRegions
} from '../lib/philippineAddress';
// Removed unused useAuth import

const ENROLLMENT_DRAFT_STORAGE_KEY = 'enrollment-form-draft';
let enrollmentDraftFile: File | null = null;
let enrollmentDraftPreviewUrl: string | null = null;
let enrollmentDraftIncomeProofFile: File | null = null;

const inferProvinceFromRegion = (regionName: string) =>
  regionName.includes('National Capital Region') ? 'Metro Manila' : regionName;

const beneficiaryProgramOptions = [
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

const MAX_UPLOAD_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const allowedUploadMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];
const allowedUploadExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];

interface FormData {
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
const initialFormData: FormData = {
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
interface EnrollmentFormProps {
  onSuccess: () => void;
}

const composeAddress = (
  data: Pick<FormData, 'streetAddress' | 'barangay' | 'municipality' | 'province' | 'region'>
) =>
  [data.streetAddress, data.barangay, data.municipality, data.province, data.region]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(', ');

interface AgeBreakdown {
  years: number;
  months: number;
  totalMonths: number;
}

interface ProgramPlacement {
  name: string;
  ageLabel: string;
  iconLabel: string;
  scheduleLabel: string;
  timeLabel: string;
  accentClassName: string;
  borderClassName: string;
  badgeClassName: string;
}

const parseDateInput = (dateOfBirth: string) => {
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

const getAgeBreakdown = (dateOfBirth: string): AgeBreakdown | null => {
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

const formatDateInputValue = (value: Date) => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const getAllowedBirthdateRange = () => {
  const today = new Date();
  const latestBirthdate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const earliestBirthdate = new Date(today.getFullYear() - 6, today.getMonth(), today.getDate() + 1);

  return {
    min: formatDateInputValue(earliestBirthdate),
    max: formatDateInputValue(latestBirthdate)
  };
};

const getProgramPlacement = (ageBreakdown: AgeBreakdown | null): ProgramPlacement | null => {
  if (!ageBreakdown || ageBreakdown.totalMonths < 0) {
    return null;
  }

  if (ageBreakdown.totalMonths <= 35) {
    return {
      name: 'ITEd (Infant/Toddler)',
      ageLabel: 'Birth to 2 years 11 months',
      iconLabel: 'IT',
      scheduleLabel: 'Monday - Friday',
      timeLabel: 'Daycare Guided Routine',
      accentClassName: 'bg-[#FDE68A]/25',
      borderClassName: 'border-[#FDE68A]',
      badgeClassName: 'bg-[#F59E0B]'
    };
  }

  if (ageBreakdown.totalMonths >= 36 && ageBreakdown.totalMonths <= 47) {
    return {
      name: 'Pre-Kindergarten 1',
      ageLabel: '3 years old only',
      iconLabel: 'PK',
      scheduleLabel: 'Monday - Friday',
      timeLabel: '8:00 AM - 11:00 AM',
      accentClassName: 'bg-[#BAE6FD]/20',
      borderClassName: 'border-[#BAE6FD]',
      badgeClassName: 'bg-[#38BDF8]'
    };
  }

  if (ageBreakdown.totalMonths >= 48 && ageBreakdown.totalMonths <= 71) {
    return {
      name: 'Pre-Kindergarten 2',
      ageLabel: '4 to 5 years old',
      iconLabel: 'P2',
      scheduleLabel: 'Monday - Friday',
      timeLabel: 'Schedule assigned by school',
      accentClassName: 'bg-[#DCFCE7]/50',
      borderClassName: 'border-[#86EFAC]',
      badgeClassName: 'bg-[#22C55E]'
    };
  }

  return null;
};

const getProgramAgeValidationMessage = (ageBreakdown: AgeBreakdown | null) => {
  if (!ageBreakdown) {
    return null;
  }

  if (ageBreakdown.totalMonths < 0) {
    return 'Birthday cannot be in the future.';
  }

  if (
    ageBreakdown.totalMonths <= 35 ||
    (ageBreakdown.totalMonths >= 36 && ageBreakdown.totalMonths <= 47) ||
    (ageBreakdown.totalMonths >= 48 && ageBreakdown.totalMonths <= 71)
  ) {
    return null;
  }

  return 'The learner age does not match the available enrollment programs. ITEd is for birth to 2 years 11 months, Pre-Kindergarten 1 is for 3-year-olds only, and Pre-Kindergarten 2 is for 4 to 5 years old.';
};

const validateUploadFile = (file: File, label: string) => {
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

export function EnrollmentForm({ onSuccess }: EnrollmentFormProps) {
  const { addEnrollment } = useEnrollment();
  // Removed unused user variable
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [regionOptions, setRegionOptions] = useState<PhilippineAddressOption[]>([]);
  const [provinceOptions, setProvinceOptions] = useState<PhilippineAddressOption[]>([]);
  const [municipalityOptions, setMunicipalityOptions] = useState<PhilippineAddressOption[]>([]);
  const [barangayOptions, setBarangayOptions] = useState<PhilippineAddressOption[]>([]);
  const [addressLookupError, setAddressLookupError] = useState<string | null>(null);
  const [isLoadingRegions, setIsLoadingRegions] = useState(false);
  const [isLoadingProvinces, setIsLoadingProvinces] = useState(false);
  const [isLoadingMunicipalities, setIsLoadingMunicipalities] = useState(false);
  const [isLoadingBarangays, setIsLoadingBarangays] = useState(false);
  const isRegionSelected = formData.regionCode.trim().length > 0;
  const hasProvinceLevel = provinceOptions.length > 0;
  const isProvinceSelected = hasProvinceLevel ?
    formData.provinceCode.trim().length > 0 :
    formData.province.trim().length > 0;
  const isMunicipalitySelected = formData.municipalityCode.trim().length > 0;
  const isProvinceAutoFilled = isRegionSelected && !isLoadingProvinces && !hasProvinceLevel;
  const isNonCaintaMunicipality =
    formData.municipality.trim().length > 0 && formData.municipality.trim().toLowerCase() !== 'cainta';
  const ageBreakdown = getAgeBreakdown(formData.dateOfBirth);
  const assignedProgram = getProgramPlacement(ageBreakdown);
  const ageValidationMessage = getProgramAgeValidationMessage(ageBreakdown);
  const exactAgeLabel = ageBreakdown ? `${ageBreakdown.years} years ${ageBreakdown.months} months` : 'Age will appear after birthday selection';
  const allowedBirthdateRange = getAllowedBirthdateRange();
  const eligibilityNotification = ageValidationMessage ?
    `Electronic Notice to Parent/Guardian: ${ageValidationMessage} Submission cannot proceed until the learner falls within the DSWD age ranges.` :
    null;

  const showEnrollmentNotification = (message: string) => {
    setSubmitError(message);

    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const rawDraft = sessionStorage.getItem(ENROLLMENT_DRAFT_STORAGE_KEY);

    if (rawDraft) {
      try {
        const parsedDraft = JSON.parse(rawDraft) as {
          currentStep?: number;
          formData?: Partial<FormData>;
        };

        if (parsedDraft.formData) {
          const nextAgeBreakdown = getAgeBreakdown(parsedDraft.formData.dateOfBirth || '');
          const nextProgram = getProgramPlacement(nextAgeBreakdown);

          setFormData((prev) => ({
            ...prev,
            ...parsedDraft.formData,
            age: nextAgeBreakdown?.years ?? prev.age,
            program: nextProgram?.name || '',
            idPicture: enrollmentDraftFile,
            incomeProof: enrollmentDraftIncomeProofFile
          }));
        }

        if (
          typeof parsedDraft.currentStep === 'number' &&
          parsedDraft.currentStep >= 1 &&
          parsedDraft.currentStep <= 3
        ) {
          setCurrentStep(parsedDraft.currentStep);
        }
      } catch {
        sessionStorage.removeItem(ENROLLMENT_DRAFT_STORAGE_KEY);
      }
    }

    if (enrollmentDraftPreviewUrl) {
      setPreviewUrl(enrollmentDraftPreviewUrl);
    }
  }, []);

  useEffect(() => {
    const serializedFormData = {
      ...formData,
      idPicture: null,
      incomeProof: null
    };

    sessionStorage.setItem(
      ENROLLMENT_DRAFT_STORAGE_KEY,
      JSON.stringify({
        currentStep,
        formData: serializedFormData
      })
    );
  }, [currentStep, formData]);

  useEffect(() => {
    let isMounted = true;

    const loadRegions = async () => {
      setIsLoadingRegions(true);

      try {
        const nextRegions = await fetchRegions();

        if (!isMounted) {
          return;
        }

        setRegionOptions(nextRegions);
        setAddressLookupError(null);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setAddressLookupError(
          error instanceof Error ? error.message : 'Unable to load Philippines address options.'
        );
      } finally {
        if (isMounted) {
          setIsLoadingRegions(false);
        }
      }
    };

    void loadRegions();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!formData.regionCode) {
      setProvinceOptions([]);
      setMunicipalityOptions([]);
      setBarangayOptions([]);
      return;
    }

    let isMounted = true;

    const loadProvinceLevel = async () => {
      setIsLoadingProvinces(true);
      setMunicipalityOptions([]);
      setBarangayOptions([]);

      try {
        const nextProvinces = await fetchProvincesByRegion(formData.regionCode);

        if (!isMounted) {
          return;
        }

        setProvinceOptions(nextProvinces);
        setAddressLookupError(null);

        if (nextProvinces.length > 0) {
          setIsLoadingMunicipalities(false);
          return;
        }

        const nextProvince = inferProvinceFromRegion(formData.region);

        setFormData((prev) => ({
          ...prev,
          province: nextProvince,
          provinceCode: '',
          address: composeAddress({
            ...prev,
            province: nextProvince
          })
        }));

        setIsLoadingMunicipalities(true);
        const nextMunicipalities = await fetchCitiesMunicipalitiesByRegion(formData.regionCode);

        if (!isMounted) {
          return;
        }

        setMunicipalityOptions(nextMunicipalities);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setAddressLookupError(
          error instanceof Error ? error.message : 'Unable to load province and city options.'
        );
      } finally {
        if (isMounted) {
          setIsLoadingProvinces(false);
          setIsLoadingMunicipalities(false);
        }
      }
    };

    void loadProvinceLevel();

    return () => {
      isMounted = false;
    };
  }, [formData.region, formData.regionCode]);

  useEffect(() => {
    if (!formData.provinceCode) {
      if (hasProvinceLevel) {
        setMunicipalityOptions([]);
        setBarangayOptions([]);
      }
      return;
    }

    let isMounted = true;

    const loadMunicipalities = async () => {
      setIsLoadingMunicipalities(true);
      setBarangayOptions([]);

      try {
        const nextMunicipalities = await fetchCitiesMunicipalitiesByProvince(formData.provinceCode);

        if (!isMounted) {
          return;
        }

        setMunicipalityOptions(nextMunicipalities);
        setAddressLookupError(null);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setAddressLookupError(
          error instanceof Error ? error.message : 'Unable to load city and municipality options.'
        );
      } finally {
        if (isMounted) {
          setIsLoadingMunicipalities(false);
        }
      }
    };

    void loadMunicipalities();

    return () => {
      isMounted = false;
    };
  }, [formData.provinceCode, hasProvinceLevel]);

  useEffect(() => {
    if (!formData.municipalityCode) {
      setBarangayOptions([]);
      return;
    }

    let isMounted = true;

    const loadBarangays = async () => {
      setIsLoadingBarangays(true);

      try {
        const nextBarangays = await fetchBarangaysByCityMunicipality(formData.municipalityCode);

        if (!isMounted) {
          return;
        }

        setBarangayOptions(nextBarangays);
        setAddressLookupError(null);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setAddressLookupError(
          error instanceof Error ? error.message : 'Unable to load barangay options.'
        );
      } finally {
        if (isMounted) {
          setIsLoadingBarangays(false);
        }
      }
    };

    void loadBarangays();

    return () => {
      isMounted = false;
    };
  }, [formData.municipalityCode]);

  const steps = [
  {
    number: 1,
    label: 'Learner Info'
  },
  {
    number: 2,
    label: 'Guardian Info'
  },
  {
    number: 3,
    label: 'Program'
  }];

  const updateFormData = (field: keyof FormData, value: any) => {
    setSubmitError(null);
    setFormData((prev) => {
      const newData = {
        ...prev,
        [field]: value
      };
      // Auto-calculate age if DOB changes
      if (field === 'dateOfBirth') {
        const nextAgeBreakdown = getAgeBreakdown(String(value));
        const nextProgram = getProgramPlacement(nextAgeBreakdown);

        newData.age = nextAgeBreakdown?.years ?? 0;
        newData.program = nextProgram?.name || '';
      }

      if (
        field === 'streetAddress' ||
        field === 'barangay' ||
        field === 'municipality' ||
        field === 'province' ||
        field === 'region'
      ) {
        newData.address = composeAddress(newData);
      }

      return newData;
    });
  };

  const handleRegionChange = (regionCode: string) => {
    const selectedRegion = regionOptions.find((region) => region.code === regionCode);

    setSubmitError(null);
    setAddressLookupError(null);
    setFormData((prev) => {
      const nextData = {
        ...prev,
        regionCode,
        region: selectedRegion?.name || '',
        provinceCode: '',
        province: '',
        municipalityCode: '',
        municipality: '',
        barangay: ''
      };

      return {
        ...nextData,
        address: composeAddress(nextData)
      };
    });
  };

  const handleProvinceChange = (provinceCode: string) => {
    const selectedProvince = provinceOptions.find((province) => province.code === provinceCode);

    setSubmitError(null);
    setAddressLookupError(null);
    setFormData((prev) => {
      const nextData = {
        ...prev,
        provinceCode,
        province: selectedProvince?.name || '',
        municipalityCode: '',
        municipality: '',
        barangay: ''
      };

      return {
        ...nextData,
        address: composeAddress(nextData)
      };
    });
  };

  const handleMunicipalityChange = (municipalityCode: string) => {
    const selectedMunicipality = municipalityOptions.find(
      (municipality) => municipality.code === municipalityCode
    );

    setSubmitError(null);
    setAddressLookupError(null);
    setFormData((prev) => {
      const nextData = {
        ...prev,
        municipalityCode,
        municipality: selectedMunicipality?.name || '',
        barangay: ''
      };

      return {
        ...nextData,
        address: composeAddress(nextData)
      };
    });
  };

  const handleBarangayChange = (barangay: string) => {
    updateFormData('barangay', barangay);
  };

  const formatGuardianContact = (value: string) => {
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
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const fileValidationError = validateUploadFile(file, 'ID picture');

      if (fileValidationError) {
        showEnrollmentNotification(fileValidationError);
        e.target.value = '';
        return;
      }

      const objectUrl = file.type === 'application/pdf' ? null : URL.createObjectURL(file);

      enrollmentDraftFile = file;
      enrollmentDraftPreviewUrl = objectUrl;

      updateFormData('idPicture', file);
      setPreviewUrl(objectUrl);
    }
  };

  const handleIncomeProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const fileValidationError = validateUploadFile(file, 'Proof of income');

      if (fileValidationError) {
        showEnrollmentNotification(fileValidationError);
        e.target.value = '';
        return;
      }

      enrollmentDraftIncomeProofFile = file;
      updateFormData('incomeProof', file);
    }
  };

  const normalizeDateOfBirthInput = (value: string) => {
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

  const isValidContactNumber = (value: string) => /^09\d{9}$/.test(value);

  const validateStep = (step: number) => {
    if (step === 1) {
      if (!formData.idPicture) return 'ID picture is required.';
      if (!formData.childFirstName.trim()) return 'First name is required.';
      if (!formData.childLastName.trim()) return 'Last name is required.';
      if (!formData.sex) return 'Sex is required.';
      if (!formData.dateOfBirth) return 'Birthday is required.';
      if (!formData.region.trim()) return 'Region is required.';
      if (!formData.streetAddress.trim()) return 'Street address is required.';
      if (!formData.municipality.trim()) return 'City or municipality is required.';
      if (!formData.barangay.trim()) return 'Barangay is required.';
      if (!formData.province.trim()) return 'Province is required.';
      if (!formData.financialProgram) return 'Financial program is required.';
      if (
        formData.financialProgram === 'Other National or LGU Assistance Program' &&
        !formData.financialProgramOther.trim()
      ) {
        return 'Please specify the beneficiary program.';
      }

      if (ageValidationMessage) {
        return ageValidationMessage;
      }
    }

    if (step === 2) {
      const hasMotherInput =
        formData.motherName.trim().length > 0 ||
        formData.motherOccupation.trim().length > 0 ||
        formData.motherContact.trim().length > 0;
      const hasFatherInput =
        formData.fatherName.trim().length > 0 ||
        formData.fatherOccupation.trim().length > 0 ||
        formData.fatherContact.trim().length > 0;
      const hasGuardianInput =
        formData.guardianName.trim().length > 0 ||
        formData.relationship.trim().length > 0 ||
        formData.relationshipOther.trim().length > 0 ||
        formData.guardianOccupation.trim().length > 0 ||
        formData.guardianContact.trim().length > 0;

      const hasRelationshipValue =
        formData.relationship !== 'Other' ?
        formData.relationship.trim().length > 0 :
        formData.relationshipOther.trim().length > 0;

      const isMotherComplete =
        formData.motherName.trim().length > 0 &&
        formData.motherOccupation.trim().length > 0 &&
        isValidContactNumber(formData.motherContact);
      const isFatherComplete =
        formData.fatherName.trim().length > 0 &&
        formData.fatherOccupation.trim().length > 0 &&
        isValidContactNumber(formData.fatherContact);
      const isGuardianComplete =
        formData.guardianName.trim().length > 0 &&
        hasRelationshipValue &&
        formData.guardianOccupation.trim().length > 0 &&
        isValidContactNumber(formData.guardianContact);

      if (hasMotherInput && !isMotherComplete) {
        return "If mother's details are provided, complete name, occupation, and a valid 11-digit contact number (09XXXXXXXXX).";
      }

      if (hasFatherInput && !isFatherComplete) {
        return "If father's details are provided, complete name, occupation, and a valid 11-digit contact number (09XXXXXXXXX).";
      }

      if (hasGuardianInput && !isGuardianComplete) {
        return "If guardian details are provided, complete guardian name, relationship, occupation, and a valid 11-digit contact number (09XXXXXXXXX).";
      }

      if (!isMotherComplete && !isFatherComplete && !isGuardianComplete) {
        return 'Please provide at least one complete caregiver profile (Mother, Father, or Guardian).';
      }

      if (!formData.incomeSourceCategory) return 'Source of income is required.';
      if (
        formData.incomeSourceCategory === 'Other' &&
        !formData.incomeSourceCategoryOther.trim()
      ) {
        return 'Please specify the source of income.';
      }
      if (!formData.monthlyIncome) return 'Monthly family income is required.';
      if (!formData.incomeProof) return 'Proof of income (ITR) is required.';
    }

    return null;
  };

  const validateThroughStep = (targetStep: number) => {
    for (let step = 1; step <= targetStep; step += 1) {
      const error = validateStep(step);
      if (error) {
        setCurrentStep(step);
        showEnrollmentNotification(error);
        return false;
      }
    }

    setSubmitError(null);
    return true;
  };

  const handleStepClick = (targetStep: number) => {
    if (targetStep <= currentStep) {
      setCurrentStep(targetStep);
      return;
    }

    for (let step = currentStep; step < targetStep; step += 1) {
      const error = validateStep(step);
      if (error) {
        setCurrentStep(step);
        showEnrollmentNotification(error);
        return;
      }
    }

    setSubmitError(null);
    setCurrentStep(targetStep);
  };

  const handleNext = () => {
    if (currentStep < 3) {
      const error = validateStep(currentStep);
      if (error) {
        showEnrollmentNotification(error);
        return;
      }

      setSubmitError(null);
      setCurrentStep((prev) => prev + 1);
    }
  };
  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((prev) => prev - 1);
  };
  const handleSubmit = async () => {
    if (!validateThroughStep(2)) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const { error } = await addEnrollment(formData);

    if (error) {
      showEnrollmentNotification(error);
      setIsSubmitting(false);
      return;
    }

    sessionStorage.removeItem(ENROLLMENT_DRAFT_STORAGE_KEY);
    enrollmentDraftFile = null;
    enrollmentDraftPreviewUrl = null;
    enrollmentDraftIncomeProofFile = null;

    setIsSubmitting(false);
    onSuccess();
  };

  const requiredMark = <span className="text-red-500 ml-1">*</span>;

  return (
    <div className="p-8 pb-24">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-800">
          New Enrollment
        </h1>
        <p className="text-gray-500 mt-1">
          Complete the form below to enroll your child.
        </p>
        <p className="text-xs text-gray-500 mt-2">
          <span className="text-red-500 font-bold">*</span> Required fields
        </p>
      </div>

      {/* Step Bubbles */}
      <div className="flex items-center justify-center mb-10">
        {steps.map((step, index) =>
        <div key={step.number} className="flex items-center">
            <motion.button
            onClick={() => handleStepClick(step.number)}
            className={`relative flex flex-col items-center group`}
            whileHover={{
              scale: 1.05
            }}
            whileTap={{
              scale: 0.95
            }}>

              <motion.div
              className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl shadow-md transition-all duration-300 ${currentStep === step.number ? 'bg-[#FBCFE8] ring-4 ring-[#FBCFE8]/30' : currentStep > step.number ? 'bg-[#BBF7D0]' : 'bg-white'}`}>

                {currentStep > step.number ? 'Done' : step.number}
              </motion.div>
              <span
              className={`mt-2 text-sm font-bold ${currentStep === step.number ? 'text-gray-800' : 'text-gray-400'}`}>

                {step.label}
              </span>
            </motion.button>
            {index < steps.length - 1 &&
          <div className="w-16 h-1 mx-4 rounded-full bg-gray-200 overflow-hidden">
                <motion.div
              className="h-full bg-[#BBF7D0]"
              initial={{
                width: 0
              }}
              animate={{
                width: currentStep > step.number ? '100%' : '0%'
              }}
              transition={{
                duration: 0.5
              }} />

              </div>
          }
          </div>
        )}
      </div>

      {/* Form Card */}
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-50">
          <AnimatePresence mode="wait">
            {/* Step 1: Learner Info */}
            {currentStep === 1 &&
            <motion.div
              key="step1"
              initial={{
                opacity: 0,
                x: 20
              }}
              animate={{
                opacity: 1,
                x: 0
              }}
              exit={{
                opacity: 0,
                x: -20
              }}
              className="space-y-6">

                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                  <span className="text-3xl bg-[#BAE6FD] w-12 h-12 rounded-full flex items-center justify-center">
                    1
                  </span>
                  <h2 className="text-xl font-bold text-gray-800">
                    Learner Information
                  </h2>
                </div>

                {/* ID Picture Upload */}
                <div className="flex justify-center mb-8">
                  <div className="relative group">
                    <div className="w-32 h-32 rounded-2xl border-4 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                      {previewUrl ?
                    <img
                      src={previewUrl}
                      alt="ID Preview"
                      className="w-full h-full object-cover" /> :

                    formData.idPicture?.type === 'application/pdf' ?
                    <div className="text-center p-2">
                          <span className="text-xl block mb-1 font-bold">PDF</span>
                          <span className="text-xs text-gray-400 font-medium break-words">
                            {formData.idPicture.name}
                          </span>
                        </div> :


                    <div className="text-center p-2">
                          <span className="text-xl block mb-1 font-bold">ID</span>
                          <span className="text-xs text-gray-400 font-medium">
                            2x2 ID Picture
                          </span>
                        </div>
                    }
                      <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer" />

                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-[#BAE6FD] w-8 h-8 rounded-full flex items-center justify-center shadow-sm pointer-events-none">
                      <span className="text-xs font-bold">Edit</span>
                    </div>
                    <p className="text-xs text-center text-gray-500 mt-3">
                      ID Picture {requiredMark}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                      First Name {requiredMark}
                    </label>
                    <input
                    type="text"
                    value={formData.childFirstName}
                    onChange={(e) =>
                    updateFormData('childFirstName', e.target.value)
                    }
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-[#BAE6FD] focus:outline-none transition-colors"
                    placeholder="Juan" />

                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                      Middle Name
                    </label>
                    <input
                    type="text"
                    value={formData.childMiddleName}
                    onChange={(e) =>
                    updateFormData('childMiddleName', e.target.value)
                    }
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-[#BAE6FD] focus:outline-none transition-colors"
                    placeholder="Santos" />

                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                      Last Name {requiredMark}
                    </label>
                    <input
                    type="text"
                    value={formData.childLastName}
                    onChange={(e) =>
                    updateFormData('childLastName', e.target.value)
                    }
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-[#BAE6FD] focus:outline-none transition-colors"
                    placeholder="Dela Cruz" />

                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                      Sex {requiredMark}
                    </label>
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                      <button
                      type="button"
                      onClick={() => updateFormData('sex', 'Male')}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${formData.sex === 'Male' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}>

                        Male
                      </button>
                      <button
                      type="button"
                      onClick={() => updateFormData('sex', 'Female')}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${formData.sex === 'Female' ? 'bg-white shadow-sm text-pink-500' : 'text-gray-500'}`}>

                        Female
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                      Birthday {requiredMark}
                    </label>
                    <input
                    type="date"
                    min={allowedBirthdateRange.min}
                    max={allowedBirthdateRange.max}
                    value={formData.dateOfBirth}
                    onChange={(e) =>
                    updateFormData(
                      'dateOfBirth',
                      normalizeDateOfBirthInput(e.target.value)
                    )
                    }
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-100 focus:border-[#BAE6FD] focus:outline-none transition-colors" />

                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                      Age
                    </label>
                    <input
                    type="number"
                    readOnly
                    value={formData.age}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 bg-gray-50 text-gray-500 font-bold" />

                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                    Child's PhilSys Number
                  </label>
                  <input
                  type="text"
                  value={formData.childPhilSysNumber}
                  onChange={(e) =>
                  updateFormData('childPhilSysNumber', e.target.value)
                  }
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-[#BAE6FD] focus:outline-none transition-colors"
                  placeholder="Enter the child's PhilSys Number" />

                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                      Street Address {requiredMark}
                    </label>
                    <input
                    type="text"
                    value={formData.streetAddress}
                    onChange={(e) => updateFormData('streetAddress', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-[#BAE6FD] focus:outline-none transition-colors"
                    placeholder="House No., Street, Subdivision" />

                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                      Region {requiredMark}
                    </label>
                    <select
                    value={formData.regionCode}
                    onChange={(e) => handleRegionChange(e.target.value)}
                    disabled={isLoadingRegions}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-[#BAE6FD] focus:outline-none transition-colors bg-white disabled:bg-gray-50 disabled:text-gray-400">

                      <option value="">{isLoadingRegions ? 'Loading regions...' : 'Select Region'}</option>
                      {regionOptions.map((region) =>
                      <option key={region.code} value={region.code}>
                          {region.name}
                        </option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                      Province {requiredMark}
                    </label>
                    {isProvinceAutoFilled ?
                    <input
                      type="text"
                      value={formData.province}
                      readOnly
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 bg-gray-50 text-gray-500 font-medium focus:outline-none"
                      placeholder="Province"
                    /> :
                    <select
                      value={formData.provinceCode}
                      onChange={(e) => handleProvinceChange(e.target.value)}
                      disabled={!isRegionSelected || isLoadingProvinces}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-[#BAE6FD] focus:outline-none transition-colors bg-white disabled:bg-gray-50 disabled:text-gray-400">

                        <option value="">
                          {!isRegionSelected ?
                            'Select region first' :
                          isLoadingProvinces ?
                            'Loading provinces...' :
                            'Select Province'}
                        </option>
                        {provinceOptions.map((province) =>
                        <option key={province.code} value={province.code}>
                            {province.name}
                          </option>
                        )}
                      </select>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                      City / Municipality {requiredMark}
                    </label>
                    <select
                      value={formData.municipalityCode}
                      onChange={(e) => handleMunicipalityChange(e.target.value)}
                      disabled={!isProvinceSelected || isLoadingMunicipalities}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-[#BAE6FD] focus:outline-none transition-colors bg-white disabled:bg-gray-50 disabled:text-gray-400">

                        <option value="">
                          {!isRegionSelected ?
                            'Select region first' :
                          hasProvinceLevel && !formData.provinceCode ?
                            'Select province first' :
                          isLoadingMunicipalities ?
                            'Loading cities and municipalities...' :
                            'Select City / Municipality'}
                        </option>
                        {municipalityOptions.map((municipality) =>
                        <option key={municipality.code} value={municipality.code}>
                            {municipality.name}
                          </option>
                        )}
                      </select>

                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                      Barangay {requiredMark}
                    </label>
                    <select
                      value={formData.barangay}
                      onChange={(e) => handleBarangayChange(e.target.value)}
                      disabled={!isMunicipalitySelected || isLoadingBarangays}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-[#BAE6FD] focus:outline-none transition-colors bg-white disabled:bg-gray-50 disabled:text-gray-400">

                        <option value="">
                          {!isMunicipalitySelected ?
                            'Select city / municipality first' :
                          isLoadingBarangays ?
                            'Loading barangays...' :
                            'Select Barangay'}
                        </option>
                        {barangayOptions.map((barangay) =>
                        <option key={barangay.code} value={barangay.name}>
                            {barangay.name}
                          </option>
                        )}
                      </select>

                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                      Full Address
                    </label>
                    <textarea
                    value={formData.address}
                    readOnly
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 bg-gray-50 text-gray-500 font-medium focus:outline-none resize-none"
                    placeholder="Address preview" />

                  </div>
                </div>

                {addressLookupError ?
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {addressLookupError}
                  </div> :
                null}

                {isNonCaintaMunicipality ?
                <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-700">
                    Applicants outside Cainta will be automatically placed on the waitlist after submission.
                  </div> :
                null}

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                    Health Concerns / Allergies
                  </label>
                  <textarea
                  value={formData.healthConcerns}
                  onChange={(e) =>
                  updateFormData('healthConcerns', e.target.value)
                  }
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-[#BAE6FD] focus:outline-none transition-colors resize-none"
                  placeholder="Please list any allergies or medical conditions..." />

                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                      Beneficiary Program {requiredMark}
                    </label>
                    <select
                    value={formData.financialProgram}
                    onChange={(e) => {
                    const value = e.target.value;
                    updateFormData('financialProgram', value);
                    if (value !== 'Other National or LGU Assistance Program') {
                      updateFormData('financialProgramOther', '');
                    }
                    }}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-[#BAE6FD] focus:outline-none transition-colors bg-white">

                      <option value="">Select Beneficiary Program</option>
                      {beneficiaryProgramOptions.map((programOption) =>
                      <option key={programOption} value={programOption}>
                          {programOption}
                        </option>
                      )}
                    </select>
                    {formData.financialProgram === 'Other National or LGU Assistance Program' ?
                    <input
                      type="text"
                      value={formData.financialProgramOther}
                      onChange={(e) =>
                      updateFormData('financialProgramOther', e.target.value)
                      }
                      className="mt-2 w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-[#BAE6FD] focus:outline-none transition-colors"
                      placeholder="Please specify" /> :

                    null}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                      Enrolled Siblings
                    </label>
                    <input
                    type="number"
                    min="0"
                    value={formData.enrolledSiblings}
                    onChange={(e) =>
                    updateFormData(
                      'enrolledSiblings',
                      parseInt(e.target.value) || 0
                    )
                    }
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-[#BAE6FD] focus:outline-none transition-colors" />

                  </div>
                </div>
              </motion.div>
            }

            {/* Step 2: Guardian Info */}
            {currentStep === 2 &&
            <motion.div
              key="step2"
              initial={{
                opacity: 0,
                x: 20
              }}
              animate={{
                opacity: 1,
                x: 0
              }}
              exit={{
                opacity: 0,
                x: -20
              }}
              className="space-y-6">

                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                  <span className="text-3xl bg-[#FBCFE8] w-12 h-12 rounded-full flex items-center justify-center">
                    2
                  </span>
                  <h2 className="text-xl font-bold text-gray-800">
                    Guardian Information
                  </h2>
                </div>

                <p className="text-xs text-gray-500 -mt-3">
                  Provide at least one complete caregiver profile: Mother, Father, or Guardian.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                      Mother's Name
                    </label>
                    <input
                    type="text"
                    value={formData.motherName}
                    onChange={(e) =>
                    updateFormData('motherName', e.target.value)
                    }
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-[#BAE6FD] focus:outline-none transition-colors"
                    placeholder="Full Name" />

                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                      Mother's Occupation
                    </label>
                    <input
                    type="text"
                    value={formData.motherOccupation}
                    onChange={(e) =>
                    updateFormData('motherOccupation', e.target.value)
                    }
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-[#BAE6FD] focus:outline-none transition-colors"
                    placeholder="Occupation" />

                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                      Father's Name
                    </label>
                    <input
                    type="text"
                    value={formData.fatherName}
                    onChange={(e) =>
                    updateFormData('fatherName', e.target.value)
                    }
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-[#BAE6FD] focus:outline-none transition-colors"
                    placeholder="Full Name" />

                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                      Father's Occupation
                    </label>
                    <input
                    type="text"
                    value={formData.fatherOccupation}
                    onChange={(e) =>
                    updateFormData('fatherOccupation', e.target.value)
                    }
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-[#BAE6FD] focus:outline-none transition-colors"
                    placeholder="Occupation" />

                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                      Guardian's Name
                    </label>
                    <input
                    type="text"
                    value={formData.guardianName}
                    onChange={(e) =>
                    updateFormData('guardianName', e.target.value)
                    }
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-[#BAE6FD] focus:outline-none transition-colors"
                    placeholder="If different from parents" />

                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                      Relationship
                    </label>
                    <select
                    value={formData.relationship}
                    onChange={(e) => {
                    const value = e.target.value;
                    updateFormData('relationship', value);
                    if (value !== 'Other') {
                      updateFormData('relationshipOther', '');
                    }
                    }}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-[#BAE6FD] focus:outline-none transition-colors bg-white">

                      <option value="">Select Relationship</option>
                      <option value="Grandparent">Grandparent</option>
                      <option value="Aunt/Uncle">Aunt/Uncle</option>
                      <option value="Sibling">Sibling</option>
                      <option value="Other">Other</option>
                    </select>
                    {formData.relationship === 'Other' ?
                    <input
                      type="text"
                      value={formData.relationshipOther}
                      onChange={(e) =>
                      updateFormData('relationshipOther', e.target.value)
                      }
                      className="w-full mt-2 px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-[#BAE6FD] focus:outline-none transition-colors"
                      placeholder="Please specify relationship" /> :

                    null}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                      Guardian's Occupation
                    </label>
                    <input
                    type="text"
                    value={formData.guardianOccupation}
                    onChange={(e) =>
                    updateFormData('guardianOccupation', e.target.value)
                    }
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-[#BAE6FD] focus:outline-none transition-colors"
                    placeholder="Occupation" />

                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                      Guardian's Contact No.
                    </label>
                    <input
                    type="text"
                    inputMode="numeric"
                    maxLength={11}
                    pattern="09[0-9]{9}"
                    title="Use 11 digits starting with 09"
                    value={formData.guardianContact}
                    onFocus={() => {
                    if (!formData.guardianContact) {
                      updateFormData('guardianContact', '09');
                    }
                    }}
                    onChange={(e) =>
                    updateFormData(
                      'guardianContact',
                      formatGuardianContact(e.target.value)
                    )
                    }
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-[#BAE6FD] focus:outline-none transition-colors"
                    placeholder="09XXXXXXXXX" />

                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                      Mother's Contact No.
                    </label>
                    <input
                    type="text"
                    inputMode="numeric"
                    maxLength={11}
                    pattern="09[0-9]{9}"
                    title="Use 11 digits starting with 09"
                    value={formData.motherContact}
                    onFocus={() => {
                    if (!formData.motherContact) {
                      updateFormData('motherContact', '09');
                    }
                    }}
                    onChange={(e) =>
                    updateFormData(
                      'motherContact',
                      formatGuardianContact(e.target.value)
                    )
                    }
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-[#BAE6FD] focus:outline-none transition-colors"
                    placeholder="09XXXXXXXXX" />

                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                      Father's Contact No.
                    </label>
                    <input
                    type="text"
                    inputMode="numeric"
                    maxLength={11}
                    pattern="09[0-9]{9}"
                    title="Use 11 digits starting with 09"
                    value={formData.fatherContact}
                    onFocus={() => {
                    if (!formData.fatherContact) {
                      updateFormData('fatherContact', '09');
                    }
                    }}
                    onChange={(e) =>
                    updateFormData(
                      'fatherContact',
                      formatGuardianContact(e.target.value)
                    )
                    }
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-[#BAE6FD] focus:outline-none transition-colors"
                    placeholder="09XXXXXXXXX" />

                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                      Solo Parent Status
                    </label>
                    <select
                    value={formData.soloParentStatus}
                    onChange={(e) =>
                    updateFormData('soloParentStatus', e.target.value)
                    }
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-[#BAE6FD] focus:outline-none transition-colors bg-white">

                      <option value="">Select Status</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                      Parent/Guardian PhilSys Number
                    </label>
                    <input
                    type="text"
                    value={formData.parentGuardianPhilSysNumber}
                    onChange={(e) =>
                    updateFormData('parentGuardianPhilSysNumber', e.target.value)
                    }
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-[#BAE6FD] focus:outline-none transition-colors"
                    placeholder="Enter the parent or guardian's PhilSys Number" />

                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                      Source of Income {requiredMark}
                    </label>
                    <select
                    value={formData.incomeSourceCategory}
                    onChange={(e) => {
                    const value = e.target.value;
                    updateFormData('incomeSourceCategory', value);
                    if (value !== 'Other') {
                      updateFormData('incomeSourceCategoryOther', '');
                    }
                    }}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-[#BAE6FD] focus:outline-none transition-colors bg-white">

                      <option value="">Select Income Source</option>
                      <option value="Salary/Wages">Salary/Wages</option>
                      <option value="Business">Business</option>
                      <option value="Both">Both</option>
                      <option value="Other">Other</option>
                    </select>
                    {formData.incomeSourceCategory === 'Other' ?
                    <input
                      type="text"
                      value={formData.incomeSourceCategoryOther}
                      onChange={(e) =>
                      updateFormData('incomeSourceCategoryOther', e.target.value)
                      }
                      className="mt-2 w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-[#BAE6FD] focus:outline-none transition-colors"
                      placeholder="Please specify" /> :

                    null}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                      Parent/Guardian Disability or Senior Citizen Status
                    </label>
                    <select
                    value={formData.parentGuardianSpecialStatus}
                    onChange={(e) =>
                    updateFormData('parentGuardianSpecialStatus', e.target.value)
                    }
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-[#BAE6FD] focus:outline-none transition-colors bg-white">

                      <option value="">Select Status</option>
                      <option value="None">None</option>
                      <option value="Person with Disability">Person with Disability</option>
                      <option value="Senior Citizen">Senior Citizen</option>
                      <option value="Both">Both</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                      Monthly Family Income {requiredMark}
                    </label>
                    <select
                    value={formData.monthlyIncome}
                    onChange={(e) =>
                    updateFormData('monthlyIncome', e.target.value)
                    }
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-[#BAE6FD] focus:outline-none transition-colors bg-white">

                      <option value="">Select Income Range</option>
                      <option value="Below 10k">Below ₱10,000</option>
                      <option value="10k-20k">₱10,000 - ₱20,000</option>
                      <option value="20k-50k">₱20,000 - ₱50,000</option>
                      <option value="Above 50k">Above ₱50,000</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                      Household Income Notes
                    </label>
                    <p className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-500">
                      Use the fields above to identify whether the family income comes from salary/wages, business, or both.
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                      Proof of Income (ITR) {requiredMark}
                    </label>
                    <label className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus-within:border-[#BAE6FD] transition-colors bg-white cursor-pointer block text-sm text-gray-600 truncate">
                      {formData.incomeProof ? formData.incomeProof.name : 'Upload file'}
                      <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={handleIncomeProofChange}
                      className="hidden" />

                    </label>
                  </div>
                </div>
              </motion.div>
            }

            {/* Step 3: Program Info */}
            {currentStep === 3 &&
            <motion.div
              key="step3"
              initial={{
                opacity: 0,
                x: 20
              }}
              animate={{
                opacity: 1,
                x: 0
              }}
              exit={{
                opacity: 0,
                x: -20
              }}
              className="space-y-6">

                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                  <span className="text-3xl bg-[#BBF7D0] w-12 h-12 rounded-full flex items-center justify-center">
                    3
                  </span>
                  <h2 className="text-xl font-bold text-gray-800">
                    Program Selection
                  </h2>
                </div>

                <div className={`relative overflow-hidden rounded-2xl border-2 p-6 ${assignedProgram ? `${assignedProgram.accentClassName} ${assignedProgram.borderClassName}` : 'border-red-200 bg-red-50'}`}>
                  <div className={`absolute right-0 top-0 rounded-bl-xl px-3 py-1 text-xs font-bold text-white ${assignedProgram ? assignedProgram.badgeClassName : 'bg-red-500'}`}>
                    {assignedProgram ? 'AUTO-ASSIGNED' : 'NOT ELIGIBLE'}
                  </div>
                  <div className="mb-4 flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-3xl shadow-sm">
                      {assignedProgram ? assignedProgram.iconLabel : '!'}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">
                        {assignedProgram ? assignedProgram.name : 'No matching program'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {assignedProgram ? assignedProgram.ageLabel : 'The learner age does not match the available enrollment bands.'}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-500">Exact Age</span>
                      <span className="font-bold text-gray-800">{exactAgeLabel}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-500">School Year</span>
                      <span className="font-bold text-gray-800">2024-2025</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-500">Schedule</span>
                      <span className="font-bold text-gray-800">
                        {assignedProgram ? assignedProgram.scheduleLabel : 'Unavailable'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-500">Time</span>
                      <span className="font-bold text-gray-800">
                        {assignedProgram ? assignedProgram.timeLabel : 'Unavailable'}
                      </span>
                    </div>
                  </div>
                </div>

                {eligibilityNotification ?
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm font-medium text-red-700">
                    {eligibilityNotification}
                  </div> :
                null}

                <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 flex gap-3">
                  <span className="text-sm font-bold text-yellow-800">Note</span>
                  <p className="text-sm text-yellow-800">
                    Program placement is automatically based on the learner's exact age from the birthdate you entered to avoid manual placement errors.
                  </p>
                </div>
              </motion.div>
            }
          </AnimatePresence>

          {submitError ?
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              Enrollment Notice: {submitError}
            </div> :
          null}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
            <button
              onClick={handleBack}
              disabled={currentStep === 1}
              className={`px-6 py-3 rounded-full font-bold transition-all ${currentStep === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}>

              ← Back
            </button>
            {currentStep < 3 ?
            <button
              onClick={handleNext}
              className="bg-[#BAE6FD] hover:bg-[#7DD3FC] px-8 py-3 rounded-full font-bold text-gray-700 transition-colors shadow-sm hover:shadow-md">

                Next Step →
              </button> :

            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-[#BBF7D0] hover:bg-[#86EFAC] px-8 py-3 rounded-full font-bold text-gray-700 transition-colors shadow-sm hover:shadow-md flex items-center gap-2">

                {isSubmitting ? 'Submitting...' : 'Submit Enrollment'}
              </button>
            }
          </div>
        </div>
      </div>
    </div>);

}