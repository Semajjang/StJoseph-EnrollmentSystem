import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

export type ButtonVariant = 'primary' | 'accent' | 'subtle' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const base =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold ' +
  'transition-all duration-150 focus-visible:outline-none focus-visible:shadow-focus ' +
  'disabled:cursor-not-allowed disabled:opacity-55 active:scale-[0.98]';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-white shadow-sm hover:bg-brand-strong',
  accent: 'bg-accent text-ink shadow-sm hover:bg-accent-strong hover:text-white',
  subtle: 'bg-surface-sunk text-ink-soft border border-line hover:bg-brand-tint hover:border-brand/30 hover:text-brand-strong',
  outline: 'border border-line-strong bg-surface text-ink-soft hover:bg-surface-sunk hover:border-brand/40',
  ghost: 'text-ink-soft hover:bg-surface-sunk',
  danger: 'bg-danger text-white shadow-sm hover:bg-danger/90',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-[13px]',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-[15px]',
  icon: 'h-10 w-10',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', isLoading = false, leftIcon, rightIcon, fullWidth, className, children, disabled, type, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      disabled={disabled || isLoading}
      className={cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
      {...props}
    >
      {isLoading ? (
        <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
      ) : (
        leftIcon
      )}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
});
