"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type TimerMode = "focus" | "break" | "long-break";

export interface TimerSettings {
  focusMinutes: number;
  breakMinutes: number;
  longBreakMinutes: number;
  enableLongBreak: boolean;
  longBreakInterval: number;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
}

export interface SessionEvent {
  mode: TimerMode;
  startedAt: number;
  endedAt: number;
  scheduledDuration: number;
  elapsedSeconds: number;
  interrupted: boolean;
}

interface UseTimerReturn {
  mode: TimerMode;
  isRunning: boolean;
  timeLeft: number;
  totalDuration: number;
  settings: TimerSettings;
  completedFocusSessions: number;
  hydrated: boolean;
  start: () => void;
  pause: () => void;
  reset: () => void;
  skip: () => void;
  toggleRunning: () => void;
  updateSettings: (partial: Partial<TimerSettings>) => void;
  sessionEvent: SessionEvent | null;
}

const STORAGE_KEY = "pomodoro-settings";

const DEFAULT_SETTINGS: TimerSettings = {
  focusMinutes: 25,
  breakMinutes: 5,
  longBreakMinutes: 15,
  enableLongBreak: true,
  longBreakInterval: 4,
  soundEnabled: true,
  notificationsEnabled: false,
};

const MINUTES_FALLBACK = 1;

function sanitizeNumber(value: unknown, fallback: number): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}

function sanitizeSettings(settings: Partial<TimerSettings>): TimerSettings {
  return {
    focusMinutes: sanitizeNumber(settings.focusMinutes, DEFAULT_SETTINGS.focusMinutes),
    breakMinutes: sanitizeNumber(settings.breakMinutes, DEFAULT_SETTINGS.breakMinutes),
    longBreakMinutes: sanitizeNumber(
      settings.longBreakMinutes,
      DEFAULT_SETTINGS.longBreakMinutes
    ),
    enableLongBreak:
      typeof settings.enableLongBreak === "boolean"
        ? settings.enableLongBreak
        : DEFAULT_SETTINGS.enableLongBreak,
    longBreakInterval: Math.max(
      1,
      Math.round(
        Number.isFinite(settings.longBreakInterval)
          ? Number(settings.longBreakInterval)
          : DEFAULT_SETTINGS.longBreakInterval
      )
    ),
    soundEnabled:
      typeof settings.soundEnabled === "boolean"
        ? settings.soundEnabled
        : DEFAULT_SETTINGS.soundEnabled,
    notificationsEnabled:
      typeof settings.notificationsEnabled === "boolean"
        ? settings.notificationsEnabled
        : DEFAULT_SETTINGS.notificationsEnabled,
  };
}

function clampMinutes(value: number): number {
  return Math.max(MINUTES_FALLBACK, Math.round(value));
}

