/**
 * Join conditional class names. Falsy values are dropped, whitespace collapsed.
 * A tiny dependency-free stand-in for clsx.
 */
export type ClassValue = string | number | false | null | undefined;

export function cn(...values: ClassValue[]): string {
  return values
    .filter((value): value is string | number => Boolean(value))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}
