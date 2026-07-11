import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useEnrollment } from '../../context/EnrollmentContext';
import {
  fetchBarangaysByCityMunicipality,
  fetchCitiesMunicipalitiesByProvince,
  fetchCitiesMunicipalitiesByRegion,
  fetchProvincesByRegion,
  fetchRegions
} from '../../lib/philippineAddress';
import type { PhilippineAddressOption } from '../../lib/philippineAddress';
import {
  fetchAgeRules,
  getAllowedBirthdateRange,
  getProgramAgeValidationMessage,
  getProgramPlacement,
  loadAgeRules
} from '../../lib/ageRules';
import {
  buildSiblingDataFromBirthday,
  clearEnrollmentDraftFiles,
  composeAddress,
  createEmptySiblingInfo,
  enrollmentDraftIncomeProofFile,
  enrollmentDraftFile,
  enrollmentDraftPreviewUrl,
  getAgeBreakdown,
  getEffectiveIdPicture,
  getEffectiveIncomeProof,
  inferProvinceFromRegion,
  setEnrollmentDraftFile,
  setEnrollmentDraftIncomeProofFile,
  setEnrollmentDraftPreviewUrl,
  syncSiblingDetailsCount,
  validateUploadFile
} from './helpers';
import { FORM_LEVEL_ERROR_KEY, validateStep } from './validation';
import type { FieldErrors } from './validation';
import {
  ENROLLMENT_DRAFT_STORAGE_KEY,
  initialFormData,
  STEPS
} from './types';
import type { EnrolledSiblingInfo, EnrollmentFormApi, FormData } from './types';

