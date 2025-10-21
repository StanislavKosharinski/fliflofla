"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import { MODE_LABELS, MODE_MESSAGES } from "@/components/pomodoro/constants";
import { TaskTracker } from "@/components/pomodoro/task-tracker";
import { TimerPanel } from "@/components/pomodoro/timer-panel";
import { TimerSettingsPanel } from "@/components/pomodoro/timer-settings-panel";
import { useNotificationPreferences } from "@/hooks/use-notification-preferences";
import { useScheduler } from "@/hooks/use-scheduler";
import type { TaskEntry } from "@/hooks/use-scheduler";
import type { TimerSettings } from "@/hooks/use-timer";
import { playChime } from "@/lib/chime";
import { formatTime } from "@/lib/time";

const DEFAULT_SETTINGS: Partial<TimerSettings> = {
  focusMinutes: 25,
  breakMinutes: 5,
  longBreakMinutes: 15,
  longBreakInterval: 4,
  enableLongBreak: true,
  soundEnabled: true,
  notificationsEnabled: false,
};

type DurationKey =
  | "focusMinutes"
  | "breakMinutes"
  | "longBreakMinutes"
  | "longBreakInterval";

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

  const [localSettings, setLocalSettings] = useState(settings);
  const [hasInteracted, setHasInteracted] = useState(false);
  const previousModeRef = useRef(mode);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const {
    supported: notificationSupported,
    statusMessage: notificationStatus,
    toggleNotifications,
    notify,
  } = useNotificationPreferences({
    enabled: localSettings.notificationsEnabled,
    onEnabledChange: (enabled) => {
      setLocalSettings((previous) => ({
        ...previous,
        notificationsEnabled: enabled,
      }));
      updateSettings({ notificationsEnabled: enabled });
    },
  });

  useEffect(() => {
    if (isRunning) {
      setHasInteracted(true);
    }
  }, [isRunning]);

  useEffect(() => {
    if (!hydrated) return;

    const modeChanged = previousModeRef.current !== mode;

    if (modeChanged) {
      if (localSettings.soundEnabled && hasInteracted) {
        playChime();
      }

      const label = MODE_LABELS[mode] ?? "Session";
      const body = MODE_MESSAGES[mode] ?? "Session update";

      notify({
        title: `Pomodoro • ${label}`,
        body,
        tag: "pomodoro-timer",
      });
    }

    previousModeRef.current = mode;
  }, [mode, hydrated, notify, localSettings.soundEnabled, hasInteracted]);

  const formattedTime = useMemo(() => formatTime(timeLeft), [timeLeft]);

  const progressValue = useMemo(() => {
    if (totalDuration === 0) return 0;
    const elapsed = totalDuration - timeLeft;
    return Math.round((elapsed / totalDuration) * 100);
  }, [timeLeft, totalDuration]);

  const handleDurationChange = useCallback(
    (key: DurationKey) => (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = Number(event.target.value);
      const sanitized = Number.isFinite(nextValue) ? Math.max(1, nextValue) : 1;
      setLocalSettings((previous) => ({
        ...previous,
        [key]: sanitized,
      }));
      updateSettings({ [key]: sanitized });
    },
    [updateSettings]
  );

  const toggleSound = useCallback(() => {
    setLocalSettings((previous) => {
      const nextValue = !previous.soundEnabled;
      updateSettings({ soundEnabled: nextValue });
      return { ...previous, soundEnabled: nextValue };
    });
  }, [updateSettings]);

  const toggleLongBreak = useCallback(() => {
    setLocalSettings((previous) => {
      const nextValue = !previous.enableLongBreak;
      updateSettings({ enableLongBreak: nextValue });
      return { ...previous, enableLongBreak: nextValue };
    });
  }, [updateSettings]);

  const startOrPause = useCallback(() => {
    if (isRunning) {
      pause();
    } else {
      start();
    }
  }, [isRunning, pause, start]);

  const restoreDefaults = useCallback(() => {
    reset();
    setLocalSettings((previous) => ({
      ...previous,
      ...DEFAULT_SETTINGS,
    }));
    updateSettings(DEFAULT_SETTINGS);
  }, [reset, updateSettings]);

  const handleToggleNotifications = useCallback(() => {
    void toggleNotifications();
  }, [toggleNotifications]);

  const todaysActiveTask: TaskEntry | undefined = useMemo(() => {
    const todaysEntry = schedule[todayKey];
    if (!todaysEntry?.activeTaskId) return undefined;
    return todaysEntry.tasks.find(
      (task) => task.id === todaysEntry.activeTaskId
    );
  }, [schedule, todayKey]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6 md:py-16">
      <TaskTracker
        scheduleHydrated={scheduleHydrated}
        selectedDayKey={selectedDayKey}
        selectedDay={selectedDay}
        todayKey={todayKey}
        availableDays={availableDays}
        onSelectDay={setSelectedDay}
        onAddTask={addTask}
        onUpdateTaskTitle={updateTaskTitle}
        onDeleteTask={deleteTask}
        onDeleteDay={deleteDay}
        onClearSchedule={clearSchedule}
        onSetActiveTask={setActiveTask}
      />

      <TimerPanel
        mode={mode}
        formattedTime={formattedTime}
        completedFocusSessions={completedFocusSessions}
        totalDuration={totalDuration}
        progressValue={progressValue}
        todaysActiveTask={todaysActiveTask}
        isRunning={isRunning}
        onStartOrPause={startOrPause}
        onReset={reset}
        onSkip={skip}
      />

      <TimerSettingsPanel
        settings={localSettings}
        onDurationChange={handleDurationChange}
        onToggleSound={toggleSound}
        onToggleLongBreak={toggleLongBreak}
        onToggleNotifications={handleToggleNotifications}
        onRestoreDefaults={restoreDefaults}
        notificationSupported={notificationSupported}
        notificationStatus={notificationStatus}
      />
    </div>
  );
}
