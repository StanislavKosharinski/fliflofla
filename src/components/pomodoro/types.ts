export interface ListItem {
  id: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface NotesState {
  items: ListItem[];
}

export interface MemorySeedState {
  items: ListItem[];
}
