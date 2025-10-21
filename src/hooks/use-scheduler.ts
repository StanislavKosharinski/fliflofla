"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useTimer } from "@/hooks/use-timer";

import type { SessionEvent } from "@/hooks/use-timer";

const SCHEDULE_STORAGE_KEY = "pomodoro-schedule";
const SELECTED_DAY_STORAGE_KEY = "pomodoro-selected-day";

interface TaskSessionRecord extends SessionEvent {
  id: string;
}

export interface TaskEntry {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  totalFocusSeconds: number;
  totalBreakSeconds: number;
  sessions: TaskSessionRecord[];
  trackedSeconds: number;
  timerStartedAt: number | null;
}

export interface DaySchedule {
  key: string;
  dateISO: string;
  createdAt: number;
  activeTaskId: string | null;
  tasks: TaskEntry[];
}

type ScheduleState = Record<string, DaySchedule>;

const computeElapsedSeconds = (timerStartedAt: number, now: number): number => {
  return Math.max(0, Math.floor((now - timerStartedAt) / 1000));
};

// Fold the in-flight timer into the persisted total before clearing it.
const stopTaskTimer = (task: TaskEntry, now: number): TaskEntry => {
  if (!task.timerStartedAt) {
    return task;
  }
  const elapsed = computeElapsedSeconds(task.timerStartedAt, now);
  return {
    ...task,
    trackedSeconds: task.trackedSeconds + elapsed,
    timerStartedAt: null,
    updatedAt: now,
  };
};

// Start (or refresh) the timer for the chosen task.
const startTaskTimer = (task: TaskEntry, now: number): TaskEntry => {
  if (task.timerStartedAt) {
    return {
      ...task,
      updatedAt: now,
    };
  }
  return {
    ...task,
    timerStartedAt: now,
    updatedAt: now,
  };
};

interface SchedulerControls {
  schedule: ScheduleState;
  selectedDayKey: string;
  selectedDay: DaySchedule | undefined;
  todayKey: string;
  setSelectedDay: (dayKey: string) => void;
  addTask: (title: string) => void;
  updateTaskTitle: (taskId: string, title: string) => void;
  deleteTask: (taskId: string) => void;
  deleteDay: (dayKey: string) => void;
  clearSchedule: () => void;
  setActiveTask: (taskId: string | null) => void;
  activeTask: TaskEntry | undefined;
  availableDays: DaySchedule[];
  scheduleHydrated: boolean;
}

const WEEKDAY_FORMAT = new Intl.DateTimeFormat(undefined, { weekday: "long" });
const DAY_KEY_REGEX = /(\d{2})\.(\d{2})\.(\d{4})$/;

const toDayKey = (date: Date): string => {
  const weekday = WEEKDAY_FORMAT.format(date);
  const formattedDate = formatDateDMY(date);
  return `${capitalize(weekday)} - ${formattedDate}`;
};

const toISODate = (date: Date): string => date.toISOString().split("T")[0];

const capitalize = (value: string): string =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

const formatDateDMY = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
};

const parseDateFromDayKey = (key: string): Date | null => {
  const match = key.match(DAY_KEY_REGEX);
  if (!match) return null;
  const [, day, month, year] = match;
  const iso = `${year}-${month}-${day}`;
  const candidate = new Date(`${iso}T00:00:00`);
  return Number.isNaN(candidate.getTime()) ? null : candidate;
};

const generateId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const createEmptyDay = (date: Date): DaySchedule => ({
  key: toDayKey(date),
  dateISO: toISODate(date),
  createdAt: Date.now(),
  activeTaskId: null,
  tasks: [],
});

const ensureDayExists = (schedule: ScheduleState, date: Date): ScheduleState => {
  const key = toDayKey(date);
  if (schedule[key]) return schedule;
  return {
    ...schedule,
    [key]: createEmptyDay(date),
  };
};

const safeParseSchedule = (value: string | null): ScheduleState => {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as ScheduleState;
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  } catch (error) {
    console.warn("Failed to parse stored Pomodoro schedule.", error);
  }
  return {};
};

const augmentDay = (day: DaySchedule): DaySchedule => ({
  activeTaskId: day.activeTaskId ?? null,
  createdAt: day.createdAt ?? Date.now(),
  dateISO: day.dateISO,
  key: day.key,
  tasks: (day.tasks ?? []).map((task) => ({
    ...task,
    sessions: task.sessions ?? [],
    totalFocusSeconds: task.totalFocusSeconds ?? task.sessions?.reduce(
      (acc, session) => (session.mode === "focus" ? acc + session.elapsedSeconds : acc),
      0
    ) ?? 0,
    totalBreakSeconds: task.totalBreakSeconds ?? task.sessions?.reduce(
      (acc, session) => (session.mode !== "focus" ? acc + session.elapsedSeconds : acc),
      0
    ) ?? 0,
    trackedSeconds: task.trackedSeconds ?? 0,
    timerStartedAt:
      typeof task.timerStartedAt === "number" && Number.isFinite(task.timerStartedAt)
        ? task.timerStartedAt
        : null,
    updatedAt: task.updatedAt ?? task.createdAt ?? Date.now(),
  })),
});

