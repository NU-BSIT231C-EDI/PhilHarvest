import { useEffect, useRef } from "react";

/**
 * Calls `fn` every `intervalMs` milliseconds while mounted.
 * Always uses the latest `fn` reference — safe to pass inline callbacks.
 */
export function usePolling(fn: () => void, intervalMs: number): void {
  const ref = useRef(fn);
  ref.current = fn;

  useEffect(() => {
    const id = setInterval(() => ref.current(), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}