export function useEnrollmentForm(onSubmitted: (enrollmentId: string | null) => void): EnrollmentFormApi {
  const { addEnrollment } = useEnrollment();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [ageRules, setAgeRules] = useState(() => loadAgeRules());
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [focusErrorTick, setFocusErrorTick] = useState(0);
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
  const enrollmentNoticeRef = useRef<HTMLDivElement | null>(null);

  const isRegionSelected = formData.regionCode.trim().length > 0;
  const hasProvinceLevel = provinceOptions.length > 0;
  const isProvinceSelected = hasProvinceLevel ?
    formData.provinceCode.trim().length > 0 :
    formData.province.trim().length > 0;
  const isMunicipalitySelected = formData.municipalityCode.trim().length > 0;
  const isProvinceAutoFilled = isRegionSelected && !isLoadingProvinces && !hasProvinceLevel;
  const normalizedMunicipality = formData.municipality.trim().toLowerCase();
  const normalizedProvince = formData.province.trim().toLowerCase();
  const shouldAutoWaitlistForAddress =
    (normalizedMunicipality.length > 0 && normalizedMunicipality !== 'cainta') ||
    (normalizedProvince.length > 0 && normalizedProvince !== 'rizal');
  const ageBreakdown = getAgeBreakdown(formData.dateOfBirth);
  const assignedProgram = getProgramPlacement(ageBreakdown, ageRules);
  const ageValidationMessage = getProgramAgeValidationMessage(ageBreakdown, ageRules);
  const exactAgeLabel = ageBreakdown ?
    `${ageBreakdown.years} years ${ageBreakdown.months} months` :
    'Age will appear after birthday selection';
  const allowedBirthdateRange = useMemo(() => getAllowedBirthdateRange(ageRules), [ageRules]);
  const eligibilityNotification = ageValidationMessage ?
    `Electronic Notice to Parent/Guardian: ${ageValidationMessage} Submission cannot proceed until the learner falls within the DSWD age ranges.` :
    null;
  const siblingBirthdateRange = allowedBirthdateRange;
  const effectiveIdPicture = getEffectiveIdPicture(formData.idPicture);
  const effectiveIncomeProof = getEffectiveIncomeProof(formData.incomeProof);

  const showEnrollmentNotification = (message: string) => {
    setSubmitError(message);
  };

  const clearFieldErrors = (...keys: string[]) => {
    setFieldErrors((prev) => {
      if (keys.every((key) => !(key in prev))) {
        return prev;
      }

      const next = { ...prev };
      for (const key of keys) {
        delete next[key];
      }
      return next;
    });
  };

  /**
   * Apply a step's field errors. Returns true when the step is valid.
   * Invalid steps: keep the user in place, mirror only the cross-field `_form`
   * message into the top banner, and queue focus onto the first invalid control.
   */
  const applyStepErrors = (errors: FieldErrors): boolean => {
    if (Object.keys(errors).length === 0) {
      setFieldErrors({});
      setSubmitError(null);
      return true;
    }

    setFieldErrors(errors);
    setSubmitError(errors[FORM_LEVEL_ERROR_KEY] ?? null);
    setFocusErrorTick((tick) => tick + 1);
    return false;
  };

  useEffect(() => {
    if (!submitError) {
      return;
    }

    enrollmentNoticeRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
  }, [submitError]);

  // Move focus to the first invalid control after errors render. Fields wire
  // `aria-invalid` through the Field primitive, so the first match in document
  // order is the first invalid field. Radiogroups aren't focusable themselves,
  // so we target their first radio button.
  useEffect(() => {
    if (focusErrorTick === 0) {
      return;
    }

    const selector = [
      'input[aria-invalid="true"]',
      'select[aria-invalid="true"]',
      'textarea[aria-invalid="true"]',
      '[role="combobox"][aria-invalid="true"]',
      '[role="radiogroup"][aria-invalid="true"]'
    ].join(', ');

    const firstInvalid = document.querySelector<HTMLElement>(selector);
    if (!firstInvalid) {
      return;
    }

    const focusTarget =
      firstInvalid.getAttribute('role') === 'radiogroup' ?
        firstInvalid.querySelector<HTMLElement>('button') ?? firstInvalid :
        firstInvalid;

    focusTarget.focus({ preventScroll: true });
    focusTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [focusErrorTick]);

  useEffect(() => {
    const loadProgramAgeRules = async () => {
      const nextRules = await fetchAgeRules();
      setAgeRules(nextRules);
    };

    void loadProgramAgeRules();
  }, []);

  useEffect(() => {
    setFormData((prev) => {
      const nextAgeBreakdown = getAgeBreakdown(prev.dateOfBirth);
      const nextProgram = getProgramPlacement(nextAgeBreakdown, ageRules);
      const nextAge = nextAgeBreakdown?.years ?? 0;
      const nextProgramName = nextProgram?.name || '';

      if (prev.age === nextAge && prev.program === nextProgramName) {
        return prev;
      }

      return {
        ...prev,
        age: nextAge,
        program: nextProgramName
      };
    });
  }, [ageRules]);

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
          const nextProgram = getProgramPlacement(nextAgeBreakdown, ageRules);
          const nextSiblingCount = Number(parsedDraft.formData.enrolledSiblings) || 0;
          const nextSiblingDetails = syncSiblingDetailsCount(
            Array.isArray(parsedDraft.formData.enrolledSiblingDetails) ?
              (parsedDraft.formData.enrolledSiblingDetails as EnrolledSiblingInfo[]).map((sibling) =>
                buildSiblingDataFromBirthday(
                  {
                    ...createEmptySiblingInfo(),
                    ...sibling
                  },
                  ageRules
                )
              ) :
              [],
            nextSiblingCount
          );

          setFormData((prev) => ({
            ...prev,
            ...parsedDraft.formData,
            enrolledSiblings: nextSiblingCount,
            enrolledSiblingDetails: nextSiblingDetails,
            age: nextAgeBreakdown?.years ?? prev.age,
            program: nextProgram?.name || '',
            idPicture: enrollmentDraftFile,
            incomeProof: enrollmentDraftIncomeProofFile
          }));
        }

        if (
          typeof parsedDraft.currentStep === 'number' &&
          parsedDraft.currentStep >= 1 &&
          parsedDraft.currentStep <= STEPS.length
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
  }, [ageRules]);

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

  const updateFormData = (field: keyof FormData, value: unknown) => {
    setSubmitError(null);
    clearFieldErrors(field as string, FORM_LEVEL_ERROR_KEY);
    setFormData((prev) => {
      const newData = {
        ...prev,
        [field]: value
      };

      if (field === 'enrolledSiblings') {
        newData.enrolledSiblings = Math.max(0, Number(value) || 0);
        newData.enrolledSiblingDetails = syncSiblingDetailsCount(
          prev.enrolledSiblingDetails,
          newData.enrolledSiblings
        );
      }

      // Auto-calculate age if DOB changes
      if (field === 'dateOfBirth') {
        const nextAgeBreakdown = getAgeBreakdown(String(value));
        const nextProgram = getProgramPlacement(nextAgeBreakdown, ageRules);

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

  const updateSiblingFormData = (
    siblingIndex: number,
    field: keyof EnrolledSiblingInfo,
    value: string
  ) => {
    setSubmitError(null);
    clearFieldErrors(FORM_LEVEL_ERROR_KEY);
    setFormData((prev) => {
      const nextSiblingDetails = prev.enrolledSiblingDetails.map((sibling, index) => {
        if (index !== siblingIndex) {
          return sibling;
        }

        const nextSibling = {
          ...sibling,
          [field]: value
        } as EnrolledSiblingInfo;

        if (field === 'dateOfBirth') {
          return buildSiblingDataFromBirthday(nextSibling, ageRules);
        }

        return nextSibling;
      });

      return {
        ...prev,
        enrolledSiblingDetails: nextSiblingDetails
      };
    });
  };

  const addSibling = () => {
    setSubmitError(null);
    clearFieldErrors(FORM_LEVEL_ERROR_KEY);
    setFormData((prev) => {
      const nextSiblingDetails = [...prev.enrolledSiblingDetails, createEmptySiblingInfo()];
      return {
        ...prev,
        enrolledSiblingDetails: nextSiblingDetails,
        enrolledSiblings: nextSiblingDetails.length
      };
    });
  };

  const removeSibling = (siblingIndex: number) => {
    setSubmitError(null);
    clearFieldErrors(FORM_LEVEL_ERROR_KEY);
    setFormData((prev) => {
      const nextSiblingDetails = prev.enrolledSiblingDetails.filter((_, index) => index !== siblingIndex);
      return {
        ...prev,
        enrolledSiblingDetails: nextSiblingDetails,
        enrolledSiblings: nextSiblingDetails.length
      };
    });
  };

  const handleRegionChange = (regionCode: string) => {
    const selectedRegion = regionOptions.find((region) => region.code === regionCode);

    setSubmitError(null);
    clearFieldErrors('region', 'province', 'municipality', 'barangay', FORM_LEVEL_ERROR_KEY);
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
    clearFieldErrors('province', 'municipality', 'barangay', FORM_LEVEL_ERROR_KEY);
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
    clearFieldErrors('municipality', 'barangay', FORM_LEVEL_ERROR_KEY);
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

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const fileValidationError = validateUploadFile(file, 'ID picture');

      if (fileValidationError) {
        showEnrollmentNotification(fileValidationError);
        event.target.value = '';
        return;
      }

      const objectUrl = file.type === 'application/pdf' ? null : URL.createObjectURL(file);

      setEnrollmentDraftFile(file);
      setEnrollmentDraftPreviewUrl(objectUrl);

      updateFormData('idPicture', file);
      setPreviewUrl(objectUrl);
    }
  };

  const handleIncomeProofChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const fileValidationError = validateUploadFile(file, 'Proof of income');

      if (fileValidationError) {
        showEnrollmentNotification(fileValidationError);
        event.target.value = '';
        return;
      }

      setEnrollmentDraftIncomeProofFile(file);
      updateFormData('incomeProof', file);
    }
  };

  const goToStep = (targetStep: number) => {
    if (targetStep <= currentStep) {
      setCurrentStep(targetStep);
      return;
    }

    for (let step = currentStep; step < targetStep; step += 1) {
      const errors = validateStep(STEPS[step - 1].id, formData, ageValidationMessage);
      if (Object.keys(errors).length > 0) {
        setCurrentStep(step);
        applyStepErrors(errors);
        return;
      }
    }

    applyStepErrors({});
    setCurrentStep(targetStep);
  };

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      const errors = validateStep(STEPS[currentStep - 1].id, formData, ageValidationMessage);
      if (!applyStepErrors(errors)) {
        return;
      }

      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((prev) => prev - 1);
  };

  const validateAllSteps = () => {
    for (let step = 1; step <= STEPS.length; step += 1) {
      const errors = validateStep(STEPS[step - 1].id, formData, ageValidationMessage);
      if (Object.keys(errors).length > 0) {
        setCurrentStep(step);
        applyStepErrors(errors);
        return false;
      }
    }

    applyStepErrors({});
    return true;
  };

  const handleSubmit = async () => {
    if (!validateAllSteps()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const currentEffectiveIdPicture = getEffectiveIdPicture(formData.idPicture);
    const currentEffectiveIncomeProof = getEffectiveIncomeProof(formData.incomeProof);

    const submissionData = {
      ...formData,
      idPicture: currentEffectiveIdPicture,
      incomeProof: currentEffectiveIncomeProof
    };

    const { error, id } = await addEnrollment(submissionData);

    if (error) {
      showEnrollmentNotification(error);
      setIsSubmitting(false);
      return;
    }

    sessionStorage.removeItem(ENROLLMENT_DRAFT_STORAGE_KEY);
    clearEnrollmentDraftFiles();

    setIsSubmitting(false);
    onSubmitted(id ?? null);
  };

  return {
    currentStep,
    steps: STEPS,
    formData,
    ageRules,
    previewUrl,
    submitError,
    fieldErrors,
    isSubmitting,
    regionOptions,
    provinceOptions,
    municipalityOptions,
    barangayOptions,
    addressLookupError,
    isLoadingRegions,
    isLoadingProvinces,
    isLoadingMunicipalities,
    isLoadingBarangays,
    isRegionSelected,
    hasProvinceLevel,
    isProvinceSelected,
    isMunicipalitySelected,
    isProvinceAutoFilled,
    shouldAutoWaitlistForAddress,
    ageBreakdown,
    assignedProgram,
    ageValidationMessage,
    exactAgeLabel,
    allowedBirthdateRange,
    eligibilityNotification,
    siblingBirthdateRange,
    effectiveIdPicture,
    effectiveIncomeProof,
    enrollmentNoticeRef,
    updateFormData,
    updateSiblingFormData,
    addSibling,
    removeSibling,
    handleRegionChange,
    handleProvinceChange,
    handleMunicipalityChange,
    handleBarangayChange,
    handleFileChange,
    handleIncomeProofChange,
    goToStep,
    handleNext,
    handleBack,
    handleSubmit: () => void handleSubmit()
  };
}
