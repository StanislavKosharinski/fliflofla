import { useEffect, useCallback } from "react";

/**
 * Custom hook for handling keyboard shortcuts
 * Supports sequence-based shortcuts like GitHub (g + n, g + s)
 */
export function useKeyboardShortcut(
  keys: string[],
  callback: () => void,
  enabled: boolean = true
) {
  const handleKeyDown = useCallback(
    (keySequence: string[]) => (event: KeyboardEvent) => {
      if (!enabled) return;

      const targetSequence = keys.map((k) => k.toLowerCase());
      const timeout = 3000;
      const processKey = (key: string) => {
        keySequence.push(key.toLowerCase());

        if (keySequence.length > targetSequence.length) {
          console.log(
            "keySequence.length > targetSequence.length",
            keySequence.length,
            targetSequence.length
          );
          keySequence = keySequence.slice(-targetSequence.length);
        }

        if (keySequence.join("") === targetSequence.join("")) {
          console.log(
            'keySequence.join("") === targetSequence.join("")',
            keySequence.join(""),
            targetSequence.join("")
          );
          event.preventDefault();
          callback();
          keySequence = [];
        }

        setTimeout(() => {
          console.log("setTimeout", keySequence);
          keySequence = [];
        }, timeout);
      };

      processKey(event.key);
    },
    [keys, callback, enabled]
  );

  useEffect(() => {
    if (!enabled) return;
    const keySequence: string[] = [];

    window.addEventListener("keydown", handleKeyDown(keySequence));
    return () =>
      window.removeEventListener("keydown", handleKeyDown(keySequence));
  }, [handleKeyDown, enabled]);
}
