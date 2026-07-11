import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * Tracks a set of selected row ids for the enrollment queue bulk actions.
 *
 * Selection is always reconciled against the currently visible (filtered) ids,
 * so rows that scroll out of the active filter drop out of the selection and
 * bulk actions can never touch a record the user can no longer see.
 */
export function useQueueSelection(visibleIds: string[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const visibleIdKey = visibleIds.join('|');

  // Prune ids that are no longer part of the filtered result.
  useEffect(() => {
    setSelectedIds((current) => {
      if (current.size === 0) {
        return current;
      }
      const allowed = new Set(visibleIds);
      let changed = false;
      const next = new Set<string>();
      current.forEach((id) => {
        if (allowed.has(id)) {
          next.add(id);
        } else {
          changed = true;
        }
      });
      return changed ? next : current;
    });
    // visibleIdKey is a stable signature of visibleIds.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleIdKey]);

  const toggle = useCallback((id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(
    (shouldSelectAll: boolean) => {
      setSelectedIds(shouldSelectAll ? new Set(visibleIds) : new Set());
    },
    [visibleIds],
  );

  const clear = useCallback(() => setSelectedIds(new Set()), []);

  const selectedCount = selectedIds.size;
  const allSelected = visibleIds.length > 0 && selectedCount === visibleIds.length;
  const someSelected = selectedCount > 0 && !allSelected;

  const orderedSelectedIds = useMemo(
    () => visibleIds.filter((id) => selectedIds.has(id)),
    [visibleIds, selectedIds],
  );

  return {
    selectedIds,
    orderedSelectedIds,
    selectedCount,
    allSelected,
    someSelected,
    toggle,
    toggleAll,
    clear,
  };
}
