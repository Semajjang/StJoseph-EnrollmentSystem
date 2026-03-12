import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEnrollment } from '../context/EnrollmentContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

interface RequirementItem {
  id: string;
  label: string;
  description: string;
  iconLabel: string;
  uploaded: boolean;
  fileName: string | null;
  selectedFile: File | null;
  storagePath: string | null;
  publicUrl: string | null;
}

const REQUIREMENT_TEMPLATE: RequirementItem[] = [
{
  id: 'birth_cert',
  label: 'Birth Certificate',
  description: 'PSA Authenticated Birth Certificate',
  iconLabel: 'BC',
  uploaded: false,
  fileName: null,
  selectedFile: null,
  storagePath: null,
  publicUrl: null
},
{
  id: 'barangay',
  label: 'Barangay Clearance',
  description: 'Latest Barangay Clearance for residency proof',
  iconLabel: 'BR',
  uploaded: false,
  fileName: null,
  selectedFile: null,
  storagePath: null,
  publicUrl: null
},
{
  id: 'immunization',
  label: 'Immunization Card',
  description: 'Copy of Baby Book / Vaccination Records',
  iconLabel: 'IM',
  uploaded: false,
  fileName: null,
  selectedFile: null,
  storagePath: null,
  publicUrl: null
},
{
  id: 'photo_id',
  label: 'Parent/Guardian ID',
  description: 'Valid Government ID of Guardian',
  iconLabel: 'ID',
  uploaded: false,
  fileName: null,
  selectedFile: null,
  storagePath: null,
  publicUrl: null
}];

const ALLOWED_FILE_EXTENSIONS = ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg'];

const hasAllowedExtension = (fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  return ALLOWED_FILE_EXTENSIONS.includes(extension);
};

const mapUploadErrorMessage = (message: string) => {
  if (/row-level security|violates row-level security/i.test(message)) {
    return 'Upload blocked by Supabase storage policy. Re-run your latest schema SQL in Supabase and sign out/sign back in.';
  }

  if (/bucket.*not found|not found.*bucket/i.test(message)) {
    return 'Requirements storage bucket is missing. Re-run your schema SQL in Supabase to create the required buckets.';
  }

  return message;
};

const deleteRequirementFile = async (storagePath: string) => {
  const { error } = await supabase.storage
    .from('requirements')
    .remove([storagePath]);

  if (error) {
    return mapUploadErrorMessage(error.message);
  }

  return null;
};

interface RequirementsProps {
  onContinueToYourChild?: () => void;
}