const sanitizeSchedule = (value: ScheduleState): ScheduleState => {
  return Object.fromEntries(
    Object.entries(value).map(([key, day]) => [key, augmentDay(day)])
  );
};

const sortDaysDesc = (days: DaySchedule[]): DaySchedule[] =>
  [...days].sort((a, b) => (a.dateISO > b.dateISO ? -1 : a.dateISO < b.dateISO ? 1 : 0));

export function useScheduler(): ReturnType<typeof useTimer> & SchedulerControls {
  const timer = useTimer();

  const [schedule, setSchedule] = useState<ScheduleState>({});
  const [scheduleHydrated, setScheduleHydrated] = useState(false);
  const [todayKey, setTodayKey] = useState(() => toDayKey(new Date()));
  const [selectedDayKey, setSelectedDayKey] = useState<string>(() => toDayKey(new Date()));

  const updateTodayKey = useCallback(() => {
    setTodayKey(toDayKey(new Date()));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedSchedule = safeParseSchedule(localStorage.getItem(SCHEDULE_STORAGE_KEY));
    const storedSelectedDay = localStorage.getItem(SELECTED_DAY_STORAGE_KEY);
    const sanitized = sanitizeSchedule(storedSchedule);

    setSchedule(ensureDayExists(sanitized, new Date()));
    if (storedSelectedDay && sanitized[storedSelectedDay]) {
      setSelectedDayKey(storedSelectedDay);
    }
    setScheduleHydrated(true);
  }, []);

  useEffect(() => {
    if (!scheduleHydrated || typeof window === "undefined") return;
    localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(schedule));
  }, [schedule, scheduleHydrated]);

  useEffect(() => {
    if (!scheduleHydrated || typeof window === "undefined") return;
    localStorage.setItem(SELECTED_DAY_STORAGE_KEY, selectedDayKey);
  }, [selectedDayKey, scheduleHydrated]);

  useEffect(() => {
    if (!scheduleHydrated) return;
    setSchedule((previous) => ensureDayExists(previous, new Date()));
  }, [scheduleHydrated, todayKey]);

  useEffect(() => {
    const interval = window.setInterval(updateTodayKey, 60_000);
    return () => {
      window.clearInterval(interval);
    };
  }, [updateTodayKey]);

  const selectedDay = schedule[selectedDayKey];

  const availableDays = useMemo(() => sortDaysDesc(Object.values(schedule)), [schedule]);

  const activeTask = useMemo(() => {
    if (!selectedDay?.activeTaskId) return undefined;
    return selectedDay.tasks.find((task) => task.id === selectedDay.activeTaskId);
  }, [selectedDay]);

