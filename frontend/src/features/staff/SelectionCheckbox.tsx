import { CheckIcon, MinusIcon } from 'lucide-react';
import { cn } from '../../lib/cn';

interface SelectionCheckboxProps {
  checked: boolean;
  /** Renders a dash instead of a check — for a partially selected "select all". */
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  'aria-label': string;
  disabled?: boolean;
}

/**
 * A small local checkbox composed from a native input for the queue's bulk
 * selection. Kept in features/staff so the shared ui kit stays untouched. The
 * label gives a >=44px touch target while the visual box stays compact.
 */
export function SelectionCheckbox({
  checked,
  indeterminate = false,
  onChange,
  disabled,
  'aria-label': ariaLabel,
}: SelectionCheckboxProps) {
  return (
    <label
      className={cn(
        'inline-flex h-11 w-11 cursor-pointer items-center justify-center',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span
        className={cn(
          'flex h-5 w-5 items-center justify-center rounded-md border transition-colors',
          checked || indeterminate
            ? 'border-brand bg-brand text-white'
            : 'border-line-strong bg-surface text-transparent',
          'peer-focus-visible:shadow-focus',
        )}
        aria-hidden
      >
        {indeterminate ? (
          <MinusIcon className="h-3.5 w-3.5" strokeWidth={3} />
        ) : checked ? (
          <CheckIcon className="h-3.5 w-3.5" strokeWidth={3} />
        ) : null}
      </span>
    </label>
  );
}
