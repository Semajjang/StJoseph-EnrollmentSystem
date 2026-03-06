import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEnrollment } from '../context/EnrollmentContext';
import { useAuth } from '../context/AuthContext';

const ENROLLMENT_DRAFT_STORAGE_KEY = 'enrollment-form-draft';
let enrollmentDraftFile: File | null = null;
let enrollmentDraftPreviewUrl: string | null = null;
let enrollmentDraftIncomeProofFile: File | null = null;

interface FormData {
  // Learner Info
  childFirstName: string;
  childMiddleName: string;
  childLastName: string;
  sex: 'Male' | 'Female' | '';
  dateOfBirth: string;
  age: number;
  address: string;
  healthConcerns: string;
  financialProgram: 'Regular' | 'Subsidized' | 'Scholarship' | '';
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
  sex: '',
  dateOfBirth: '',
  age: 0,
  address: '',
  healthConcerns: '',
  financialProgram: '',
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
  monthlyIncome: '',
  incomeProof: null,
  program: 'Pre-Kindergarten 1',
  schoolYear: '2024-2025',
  schedule: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
};
interface EnrollmentFormProps {
  onSuccess: () => void;
}
export function EnrollmentForm({ onSuccess }: EnrollmentFormProps) {
  const { addEnrollment } = useEnrollment();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const rawDraft = sessionStorage.getItem(ENROLLMENT_DRAFT_STORAGE_KEY);

    if (rawDraft) {
      try {
        const parsedDraft = JSON.parse(rawDraft) as {
          currentStep?: number;
          formData?: Partial<FormData>;
        };

        if (parsedDraft.formData) {
          setFormData((prev) => ({
            ...prev,
            ...parsedDraft.formData,
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
        const birthDate = new Date(value as string);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || m === 0 && today.getDate() < birthDate.getDate()) {
          age--;
        }
        newData.age = age;
      }
      return newData;
    });
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
      const objectUrl = URL.createObjectURL(file);

      enrollmentDraftFile = file;
      enrollmentDraftPreviewUrl = objectUrl;

      updateFormData('idPicture', file);
      setPreviewUrl(objectUrl);
    }
  };

  const handleIncomeProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
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
      if (!formData.address.trim()) return 'Complete address is required.';
      if (!formData.financialProgram) return 'Financial program is required.';
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
        setSubmitError(error);
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
        setSubmitError(error);
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
        setSubmitError(error);
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
      setSubmitError(error);
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


                    <div className="text-center p-2">
                          <span className="text-xl block mb-1 font-bold">ID</span>
                          <span className="text-xs text-gray-400 font-medium">
                            2x2 ID Picture
                          </span>
                        </div>
                    }
                      <input
                      type="file"
                      accept="image/*"
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
                    Complete Address {requiredMark}
                  </label>
                  <textarea
                  value={formData.address}
                  onChange={(e) => updateFormData('address', e.target.value)}
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-[#BAE6FD] focus:outline-none transition-colors resize-none"
                  placeholder="House No., Street, Barangay, City, Province" />

                </div>

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
                      Financial Program {requiredMark}
                    </label>
                    <select
                    value={formData.financialProgram}
                    onChange={(e) =>
                    updateFormData('financialProgram', e.target.value)
                    }
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-[#BAE6FD] focus:outline-none transition-colors bg-white">

                      <option value="">Select Program Type</option>
                      <option value="Regular">Regular</option>
                      <option value="Subsidized">Subsidized</option>
                      <option value="Scholarship">Scholarship</option>
                    </select>
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
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
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                      Proof of Income (ITR) {requiredMark}
                    </label>
                    <label className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus-within:border-[#BAE6FD] transition-colors bg-white cursor-pointer block text-sm text-gray-600 truncate">
                      {formData.incomeProof ? formData.incomeProof.name : 'Upload file'}
                      <input
                      type="file"
                      accept="image/*,.pdf"
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

                <div className="bg-[#BAE6FD]/20 border-2 border-[#BAE6FD] rounded-2xl p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-[#BAE6FD] text-white text-xs font-bold px-3 py-1 rounded-bl-xl">
                    SELECTED
                  </div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-3xl shadow-sm">
                      PK
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">
                        Pre-Kindergarten 1
                      </h3>
                      <p className="text-gray-600 text-sm">
                        Ages 3-5 Years Old
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 font-medium">
                        School Year
                      </span>
                      <span className="font-bold text-gray-800">2024-2025</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 font-medium">
                        Schedule
                      </span>
                      <span className="font-bold text-gray-800">
                        Monday - Friday
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 font-medium">Time</span>
                      <span className="font-bold text-gray-800">
                        8:00 AM - 11:00 AM
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 flex gap-3">
                  <span className="text-sm font-bold text-yellow-800">Note</span>
                  <p className="text-sm text-yellow-800">
                    By submitting this form, you confirm that all information
                    provided is true and correct. You will be redirected to the
                    status page to track your application.
                  </p>
                </div>
              </motion.div>
            }
          </AnimatePresence>

          {submitError ?
          <p className="mt-4 text-sm font-medium text-red-600">{submitError}</p> :
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