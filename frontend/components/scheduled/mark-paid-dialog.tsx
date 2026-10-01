"use client";

import { useEffect, useState } from "react";
import { CalendarDays, CheckCircle2 } from "lucide-react";
import { AmountField } from "@/components/ui/amount-field";
import { formatDateID } from "@/lib/schedule-display";
import { today } from "@/lib/utils";
import type { ScheduledTransaction } from "@/types/api";

type MarkPaidDialogProps = {
  schedule: ScheduledTransaction | null;
  loading?: boolean;
  error?: string | null;
  onConfirm: (values: { amount: string; transaction_date: string }) => void;
  onCancel: () => void;
};

/**
 * Bottom sheet (mobile) / centered dialog (desktop) used to confirm a due
 * reminder. The amount is prefilled with the schedule's estimate when it has one.
 */
export function MarkPaidDialog({ schedule, loading = false, error, onConfirm, onCancel }: MarkPaidDialogProps) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");

  // Reset the fields every time a different schedule is opened.
  useEffect(() => {
    if (!schedule) return;
    setAmount(schedule.amount ? String(Math.trunc(Number(schedule.amount))) : "");
    setDate(today());
  }, [schedule]);

  useEffect(() => {
    if (!schedule) return;
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
  }, [schedule, loading, onCancel]);

  if (!schedule) return null;

  const valid = Number(amount) > 0 && Boolean(date);
  const isExpense = schedule.type === "expense";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-[#001b3d]/45 backdrop-blur-[2px] sm:items-center sm:p-4"
      style={{ animation: "overlay-fade-in 0.15s ease-out" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mark-paid-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) onCancel();
      }}
    >
      <div
        className="w-full max-w-sm rounded-t-3xl bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.25)] sm:rounded-3xl"
        style={{ animation: "dialog-slide-up 0.2s ease-out" }}
      >
        <div className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-[var(--primary-soft)] text-[var(--primary-strong)]">
          <CheckCircle2 size={24} />
        </div>

        <h2 id="mark-paid-title" className="text-lg font-semibold text-[var(--text-primary)]">
          Tandai lunas
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {schedule.name} · jatuh tempo {formatDateID(schedule.next_due_date)}
        </p>

        <div className="mt-5 flex flex-col items-center text-center">
          <span className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
            Nominal sebenarnya
          </span>
          <AmountField
            value={amount}
            onValueChange={setAmount}
            ariaLabel="Nominal yang dibayar"
            className={isExpense ? "text-[var(--expense)]" : "text-[var(--income)]"}
          />
          <div className="mt-3 h-px w-24 bg-[var(--border)]" />
        </div>

        <div className="mt-5">
          <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Tanggal pembayaran</label>
          <div className="relative">
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-3 pr-12 text-[15px] text-[var(--text-primary)] outline-none transition [color-scheme:light] focus:border-[var(--primary-strong)] focus:ring-1 focus:ring-[var(--primary-strong)] [&::-webkit-calendar-picker-indicator]:opacity-0"
            />
            <CalendarDays className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-muted)]" />
          </div>
        </div>

        {error ? <p className="mt-4 text-sm font-semibold text-[var(--expense)]">{error}</p> : null}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="flex h-11 flex-1 items-center justify-center rounded-[var(--radius)] border border-[var(--border-strong)] text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={loading || !valid}
            onClick={() => onConfirm({ amount, transaction_date: date })}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[var(--radius)] bg-[var(--primary-strong)] text-sm font-semibold text-white transition hover:bg-[var(--primary)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
            )}
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}
