import { cn } from '../../lib/cn';

const sizes = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-9 w-9 border-[3px]',
};

export function Spinner({ size = 'md', className, label = 'Loading' }: { size?: keyof typeof sizes; className?: string; label?: string }) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn('inline-block animate-spin rounded-full border-brand/25 border-t-brand', sizes[size], className)}
    />
  );
}

export function LoadingScreen({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-3 text-muted">
      <Spinner size="lg" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}
