import { useCallback, useEffect, useState } from "react";
import type {
  ListItem,
  NotesState,
  MemorySeedState,
} from "@/components/pomodoro/types";
import {
  loadNotes,
  saveNotes,
  loadMemorySeeds,
  saveMemorySeeds,
} from "@/lib/notes-storage";

export function useListManager() {
  const [notes, setNotes] = useState<NotesState>({ items: [] });
  const [memorySeeds, setMemorySeeds] = useState<MemorySeedState>({
    items: [],
  });
  const [hydrated, setHydrated] = useState(false);

  // Load data on mount
  useEffect(() => {
    setNotes(loadNotes());
    setMemorySeeds(loadMemorySeeds());
    setHydrated(true);
  }, []);

  // Save notes when changed
  useEffect(() => {
    if (!hydrated) return;
    saveNotes(notes);
  }, [notes, hydrated]);

  // Save memory seeds when changed
  useEffect(() => {
    if (!hydrated) return;
    saveMemorySeeds(memorySeeds);
  }, [memorySeeds, hydrated]);

  const addNote = useCallback((content: string) => {
    if (!content.trim()) return;
    const newItem: ListItem = {
      id: crypto.randomUUID(),
      content: content.trim(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setNotes((prev) => ({ items: [newItem, ...prev.items] }));
  }, []);

  const updateNote = useCallback((id: string, content: string) => {
    if (!content.trim()) return;
    setNotes((prev) => ({
      items: prev.items.map((item) =>
        item.id === id
          ? { ...item, content: content.trim(), updatedAt: Date.now() }
          : item
      ),
    }));
  }, []);

  const deleteNote = useCallback((id: string) => {
    setNotes((prev) => ({
      items: prev.items.filter((item) => item.id !== id),
    }));
  }, []);

  const addMemorySeed = useCallback((content: string) => {
    if (!content.trim()) return;
    const newItem: ListItem = {
      id: crypto.randomUUID(),
      content: content.trim(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setMemorySeeds((prev) => ({ items: [newItem, ...prev.items] }));
  }, []);

  const updateMemorySeed = useCallback((id: string, content: string) => {
    if (!content.trim()) return;
    setMemorySeeds((prev) => ({
      items: prev.items.map((item) =>
        item.id === id
          ? { ...item, content: content.trim(), updatedAt: Date.now() }
          : item
      ),
    }));
  }, []);

  const deleteMemorySeed = useCallback((id: string) => {
    setMemorySeeds((prev) => ({
      items: prev.items.filter((item) => item.id !== id),
    }));
  }, []);

  return {
    notes: notes.items,
    memorySeeds: memorySeeds.items,
    addNote,
    updateNote,
    deleteNote,
    addMemorySeed,
    updateMemorySeed,
    deleteMemorySeed,
  };
}
