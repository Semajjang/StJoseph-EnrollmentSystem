import { useEffect, useMemo, useState } from 'react';
import { CheckIcon, FileTextIcon, RefreshCwIcon, Trash2Icon, UploadCloudIcon } from 'lucide-react';
import { Badge, Button, Card, ConfirmDialog, Spinner } from '../../components/ui';
import { cn } from '../../lib/cn';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { EnrollmentData, useEnrollment } from '../../context/EnrollmentContext';

interface RequirementDef {
  id: string;
  label: string;
  description: string;
}

const REQUIREMENTS: RequirementDef[] = [
  { id: 'birth_cert', label: 'Birth Certificate', description: 'PSA-authenticated copy of the child’s birth certificate' },
  { id: 'barangay', label: 'Barangay Clearance', description: 'Latest barangay clearance as proof of residency' },
  { id: 'immunization', label: 'Immunization Card', description: 'Copy of the baby book or vaccination records' },
  { id: 'photo_id', label: 'Parent / Guardian ID', description: 'A valid government-issued ID of the guardian' },
];

const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg'];

const hasAllowedExtension = (fileName: string) =>
  ALLOWED_EXTENSIONS.includes(fileName.split('.').pop()?.toLowerCase() || '');

const mapUploadError = (message: string) => {
  if (/row-level security|violates row-level security/i.test(message)) {
    return 'Upload was blocked by the storage policy. Re-run your schema SQL in Supabase, then sign out and back in.';
  }
  if (/bucket.*not found|not found.*bucket/i.test(message)) {
    return 'The requirements storage bucket is missing. Re-run your schema SQL in Supabase to create it.';
  }
  return message;
};

interface UploadedDoc {
  id: string;
  label: string;
  fileName: string;
  storagePath?: string;
  publicUrl?: string;
}

export interface RequirementsUploaderProps {
  enrollment: EnrollmentData;
  /** Fires whenever the uploaded count changes, for parent-rendered progress. */
  onProgress?: (uploaded: number, total: number) => void;
}

/**
 * The document upload surface for a single enrollment. Files upload the moment
 * they're chosen — no separate confirm step — and each success is persisted to
 * the enrollment record. Shared by the enrollment flow and the Requirements page.
 */
