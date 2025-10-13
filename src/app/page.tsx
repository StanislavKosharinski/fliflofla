import { PomodoroTimer } from "@/components/pomodoro/pomodoro-timer";

export default function Home() {
  return (
    <main className="relative min-h-screen w-full overflow-hidden pb-16">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-indigo-100 via-white to-pink-100 transition-colors dark:from-slate-900 dark:via-slate-950 dark:to-purple-950" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(120%_120%_at_20%_0%,rgba(56,189,248,0.35),transparent),radial-gradient(120%_120%_at_80%_20%,rgba(244,114,182,0.3),transparent),radial-gradient(100%_120%_at_50%_80%,rgba(167,139,250,0.3),transparent)]" />
      <PomodoroTimer />
    </main>
  );
}
