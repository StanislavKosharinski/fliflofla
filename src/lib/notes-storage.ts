import type {
  ListItem,
  NotesState,
  MemorySeedState,
} from "@/components/pomodoro/types";

const NOTES_STORAGE_KEY = "pomodoro-notes";
const MEMORY_SEED_STORAGE_KEY = "pomodoro-memory-seeds";

const DEFAULT_NOTES: NotesState = { items: [] };
const DEFAULT_MEMORY_SEEDS: MemorySeedState = { items: [] };

type ListState = { items: ListItem[] };
type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function toListItems(value: unknown): ListItem[] | null {
  if (!Array.isArray(value)) return null;

  const sanitized: ListItem[] = [];

  for (const item of value) {
    if (!isRecord(item)) return null;
    const { id, content, createdAt, updatedAt } = item;

    if (
      typeof id !== "string" ||
      typeof content !== "string" ||
      typeof createdAt !== "number" ||
      typeof updatedAt !== "number"
    ) {
      return null;
    }

    sanitized.push({ id, content, createdAt, updatedAt });
  }

  return sanitized;
}

function parseListState<T extends ListState>(value: unknown, fallback: T): T {
  if (!isRecord(value)) return fallback;
  const items = toListItems(value.items);
  return items ? ({ items } as T) : fallback;
}

export function loadNotes(): NotesState {
  if (typeof window === "undefined") return DEFAULT_NOTES;
  try {
    const stored = localStorage.getItem(NOTES_STORAGE_KEY);
    if (!stored) return DEFAULT_NOTES;
    const parsed: unknown = JSON.parse(stored);
    return parseListState<NotesState>(parsed, DEFAULT_NOTES);
  } catch (error) {
    console.warn("Failed to load notes, using defaults.", error);
    return DEFAULT_NOTES;
  }
}

export function saveNotes(notes: NotesState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
  } catch (error) {
    console.warn("Failed to save notes.", error);
  }
}

export function loadMemorySeeds(): MemorySeedState {
  if (typeof window === "undefined") return DEFAULT_MEMORY_SEEDS;
  try {
    const stored = localStorage.getItem(MEMORY_SEED_STORAGE_KEY);
    if (!stored) return DEFAULT_MEMORY_SEEDS;
    const parsed: unknown = JSON.parse(stored);
    return parseListState<MemorySeedState>(parsed, DEFAULT_MEMORY_SEEDS);
  } catch (error) {
    console.warn("Failed to load memory seeds, using defaults.", error);
    return DEFAULT_MEMORY_SEEDS;
  }
}

export function saveMemorySeeds(seeds: MemorySeedState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MEMORY_SEED_STORAGE_KEY, JSON.stringify(seeds));
  } catch (error) {
    console.warn("Failed to save memory seeds.", error);
  }
}
