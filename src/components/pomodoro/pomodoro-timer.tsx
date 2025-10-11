"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { createPortal } from "react-dom";

import Button from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useScheduler } from "@/hooks/use-scheduler";

import type { TaskEntry } from "@/hooks/use-scheduler";
import type { TimerMode, TimerSettings } from "@/hooks/use-timer";

const MODE_LABELS: Record<TimerMode, string> = {
  focus: "Focus",
  break: "Short Break",
  "long-break": "Long Break",
};

const MODE_MESSAGES: Record<TimerMode, string> = {
  focus: "Back to focus mode. Let's get productive!",
  break: "Great job! Take a breather and recharge.",
  "long-break": "Long break unlocked. Enjoy an extended rest.",
};

const TIME_OF_DAY_FORMAT = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${seconds}`;
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "0s";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const parts: string[] = [];
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (!hours && !minutes && secs === 0) {
    parts.push("0s");
  } else if (secs && (minutes < 50 || !hours)) {
    parts.push(`${secs}s`);
  }
  return parts.join(" ");
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

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmVariant?: "default" | "destructive";
}

function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
  confirmVariant = "destructive",
}: ConfirmDialogProps) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="alertdialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {title}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {description}
          </p>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            aria-label="Cancel confirmation"
          >
            Cancel
          </Button>
          <Button
            variant={
              confirmVariant === "destructive" ? "destructive" : "default"
            }
            onClick={onConfirm}
            aria-label={confirmLabel}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
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
    schedule,
    selectedDayKey,
    selectedDay,
    todayKey,
    setSelectedDay,
    addTask,
    updateTaskTitle,
    deleteTask,
    deleteDay,
    clearSchedule,
    setActiveTask,
    availableDays,
    scheduleHydrated,
  } = useScheduler();

  const [localSettings, setLocalSettings] = useState<TimerSettings>(settings);
  const [hasInteracted, setHasInteracted] = useState(false);
  const previousModeRef = useRef(mode);
  const notificationRef = useRef<Notification | null>(null);
  const notificationFeedbackTimeout = useRef<number | null>(null);
  const [notificationStatus, setNotificationStatus] = useState<string | null>(
    null
  );
  const [notificationSupported, setNotificationSupported] = useState(false);

  const [taskTitle, setTaskTitle] = useState("");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [deleteDayKey, setDeleteDayKey] = useState<string | null>(null);
  const [showDeleteDayDialog, setShowDeleteDayDialog] = useState(false);
  const [showClearScheduleDialog, setShowClearScheduleDialog] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  useEffect(() => {
    setNotificationSupported(
      typeof window !== "undefined" && "Notification" in window
    );
  }, []);

  useEffect(() => {
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
      if (!notificationSupported) return;
      if (
        typeof window === "undefined" ||
        Notification.permission !== "granted"
      )
        return;
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
    [notificationSupported, settings.notificationsEnabled]
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

  useEffect(() => {
    if (isRunning) {
      setHasInteracted(true);
    }
  }, [isRunning]);

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
        "Notifications are blocked. Enable them in browser settings."
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

  const handleTaskSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!taskTitle.trim()) return;
    addTask(taskTitle.trim());
    setTaskTitle("");
  };

  const beginEditingTask = (task: TaskEntry) => {
    setEditingTaskId(task.id);
    setEditingTitle(task.title);
  };

  const cancelEditingTask = () => {
    setEditingTaskId(null);
    setEditingTitle("");
  };

  const handleEditingSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingTaskId) return;
    if (!editingTitle.trim()) {
      cancelEditingTask();
      return;
    }
    updateTaskTitle(editingTaskId, editingTitle.trim());
    cancelEditingTask();
  };

  const tasks = selectedDay?.tasks ?? [];
  const dayFocusSeconds = tasks.reduce(
    (acc, task) => acc + task.totalFocusSeconds,
    0
  );
  const dayBreakSeconds = tasks.reduce(
    (acc, task) => acc + task.totalBreakSeconds,
    0
  );
  const daySessions = tasks.reduce(
    (acc, task) => acc + task.sessions.length,
    0
  );

  const todaysEntry = schedule[todayKey];
  const todaysActiveTask =
    todaysEntry?.activeTaskId &&
    todaysEntry.tasks.find((task) => task.id === todaysEntry.activeTaskId);

  const isTodaySelected = selectedDayKey === todayKey;
  const dayLabel = selectedDay?.key ?? selectedDayKey;

  const openDeleteDay = () => {
    setDeleteDayKey(selectedDayKey);
    setShowDeleteDayDialog(true);
  };

  const confirmDeleteDay = () => {
    if (deleteDayKey) {
      deleteDay(deleteDayKey);
    }
    setShowDeleteDayDialog(false);
    setDeleteDayKey(null);
  };

  const confirmClearSchedule = () => {
    clearSchedule();
    setShowClearScheduleDialog(false);
  };

  return (
    <>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6 md:py-16">
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
              Stay on top of focused work sessions and breaks without losing
              your rhythm.
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

            <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4 dark:border-slate-700/70 dark:bg-slate-900/50">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Today&apos;s active task
              </p>
              <p className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">
                {todaysActiveTask
                  ? todaysActiveTask.title
                  : "No active task selected yet"}
              </p>
              {todaysActiveTask && (
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    Focus logged:{" "}
                    <strong className="font-semibold text-slate-800 dark:text-slate-200">
                      {formatDuration(todaysActiveTask.totalFocusSeconds)}
                    </strong>
                  </span>
                  <span>
                    Breaks logged:{" "}
                    <strong className="font-semibold text-slate-800 dark:text-slate-200">
                      {formatDuration(todaysActiveTask.totalBreakSeconds)}
                    </strong>
                  </span>
                  <span>
                    Sessions:{" "}
                    <strong className="font-semibold text-slate-800 dark:text-slate-200">
                      {todaysActiveTask.sessions.length}
                    </strong>
                  </span>
                </div>
              )}
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
          <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Task Tracker</CardTitle>
              <CardDescription>
                Attach the timer to a task, review history, and keep progress
                per day.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                View day
                <select
                  className="mt-1 w-full min-w-[200px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-400"
                  value={selectedDayKey}
                  onChange={(event) => setSelectedDay(event.target.value)}
                >
                  {availableDays.map((day) => (
                    <option key={day.key} value={day.key}>
                      {day.key}
                    </option>
                  ))}
                </select>
              </label>
              {!isTodaySelected && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedDay(todayKey)}
                  aria-label="Jump to today's schedule"
                >
                  Jump to today
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {!scheduleHydrated ? (
              <p className="text-sm text-slate-500 dark:text-slate-300">
                Loading historical sessions…
              </p>
            ) : (
              <>
                <div className="grid gap-3 rounded-xl border border-slate-200/70 bg-slate-50/70 p-4 text-sm text-slate-600 dark:border-slate-700/70 dark:bg-slate-900/40 dark:text-slate-300 sm:grid-cols-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Day
                    </p>
                    <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                      {dayLabel}
                    </p>
                    {!isTodaySelected && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Read-only view; timer continues logging to today.
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Focus logged
                    </p>
                    <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                      {formatDuration(dayFocusSeconds)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Sessions
                    </p>
                    <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                      {daySessions} total ({formatDuration(dayBreakSeconds)}{" "}
                      break time)
                    </p>
                  </div>
                </div>

                <form
                  onSubmit={handleTaskSubmit}
                  className="flex flex-col gap-3 rounded-xl border border-dashed border-slate-300/80 bg-white/50 p-4 dark:border-slate-700/70 dark:bg-slate-900/40 sm:flex-row sm:items-center"
                >
                  <label htmlFor="task-title" className="sr-only">
                    Task title
                  </label>
                  <input
                    id="task-title"
                    value={taskTitle}
                    onChange={(event) => setTaskTitle(event.target.value)}
                    placeholder="What are you working on?"
                    className="w-5/6 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-400"
                  />
                  <Button
                    type="submit"
                    disabled={!taskTitle.trim()}
                    aria-label="Add task"
		    className="w-1/6"
                  >
                    Add task
                  </Button>
                </form>

                <div className="space-y-4">
                  {tasks.length === 0 ? (
                    <p className="rounded-xl border border-slate-200/70 bg-slate-50/70 px-4 py-6 text-sm text-slate-500 dark:border-slate-700/70 dark:bg-slate-900/40 dark:text-slate-300">
                      No tasks logged for this day yet. Add one above to start
                      tracking.
                    </p>
                  ) : (
                    tasks.map((task) => {
                      const isActive = selectedDay?.activeTaskId === task.id;
                      return (
                        <div
                          key={task.id}
                          className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm transition hover:border-indigo-200 dark:border-slate-700 dark:bg-slate-900/70 dark:hover:border-indigo-500/50"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            {editingTaskId === task.id ? (
                              <form
                                onSubmit={handleEditingSubmit}
                                className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3"
                              >
                                <label
                                  htmlFor={`edit-${task.id}`}
                                  className="sr-only"
                                >
                                  Edit task title
                                </label>
                                <input
                                  id={`edit-${task.id}`}
                                  value={editingTitle}
                                  onChange={(event) =>
                                    setEditingTitle(event.target.value)
                                  }
                                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-400"
                                />
                                <div className="flex gap-2">
                                  <Button type="submit" size="sm">
                                    Save
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={cancelEditingTask}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </form>
                            ) : (
                              <div>
                                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                                  {task.title}
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  Created{" "}
                                  {TIME_OF_DAY_FORMAT.format(task.createdAt)} •{" "}
                                  {task.sessions.length} sessions
                                </p>
                              </div>
                            )}
                            <div className="flex flex-wrap items-center gap-2">
                              <Button
                                variant={isActive ? "secondary" : "outline"}
                                size="sm"
                                onClick={() => setActiveTask(task.id)}
                                aria-pressed={isActive}
                                aria-label={
                                  isActive
                                    ? "Task already active"
                                    : "Attach timer to this task"
                                }
				className={`${isActive ? "bg-indigo-500 animate-pulse text-white" : ""}`}
                              >
                                {isActive ? "Active" : "Set active"}
                              </Button>
                              {editingTaskId !== task.id && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => beginEditingTask(task)}
                                >
                                  Edit
                                </Button>
                              )}
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deleteTask(task.id)}
                                aria-label={`Delete task ${task.title}`}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-2 text-xs text-slate-600 dark:text-slate-300 sm:grid-cols-3">
                            <span>
                              Focus time:{" "}
                              <strong className="font-semibold text-slate-900 dark:text-slate-100">
                                {formatDuration(task.totalFocusSeconds)}
                              </strong>
                            </span>
                            <span>
                              Break time:{" "}
                              <strong className="font-semibold text-slate-900 dark:text-slate-100">
                                {formatDuration(task.totalBreakSeconds)}
                              </strong>
                            </span>
                            <span>
                              Last update:{" "}
                              <strong className="font-semibold text-slate-900 dark:text-slate-100">
                                {TIME_OF_DAY_FORMAT.format(task.updatedAt)}
                              </strong>
                            </span>
                          </div>

                          {task.sessions.length > 0 && (
                            <details className="mt-4 rounded-xl border border-slate-200/70 bg-slate-50/70 p-4 text-xs text-slate-600 transition open:shadow-sm dark:border-slate-700/70 dark:bg-slate-900/40 dark:text-slate-300">
                              <summary className="cursor-pointer list-none text-sm font-semibold text-slate-800 transition hover:text-indigo-500 dark:text-slate-100 dark:hover:text-indigo-300">
                                Session history
                              </summary>
                              <ul className="mt-3 space-y-2">
                                {task.sessions
                                  .slice()
                                  .sort((a, b) => a.startedAt - b.startedAt)
                                  .map((session) => (
                                    <li
                                      key={session.id}
                                      className="flex flex-wrap items-center justify-between gap-2"
                                    >
                                      <span className="font-medium text-slate-800 dark:text-slate-100">
                                        {MODE_LABELS[session.mode] ??
                                          session.mode}
                                      </span>
                                      <span className="text-slate-500 dark:text-slate-400">
                                        {formatDuration(session.elapsedSeconds)}{" "}
                                        •{" "}
                                        {TIME_OF_DAY_FORMAT.format(
                                          session.startedAt
                                        )}{" "}
                                        –{" "}
                                        {TIME_OF_DAY_FORMAT.format(
                                          session.endedAt
                                        )}
                                      </span>
                                      {session.interrupted && (
                                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-400/20 dark:text-amber-200">
                                          Interrupted
                                        </span>
                                      )}
                                    </li>
                                  ))}
                              </ul>
                            </details>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openDeleteDay}
                    aria-label={`Delete schedule for ${dayLabel}`}
                  >
                    Delete this day
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowClearScheduleDialog(true)}
                    aria-label="Delete entire schedule"
                  >
                    Delete entire schedule
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="p-6 sm:p-8">
          <CardHeader>
            <CardTitle>Session Preferences</CardTitle>
            <CardDescription>
              Customize durations and behavior. Changes are saved automatically
              to your browser.
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
                    variant={
                      localSettings.soundEnabled ? "secondary" : "outline"
                    }
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
                  <Button
                    variant={
                      localSettings.notificationsEnabled
                        ? "secondary"
                        : "outline"
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
                    Notifications are unavailable in this environment.
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
                  setLocalSettings((previous) => ({
                    ...previous,
                    ...defaults,
                  }));
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

      <ConfirmDialog
        open={showDeleteDayDialog}
        title="Delete day?"
        description={`This will remove all tasks and sessions for “${
          deleteDayKey ?? ""
        }”. This action cannot be undone.`}
        confirmLabel="Delete day"
        onCancel={() => {
          setShowDeleteDayDialog(false);
          setDeleteDayKey(null);
        }}
        onConfirm={confirmDeleteDay}
      />

      <ConfirmDialog
        open={showClearScheduleDialog}
        title="Delete all history?"
        description="This removes every recorded task and session across all days. This action cannot be undone."
        confirmLabel="Delete schedule"
        onCancel={() => setShowClearScheduleDialog(false)}
        onConfirm={confirmClearSchedule}
      />
    </>
  );
}