export function Requirements({ onContinueToYourChild }: RequirementsProps) {
  const { user } = useAuth();
  const { enrollments, updateLatestEnrollmentRequirements } = useEnrollment();
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [requirements, setRequirements] = useState<RequirementItem[]>(REQUIREMENT_TEMPLATE);
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string>('');

  useEffect(() => {
    if (enrollments.length === 0) {
      setSelectedEnrollmentId('');
      return;
    }

    const selectedStillExists = enrollments.some(
      (enrollment) => enrollment.id === selectedEnrollmentId
    );

    if (selectedEnrollmentId && selectedStillExists) {
      return;
    }

    const defaultEnrollment = enrollments[0];

    setSelectedEnrollmentId(defaultEnrollment.id);
  }, [enrollments, selectedEnrollmentId]);

  const selectedEnrollment =
  enrollments.find((enrollment) => enrollment.id === selectedEnrollmentId) || null;

  useEffect(() => {
    if (!selectedEnrollment) {
      setRequirements(REQUIREMENT_TEMPLATE);
      setIsInitialized(false);
      return;
    }

    const savedRequirementsById = new Map(
      (selectedEnrollment.requirements || []).map((req) => [req.id, req])
    );

    const hydratedRequirements = REQUIREMENT_TEMPLATE.map((requirement) => {
      const saved = savedRequirementsById.get(requirement.id);

      if (!saved) {
        return {
          ...requirement,
          selectedFile: null
        };
      }

      return {
        ...requirement,
        uploaded: true,
        fileName: saved.fileName,
        selectedFile: null,
        storagePath: saved.storagePath || null,
        publicUrl: saved.publicUrl || null
      };
    });

    setRequirements(hydratedRequirements);
    setIsInitialized(true);
  }, [selectedEnrollmentId]);

  useEffect(() => {
    if (!isInitialized || !selectedEnrollment) {
      return;
    }

    const hasPendingLocalSelection = requirements.some((req) => req.selectedFile);
    if (hasPendingLocalSelection) {
      return;
    }

    const uploadedRequirements = requirements
      .filter((req) => req.uploaded && req.fileName)
      .map((req) => ({
        id: req.id,
        label: req.label,
        fileName: req.fileName as string,
        storagePath: req.storagePath || undefined,
        publicUrl: req.publicUrl || undefined
      }));

    void updateLatestEnrollmentRequirements(uploadedRequirements, selectedEnrollment.id);
  }, [
    requirements,
    isInitialized,
    selectedEnrollment,
    updateLatestEnrollmentRequirements]);
  const handleFileSelect = (id: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.png,.jpg,.jpeg';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        if (!hasAllowedExtension(file.name)) {
          setUploadError('Unsupported file type. Please upload PDF, DOC, DOCX, PNG, JPG, or JPEG.');
          return;
        }

        setUploadError(null);
        setRequirements((prev) =>
          prev.map((req) =>
            req.id === id ?
            {
              ...req,
              fileName: file.name,
              selectedFile: file,
              uploaded: false,
              storagePath: null,
              publicUrl: null
            } :
            req
          )
        );
      }
    };
    input.click();
  };

  const handleConfirmUpload = async (id: string) => {
    const selectedRequirement = requirements.find((req) => req.id === id);

    if (!selectedRequirement?.selectedFile) {
      setUploadError('Please select a file first.');
      return;
    }

    if (!selectedEnrollment) {
      setUploadError('Please submit or select an enrollment record first.');
      return;
    }

    if (!user?.id) {
      setUploadError('Your session is not ready. Please sign out and sign back in.');
      return;
    }

    setUploadError(null);
    setUploadingId(id);

    const sanitizedFileName = selectedRequirement.selectedFile.name.replace(/\s+/g, '_');
    const storagePath = `${user.id}/${selectedEnrollment.id}/${id}/${Date.now()}_${sanitizedFileName}`;

    const { error: uploadErrorResult } = await supabase.storage
      .from('requirements')
      .upload(storagePath, selectedRequirement.selectedFile, {
        upsert: false
      });

    if (uploadErrorResult) {
      setUploadError(mapUploadErrorMessage(uploadErrorResult.message));
      setUploadingId(null);
      return;
    }

    if (selectedRequirement.storagePath) {
      const deleteError = await deleteRequirementFile(selectedRequirement.storagePath);

      if (deleteError) {
        setUploadError(deleteError);
      }
    }

    setRequirements((prev) =>
      prev.map((req) =>
        req.id === id ?
        {
          ...req,
          uploaded: true,
          storagePath,
          publicUrl: null,
          selectedFile: null
        } :
        req
      )
    );

    setUploadError(null);
    setUploadingId(null);
  };

  const handleDeleteUpload = async (id: string) => {
    const selectedRequirement = requirements.find((req) => req.id === id);

    if (!selectedRequirement?.uploaded) {
      return;
    }

    const confirmed = window.confirm(`Delete the uploaded file for ${selectedRequirement.label}?`);

    if (!confirmed) {
      return;
    }

    setUploadingId(id);
    setUploadError(null);

    if (selectedRequirement.storagePath) {
      const deleteError = await deleteRequirementFile(selectedRequirement.storagePath);

      if (deleteError) {
        setUploadError(deleteError);
        setUploadingId(null);
        return;
      }
    }

    setRequirements((prev) =>
      prev.map((req) =>
        req.id === id ?
          {
            ...req,
            uploaded: false,
            fileName: null,
            selectedFile: null,
            storagePath: null,
            publicUrl: null
          } :
          req
      )
    );

    setUploadingId(null);
  };

  const handleCancelUpload = (id: string) => {
    setRequirements((prev) =>
      prev.map((req) =>
      req.id === id ?
      {
        ...req,
        fileName: null,
        selectedFile: null,
        uploaded: false,
        storagePath: null,
        publicUrl: null
      } :
      req
      )
    );
  };
  const uploadedCount = requirements.filter((r) => r.uploaded).length;
  const totalCount = requirements.length;
  const progress = uploadedCount / totalCount * 100;
  const isRequirementsComplete = totalCount > 0 && uploadedCount === totalCount;
  return (
    <div className="p-8 pb-24">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-800">
          Requirements Portal
        </h1>
        <p className="text-gray-500 mt-1 text-base">
          Please upload the following documents to complete your enrollment.
        </p>
        {enrollments.length > 0 ?
        <div className="mt-4 max-w-lg">
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">
              Enrollment Record
            </label>
            <select
            value={selectedEnrollmentId}
            onChange={(e) => {
              setSelectedEnrollmentId(e.target.value);
              setUploadError(null);
            }}
            className="w-full px-4 py-3 rounded-xl border-2 border-blue-100 focus:border-[#60A5FA] focus:outline-none transition-colors bg-white text-gray-700">

              {enrollments.map((enrollment) =>
            <option key={enrollment.id} value={enrollment.id}>
                  {enrollment.childLastName}, {enrollment.childFirstName} - {new Date(enrollment.submittedAt).toLocaleDateString()}
                </option>
            )}
            </select>
          </div> :
        <p className="text-sm text-gray-500 mt-2">
            Submit an enrollment form first before uploading requirements.
          </p>}
        {uploadError ?
        <p className="text-sm font-medium text-red-600 mt-2">{uploadError}</p> :
        null}
      </div>

      {/* Progress Card */}
      <motion.div
        initial={{
          opacity: 0,
          y: 20
        }}
        animate={{
          opacity: 1,
          y: 0
        }}
        className="bg-white rounded-2xl shadow-md p-6 mb-8 border border-blue-100">

        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-gray-800 text-lg">Upload Progress</h2>
            <p className="text-gray-500 text-sm">
              {uploadedCount} of {totalCount} documents uploaded
            </p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-extrabold text-gray-800">
              {Math.round(progress)}%
            </span>
          </div>
        </div>
        <div className="h-4 bg-blue-50 rounded-full overflow-hidden border border-blue-100">
          <motion.div
            className="h-full bg-gradient-to-r from-[#93C5FD] to-[#A7F3D0] rounded-full"
            initial={{
              width: 0
            }}
            animate={{
              width: `${progress}%`
            }}
            transition={{
              duration: 0.5
            }} />

        </div>

        {onContinueToYourChild ?
        <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={onContinueToYourChild}
              disabled={!isRequirementsComplete}
              className="rounded-xl bg-[#1D4ED8] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#1E40AF] disabled:cursor-not-allowed disabled:bg-blue-200"
            >
              Go to Your Children
            </button>
          </div> :
        null}
      </motion.div>

      {/* Requirements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {requirements.map((req, index) =>
        <motion.div
          key={req.id}
          initial={{
            opacity: 0,
            y: 20
          }}
          animate={{
            opacity: 1,
            y: 0
          }}
          transition={{
            delay: index * 0.1
          }}
          className="bg-white rounded-2xl shadow-md p-6 border border-blue-100">

            <div className="flex items-start gap-4">
              <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-colors font-bold ${req.uploaded ? 'bg-[#A7F3D0] text-green-800' : 'bg-[#DBEAFE] text-blue-700'}`}>

                {req.uploaded ? 'Done' : req.iconLabel}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-800 mb-1">{req.label}</h3>
                <p className="text-sm text-gray-500 mb-4">{req.description}</p>

                <AnimatePresence mode="wait">
                  {req.uploaded ? (
                    <motion.div
                      key="uploaded"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-3 bg-[#ECFDF5] rounded-xl border border-[#A7F3D0]"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-green-600 font-bold text-sm">
                          Document Uploaded
                        </span>
                        <span className="text-green-600">Complete</span>
                      </div>
                      {req.fileName ?
                    <p className="text-xs text-green-700 mt-1 truncate">
                          {req.fileName}
                        </p> :
                    null}
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleFileSelect(req.id)}
                          disabled={uploadingId === req.id}
                          className="flex-1 rounded-lg bg-green-100 px-3 py-2 text-sm font-bold text-green-800 transition-colors hover:bg-green-200 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Replace
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteUpload(req.id)}
                          disabled={uploadingId === req.id}
                          className="flex-1 rounded-lg bg-red-100 px-3 py-2 text-sm font-bold text-red-700 transition-colors hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {uploadingId === req.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </motion.div>
                  ) : req.fileName ? (
                    <motion.div
                      key="confirm"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-gray-100 rounded-xl"
                    >
                      <p className="text-sm text-gray-700 mb-2 truncate">
                        {req.fileName}
                      </p>
                      <div className="flex gap-2">
                        <button
                          disabled={uploadingId === req.id}
                          onClick={() => handleConfirmUpload(req.id)}
                          className="flex-1 py-2 px-4 bg-[#1D4ED8] hover:bg-[#1E40AF] text-white rounded-lg text-sm font-bold transition-colors"
                        >
                          {uploadingId === req.id ? 'Uploading...' : 'Confirm'}
                        </button>
                        <button
                          onClick={() => handleCancelUpload(req.id)}
                          className="flex-1 py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-bold transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.button
                      key="upload"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      disabled={!selectedEnrollment}
                      onClick={() => handleFileSelect(req.id)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full py-3 px-6 bg-[#1D4ED8] hover:bg-[#1E40AF] disabled:bg-blue-200 disabled:cursor-not-allowed rounded-xl font-bold text-white transition-colors flex items-center justify-center gap-2 shadow-sm"
                    >
                      Upload
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>);

}