"use client";

import { createPortal } from "react-dom";

import Button from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmVariant?: "default" | "destructive";
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
  confirmVariant = "destructive",
}: ConfirmDialogProps) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="alertdialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {title}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {description}
          </p>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            aria-label="Cancel confirmation"
          >
            Cancel
          </Button>
          <Button
            variant={confirmVariant === "destructive" ? "destructive" : "default"}
            onClick={onConfirm}
            aria-label={confirmLabel}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