export function RequirementsUploader({ enrollment, onProgress }: RequirementsUploaderProps) {
  const { user } = useAuth();
  const { updateLatestEnrollmentRequirements } = useEnrollment();
  const [docs, setDocs] = useState<Record<string, UploadedDoc | null>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Hydrate from the enrollment's saved requirements whenever it changes.
  useEffect(() => {
    const saved = new Map((enrollment.requirements || []).map((req) => [req.id, req]));
    const next: Record<string, UploadedDoc | null> = {};
    for (const def of REQUIREMENTS) {
      const match = saved.get(def.id);
      next[def.id] = match
        ? { id: def.id, label: def.label, fileName: match.fileName, storagePath: match.storagePath, publicUrl: match.publicUrl }
        : null;
    }
    setDocs(next);
  }, [enrollment.id, enrollment.requirements]);

  const uploadedCount = useMemo(() => Object.values(docs).filter(Boolean).length, [docs]);

  useEffect(() => {
    onProgress?.(uploadedCount, REQUIREMENTS.length);
  }, [uploadedCount, onProgress]);

  const persist = async (nextDocs: Record<string, UploadedDoc | null>) => {
    const uploaded = Object.values(nextDocs).filter((doc): doc is UploadedDoc => Boolean(doc));
    await updateLatestEnrollmentRequirements(
      uploaded.map((doc) => ({ id: doc.id, label: doc.label, fileName: doc.fileName, storagePath: doc.storagePath, publicUrl: doc.publicUrl })),
      enrollment.id,
    );
  };

  const uploadFile = async (def: RequirementDef, file: File) => {
    if (!hasAllowedExtension(file.name)) {
      setError('Unsupported file type. Please upload a PDF, DOC, DOCX, PNG, JPG, or JPEG.');
      return;
    }
    if (!user?.id) {
      setError('Your session is not ready. Please sign out and back in.');
      return;
    }

    setError(null);
    setBusyId(def.id);

    const previous = docs[def.id];
    const safeName = file.name.replace(/\s+/g, '_');
    const storagePath = `${user.id}/${enrollment.id}/${def.id}/${Date.now()}_${safeName}`;

    const { error: uploadError } = await supabase.storage.from('requirements').upload(storagePath, file, { upsert: false });
    if (uploadError) {
      setError(mapUploadError(uploadError.message));
      setBusyId(null);
      return;
    }

    // Best-effort removal of the file being replaced.
    if (previous?.storagePath) {
      await supabase.storage.from('requirements').remove([previous.storagePath]);
    }

    const nextDocs = { ...docs, [def.id]: { id: def.id, label: def.label, fileName: file.name, storagePath, publicUrl: undefined } };
    setDocs(nextDocs);
    setBusyId(null);
    await persist(nextDocs);
  };

  const pickFile = (def: RequirementDef) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.png,.jpg,.jpeg';
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) void uploadFile(def, file);
    };
    input.click();
  };

  const deleteDoc = async (defId: string) => {
    const doc = docs[defId];
    if (!doc) return;
    setBusyId(defId);
    setError(null);
    if (doc.storagePath) {
      const { error: removeError } = await supabase.storage.from('requirements').remove([doc.storagePath]);
      if (removeError) {
        setError(mapUploadError(removeError.message));
        setBusyId(null);
        return;
      }
    }
    const nextDocs = { ...docs, [defId]: null };
    setDocs(nextDocs);
    setBusyId(null);
    await persist(nextDocs);
  };

  const pendingDeleteDef = REQUIREMENTS.find((def) => def.id === pendingDeleteId) || null;

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-xl border border-danger/25 bg-danger-soft px-4 py-3 text-sm font-medium text-danger">{error}</p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {REQUIREMENTS.map((def) => {
          const doc = docs[def.id];
          const isBusy = busyId === def.id;
          const isUploaded = Boolean(doc);

          return (
            <Card key={def.id} padding="none" className="flex flex-col">
              <div className="flex items-start gap-4 p-5">
                <span
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
                    isUploaded ? 'bg-success-soft text-success' : 'bg-brand-tint text-brand',
                  )}
                >
                  {isBusy ? <Spinner size="sm" /> : isUploaded ? <CheckIcon className="h-5 w-5" /> : <FileTextIcon className="h-5 w-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-ink">{def.label}</h3>
                    {isUploaded ? (
                      <Badge tone="success" icon={<CheckIcon className="h-3 w-3" />}>
                        Uploaded
                      </Badge>
                    ) : (
                      <Badge tone="neutral">Needed</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-muted">{def.description}</p>
                  {doc?.fileName ? <p className="mt-2 truncate text-xs font-medium text-ink-soft">{doc.fileName}</p> : null}
                </div>
              </div>

              <div className="mt-auto border-t border-line p-4">
                {isUploaded ? (
                  <div className="flex gap-2">
                    <Button variant="subtle" size="sm" fullWidth onClick={() => pickFile(def)} disabled={isBusy} leftIcon={<RefreshCwIcon className="h-4 w-4" />}>
                      Replace
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setPendingDeleteId(def.id)} disabled={isBusy} aria-label={`Remove ${def.label}`}>
                      <Trash2Icon className="h-4 w-4 text-danger" />
                    </Button>
                  </div>
                ) : (
                  <Button fullWidth size="sm" onClick={() => pickFile(def)} isLoading={isBusy} leftIcon={<UploadCloudIcon className="h-4 w-4" />}>
                    {isBusy ? 'Uploading…' : 'Choose file'}
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
          const target = pendingDeleteId;
          setPendingDeleteId(null);
          if (target) void deleteDoc(target);
        }}
        title="Remove this document?"
        message={pendingDeleteDef ? `This removes the uploaded ${pendingDeleteDef.label}. You can upload it again anytime.` : 'This removes the uploaded file.'}
        confirmLabel="Remove document"
      />
    </div>
  );
}

export const REQUIRED_DOCUMENT_COUNT = REQUIREMENTS.length;
