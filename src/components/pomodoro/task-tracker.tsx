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

import Button from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { DaySchedule, TaskEntry } from "@/hooks/use-scheduler";
import { cn } from "@/lib/utils";
import {
  formatDuration,
  formatDurationHMS,
  formatTimeOfDay,
  secondsToHoursMinutes,
  hoursMinutesToSeconds,
} from "@/lib/time";
import { MODE_LABELS } from "@/components/pomodoro/constants";

interface TaskTrackerProps {
  scheduleHydrated: boolean;
  selectedDayKey: string;
  selectedDay: DaySchedule | undefined;
  todayKey: string;
  availableDays: DaySchedule[];
  onSelectDay: (dayKey: string) => void;
  onAddTask: (title: string) => void;
  onUpdateTaskTitle: (taskId: string, title: string) => void;
  onUpdateTaskTrackedTime: (taskId: string, trackedSeconds: number) => void;
  onDeleteTask: (taskId: string) => void;
  onDeleteDay: (dayKey: string) => void;
  onClearSchedule: () => void;
  onSetActiveTask: (taskId: string | null) => void;
}

type CopyStatus = "success" | "error" | null;

export function TaskTracker({
  scheduleHydrated,
  selectedDayKey,
  selectedDay,
  todayKey,
  availableDays,
  onSelectDay,
  onAddTask,
  onUpdateTaskTitle,
  onUpdateTaskTrackedTime,
  onDeleteTask,
  onDeleteDay,
  onClearSchedule,
  onSetActiveTask,
}: TaskTrackerProps) {
  const [taskTitle, setTaskTitle] = useState("");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingTrackedHours, setEditingTrackedHours] = useState(0);
  const [editingTrackedMinutes, setEditingTrackedMinutes] = useState(0);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>(null);
  const [clipboardSupported, setClipboardSupported] = useState(false);
  const [dayToDelete, setDayToDelete] = useState<string | null>(null);
  const [showDeleteDayDialog, setShowDeleteDayDialog] = useState(false);
  const [showClearScheduleDialog, setShowClearScheduleDialog] = useState(false);

  const copyFeedbackTimeout = useRef<number | null>(null);

  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    setClipboardSupported(
      typeof navigator !== "undefined" &&
        Boolean(navigator.clipboard) &&
        typeof navigator.clipboard.writeText === "function"
    );
    return () => {
      if (copyFeedbackTimeout.current) {
        window.clearTimeout(copyFeedbackTimeout.current);
        copyFeedbackTimeout.current = null;
      }
    };
  }, []);

  const tasks = useMemo(() => selectedDay?.tasks ?? [], [selectedDay]);

  const hasRunningTask = useMemo(
    () => tasks.some((task) => task.timerStartedAt !== null),
    [tasks]
  );

  useEffect(() => {
    if (!hasRunningTask) {
      return;
    }
    setCurrentTime(Date.now());
    const interval = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => {
      window.clearInterval(interval);
    };
  }, [hasRunningTask]);

  const { trackedSeconds } = useMemo(() => {
    return tasks.reduce(
      (acc, task) => {
        const isTimerRunning = task.timerStartedAt !== null;
        const timerStartedAt = task.timerStartedAt ?? 0;
        const liveTrackedSeconds =
          task.trackedSeconds +
          (isTimerRunning
            ? Math.max(0, Math.floor((currentTime - timerStartedAt) / 1000))
            : 0);
        acc.trackedSeconds += liveTrackedSeconds;
        return acc;
      },
      { trackedSeconds: 0 }
    );
  }, [tasks, currentTime]);

  const isTodaySelected = selectedDayKey === todayKey;
  const dayLabel = selectedDay?.key ?? selectedDayKey;

  const showCopyFeedback = useCallback((status: Exclude<CopyStatus, null>) => {
    if (copyFeedbackTimeout.current) {
      window.clearTimeout(copyFeedbackTimeout.current);
    }
    setCopyStatus(status);
    copyFeedbackTimeout.current = window.setTimeout(() => {
      setCopyStatus(null);
      copyFeedbackTimeout.current = null;
    }, 2500);
  }, []);

  const handleTaskSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!taskTitle.trim()) return;
      onAddTask(taskTitle.trim());
      setTaskTitle("");
    },
    [onAddTask, taskTitle]
  );

  const beginEditingTask = useCallback((task: TaskEntry) => {
    setEditingTaskId(task.id);
    setEditingTitle(task.title);
    const { hours, minutes } = secondsToHoursMinutes(task.trackedSeconds);
    setEditingTrackedHours(hours);
    setEditingTrackedMinutes(minutes);
  }, []);

  const cancelEditingTask = useCallback(() => {
    setEditingTaskId(null);
    setEditingTitle("");
    setEditingTrackedHours(0);
    setEditingTrackedMinutes(0);
  }, []);

  const handleEditingSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!editingTaskId) return;
      if (!editingTitle.trim()) {
        cancelEditingTask();
        return;
      }

      // Find the task being edited to check if timer is running
      const taskBeingEdited = selectedDay?.tasks.find(
        (task) => task.id === editingTaskId
      );
      const isTimerRunning = taskBeingEdited?.timerStartedAt !== null;

      onUpdateTaskTitle(editingTaskId, editingTitle.trim());

      // Only update tracked time if timer is not running
      if (!isTimerRunning) {
        const trackedSeconds = hoursMinutesToSeconds(
          editingTrackedHours,
          editingTrackedMinutes
        );
        onUpdateTaskTrackedTime(editingTaskId, trackedSeconds);
      }

      cancelEditingTask();
    },
    [
      cancelEditingTask,
      editingTaskId,
      editingTitle,
      editingTrackedHours,
      editingTrackedMinutes,
      onUpdateTaskTitle,
      onUpdateTaskTrackedTime,
      selectedDay,
    ]
  );

  const handleCopyDaySummary = useCallback(() => {
    if (!clipboardSupported) {
      showCopyFeedback("error");
      return;
    }
    if (!selectedDay || selectedDay.tasks.length === 0) {
      showCopyFeedback("error");
      return;
    }

    const summaryText = buildDaySummaryText(selectedDay);
    navigator.clipboard
      .writeText(summaryText)
      .then(() => showCopyFeedback("success"))
      .catch(() => showCopyFeedback("error"));
  }, [clipboardSupported, selectedDay, showCopyFeedback]);

  const openDeleteDay = useCallback(() => {
    setDayToDelete(selectedDayKey);
    setShowDeleteDayDialog(true);
  }, [selectedDayKey]);

  const confirmDeleteDay = useCallback(() => {
    if (dayToDelete) {
      onDeleteDay(dayToDelete);
    }
    setShowDeleteDayDialog(false);
    setDayToDelete(null);
  }, [dayToDelete, onDeleteDay]);

  const confirmClearSchedule = useCallback(() => {
    onClearSchedule();
    setShowClearScheduleDialog(false);
  }, [onClearSchedule]);

  const handleTitleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setTaskTitle(event.target.value);
    },
    []
  );

  const handleEditingTitleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setEditingTitle(event.target.value);
    },
    []
  );

  const handleEditingTrackedHoursChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = Math.max(
        0,
        Math.min(23, parseInt(event.target.value) || 0)
      );
      setEditingTrackedHours(value);
    },
    []
  );

  const handleEditingTrackedMinutesChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = Math.max(
        0,
        Math.min(59, parseInt(event.target.value) || 0)
      );
      setEditingTrackedMinutes(value);
    },
    []
  );

  return (
    <>
      <Card className="p-6 sm:p-8">
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Task Tracker</CardTitle>
            <CardDescription>
              Attach the timer to a task, review history, and keep progress per
              day.
            </CardDescription>
          </div>
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              View day
              <select
                className="mt-1 w-full min-w-[200px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-400"
                value={selectedDayKey}
                onChange={(event) => onSelectDay(event.target.value)}
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
                onClick={() => onSelectDay(todayKey)}
                aria-label="Jump to today's schedule"
                className="self-end"
              >
                Jump to today
              </Button>
            )}

            <div className="flex flex-wrap items-center justify-end self-end gap-3 text-xs text-slate-500 dark:text-slate-400">
              {copyStatus === "success" && (
                <span className="rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-200">
                  Copied to clipboard
                </span>
              )}
              {copyStatus === "error" && (
                <span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-700 dark:bg-amber-400/20 dark:text-amber-200">
                  Unable to copy
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyDaySummary}
                aria-label={`Copy task list for ${dayLabel}`}
                disabled={
                  !clipboardSupported ||
                  !selectedDay ||
                  selectedDay.tasks.length === 0
                }
              >
                Copy task list
              </Button>
            </div>
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
                    Total time logged
                  </p>
                  <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                    {formatDurationHMS(trackedSeconds)}
                  </p>
                </div>
              </div>

              <form
                onSubmit={handleTaskSubmit}
                className="grid grid-cols-6 gap-3 rounded-xl border border-dashed border-slate-300/80 bg-white/50 p-4 dark:border-slate-700/70 dark:bg-slate-900/40 sm:flex-row sm:items-center"
              >
                <label htmlFor="task-title" className="sr-only">
                  Task title
                </label>
                <input
                  id="task-title"
                  value={taskTitle}
                  onChange={handleTitleChange}
                  placeholder="What are you working on?"
                  className="col-span-5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-400"
                />
                <Button
                  type="submit"
                  disabled={!taskTitle.trim()}
                  aria-label="Add task"
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
                    const isTimerRunning = task.timerStartedAt !== null;
                    const timerStartedAt = task.timerStartedAt ?? 0;
                    const trackedSeconds =
                      task.trackedSeconds +
                      (isTimerRunning
                        ? Math.max(
                            0,
                            Math.floor((currentTime - timerStartedAt) / 1000)
                          )
                        : 0);
                    return (
                      <div
                        key={task.id}
                        className={cn(
                          "rounded-2xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg",
                          isActive
                            ? "border-indigo-400 bg-gradient-to-r from-indigo-500/15 via-purple-500/15 to-pink-500/15 dark:border-indigo-500/50 dark:from-indigo-500/20 dark:via-purple-500/20 dark:to-pink-500/20"
                            : "border-slate-200 bg-white/90 hover:border-indigo-200 dark:border-slate-700 dark:bg-slate-900/70 dark:hover:border-indigo-500/40"
                        )}
                      >
                        <div className="grid grid-cols-12">
                          {editingTaskId === task.id ? (
                            <form
                              onSubmit={handleEditingSubmit}
                              className="col-span-8 space-y-3"
                            >
                              <div>
                                <label
                                  htmlFor={`edit-title-${task.id}`}
                                  className="sr-only"
                                >
                                  Edit task title
                                </label>
                                <input
                                  id={`edit-title-${task.id}`}
                                  value={editingTitle}
                                  onChange={handleEditingTitleChange}
                                  placeholder="Task title"
                                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-400"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label
                                    htmlFor={`edit-hours-${task.id}`}
                                    className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                                  >
                                    Hours
                                  </label>
                                  <input
                                    id={`edit-hours-${task.id}`}
                                    type="number"
                                    min="0"
                                    max="23"
                                    value={editingTrackedHours}
                                    onChange={handleEditingTrackedHoursChange}
                                    disabled={isTimerRunning}
                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
                                  />
                                </div>
                                <div>
                                  <label
                                    htmlFor={`edit-minutes-${task.id}`}
                                    className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                                  >
                                    Minutes
                                  </label>
                                  <input
                                    id={`edit-minutes-${task.id}`}
                                    type="number"
                                    min="0"
                                    max="59"
                                    value={editingTrackedMinutes}
                                    onChange={handleEditingTrackedMinutesChange}
                                    disabled={isTimerRunning}
                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
                                  />
                                </div>
                              </div>
                              {isTimerRunning && (
                                <p className="rounded-md border border-amber-200/70 bg-amber-50/70 px-3 py-2 text-xs text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
                                  Time editing is disabled while the timer is
                                  running. Stop the timer to edit tracked time.
                                </p>
                              )}
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
                            <div className="col-span-8 space-y-2">
                              <h3 className="wrap-anywhere text-base font-semibold text-slate-900 dark:text-slate-100">
                                {task.title}
                              </h3>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Created {formatTimeOfDay(task.createdAt)}
                              </p>
                            </div>
                          )}
                          <div className="col-span-4 flex items-start justify-end gap-2">
                            <Button
                              variant={isActive ? "secondary" : "outline"}
                              size="sm"
                              onClick={() =>
                                onSetActiveTask(isActive ? null : task.id)
                              }
                              aria-pressed={isActive}
                              aria-label={
                                isActive
                                  ? "Stop timer for this task"
                                  : "Start timer for this task"
                              }
                            >
                              {isActive ? "Stop timer" : "Start timer"}
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
                              onClick={() => onDeleteTask(task.id)}
                              aria-label={`Delete task ${task.title}`}
                            >
                              Delete
                            </Button>
                          </div>

                          <div className="col-span-12 flex items-start justify-end gap-2">
                            <strong className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                              {formatDurationHMS(trackedSeconds)}
                            </strong>
                          </div>
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
                                      {formatDuration(session.elapsedSeconds)} •{" "}
                                      {formatTimeOfDay(session.startedAt)} –{" "}
                                      {formatTimeOfDay(session.endedAt)}
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

      <ConfirmDialog
        open={showDeleteDayDialog}
        title="Delete day?"
        description={`This will remove all tasks and sessions for “${
          dayToDelete ?? ""
        }”. This action cannot be undone.`}
        confirmLabel="Delete day"
        onCancel={() => {
          setShowDeleteDayDialog(false);
          setDayToDelete(null);
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

function buildDaySummaryText(day: DaySchedule | undefined): string {
  if (!day) {
    return "No day selected.";
  }

  const orderedTasks = day.tasks
    .slice()
    .sort((a, b) => b.updatedAt - a.updatedAt);

  if (orderedTasks.length === 0) {
    return "No tasks recorded.";
  }

  const lines = orderedTasks.map(
    (task, index) => `${index + 1}. ${task.title}`
  );

  return lines.join("\n");
}
