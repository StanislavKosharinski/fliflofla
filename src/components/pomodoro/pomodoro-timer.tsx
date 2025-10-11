"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import Button from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useTimer } from "@/hooks/use-timer";

import type { TimerMode, TimerSettings } from "@/hooks/use-timer";

const MODE_LABELS: Record<TimerMode, string> = {
  focus: "Focus",
  break: "Short Break",
  "long-break": "Long Break",
};

const MODE_MESSAGES: Record<TimerMode, string> = {
  focus: "Back to focus time. Let's get productive!",
  break: "Great job! Take a short break and recharge.",
  "long-break": "Long break unlocked. Enjoy a longer rest.",
};

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${seconds}`;
}

function playChime() {
  if (typeof window === "undefined") return;
  const AudioContextClass =
    window.AudioContext ||
    (
      window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }
    ).webkitAudioContext;
  if (!AudioContextClass) return;

  const audioCtx = new AudioContextClass();
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  if (audioCtx.state === "suspended") {
    void audioCtx.resume().catch(() => undefined);
  }

  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
  const attackStart = audioCtx.currentTime;
  gainNode.gain.setValueAtTime(0, attackStart);
  gainNode.gain.linearRampToValueAtTime(0.2, attackStart + 0.05);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, attackStart + 0.7);

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  const startTime = audioCtx.currentTime + 0.05;

  oscillator.start(startTime);
  oscillator.stop(startTime + 0.6);
  oscillator.addEventListener("ended", () => {
    audioCtx.close().catch(() => {
      // AudioContext might already be closed; ignore to keep UX smooth.
    });
  });
}

export function PomodoroTimer() {
  const {
    mode,
    isRunning,
    timeLeft,
    totalDuration,
    settings,
    hydrated,
    completedFocusSessions,
    start,
    pause,
    reset,
    skip,
    updateSettings,
  } = useTimer();

  const [localSettings, setLocalSettings] = useState<TimerSettings>(settings);
  const [hasInteracted, setHasInteracted] = useState(false);
  const previousModeRef = useRef(mode);
  const notificationRef = useRef<Notification | null>(null);
  const notificationFeedbackTimeout = useRef<number | null>(null);
  const [notificationStatus, setNotificationStatus] = useState<string | null>(
    null
  );
  const [notificationSupported, setNotificationSupported] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationSupported(true);
    }

    return () => {
      notificationRef.current?.close?.();
      if (notificationFeedbackTimeout.current) {
        window.clearTimeout(notificationFeedbackTimeout.current);
        notificationFeedbackTimeout.current = null;
      }
    };
  }, []);

  const setNotificationFeedback = useCallback((message: string | null) => {
    if (notificationFeedbackTimeout.current) {
      window.clearTimeout(notificationFeedbackTimeout.current);
      notificationFeedbackTimeout.current = null;
    }
    setNotificationStatus(message);
    if (message) {
      notificationFeedbackTimeout.current = window.setTimeout(() => {
        setNotificationStatus(null);
        notificationFeedbackTimeout.current = null;
      }, 4000);
    }
  }, []);

  const triggerNotification = useCallback(
    (targetMode: TimerMode) => {
      if (!settings.notificationsEnabled) return;
      if (typeof window === "undefined" || !("Notification" in window)) return;
      if (Notification.permission !== "granted") return;
      if (document.visibilityState === "visible") return;

      const title = `Pomodoro • ${MODE_LABELS[targetMode] ?? "Session"}`;
      const body = MODE_MESSAGES[targetMode] ?? "Session update";

      try {
        notificationRef.current?.close?.();
        notificationRef.current = new Notification(title, {
          body,
          tag: "pomodoro-timer",
        });
      } catch (error) {
        console.warn("Unable to show notification.", error);
      }
    },
    [settings.notificationsEnabled]
  );

  useEffect(() => {
    if (!hydrated) return;

    const modeChanged = previousModeRef.current !== mode;

    if (modeChanged) {
      if (settings.soundEnabled && hasInteracted) {
        playChime();
      }
      triggerNotification(mode);
    }

    previousModeRef.current = mode;
  }, [
    mode,
    hydrated,
    settings.soundEnabled,
    hasInteracted,
    triggerNotification,
  ]);

  const formattedTime = useMemo(() => formatTime(timeLeft), [timeLeft]);
  const progressValue = useMemo(() => {
    if (totalDuration === 0) return 0;
    const elapsed = totalDuration - timeLeft;
    return Math.round((elapsed / totalDuration) * 100);
  }, [timeLeft, totalDuration]);

  const handleNumberChange =
    (key: keyof TimerSettings) => (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = Number(event.target.value);
      const sanitized = Number.isFinite(nextValue) ? Math.max(1, nextValue) : 1;
      const nextSettings = {
        ...localSettings,
        [key]: sanitized,
      };
      setLocalSettings(nextSettings);
      updateSettings({ [key]: sanitized });
    };

  useEffect(() => {
    if (isRunning) {
      setHasInteracted(true);
    }
  }, [isRunning]);

  const toggleSound = () => {
    const nextValue = !localSettings.soundEnabled;
    setLocalSettings((previous) => ({ ...previous, soundEnabled: nextValue }));
    updateSettings({ soundEnabled: nextValue });
  };

  const toggleNotifications = async () => {
    if (!notificationSupported) {
      setNotificationFeedback(
        "Notifications are not supported in this browser."
      );
      return;
    }

    if (localSettings.notificationsEnabled) {
      setLocalSettings((previous) => ({
        ...previous,
        notificationsEnabled: false,
      }));
      updateSettings({ notificationsEnabled: false });
      setNotificationFeedback("Notifications disabled.");
      return;
    }

    const permission = Notification.permission;

    if (permission === "granted") {
      setLocalSettings((previous) => ({
        ...previous,
        notificationsEnabled: true,
      }));
      updateSettings({ notificationsEnabled: true });
      setNotificationFeedback("Notifications enabled.");
      return;
    }

    if (permission === "denied") {
      setNotificationFeedback(
        "Notifications are blocked. Enable them in your browser settings."
      );
      return;
    }

    try {
      const result = await Notification.requestPermission();
      if (result === "granted") {
        setLocalSettings((previous) => ({
          ...previous,
          notificationsEnabled: true,
        }));
        updateSettings({ notificationsEnabled: true });
        setNotificationFeedback("Notifications enabled.");
      } else {
        setNotificationFeedback(
          "Notifications stay off until permission is granted."
        );
      }
    } catch (error) {
      console.warn("Notification permission request failed.", error);
      setNotificationFeedback("Unable to update notification permission.");
    }
  };

  const toggleLongBreak = () => {
    const nextValue = !localSettings.enableLongBreak;
    setLocalSettings((previous) => ({
      ...previous,
      enableLongBreak: nextValue,
    }));
    updateSettings({ enableLongBreak: nextValue });
  };

  const startOrPause = () => {
    if (isRunning) {
      pause();
    } else {
      start();
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6 md:py-16">
      <Card className="bg-white/[0.92] p-8 shadow-2xl dark:bg-slate-900/[0.9] sm:p-10">
        <CardHeader className="flex flex-col gap-3 text-center sm:text-left">
          <span
            aria-live="polite"
            className="inline-flex w-fit items-center justify-center self-center rounded-full border border-indigo-400/60 px-3 py-1 text-xs font-medium uppercase tracking-wide text-indigo-600 dark:border-indigo-500/60 dark:text-indigo-300 sm:self-start"
          >
            {MODE_LABELS[mode] ?? "Focus"}
          </span>
          <CardTitle>Pomodoro Timer</CardTitle>
          <CardDescription>
            Stay on top of focused work sessions and breaks without losing your
            rhythm.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="text-6xl font-semibold tabular-nums text-slate-900 dark:text-slate-50 sm:text-7xl">
              <span aria-live="polite">{formattedTime}</span>
            </div>
            <div className="flex flex-col items-center gap-1 text-sm text-slate-500 dark:text-slate-300 sm:items-end">
              <span>
                Completed cycles:{" "}
                <strong className="font-semibold text-slate-900 dark:text-white">
                  {completedFocusSessions}
                </strong>
              </span>
              <span>
                Session length:{" "}
                <strong className="font-semibold text-slate-900 dark:text-white">
                  {Math.round(totalDuration / 60)} min
                </strong>
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Progress value={progressValue} aria-label="Pomodoro progress" />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {progressValue}% complete
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(140px,1fr))]">
            <Button
              onClick={startOrPause}
              aria-label={isRunning ? "Pause timer" : "Start timer"}
            >
              {isRunning ? "Pause" : "Start"}
            </Button>
            <Button
              variant="secondary"
              onClick={reset}
              aria-label="Reset timer"
            >
              Reset
            </Button>
            <Button
              variant="outline"
              onClick={skip}
              aria-label="Skip to next interval"
            >
              Skip
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="p-6 sm:p-8">
        <CardHeader>
          <CardTitle>Session Preferences</CardTitle>
          <CardDescription>
            Customize durations and behavior. Changes are saved automatically to
            your browser.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-600 dark:text-slate-200">
              Focus (minutes)
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={localSettings.focusMinutes}
                onChange={handleNumberChange("focusMinutes")}
                aria-label="Set focus duration in minutes"
                className="w-full rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-base font-semibold text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50 dark:focus:border-indigo-400"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-600 dark:text-slate-200">
              Short break (minutes)
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={localSettings.breakMinutes}
                onChange={handleNumberChange("breakMinutes")}
                aria-label="Set short break duration in minutes"
                className="w-full rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-base font-semibold text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50 dark:focus:border-indigo-400"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-600 dark:text-slate-200">
              Long break (minutes)
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={localSettings.longBreakMinutes}
                onChange={handleNumberChange("longBreakMinutes")}
                aria-label="Set long break duration in minutes"
                disabled={!localSettings.enableLongBreak}
                className="w-full rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-base font-semibold text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50 dark:focus:border-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-600 dark:text-slate-200">
              Long break every
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={localSettings.longBreakInterval}
                onChange={handleNumberChange("longBreakInterval")}
                aria-label="Set number of focus sessions before a long break"
                disabled={!localSettings.enableLongBreak}
                className="w-full rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-base font-semibold text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50 dark:focus:border-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
              />
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                Focus sessions before switching to a long break.
              </span>
            </label>

            <div className="flex flex-col gap-4 rounded-xl border border-slate-200/80 p-4 dark:border-slate-700/70">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Toggles
              </span>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Sound alerts
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Play a short chime when the session switches.
                  </p>
                </div>
                <Button
                  variant={localSettings.soundEnabled ? "secondary" : "outline"}
                  size="sm"
                  onClick={toggleSound}
                  aria-pressed={localSettings.soundEnabled}
                  aria-label="Toggle sound notifications"
                >
                  {localSettings.soundEnabled ? "On" : "Off"}
                </Button>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Long breaks
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Take a longer rest every few focus sessions.
                  </p>
                </div>
                <Button
                  variant={
                    localSettings.enableLongBreak ? "secondary" : "outline"
                  }
                  size="sm"
                  onClick={toggleLongBreak}
                  aria-pressed={localSettings.enableLongBreak}
                  aria-label="Toggle long breaks"
                >
                  {localSettings.enableLongBreak ? "On" : "Off"}
                </Button>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Browser notifications
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Show a system notification when modes switch.
                  </p>
                </div>
                <p>{notificationSupported === true}</p>
                <Button
                  variant={
                    localSettings.notificationsEnabled ? "secondary" : "outline"
                  }
                  size="sm"
                  onClick={toggleNotifications}
                  aria-pressed={localSettings.notificationsEnabled}
                  aria-label="Toggle browser notifications"
                  disabled={!notificationSupported}
                >
                  {localSettings.notificationsEnabled ? "On" : "Off"}
                </Button>
              </div>
              {!notificationSupported && (
                <p className="rounded-md border border-amber-200/70 bg-amber-50/70 px-3 py-2 text-xs text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
                  Your browser does not support notifications or they are
                  unavailable in this context.
                </p>
              )}
              {notificationStatus && (
                <p className="rounded-md border border-indigo-200/60 bg-indigo-50/70 px-3 py-2 text-xs font-medium text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-200">
                  {notificationStatus}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>
              Timer persists locally so your preferences stay put on refresh.
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                reset();
                const defaults = {
                  focusMinutes: 25,
                  breakMinutes: 5,
                  longBreakMinutes: 15,
                  longBreakInterval: 4,
                  enableLongBreak: true,
                  soundEnabled: true,
                  notificationsEnabled: false,
                } satisfies Partial<TimerSettings>;
                setLocalSettings((previous) => ({ ...previous, ...defaults }));
                updateSettings(defaults);
              }}
              aria-label="Restore default Pomodoro settings"
            >
              Restore defaults
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
