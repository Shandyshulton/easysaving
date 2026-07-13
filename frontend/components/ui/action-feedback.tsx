"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ActionFeedbackState = {
  type: "success" | "error";
  title: string;
  message?: string;
};

const FLASH_KEY = "easysaving_action_feedback";

export function setActionFeedbackFlash(feedback: ActionFeedbackState) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(FLASH_KEY, JSON.stringify(feedback));
}

export function useActionFeedback(timeout = 2600) {
  const [feedback, setFeedback] = useState<ActionFeedbackState | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem(FLASH_KEY);
    if (!raw) return;
    sessionStorage.removeItem(FLASH_KEY);
    try {
      setFeedback(JSON.parse(raw) as ActionFeedbackState);
    } catch {
      setFeedback(null);
    }
  }, []);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), timeout);
    return () => window.clearTimeout(timer);
  }, [feedback, timeout]);

  const showSuccess = useCallback((title: string, message?: string) => {
    setFeedback({ type: "success", title, message });
  }, []);

  const showError = useCallback((title: string, message?: string) => {
    setFeedback({ type: "error", title, message });
  }, []);

  const clear = useCallback(() => setFeedback(null), []);

  return { feedback, showSuccess, showError, clear };
}

export function ActionFeedback({ feedback, onClose }: { feedback: ActionFeedbackState | null; onClose?: () => void }) {
  if (!feedback) return null;

  const success = feedback.type === "success";

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[80] flex justify-center px-4 sm:top-6" role="status" aria-live="polite">
      <div
        className={cn(
          "feedback-toast pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border bg-white px-4 py-3 shadow-[0_18px_44px_rgba(15,23,42,0.14)]",
          success ? "border-emerald-200" : "border-[#ffb3b0]"
        )}
      >
        <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full", success ? "bg-emerald-100 text-[#006c49]" : "bg-[#ffdad8] text-[#a83639]")}>
          {success ? <Check className="feedback-success-mark" size={23} strokeWidth={3} /> : <X className="feedback-error-mark" size={23} strokeWidth={3} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-5 text-[#0f172a]">{feedback.title}</p>
          {feedback.message ? <p className="mt-0.5 text-sm leading-5 text-[#64748b]">{feedback.message}</p> : null}
        </div>
        {onClose ? (
          <button type="button" onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#64748b] transition hover:bg-[#f2f4f6]" aria-label="Tutup feedback">
            <X size={16} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function ActionFeedbackHost() {
  const feedback = useActionFeedback();
  return <ActionFeedback feedback={feedback.feedback} onClose={feedback.clear} />;
}
