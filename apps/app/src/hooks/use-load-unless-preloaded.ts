"use client";

import { useEffect, useRef } from "react";

/**
 * Runs `load` whenever `filters` change, except for the filters the server already loaded the page with.
 *
 * Pages preload their first view on the server and pass it in as initial state; without this they would
 * fetch the same data again from the browser right after rendering it. Changing a filter (or remounting in
 * dev Strict Mode) still behaves as before: the first new set of filters loads, an unchanged set does not.
 */
export function useLoadUnlessPreloaded(load: () => unknown, filters: readonly unknown[], preloaded: boolean) {
  const key = JSON.stringify(filters);
  const loadedFor = useRef<string | null>(preloaded ? key : null);

  useEffect(() => {
    if (loadedFor.current === key) return;
    loadedFor.current = key;
    void load();
  }, [key, load]);
}