export function useTimer(): UseTimerReturn {
  const [settings, setSettings] = useState<TimerSettings>(DEFAULT_SETTINGS);
  const [mode, setMode] = useState<TimerMode>("focus");
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_SETTINGS.focusMinutes * 60);
  const [hydrated, setHydrated] = useState(false);
  const [completedFocusSessions, setCompletedFocusSessions] = useState(0);
  const [sessionEvent, setSessionEvent] = useState<SessionEvent | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const focusCounterRef = useRef(0);
  const sessionStartRef = useRef<number>(Date.now());
  const sessionDurationRef = useRef<number>(DEFAULT_SETTINGS.focusMinutes * 60);
  const timeLeftRef = useRef<number>(timeLeft);

  const getDurationForMode = useCallback(
    (targetMode: TimerMode): number => {
      switch (targetMode) {
        case "focus":
          return clampMinutes(settings.focusMinutes) * 60;
        case "break":
          return clampMinutes(settings.breakMinutes) * 60;
        case "long-break":
          return clampMinutes(settings.longBreakMinutes) * 60;
        default:
          return clampMinutes(DEFAULT_SETTINGS.focusMinutes) * 60;
      }
    },
    [settings.breakMinutes, settings.focusMinutes, settings.longBreakMinutes]
  );

  useEffect(() => {
    sessionDurationRef.current = getDurationForMode(mode);
    if (!isRunning) {
      sessionStartRef.current = Date.now();
    }
  }, [getDurationForMode, mode, isRunning]);

  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const loadSettings = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as Partial<TimerSettings>;
      const sanitized = sanitizeSettings(parsed);
      setSettings(sanitized);
      setTimeLeft(clampMinutes(sanitized.focusMinutes) * 60);
    } catch (error) {
      console.warn("Failed to load Pomodoro settings, using defaults.", error);
    }
  }, []);

  useEffect(() => {
    loadSettings();
    setHydrated(true);
  }, [loadSettings]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.warn("Failed to persist Pomodoro settings.", error);
    }
  }, [settings, hydrated]);

  const transitionMode = useCallback(() => {
    setMode((previousMode) => {
      const scheduledDuration = sessionDurationRef.current;
      const elapsedSeconds = Math.min(
        scheduledDuration,
        Math.max(0, scheduledDuration - timeLeftRef.current)
      );
      const endedAt = Date.now();
      const startedAt = sessionStartRef.current;

      if (previousMode) {
        setSessionEvent({
          mode: previousMode,
          startedAt,
          endedAt,
          scheduledDuration,
          elapsedSeconds,
          interrupted: elapsedSeconds < scheduledDuration,
        });
      }

      let nextMode: TimerMode = "focus";

      if (previousMode === "focus") {
        const newCount = focusCounterRef.current + 1;
        focusCounterRef.current = newCount;
        setCompletedFocusSessions(newCount);

        const shouldUseLongBreak =
          settings.enableLongBreak && newCount % clampMinutes(settings.longBreakInterval) === 0;
        nextMode = shouldUseLongBreak ? "long-break" : "break";
      } else {
        nextMode = "focus";
      }

      setTimeLeft(getDurationForMode(nextMode));
      sessionStartRef.current = Date.now();
      sessionDurationRef.current = getDurationForMode(nextMode);
      return nextMode;
    });
  }, [
    getDurationForMode,
    settings.enableLongBreak,
    settings.longBreakInterval,
  ]);

  useEffect(() => {
    if (!isRunning) {
      clearTimer();
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft((previous) => (previous > 0 ? previous - 1 : 0));
    }, 1000);

    return clearTimer;
  }, [isRunning, clearTimer]);

  useEffect(() => {
    if (!isRunning || timeLeft > 0) {
      return;
    }
    transitionMode();
  }, [isRunning, timeLeft, transitionMode]);

  useEffect(() => {
    if (isRunning) {
      return;
    }
    setTimeLeft(getDurationForMode(mode));
  }, [settings.focusMinutes, settings.breakMinutes, settings.longBreakMinutes, mode, isRunning, getDurationForMode]);

  useEffect(() => {
    if (mode === "long-break" && !settings.enableLongBreak) {
      setMode("break");
      setTimeLeft(getDurationForMode("break"));
    }
  }, [mode, settings.enableLongBreak, getDurationForMode]);

  const start = useCallback(() => {
    setIsRunning(true);
  }, []);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const reset = useCallback(() => {
    pause();
    setMode("focus");
    focusCounterRef.current = 0;
    setCompletedFocusSessions(0);
    setTimeLeft(getDurationForMode("focus"));
    sessionStartRef.current = Date.now();
    sessionDurationRef.current = getDurationForMode("focus");
    setSessionEvent(null);
  }, [getDurationForMode, pause]);

  const skip = useCallback(() => {
    transitionMode();
  }, [transitionMode]);

  const toggleRunning = useCallback(() => {
    setIsRunning((previous) => !previous);
  }, []);

  const updateSettings = useCallback(
    (partial: Partial<TimerSettings>) => {
      setSettings((previous) => ({
        ...previous,
        ...sanitizeSettings({
          ...previous,
          ...partial,
        }),
      }));
    },
    []
  );

  const totalDuration = useMemo(() => getDurationForMode(mode), [getDurationForMode, mode]);

  return {
    mode,
    isRunning,
    timeLeft,
    totalDuration,
    settings,
    completedFocusSessions,
    hydrated,
    start,
    pause,
    reset,
    skip,
    toggleRunning,
    updateSettings,
    sessionEvent,
  };
}
