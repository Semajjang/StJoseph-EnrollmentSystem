import { useEffect, useState } from 'react';

/**
 * Returns a copy of `value` that only updates after `delayMs` of no changes.
 * Used to keep an input responsive while debouncing the expensive filtering
 * it drives (e.g. the masterlist free-text search).
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedValue(value), delayMs);
    return () => window.clearTimeout(handle);
  }, [value, delayMs]);

  return debouncedValue;
}
