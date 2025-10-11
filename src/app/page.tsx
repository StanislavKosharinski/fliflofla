import { PomodoroTimer } from "@/components/pomodoro/pomodoro-timer";

export default function Home() {
  return (
    <main className="relative min-h-screen w-full overflow-hidden pb-16">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-slate-100 transition-colors dark:bg-slate-950" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(129,140,248,0.25),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(236,72,153,0.15),_transparent_60%)]" />
      <PomodoroTimer />
    </main>
  );
}
