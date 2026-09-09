"use client";

import { useEffect, useState } from "react";

/** Debounce a fast-changing value (e.g. search input). Default 500ms per spec. */
export function useDebounce<T>(value: T, delay = 500): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return debounced;
}
