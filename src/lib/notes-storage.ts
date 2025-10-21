import type { NotesState, MemorySeedState } from "@/components/pomodoro/types";

const NOTES_STORAGE_KEY = "pomodoro-notes";
const MEMORY_SEED_STORAGE_KEY = "pomodoro-memory-seeds";

const DEFAULT_NOTES: NotesState = { items: [] };
const DEFAULT_MEMORY_SEEDS: MemorySeedState = { items: [] };

export function loadNotes(): NotesState {
  if (typeof window === "undefined") return DEFAULT_NOTES;
  try {
    const stored = localStorage.getItem(NOTES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_NOTES;
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
    return stored ? JSON.parse(stored) : DEFAULT_MEMORY_SEEDS;
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
