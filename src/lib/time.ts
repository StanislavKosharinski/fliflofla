const TIME_OF_DAY_FORMAT = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

export function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${seconds}`;
}

export function formatDuration(seconds: number): string {
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

export function formatTimeOfDay(timestamp: number): string {
  return TIME_OF_DAY_FORMAT.format(timestamp);
}

export function isTimeApiAvailable(): boolean {
  return typeof window !== "undefined";
}

export { TIME_OF_DAY_FORMAT };
