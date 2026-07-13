"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Generic, reusable confirmation modal. Used for any destructive or
 * important action across the app (currently: bulk-deleting transactions).
 * Replaces the native `window.confirm()` with an on-brand, accessible modal.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Konfirmasi",
  cancelLabel = "Batal",
  tone = "danger",
  loading = false,
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !loading) onCancel();
    }

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-[#001b3d]/45 backdrop-blur-[2px] sm:items-center sm:p-4"
      style={{ animation: "overlay-fade-in 0.15s ease-out" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby={description ? "confirm-dialog-description" : undefined}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) onCancel();
      }}
    >
      <div
        className="w-full max-w-sm rounded-t-3xl bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.25)] sm:rounded-3xl"
        style={{ animation: "dialog-slide-up 0.2s ease-out" }}
      >
        <div
          className={cn(
            "mb-4 grid h-12 w-12 place-items-center rounded-full",
            tone === "danger" ? "bg-[#ffdad6] text-[#ba1a1a]" : "bg-emerald-100 text-[#006c49]"
          )}
        >
          <AlertTriangle size={24} />
        </div>

        <h2 id="confirm-dialog-title" className="mb-1.5 text-lg font-bold text-[#0f172a]">
          {title}
        </h2>
        {description ? (
          <p id="confirm-dialog-description" className="mb-6 text-sm leading-relaxed text-[#64748b]">
            {description}
          </p>
        ) : (
          <div className="mb-6" />
        )}

        <div className="flex gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="flex h-11 flex-1 items-center justify-center rounded-xl border border-gray-200 text-sm font-semibold text-[#0f172a] transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={cn(
              "flex h-11 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60",
              tone === "danger" ? "bg-[#ba1a1a] hover:bg-[#a01616]" : "bg-[#006c49] hover:bg-[#00543a]"
            )}
          >
            {loading && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
