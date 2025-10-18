"use client";

import type { ChangeEvent } from "react";

import Button from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TimerSettings } from "@/hooks/use-timer";

type DurationKey =
  | "focusMinutes"
  | "breakMinutes"
  | "longBreakMinutes"
  | "longBreakInterval";

interface TimerSettingsPanelProps {
  settings: TimerSettings;
  onDurationChange: (
    key: DurationKey
  ) => (event: ChangeEvent<HTMLInputElement>) => void;
  onToggleSound: () => void;
  onToggleLongBreak: () => void;
  onToggleNotifications: () => void;
  onRestoreDefaults: () => void;
  notificationSupported: boolean;
  notificationStatus: string | null;
}

export function TimerSettingsPanel({
  settings,
  onDurationChange,
  onToggleSound,
  onToggleLongBreak,
  onToggleNotifications,
  onRestoreDefaults,
  notificationSupported,
  notificationStatus,
}: TimerSettingsPanelProps) {
  return (
    <Card className="p-6 sm:p-8">
      <CardHeader>
        <CardTitle>Session Preferences</CardTitle>
        <CardDescription>
          Customize durations and behavior. Changes are saved automatically to your browser.
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
              value={settings.focusMinutes}
              onChange={onDurationChange("focusMinutes")}
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
              value={settings.breakMinutes}
              onChange={onDurationChange("breakMinutes")}
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
              value={settings.longBreakMinutes}
              onChange={onDurationChange("longBreakMinutes")}
              aria-label="Set long break duration in minutes"
              disabled={!settings.enableLongBreak}
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
              value={settings.longBreakInterval}
              onChange={onDurationChange("longBreakInterval")}
              aria-label="Set number of focus sessions before a long break"
              disabled={!settings.enableLongBreak}
              className="w-full rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-base font-semibold text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50 dark:focus:border-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
              Focus sessions before switching to a long break.
            </span>
          </label>

          <div className="flex flex-col gap-4 rounded-xl border border-slate-200/80 p-4 dark:border-slate-700/70">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Toggles</span>
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
                variant={settings.soundEnabled ? "secondary" : "outline"}
                size="sm"
                onClick={onToggleSound}
                aria-pressed={settings.soundEnabled}
                aria-label="Toggle sound notifications"
              >
                {settings.soundEnabled ? "On" : "Off"}
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
                variant={settings.enableLongBreak ? "secondary" : "outline"}
                size="sm"
                onClick={onToggleLongBreak}
                aria-pressed={settings.enableLongBreak}
                aria-label="Toggle long breaks"
              >
                {settings.enableLongBreak ? "On" : "Off"}
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
                variant={settings.notificationsEnabled ? "secondary" : "outline"}
                size="sm"
                onClick={onToggleNotifications}
                aria-pressed={settings.notificationsEnabled}
                aria-label="Toggle browser notifications"
                disabled={!notificationSupported}
              >
                {settings.notificationsEnabled ? "On" : "Off"}
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
          <span>Timer persists locally so your preferences stay put on refresh.</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRestoreDefaults}
            aria-label="Restore default Pomodoro settings"
          >
            Restore defaults
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
