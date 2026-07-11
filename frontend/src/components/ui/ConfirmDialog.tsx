import type { ReactNode } from 'react';
import { AlertTriangleIcon } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import type { ButtonVariant } from './Button';

export interface ConfirmDialogProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: ButtonVariant;
  isLoading?: boolean;
  tone?: 'danger' | 'brand';
}

/**
 * A focused confirm gate for destructive or hard-to-reverse actions.
 * Use before deleting records, overriding data, or restoring backups.
 */
export function ConfirmDialog({
  open,
  onCancel,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant,
  isLoading,
  tone = 'danger',
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} size="sm" hideClose>
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <span
          className={
            tone === 'danger'
              ? 'flex h-12 w-12 items-center justify-center rounded-2xl bg-danger-soft text-danger'
              : 'flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-tint text-brand'
          }
        >
          <AlertTriangleIcon className="h-6 w-6" />
        </span>
        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-ink">{title}</h2>
          <p className="text-sm leading-6 text-muted">{message}</p>
        </div>
        <div className="mt-2 flex w-full gap-3">
          <Button variant="outline" fullWidth onClick={onCancel} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={confirmVariant ?? (tone === 'danger' ? 'danger' : 'primary')}
            fullWidth
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