const setSelectedDay = useCallback((dayKey: string) => {
    setSchedule((previous) => {
      if (previous[dayKey]) return previous;
      const parsedDate = parseDateFromDayKey(dayKey) ?? new Date();
      return {
        ...previous,
        [dayKey]: {
          key: dayKey,
          dateISO: toISODate(parsedDate),
          createdAt: Date.now(),
          activeTaskId: null,
          tasks: [],
        },
      };
    });
    setSelectedDayKey(dayKey);
  }, []);

  const mutateDay = useCallback(
    (dayKey: string, mutate: (day: DaySchedule) => DaySchedule): void => {
      setSchedule((previous) => {
        const parsedDate = parseDateFromDayKey(dayKey) ?? new Date();
        const fallback = createEmptyDay(parsedDate);
        const existing = previous[dayKey]
          ? previous[dayKey]
          : {
              ...fallback,
              key: dayKey,
              dateISO: toISODate(parsedDate),
            };
        const next = mutate(existing);
        return {
          ...previous,
          [dayKey]: next,
        };
      });
    },
    []
  );

  const addTask = useCallback(
    (title: string) => {
      if (!title.trim()) return;
      const dayKey = selectedDayKey;
      mutateDay(dayKey, (day) => {
        const id = generateId();
        const now = Date.now();
        const shouldActivate = day.activeTaskId === null;
        const task: TaskEntry = {
          id,
          title: title.trim(),
          createdAt: now,
          updatedAt: now,
          totalFocusSeconds: 0,
          totalBreakSeconds: 0,
          sessions: [],
          trackedSeconds: 0,
          timerStartedAt: shouldActivate ? now : null,
        };
        const tasks = [...day.tasks, task];
        return {
          ...day,
          tasks,
          activeTaskId: day.activeTaskId ?? id,
        };
      });
    },
    [mutateDay, selectedDayKey]
  );

  const updateTaskTitle = useCallback(
    (taskId: string, title: string) => {
      mutateDay(selectedDayKey, (day) => ({
        ...day,
        tasks: day.tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                title: title.trim() || task.title,
                updatedAt: Date.now(),
              }
            : task
        ),
      }));
    },
    [mutateDay, selectedDayKey]
  );

  const deleteTask = useCallback(
    (taskId: string) => {
      const now = Date.now();
      mutateDay(selectedDayKey, (day) => {
        const remaining = day.tasks.filter((task) => task.id !== taskId);
        const wasActive = day.activeTaskId === taskId;
        const nextActiveId = wasActive ? remaining[0]?.id ?? null : day.activeTaskId;
        const tasks = remaining.map((task) => {
          if (nextActiveId && task.id === nextActiveId) {
            return startTaskTimer(task, now);
          }
          if (task.timerStartedAt && (!nextActiveId || task.id !== nextActiveId)) {
            return stopTaskTimer(task, now);
          }
          return task;
        });
        return {
          ...day,
          tasks,
          activeTaskId: nextActiveId,
        };
      });
    },
    [mutateDay, selectedDayKey]
  );

  const deleteDay = useCallback(
    (dayKey: string) => {
      setSchedule((previous) => {
        const rest = { ...previous };
        delete rest[dayKey];
        const nextSchedule = Object.keys(rest).length ? rest : ensureDayExists({}, new Date());
        if (selectedDayKey === dayKey) {
          const nextDay = nextSchedule[todayKey]
            ? todayKey
            : sortDaysDesc(Object.values(nextSchedule))[0]?.key ?? toDayKey(new Date());
          setSelectedDayKey(nextDay);
        }
        return nextSchedule;
      });
    },
    [selectedDayKey, todayKey]
  );

  const clearSchedule = useCallback(() => {
    const today = new Date();
    setSchedule(ensureDayExists({}, today));
    setSelectedDayKey(toDayKey(today));
  }, []);

  const setActiveTask = useCallback(
    (taskId: string | null) => {
      const now = Date.now();
      mutateDay(selectedDayKey, (day) => {
        const tasks = day.tasks.map((task) => {
          if (taskId && task.id === taskId) {
            return startTaskTimer(task, now);
          }
          if (task.timerStartedAt) {
            return stopTaskTimer(task, now);
          }
          return task;
        });

        const nextActiveId =
          taskId && tasks.some((task) => task.id === taskId) ? taskId : null;

        return {
          ...day,
          activeTaskId: nextActiveId,
          tasks,
        };
      });
    },
    [mutateDay, selectedDayKey]
  );

  const logSession = useCallback(
    (event: SessionEvent) => {
      const eventDate = new Date(event.endedAt);
      const dayKey = toDayKey(eventDate);

      setSchedule((previous) => {
        const day = previous[dayKey] ?? createEmptyDay(eventDate);
        if (!day.activeTaskId) {
          return {
            ...previous,
            [dayKey]: day,
          };
        }
        const taskIndex = day.tasks.findIndex((task) => task.id === day.activeTaskId);
        if (taskIndex === -1) {
          return {
            ...previous,
            [dayKey]: day,
          };
        }

        const task = day.tasks[taskIndex];
        const sessionRecord: TaskSessionRecord = {
          id: generateId(),
          ...event,
        };

        const isFocus = event.mode === "focus";
        const updatedTask: TaskEntry = {
          ...task,
          updatedAt: event.endedAt,
          totalFocusSeconds: isFocus
            ? task.totalFocusSeconds + event.elapsedSeconds
            : task.totalFocusSeconds,
          totalBreakSeconds: !isFocus
            ? task.totalBreakSeconds + event.elapsedSeconds
            : task.totalBreakSeconds,
          sessions: [...task.sessions, sessionRecord],
        };

        const tasks = [...day.tasks];
        tasks.splice(taskIndex, 1, updatedTask);

        return {
          ...previous,
          [dayKey]: {
            ...day,
            tasks,
          },
        };
      });
    },
    []
  );

  useEffect(() => {
    if (!timer.sessionEvent) return;
    logSession(timer.sessionEvent);
  }, [logSession, timer.sessionEvent]);

  return {
    ...timer,
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
    activeTask,
    availableDays,
    scheduleHydrated,
  };
}
