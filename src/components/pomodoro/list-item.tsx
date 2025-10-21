import { useState } from "react";
import Button from "@/components/ui/button";
import type { ListItem } from "./types";

interface ListItemProps {
  item: ListItem;
  onUpdate: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  placeholder?: string;
}

export function ListItemComponent({
  item,
  onUpdate,
  onDelete,
  placeholder,
}: ListItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(item.content);

  const handleSave = () => {
    if (editContent.trim()) {
      onUpdate(item.id, editContent);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditContent(item.content);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  return (
    <div className="flex items-start gap-2 p-3 border border-slate-200 rounded-lg dark:border-slate-700">
      {isEditing ? (
        <div className="flex-1 flex gap-2">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 p-2 border border-slate-300 rounded resize-none focus:border-blue-500 focus:ring-2 focus:ring-blue-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            autoFocus
          />
          <div className="flex gap-1">
            <Button
              size="sm"
              onClick={handleSave}
              className="bg-green-500 hover:bg-green-600"
            >
              ✓
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel}>
              ✕
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1">
            <p className="text-sm text-slate-700 dark:text-slate-300">
              {item.content}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {new Date(item.createdAt).toLocaleString()}
            </p>
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditing(true)}
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onDelete(item.id)}
            >
              Delete
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
