import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEnrollment } from '../context/EnrollmentContext';
import { useAuth } from '../context/AuthContext';
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
  motherOccupation: string;
  fatherOccupation: string;
  motherContact: string;
  fatherContact: string;
  monthlyIncome: string;
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
  motherOccupation: '',
  fatherOccupation: '',
  motherContact: '',
  fatherContact: '',
  monthlyIncome: '',
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
      updateFormData('idPicture', file);
      setPreviewUrl(URL.createObjectURL(file));
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
  const handleNext = () => {
    if (currentStep < 3) setCurrentStep((prev) => prev + 1);
  };
  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((prev) => prev - 1);
  };
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    const { error } = await addEnrollment(formData);

    if (error) {
      setSubmitError(error);
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    onSuccess();
  };
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
      </div>

      {/* Step Bubbles */}
      <div className="flex items-center justify-center mb-10">
        {steps.map((step, index) =>
        <div key={step.number} className="flex items-center">
            <motion.button
            onClick={() => setCurrentStep(step.number)}
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
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                      First Name
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
                      Last Name
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
                      Sex
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
                      Birthday
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
                    Complete Address
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
                      Financial Program
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
                    onChange={(e) =>
                    updateFormData('relationship', e.target.value)
                    }
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-[#BAE6FD] focus:outline-none transition-colors bg-white">

                      <option value="">Select Relationship</option>
                      <option value="Grandparent">Grandparent</option>
                      <option value="Aunt/Uncle">Aunt/Uncle</option>
                      <option value="Sibling">Sibling</option>
                      <option value="Other">Other</option>
                    </select>
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

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                    Monthly Family Income
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