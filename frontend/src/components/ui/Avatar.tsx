import { cn } from '../../lib/cn';

const sizes = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
};

// Deterministic warm tint per name so avatars stay stable across renders.
const palettes = [
  'bg-brand-tint text-brand-strong',
  'bg-accent-soft text-accent-strong',
  'bg-success-soft text-success',
  'bg-info-soft text-brand-strong',
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function hash(value: string): number {
  let total = 0;
  for (let i = 0; i < value.length; i += 1) total = (total + value.charCodeAt(i)) % 997;
  return total;
}

export function Avatar({ name, size = 'md', className }: { name: string; size?: keyof typeof sizes; className?: string }) {
  const palette = palettes[hash(name) % palettes.length];
  return (
    <span
      aria-hidden
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-bold', sizes[size], palette, className)}
    >
      {initials(name)}
    </span>
  );
}
