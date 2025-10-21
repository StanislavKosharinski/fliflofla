import { useState } from "react";
import Button from "@/components/ui/button";

interface AddItemProps {
  onAdd: (content: string) => void;
  placeholder?: string;
  buttonText?: string;
}

export function AddItem({
  onAdd,
  placeholder = "Add new item...",
  buttonText = "Add",
}: AddItemProps) {
  const [content, setContent] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      onAdd(content);
      setContent("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        className="flex-1 p-3 border border-slate-300 rounded-lg resize-none focus:border-blue-500 focus:ring-2 focus:ring-blue-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        rows={2}
      />
      <Button type="submit" className="bg-blue-500 hover:bg-blue-600">
        {buttonText}
      </Button>
    </form>
  );
}
