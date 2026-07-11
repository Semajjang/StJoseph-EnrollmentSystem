import { useMemo, useState } from 'react';
import { ExternalLinkIcon, FileTextIcon, Trash2Icon } from 'lucide-react';
import type { EnrollmentData } from '../../context/EnrollmentContext';
import { supabase } from '../../lib/supabase';
import {
  Badge,
  Button,
  ConfirmDialog,
  Field,
  Select,
  StatusPill,
} from '../../components/ui';
import { ApplicantDrawerShell } from './ApplicantDrawerShell';
import {
  ManagedProgram,
  SectionCatalog,
  getManagedProgram,
  sectionCapacity,
} from './sections';
import {
  ViewableRequirement,
  fileFieldKeysToHide,
  formatFieldValue,
  formatSubmittedFieldLabel,
  getEnrollmentIdPicture,
  getSiblingEntries,
  mergeEnrollmentRequirements,
} from './enrollmentData';

type EnrollmentStatus = EnrollmentData['status'];

interface ApplicantDrawerProps {
  student: EnrollmentData;
  open: boolean;
  onClose: () => void;
  sectionsByProgram: SectionCatalog;
  sectionLoadByProgram: Record<ManagedProgram, Record<string, number>>;
  onChangeStatus: (student: EnrollmentData, status: EnrollmentStatus) => void;
  onChangeSection: (student: EnrollmentData, section: string | null) => void;
  onDelete: (student: EnrollmentData) => Promise<boolean>;
}

const statusOptions: EnrollmentStatus[] = ['Pending', 'Approved', 'Waitlisted', 'Rejected'];

