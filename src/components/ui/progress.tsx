import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
}

export function Progress({ value, max = 100, className, ...props }: ProgressProps) {
  const clamped = Math.min(Math.max(value, 0), max);
  const percentage = (clamped / max) * 100;

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn(
        "relative h-3 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700/70",
        className
      )}
      {...props}
    >
      <span
        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
