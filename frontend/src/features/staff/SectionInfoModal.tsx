import { useEffect, useState } from 'react';
import { Trash2Icon } from 'lucide-react';
import { Button, ConfirmDialog, Field, Input, Modal } from '../../components/ui';
import {
  buildSectionLabel,
  formatSectionTimeRange,
  isValidSectionTimeRange,
  normalizeSectionName,
  parseSectionLabel,
} from './sections';

interface SectionInfoModalProps {
  open: boolean;
  program: string;
  section: string;
  studentCount: number;
  onClose: () => void;
  onSave: (name: string, startTime: string, endTime: string) => Promise<boolean>;
  onDelete: () => Promise<boolean>;
}

/** Rename or delete a single section; reassigns its learners on save/delete. */
export function SectionInfoModal({
  open,
  program,
  section,
  studentCount,
  onClose,
  onSave,
  onDelete,
}: SectionInfoModalProps) {
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    const parsed = parseSectionLabel(section);
    setName(parsed.sectionName);
    setStartTime(parsed.startTime);
    setEndTime(parsed.endTime);
  }, [section]);

  const canSave = Boolean(normalizeSectionName(name) && formatSectionTimeRange(startTime, endTime));
  const showTimeError = Boolean(startTime && endTime && !isValidSectionTimeRange(startTime, endTime));
  const busy = isSaving || isDeleting;

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(name, startTime, endTime);
    setIsSaving(false);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    const success = await onDelete();
    setIsDeleting(false);
    setConfirmDeleteOpen(false);
    if (!success) {
      // Keep the modal open so the reviewer can retry.
    }
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        size="lg"
        title="Section settings"
        description={`${program} · ${studentCount} learner${studentCount === 1 ? '' : 's'} assigned`}
        footer={
          <>
            <Button
              variant="danger"
              leftIcon={<Trash2Icon className="h-4 w-4" />}
              onClick={() => setConfirmDeleteOpen(true)}
              disabled={busy}
            >
              Delete section
            </Button>
            <Button onClick={handleSave} isLoading={isSaving} disabled={!canSave || isDeleting}>
              Save changes
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Section name">
              {({ id }) => (
                <Input
                  id={id}
                  value={name}
                  disabled={busy}
                  onChange={(event) => setName(event.target.value)}
                />
              )}
            </Field>
            <Field label="Start time">
              {({ id }) => (
                <Input
                  id={id}
                  type="time"
                  value={startTime}
                  disabled={busy}
                  onChange={(event) => setStartTime(event.target.value)}
                />
              )}
            </Field>
            <Field label="End time" error={showTimeError ? 'Ends after start' : undefined}>
              {({ id, invalid }) => (
                <Input
                  id={id}
                  type="time"
                  value={endTime}
                  invalid={invalid}
                  disabled={busy}
                  onChange={(event) => setEndTime(event.target.value)}
                />
              )}
            </Field>
          </div>

          <div className="rounded-xl border border-line bg-brand-tint px-4 py-3">
            <p className="text-2xs font-bold uppercase tracking-[0.1em] text-brand">Updated label preview</p>
            <p className="mt-1 text-base font-bold text-ink">
              {buildSectionLabel(name || section, startTime, endTime)}
            </p>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDeleteOpen}
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        title="Delete this section?"
        message={`${section} will be removed and its ${studentCount} assigned learner${
          studentCount === 1 ? '' : 's'
        } will become unassigned. This can't be undone.`}
        confirmLabel="Delete section"
      />
    </>
  );
}
