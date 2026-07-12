import type { ChangeEvent } from 'react';
import { ImageIcon, UploadIcon } from 'lucide-react';
import { cn } from '../../../lib/cn';

interface ImagePickerProps {
  image: string;
  label: string;
  aspect: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

/** Preview thumbnail + upload control that reads an image into a data URL. */
export function ImagePicker({ image, label, aspect, onChange }: ImagePickerProps) {
  return (
    <div>
      {image ? (
        <img src={image} alt="" className={cn('w-full rounded-xl object-cover', aspect)} />
      ) : (
        <div
          className={cn(
            'flex w-full items-center justify-center rounded-xl border border-dashed border-line-strong bg-surface-sunk text-muted',
            aspect,
          )}
        >
          <ImageIcon className="h-6 w-6" />
        </div>
      )}
      <label className="mt-2.5 inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink-soft shadow-sm transition hover:bg-surface-sunk">
        <UploadIcon className="h-3.5 w-3.5" />
        {label}
        <input type="file" accept="image/*" className="hidden" onChange={(event) => void onChange(event)} />
      </label>
    </div>
  );
}
