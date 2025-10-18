import type { TimerMode } from "@/hooks/use-timer";

export const MODE_LABELS: Record<TimerMode, string> = {
  focus: "Focus",
  break: "Short Break",
  "long-break": "Long Break",
};

export const MODE_MESSAGES: Record<TimerMode, string> = {
  focus: "Back to focus mode. Let's get productive!",
  break: "Great job! Take a breather and recharge.",
  "long-break": "Long break unlocked. Enjoy an extended rest.",
};
