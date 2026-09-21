"use client";

import { useSyncExternalStore } from "react";

/** True when the user prefers reduced motion; used to disable chart animation. */
export function useReducedMotion() {
  return useSyncExternalStore(
    (callback) => {
      if (typeof window.matchMedia !== "function") return () => {};
      const query = window.matchMedia("(prefers-reduced-motion: reduce)");
      query.addEventListener("change", callback);
      return () => query.removeEventListener("change", callback);
    },
    () => typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}
