"use client";

import { useCallback, useMemo, useState } from "react";

/**
 * Generic multi-select state manager for lists that support bulk actions
 * (e.g. "select checkbox -> show bulk delete button").
 *
 * - Uses a Set for O(1) membership checks so large lists stay smooth.
 * - Selection is automatically intersected with `visibleIds` so stale
 *   selections (items hidden by a filter/search) never get silently acted
 *   upon, while still "remembering" the pick if the item becomes visible
 *   again (e.g. clearing a filter).
 */
export function useSelection(visibleIds: string[]) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const visibleIdSet = useMemo(() => new Set(visibleIds), [visibleIds]);

  const selectedIds = useMemo(
    () => visibleIds.filter((id) => selected.has(id)),
    [visibleIds, selected]
  );

  const isSelected = useCallback((id: string) => selected.has(id), [selected]);

  const toggle = useCallback((id: string, checked: boolean) => {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const selectAllVisible = useCallback(() => {
    setSelected((current) => {
      const next = new Set(current);
      visibleIds.forEach((id) => next.add(id));
      return next;
    });
  }, [visibleIds]);

  const clear = useCallback(() => setSelected(new Set()), []);

  const toggleAllVisible = useCallback(() => {
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
    if (allSelected) {
      setSelected((current) => {
        const next = new Set(current);
        visibleIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      selectAllVisible();
    }
  }, [visibleIds, selected, selectAllVisible]);

  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => visibleIdSet.has(id) && selected.has(id));

  return {
    selectedIds,
    count: selectedIds.length,
    isSelected,
    toggle,
    selectAllVisible,
    toggleAllVisible,
    clear,
    allVisibleSelected
  };
}
