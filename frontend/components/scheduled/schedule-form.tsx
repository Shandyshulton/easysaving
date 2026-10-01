"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, CalendarDays, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomDropdown } from "@/components/ui/custom-dropdown";
import { AmountField } from "@/components/ui/amount-field";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { endpoints, type ScheduledPayload } from "@/services/api/easysaving";
import { scheduledSchema } from "@/schemas/forms";
import { MAX_CATCH_UP_PERIODS, MAX_REMIND_DAYS_BEFORE } from "@/lib/schedule-display";
import { today } from "@/lib/utils";
import type { SchedulePreview } from "@/types/api";

export type ScheduleFormValues = z.infer<typeof scheduledSchema>;

const frequencyOptions = [
  { value: "daily", label: "Harian" },
  { value: "weekly", label: "Mingguan" },
  { value: "monthly", label: "Bulanan" },
  { value: "yearly", label: "Tahunan" }
];

export const emptyScheduleForm: ScheduleFormValues = {
  type: "expense",
  name: "",
  amount: "",
  category_id: "",
  account_id: "",
  mode: "auto",
  frequency: "monthly",
  interval: 1,
  start_date: today(),
  end_date: "",
  remind_days_before: 3,
  notes: ""
};

type ScheduleFormProps = {
  title: string;
  submitLabel: string;
  defaultValues: ScheduleFormValues;
  submitting: boolean;
  errorMessage?: string | null;
  onSubmit: (payload: ScheduledPayload) => void;
};

/**
 * Shared create/edit form for scheduled transactions.
 *
 * Before saving a backdated auto schedule it asks the server how many past
 * occurrences would be created, then asks the user to confirm, because those
 * transactions change past balances and reports.
 */
