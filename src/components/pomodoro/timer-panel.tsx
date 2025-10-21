"use client";

import Button from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { TaskEntry } from "@/hooks/use-scheduler";
import type { TimerMode } from "@/hooks/use-timer";
import { cn } from "@/lib/utils";
import { MODE_LABELS } from "@/components/pomodoro/constants";
import { formatDuration } from "@/lib/time";

interface TimerPanelProps {
  mode: TimerMode;
  formattedTime: string;
  completedFocusSessions: number;
  totalDuration: number;
  progressValue: number;
  isRunning: boolean;
  onStartOrPause: () => void;
  onReset: () => void;
  onSkip: () => void;
}

export function TimerPanel({
  mode,
  formattedTime,
  completedFocusSessions,
  totalDuration,
  progressValue,
  isRunning,
  onStartOrPause,
  onReset,
  onSkip,
}: TimerPanelProps) {
  return (
    <Card className="bg-white/[0.92] p-8 shadow-2xl dark:bg-slate-900/[0.9] sm:p-10">
      <CardHeader className="space-y-4 text-center sm:text-left">
        <div className="flex flex-col gap-3">
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
        </div>
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
            onClick={onStartOrPause}
            aria-label={isRunning ? "Pause timer" : "Start timer"}
          >
            {isRunning ? "Pause" : "Start"}
          </Button>
          <Button
            variant="secondary"
            onClick={onReset}
            aria-label="Reset timer"
          >
            Reset
          </Button>
          <Button
            variant="outline"
            onClick={onSkip}
            aria-label="Skip to next interval"
          >
            Skip
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