/** Full record view with inline status / section edits and requirement review. */
export function ApplicantDrawer({
  student,
  open,
  onClose,
  sectionsByProgram,
  sectionLoadByProgram,
  onChangeStatus,
  onChangeSection,
  onDelete,
}: ApplicantDrawerProps) {
  const [loadingFileId, setLoadingFileId] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const submittedEntries = useMemo(
    () =>
      (Object.entries(student.formData || {}) as [string, unknown][]).filter(
        ([key]) => !fileFieldKeysToHide.has(key),
      ),
    [student.formData],
  );
  const requirements = useMemo(() => mergeEnrollmentRequirements(student), [student]);
  const idPicture = useMemo(() => getEnrollmentIdPicture(student), [student]);

  const managedProgram = getManagedProgram(student.program);
  const sectionOptions = managedProgram ? sectionsByProgram[managedProgram] : [];
  const mergedSectionOptions =
    student.section && !sectionOptions.includes(student.section)
      ? [...sectionOptions, student.section]
      : sectionOptions;
  const canAssignSection = student.status === 'Approved';

  const openStoredFile = async (
    id: string,
    bucket: 'requirements' | 'enrollment-files',
    storagePath?: string,
    publicUrl?: string,
  ) => {
    if (storagePath) {
      setLoadingFileId(id);
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(storagePath, 60 * 10);
      setLoadingFileId(null);

      if (!error && data?.signedUrl) {
        window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
        return;
      }
    }

    if (publicUrl) {
      window.open(publicUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    const success = await onDelete(student);
    setIsDeleting(false);
    setConfirmDeleteOpen(false);
    if (success) {
      onClose();
    }
  };

  return (
    <>
      <ApplicantDrawerShell
        open={open}
        onClose={onClose}
        title={`${student.childFirstName} ${student.childLastName}`}
        description={`${student.program}${student.section ? ` · ${student.section}` : ''}`}
        footer={
          <>
            <Button
              variant="danger"
              leftIcon={<Trash2Icon className="h-4 w-4" />}
              onClick={() => setConfirmDeleteOpen(true)}
            >
              Delete record
            </Button>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          <section className="rounded-2xl border border-line bg-surface-sunk/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-2xs font-bold uppercase tracking-[0.1em] text-brand">Record controls</p>
              <StatusPill status={student.status} />
            </div>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Enrollment status">
                {({ id }) => (
                  <Select
                    id={id}
                    value={student.status}
                    onChange={(event) =>
                      onChangeStatus(student, event.target.value as EnrollmentStatus)
                    }
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field
                label="Section"
                hint={canAssignSection ? undefined : 'Approve the learner first to assign a section.'}
              >
                {({ id }) => (
                  <Select
                    id={id}
                    value={student.section || ''}
                    disabled={!canAssignSection}
                    onChange={(event) => onChangeSection(student, event.target.value || null)}
                  >
                    <option value="">Unassigned</option>
                    {mergedSectionOptions.map((section) => {
                      const load = managedProgram
                        ? sectionLoadByProgram[managedProgram][section] || 0
                        : 0;
                      const suffix =
                        load > sectionCapacity
                          ? ` (Overloaded ${load}/${sectionCapacity})`
                          : load === sectionCapacity
                            ? ` (Full ${load}/${sectionCapacity})`
                            : '';
                      return (
                        <option key={section} value={section}>
                          {section}
                          {suffix}
                        </option>
                      );
                    })}
                  </Select>
                )}
              </Field>
            </div>
          </section>

          <RecordGrid student={student} />

          <section>
            <h4 className="mb-3 text-sm font-bold text-ink">Submitted form data</h4>
            {submittedEntries.length === 0 ? (
              <p className="text-sm text-muted">No additional form fields were submitted.</p>
            ) : (
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {submittedEntries.map(([key, value]) => (
                  <div key={key} className="rounded-xl border border-line bg-surface px-4 py-3">
                    <p className="text-2xs font-bold uppercase tracking-[0.08em] text-muted">
                      {formatSubmittedFieldLabel(key)}
                    </p>
                    <SubmittedFieldValue fieldKey={key} value={value} />
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h4 className="mb-3 text-sm font-bold text-ink">Learner ID photo</h4>
            {idPicture ? (
              <FileRow
                label={idPicture.fileName}
                loading={loadingFileId === 'id-picture'}
                onOpen={() =>
                  openStoredFile('id-picture', 'enrollment-files', idPicture.storagePath, idPicture.publicUrl)
                }
              />
            ) : (
              <p className="text-sm text-muted">No ID photo was uploaded for this enrollment.</p>
            )}
          </section>

          <section>
            <h4 className="mb-3 text-sm font-bold text-ink">Requirements &amp; uploads</h4>
            {requirements.length === 0 ? (
              <p className="text-sm text-muted">No requirement files uploaded yet.</p>
            ) : (
              <div className="space-y-2.5">
                {requirements.map((requirement) => (
                  <FileRow
                    key={requirement.id}
                    label={requirement.fileName}
                    eyebrow={requirement.label}
                    loading={loadingFileId === requirement.id}
                    onOpen={() => openRequirement(requirement)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </ApplicantDrawerShell>

      <ConfirmDialog
        open={confirmDeleteOpen}
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        title="Delete this enrollment?"
        message={`This permanently removes ${student.childFirstName} ${student.childLastName}'s record. This can't be undone.`}
        confirmLabel="Delete record"
      />
    </>
  );

  function openRequirement(requirement: ViewableRequirement) {
    void openStoredFile(
      requirement.id,
      requirement.bucketName,
      requirement.storagePath,
      requirement.publicUrl,
    );
  }
}

function RecordGrid({ student }: { student: EnrollmentData }) {
  const rows: Array<{ label: string; value: string }> = [
    { label: 'Last name', value: student.childLastName },
    { label: 'First name', value: student.childFirstName },
    { label: 'Program', value: student.program },
    { label: 'Section', value: student.section || 'Unassigned' },
    { label: 'Role', value: student.role },
    { label: 'Submitted', value: new Date(student.submittedAt).toLocaleString() },
  ];

  return (
    <section className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
      {rows.map((row) => (
        <div key={row.label} className="rounded-xl border border-line bg-surface px-4 py-3">
          <p className="text-2xs font-bold uppercase tracking-[0.08em] text-muted">{row.label}</p>
          <p className="mt-0.5 text-sm font-semibold text-ink">{row.value}</p>
        </div>
      ))}
    </section>
  );
}

function SubmittedFieldValue({ fieldKey, value }: { fieldKey: string; value: unknown }) {
  if (fieldKey === 'enrolledSiblingDetails' && Array.isArray(value)) {
    const siblings = getSiblingEntries({ formData: { enrolledSiblingDetails: value } } as EnrollmentData);

    if (siblings.length === 0) {
      return <p className="mt-0.5 break-words text-sm text-ink-soft">N/A</p>;
    }

    return (
      <div className="mt-1.5 space-y-1.5">
        {siblings.map((sibling, index) => (
          <div key={index} className="rounded-lg border border-line bg-surface-sunk px-3 py-2">
            <p className="text-sm font-semibold text-ink">
              {typeof sibling.name === 'string' && sibling.name.trim()
                ? sibling.name
                : `Sibling ${index + 1}`}
            </p>
            <p className="text-2xs text-muted">Birthday: {formatFieldValue(sibling.dateOfBirth)}</p>
            <p className="text-2xs text-muted">Sex: {formatFieldValue(sibling.sex)}</p>
            <p className="text-2xs text-muted">Age: {formatFieldValue(sibling.age)}</p>
            <p className="text-2xs text-muted">Program: {formatFieldValue(sibling.program)}</p>
          </div>
        ))}
      </div>
    );
  }

  return <p className="mt-0.5 break-words text-sm text-ink-soft">{formatFieldValue(value)}</p>;
}

function FileRow({
  label,
  eyebrow,
  loading,
  onOpen,
}: {
  label: string;
  eyebrow?: string;
  loading: boolean;
  onOpen: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-tint text-brand">
          <FileTextIcon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          {eyebrow ? <Badge tone="neutral">{eyebrow}</Badge> : null}
          <p className="mt-0.5 truncate text-sm font-medium text-ink">{label}</p>
        </div>
      </div>
      <Button
        variant="subtle"
        size="sm"
        isLoading={loading}
        rightIcon={<ExternalLinkIcon className="h-3.5 w-3.5" />}
        onClick={onOpen}
      >
        {loading ? 'Preparing' : 'View'}
      </Button>
    </div>
  );
}
