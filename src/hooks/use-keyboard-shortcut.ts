import { useEffect, useCallback, useMemo, useRef } from "react";

/**
 * Custom hook for handling keyboard shortcuts
 * Supports sequence-based shortcuts like GitHub (g + n, g + s)
 */
export function useKeyboardShortcut(
  keys: string[],
  callback: () => void,
  enabled: boolean = true
) {
  const targetSequence = useMemo(
    () => keys.map((key) => key.toLowerCase()),
    [keys]
  );

  const timeoutRef = useRef<number | null>(null);
  const sequenceRef = useRef<string[]>([]);

  const resetSequence = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    sequenceRef.current = [];
  }, []);

  const scheduleReset = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      sequenceRef.current = [];
      timeoutRef.current = null;
    }, 3000);
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled || targetSequence.length === 0) return;

      sequenceRef.current = [
        ...sequenceRef.current,
        event.key.toLowerCase(),
      ].slice(-targetSequence.length);

      if (sequenceRef.current.join("") === targetSequence.join("")) {
        event.preventDefault();
        callback();
        resetSequence();
        return;
      }

      scheduleReset();
    },
    [callback, enabled, scheduleReset, targetSequence, resetSequence]
  );

  useEffect(() => {
    if (!enabled || targetSequence.length === 0) {
      resetSequence();
      return;
    }

    const listener = (event: KeyboardEvent) => handleKeyDown(event);
    window.addEventListener("keydown", listener);

    return () => {
      window.removeEventListener("keydown", listener);
      resetSequence();
    };
  }, [enabled, handleKeyDown, resetSequence, targetSequence.length]);
}
