import { useEffect, useState } from 'react';
import { ArrowRightIcon, CheckIcon, FileTextIcon, UploadCloudIcon } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardBody,
  ConfirmDialog,
  Field,
  PageHeader,
  Select,
} from '../components/ui';
import { cn } from '../lib/cn';
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
    publicUrl: null,
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
    publicUrl: null,
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
    publicUrl: null,
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
    publicUrl: null,
  },
];

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
  const { error } = await supabase.storage.from('requirements').remove([storagePath]);

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
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (enrollments.length === 0) {
      setSelectedEnrollmentId('');
      return;
    }

    const selectedStillExists = enrollments.some((enrollment) => enrollment.id === selectedEnrollmentId);

    if (selectedEnrollmentId && selectedStillExists) {
      return;
    }

    const defaultEnrollment = enrollments[0];

    setSelectedEnrollmentId(defaultEnrollment.id);
  }, [enrollments, selectedEnrollmentId]);

  const selectedEnrollment = enrollments.find((enrollment) => enrollment.id === selectedEnrollmentId) || null;

  useEffect(() => {
    if (!selectedEnrollment) {
      setRequirements(REQUIREMENT_TEMPLATE);
      setIsInitialized(false);
      return;
    }

    const savedRequirementsById = new Map((selectedEnrollment.requirements || []).map((req) => [req.id, req]));

    const hydratedRequirements = REQUIREMENT_TEMPLATE.map((requirement) => {
      const saved = savedRequirementsById.get(requirement.id);

      if (!saved) {
        return {
          ...requirement,
          selectedFile: null,
        };
      }

      return {
        ...requirement,
        uploaded: true,
        fileName: saved.fileName,
        selectedFile: null,
        storagePath: saved.storagePath || null,
        publicUrl: saved.publicUrl || null,
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
        publicUrl: req.publicUrl || undefined,
      }));

    void updateLatestEnrollmentRequirements(uploadedRequirements, selectedEnrollment.id);
  }, [requirements, isInitialized, selectedEnrollment, updateLatestEnrollmentRequirements]);

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
            req.id === id
              ? {
                  ...req,
                  fileName: file.name,
                  selectedFile: file,
                  uploaded: false,
                  storagePath: null,
                  publicUrl: null,
                }
              : req,
          ),
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
        upsert: false,
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
        req.id === id
          ? {
              ...req,
              uploaded: true,
              storagePath,
              publicUrl: null,
              selectedFile: null,
            }
          : req,
      ),
    );

    setUploadError(null);
    setUploadingId(null);
  };

  const handleDeleteUpload = async (id: string) => {
    const selectedRequirement = requirements.find((req) => req.id === id);

    if (!selectedRequirement?.uploaded) {
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
        req.id === id
          ? {
              ...req,
              uploaded: false,
              fileName: null,
              selectedFile: null,
              storagePath: null,
              publicUrl: null,
            }
          : req,
      ),
    );

    setUploadingId(null);
  };

  const handleCancelUpload = (id: string) => {
    setRequirements((prev) =>
      prev.map((req) =>
        req.id === id
          ? {
              ...req,
              fileName: null,
              selectedFile: null,
              uploaded: false,
              storagePath: null,
              publicUrl: null,
            }
          : req,
      ),
    );
  };

  const pendingDeleteRequirement = requirements.find((req) => req.id === pendingDeleteId) || null;
  const uploadedCount = requirements.filter((r) => r.uploaded).length;
  const totalCount = requirements.length;
  const progress = (uploadedCount / totalCount) * 100;
  const isRequirementsComplete = totalCount > 0 && uploadedCount === totalCount;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 md:p-8">
      <PageHeader
        eyebrow="Requirements"
        title="Upload your documents"
        description="Upload each document below to complete your enrollment. Accepted files: PDF, DOC, DOCX, PNG, JPG, or JPEG."
      />

      {enrollments.length > 0 ? (
        <Card>
          <Field label="Enrollment record" hint="Choose which child's requirements you're uploading.">
            {({ id }) => (
              <Select
                id={id}
                value={selectedEnrollmentId}
                onChange={(event) => {
                  setSelectedEnrollmentId(event.target.value);
                  setUploadError(null);
                }}
              >
                {enrollments.map((enrollment) => (
                  <option key={enrollment.id} value={enrollment.id}>
                    {enrollment.childLastName}, {enrollment.childFirstName} - {new Date(enrollment.submittedAt).toLocaleDateString()}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-muted">Submit an enrollment form first before uploading requirements.</p>
        </Card>
      )}

      {uploadError ? (
        <p className="rounded-xl border border-danger/25 bg-danger-soft px-4 py-3 text-sm font-medium text-danger">{uploadError}</p>
      ) : null}

      {/* Progress */}
      <Card padding="none">
        <CardBody className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-bold text-ink">Upload progress</h2>
              <p className="text-sm text-muted">{uploadedCount} of {totalCount} documents uploaded</p>
            </div>
            <span className="font-display text-3xl font-extrabold text-brand-strong">{Math.round(progress)}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-sunk">
            <div
              className="h-full rounded-full bg-brand transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          {onContinueToYourChild ? (
            <div className="flex justify-end">
              <Button
                onClick={onContinueToYourChild}
                disabled={!isRequirementsComplete}
                rightIcon={<ArrowRightIcon className="h-4 w-4" />}
              >
                Go to My Children
              </Button>
            </div>
          ) : null}
        </CardBody>
      </Card>

      {/* Requirements checklist */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {requirements.map((req) => {
          const isBusy = uploadingId === req.id;
          const statusBadge = req.uploaded ? (
            <Badge tone="success" icon={<CheckIcon className="h-3 w-3" />}>Uploaded</Badge>
          ) : req.selectedFile ? (
            <Badge tone="warning">Ready to upload</Badge>
          ) : (
            <Badge tone="neutral">Not uploaded</Badge>
          );

          return (
            <Card key={req.id} padding="none" className="flex flex-col">
              <div className="flex items-start gap-4 p-5">
                <span
                  className={cn(
                    'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl',
                    req.uploaded ? 'bg-success-soft text-success' : 'bg-brand-tint text-brand',
                  )}
                >
                  {req.uploaded ? <CheckIcon className="h-6 w-6" /> : <FileTextIcon className="h-6 w-6" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-ink">{req.label}</h3>
                    {statusBadge}
                  </div>
                  <p className="mt-0.5 text-sm text-muted">{req.description}</p>
                  {req.fileName ? (
                    <p className="mt-2 truncate text-xs font-medium text-ink-soft">{req.fileName}</p>
                  ) : null}
                </div>
              </div>

              <div className="mt-auto border-t border-line p-4">
                {req.uploaded ? (
                  <div className="flex gap-2">
                    <Button variant="subtle" size="sm" fullWidth onClick={() => handleFileSelect(req.id)} disabled={isBusy}>
                      Replace
                    </Button>
                    <Button variant="danger" size="sm" fullWidth onClick={() => setPendingDeleteId(req.id)} disabled={isBusy}>
                      {isBusy ? 'Deleting…' : 'Delete'}
                    </Button>
                  </div>
                ) : req.selectedFile ? (
                  <div className="flex gap-2">
                    <Button size="sm" fullWidth onClick={() => void handleConfirmUpload(req.id)} isLoading={isBusy}>
                      {isBusy ? 'Uploading…' : 'Confirm'}
                    </Button>
                    <Button variant="outline" size="sm" fullWidth onClick={() => handleCancelUpload(req.id)} disabled={isBusy}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    fullWidth
                    size="sm"
                    onClick={() => handleFileSelect(req.id)}
                    disabled={!selectedEnrollment}
                    leftIcon={<UploadCloudIcon className="h-4 w-4" />}
                  >
                    Upload
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <ConfirmDialog
        open={Boolean(pendingDeleteId)}
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={() => {
          const targetId = pendingDeleteId;
          setPendingDeleteId(null);
          if (targetId) {
            void handleDeleteUpload(targetId);
          }
        }}
        title="Delete this document?"
        message={
          pendingDeleteRequirement
            ? `This removes the uploaded file for ${pendingDeleteRequirement.label}. You can upload it again later.`
            : 'This removes the uploaded file.'
        }
        confirmLabel="Delete document"
      />
    </div>
  );
}