export function ScheduleForm({
  title,
  submitLabel,
  defaultValues,
  submitting,
  errorMessage,
  onSubmit
}: ScheduleFormProps) {
  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduledSchema),
    defaultValues
  });

  const type = form.watch("type");
  const mode = form.watch("mode");
  const amount = form.watch("amount");
  const accountID = form.watch("account_id");
  const categoryID = form.watch("category_id");
  const frequency = form.watch("frequency");
  const startDate = form.watch("start_date");
  const remindDaysBefore = form.watch("remind_days_before");

  const [pendingPayload, setPendingPayload] = useState<ScheduledPayload | null>(null);
  const [preview, setPreview] = useState<SchedulePreview | null>(null);

  const { data: accounts = [] } = useQuery({ queryKey: ["accounts"], queryFn: endpoints.accounts });
  const { data: categories = [] } = useQuery({
    queryKey: ["categories", type],
    queryFn: () => endpoints.categories(type)
  });

  // Clear a category that belongs to the other transaction type.
  useEffect(() => {
    if (!categoryID) return;
    if (categories.length > 0 && !categories.some((item) => item.id === categoryID)) {
      form.setValue("category_id", "");
    }
  }, [categories, categoryID, form]);

  const previewMutation = useMutation({
    mutationFn: (payload: ScheduledPayload) => endpoints.previewScheduled(payload),
    onSuccess: (result, payload) => {
      // Only auto schedules actually create transactions for past dates.
      if (result.past_count > 0 && payload.mode === "auto") {
        setPreview(result);
        setPendingPayload(payload);
        return;
      }
      onSubmit(payload);
    },
    // If the preview fails we still let the user save; the server validates anyway.
    onError: (_error, payload) => onSubmit(payload)
  });

  const isBackdated = useMemo(() => Boolean(startDate) && startDate < today(), [startDate]);

  // The server caps catch-up, so the dialog must promise what will really happen:
  // "12 transaksi akan dibuat, N periode terlama dilewati" rather than the raw total.
  const backdateTitle = useMemo(() => {
    if (!preview) return "";
    const willCreate = Math.min(preview.past_count, MAX_CATCH_UP_PERIODS);
    if (preview.skipped_too_old > 0) {
      return `${willCreate} transaksi akan dibuat, ${preview.skipped_too_old} periode terlama dilewati`;
    }
    return `${willCreate} transaksi akan dibuat untuk tanggal lampau`;
  }, [preview]);

  function toPayload(values: ScheduleFormValues): ScheduledPayload {
    return {
      type: values.type,
      name: values.name.trim(),
      amount: values.amount,
      category_id: values.category_id,
      account_id: values.account_id,
      mode: values.mode,
      frequency: values.frequency,
      interval: Number(values.interval) || 1,
      start_date: values.start_date,
      end_date: values.end_date || undefined,
      remind_days_before: Number(values.remind_days_before) || 0,
      notes: values.notes || undefined
    };
  }

  function handleValid(values: ScheduleFormValues) {
    const payload = toPayload(values);
    // Ask for confirmation only when it can affect the past.
    if (isBackdated && payload.mode === "auto") {
      previewMutation.mutate(payload);
      return;
    }
    onSubmit(payload);
  }

  const fieldError =
    form.formState.errors.name?.message ||
    form.formState.errors.amount?.message ||
    form.formState.errors.category_id?.message ||
    form.formState.errors.account_id?.message ||
    form.formState.errors.start_date?.message ||
    form.formState.errors.end_date?.message ||
    form.formState.errors.interval?.message;

  const busy = submitting || previewMutation.isPending;

  return (
    <>
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/scheduled"
            className="grid h-10 w-10 place-items-center rounded-full text-[var(--text-primary)] transition hover:bg-[var(--surface-muted)] active:scale-95"
            aria-label="Kembali"
          >
            <ArrowLeft size={24} strokeWidth={2.25} />
          </Link>
          <h1 className="text-xl font-semibold text-[var(--text-primary)] lg:text-2xl">{title}</h1>
        </div>

        <form onSubmit={form.handleSubmit(handleValid)} className="space-y-6">
          {/* Type */}
          <div className="flex justify-center">
            <div className="grid w-full max-w-xs grid-cols-2 rounded-[var(--radius)] bg-[var(--surface-muted)] p-1">
              <button
                type="button"
                className={`rounded-[var(--radius-sm)] px-4 py-2.5 text-[15px] font-semibold transition ${
                  type === "expense" ? "bg-[var(--expense)] text-white shadow-sm" : "bg-transparent text-[var(--expense)]"
                }`}
                onClick={() => {
                  form.setValue("type", "expense");
                  form.setValue("category_id", "");
                }}
              >
                Pengeluaran
              </button>
              <button
                type="button"
                className={`rounded-[var(--radius-sm)] px-4 py-2.5 text-[15px] font-semibold transition ${
                  type === "income" ? "bg-[var(--income)] text-white shadow-sm" : "bg-transparent text-[var(--income)]"
                }`}
                onClick={() => {
                  form.setValue("type", "income");
                  form.setValue("category_id", "");
                }}
              >
                Pemasukan
              </button>
            </div>
          </div>

          {/* Amount */}
          <div className="flex flex-col items-center text-center">
            <label className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
              {mode === "remind" ? "Perkiraan nominal (opsional)" : "Nominal"}
            </label>
            <AmountField
              value={amount}
              onValueChange={(value) => form.setValue("amount", value, { shouldDirty: true, shouldValidate: true })}
              className={type === "expense" ? "text-[var(--expense)]" : "text-[var(--income)]"}
            />
            <div className="mt-3 h-px w-24 bg-[var(--border)]" />
          </div>

          <div className="panel p-5 sm:p-6">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div className="lg:col-span-2">
                <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Nama jadwal</label>
                <input
                  {...form.register("name")}
                  placeholder="Misal: Kos, Netflix, Gaji"
                  className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-3 text-[15px] text-[var(--text-primary)] outline-none transition focus:border-[var(--primary-strong)] focus:ring-1 focus:ring-[var(--primary-strong)]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Rekening</label>
                <CustomDropdown
                  value={accountID}
                  placeholder="Pilih Rekening"
                  options={accounts.map((item) => ({ value: item.id, label: item.account_name }))}
                  onChange={(value) => form.setValue("account_id", value, { shouldValidate: true })}
                  buttonClassName="rounded-[var(--radius)] border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-3 text-[15px] text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Kategori</label>
                <CustomDropdown
                  value={categoryID}
                  placeholder="Pilih Kategori"
                  options={categories.map((item) => ({ value: item.id, label: item.name }))}
                  onChange={(value) => form.setValue("category_id", value, { shouldValidate: true })}
                  buttonClassName="rounded-[var(--radius)] border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-3 text-[15px] text-[var(--text-primary)]"
                />
              </div>

              {/* Mode */}
              <div className="lg:col-span-2">
                <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Mode</label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => form.setValue("mode", "auto", { shouldValidate: true })}
                    className={`rounded-[var(--radius)] border p-4 text-left transition ${
                      mode === "auto"
                        ? "border-[var(--primary-strong)] bg-[var(--primary-soft)]"
                        : "border-[var(--border)] bg-white hover:border-[var(--primary-border)]"
                    }`}
                  >
                    <span className="block text-sm font-semibold text-[var(--text-primary)]">Catat otomatis</span>
                    <span className="mt-1 block text-xs leading-4 text-[var(--text-secondary)]">
                      Transaksi dibuat sendiri saat jatuh tempo. Nominal tetap.
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => form.setValue("mode", "remind", { shouldValidate: true })}
                    className={`rounded-[var(--radius)] border p-4 text-left transition ${
                      mode === "remind"
                        ? "border-[var(--warning)] bg-[var(--warning-soft)]"
                        : "border-[var(--border)] bg-white hover:border-[var(--primary-border)]"
                    }`}
                  >
                    <span className="block text-sm font-semibold text-[var(--text-primary)]">Ingatkan saja</span>
                    <span className="mt-1 block text-xs leading-4 text-[var(--text-secondary)]">
                      Muncul di daftar jatuh tempo, Anda isi nominal saat lunas.
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Frekuensi</label>
                <CustomDropdown
                  value={frequency}
                  placeholder="Pilih frekuensi"
                  options={frequencyOptions}
                  onChange={(value) =>
                    form.setValue("frequency", value as ScheduleFormValues["frequency"], { shouldValidate: true })
                  }
                  buttonClassName="rounded-[var(--radius)] border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-3 text-[15px] text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Ulangi setiap</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={365}
                    {...form.register("interval", { valueAsNumber: true })}
                    className="w-24 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-3 text-[15px] text-[var(--text-primary)] outline-none transition focus:border-[var(--primary-strong)] focus:ring-1 focus:ring-[var(--primary-strong)]"
                  />
                  <span className="text-sm text-[var(--text-secondary)]">
                    {frequency === "daily" ? "hari" : frequency === "weekly" ? "minggu" : frequency === "monthly" ? "bulan" : "tahun"}
                  </span>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Tanggal mulai</label>
                <div className="relative">
                  <input
                    type="date"
                    {...form.register("start_date")}
                    className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-3 pr-12 text-[15px] text-[var(--text-primary)] outline-none transition [color-scheme:light] focus:border-[var(--primary-strong)] focus:ring-1 focus:ring-[var(--primary-strong)] [&::-webkit-calendar-picker-indicator]:opacity-0"
                  />
                  <CalendarDays className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-muted)]" />
                </div>
                {isBackdated && mode === "auto" ? (
                  <p className="mt-2 text-xs font-semibold text-[var(--warning)]">
                    Tanggal mulai di masa lalu. Transaksi lampau akan dibuat setelah dikonfirmasi.
                  </p>
                ) : null}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
                  Tanggal berakhir <span className="font-normal text-[var(--text-muted)]">(opsional)</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    {...form.register("end_date")}
                    className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-3 pr-12 text-[15px] text-[var(--text-primary)] outline-none transition [color-scheme:light] focus:border-[var(--primary-strong)] focus:ring-1 focus:ring-[var(--primary-strong)] [&::-webkit-calendar-picker-indicator]:opacity-0"
                  />
                  <CalendarDays className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-muted)]" />
                </div>
              </div>

              {mode === "remind" ? (
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
                    Ingatkan H- (hari)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={MAX_REMIND_DAYS_BEFORE}
                    {...form.register("remind_days_before", { valueAsNumber: true })}
                    className="w-24 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-3 text-[15px] text-[var(--text-primary)] outline-none transition focus:border-[var(--primary-strong)] focus:ring-1 focus:ring-[var(--primary-strong)]"
                  />
                  <p className="mt-2 text-xs text-[var(--text-secondary)]">
                    Muncul di daftar jatuh tempo mulai {remindDaysBefore || 0} hari sebelum tanggal jatuh tempo.
                    Maksimal {MAX_REMIND_DAYS_BEFORE} hari.
                  </p>
                </div>
              ) : null}

              <div className="lg:col-span-2">
                <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
                  Catatan <span className="font-normal text-[var(--text-muted)]">(opsional)</span>
                </label>
                <textarea
                  {...form.register("notes")}
                  placeholder="Detail tambahan..."
                  className="min-h-[88px] w-full resize-none rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-3 text-[15px] leading-6 text-[var(--text-primary)] outline-none transition focus:border-[var(--primary-strong)] focus:ring-1 focus:ring-[var(--primary-strong)]"
                />
              </div>
            </div>

            {fieldError ? <p className="mt-4 text-sm font-semibold text-[var(--expense)]">{fieldError}</p> : null}
            {errorMessage ? <p className="mt-4 text-sm font-semibold text-[var(--expense)]">{errorMessage}</p> : null}
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              disabled={busy}
              className="rounded-[var(--radius)] bg-[var(--primary-strong)] px-6 py-4 text-[16px] font-semibold text-white transition hover:bg-[var(--primary)] active:scale-[0.99]"
            >
              <Save className="h-5 w-5" strokeWidth={2.5} />
              {busy ? "Menyimpan..." : submitLabel}
            </Button>
            <Link
              href="/scheduled"
              className="rounded-[var(--radius)] border border-[var(--border-strong)] bg-white px-6 py-4 text-[16px] font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)]"
            >
              Batal
            </Link>
          </div>
        </form>
      </div>

      {/* Backdate confirmation: this changes past balances and reports.
          The numbers come from POST /scheduled/preview, which uses the same
          recurrence functions and Asia/Jakarta clock as the scheduler job, so the
          dialog can never disagree with what actually happens. */}
      <ConfirmDialog
        open={Boolean(pendingPayload && preview)}
        tone="default"
        title={backdateTitle}
        description={
          preview
            ? `Karena tanggal mulai di masa lalu, jadwal ini mencatat transaksi mundur sampai hari ini. Saldo rekening dan laporan bulan lalu akan berubah.${
                preview.skipped_too_old > 0
                  ? ` Batas catch-up adalah ${MAX_CATCH_UP_PERIODS} periode per proses, jadi ${preview.skipped_too_old} periode terlama tidak dicatat.`
                  : ""
              }`
            : undefined
        }
        confirmLabel={submitting ? "Menyimpan..." : "Ya, lanjutkan"}
        cancelLabel="Batal"
        loading={submitting}
        onCancel={() => {
          if (submitting) return;
          setPendingPayload(null);
          setPreview(null);
        }}
        onConfirm={() => {
          if (pendingPayload) onSubmit(pendingPayload);
        }}
      />
    </>
  );
}
