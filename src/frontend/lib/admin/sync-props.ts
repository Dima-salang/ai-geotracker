"use client";

import { useEffect } from "react";

/** Keep client list state in sync when the server re-renders after router.refresh(). */
export function useSyncProp<T>(value: T, setter: (v: T) => void) {
  useEffect(() => {
    setter(value);
  }, [value, setter]);
}
