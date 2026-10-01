"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlarmClock,
  CalendarClock,
  CheckCircle2,
  Pause,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  SkipForward,
  Trash2
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ActionFeedback, useActionFeedback } from "@/components/ui/action-feedback";
import { MarkPaidDialog } from "@/components/scheduled/mark-paid-dialog";
import { endpoints } from "@/services/api/easysaving";
import { formatIDR } from "@/lib/utils";
import { accountName } from "@/lib/transaction-display";
import { dueBucket, dueLabel, formatDateID, frequencyLabel, groupSchedules, modeLabel } from "@/lib/schedule-display";
import type { Account, ScheduledTransaction } from "@/types/api";

function ModeBadge({ mode }: { mode: ScheduledTransaction["mode"] }) {
  const isAuto = mode === "auto";
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        isAuto
          ? "bg-[var(--primary-soft)] text-[var(--primary-strong)]"
          : "bg-[var(--warning-soft)] text-[var(--warning)]"
      }`}
    >
      {isAuto ? <RefreshCw size={11} /> : <AlarmClock size={11} />}
      {modeLabel(mode)}
    </span>
  );
}

type RowProps = {
  item: ScheduledTransaction;
  accounts: Account[];
  onMarkPaid: (item: ScheduledTransaction) => void;
  onSkip: (item: ScheduledTransaction) => void;
  onToggle: (item: ScheduledTransaction) => void;
  onDelete: (item: ScheduledTransaction) => void;
  busy: boolean;
};

function ScheduleRow({ item, accounts, onMarkPaid, onSkip, onToggle, onDelete, busy }: RowProps) {
  const bucket = dueBucket(item);
  const isExpense = item.type === "expense";
  const overdue = bucket === "overdue";
  // A backlog of more than one period is collapsed into a single row; actions
  // always apply to the oldest outstanding period.
  const backlog = item.is_active && item.overdue_periods > 1;

  return (
    <div className="py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{item.name}</p>
            <ModeBadge mode={item.mode} />
            {backlog ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--expense-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--expense)]">
                Terlambat {item.overdue_periods} periode
              </span>
            ) : null}
            {!item.is_active ? (
              <span className="rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text-secondary)]">
                Dijeda
              </span>
            ) : null}
          </div>
          <p className="mt-1 truncate text-xs text-[var(--text-secondary)]">
            {accountName(accounts, item.account_id)} · {frequencyLabel(item.frequency, item.interval)}
          </p>
          <p
            className={`mt-1 text-xs font-semibold ${
              overdue ? "text-[var(--expense)]" : bucket === "today" ? "text-[var(--warning)]" : "text-[var(--text-secondary)]"
            }`}
          >
            {item.is_active ? dueLabel(item) : "Tidak aktif"}
            {backlog ? ` · periode tertua ${formatDateID(item.next_due_date)}` : ""}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p
            className={`number-align text-sm font-semibold ${
              isExpense ? "text-[var(--expense)]" : "text-[var(--income)]"
            }`}
          >
            {item.amount ? `${isExpense ? "-" : "+"}${formatIDR(item.amount)}` : "Perkiraan -"}
          </p>
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {item.mode === "remind" && item.is_active && bucket !== "upcoming" ? (
          <>
            <button
              type="button"
              onClick={() => onMarkPaid(item)}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--primary-strong)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--primary)] active:scale-95"
            >
              <CheckCircle2 size={14} />
              Tandai lunas
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onSkip(item)}
              title="Majukan ke periode berikutnya tanpa mencatat transaksi"
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-strong)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)] disabled:opacity-60"
            >
              <SkipForward size={14} />
              Lewati periode ini
            </button>
          </>
        ) : null}

        <button
          type="button"
          disabled={busy}
          onClick={() => onToggle(item)}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-strong)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)] disabled:opacity-60"
        >
          {item.is_active ? <Pause size={14} /> : <Play size={14} />}
          {item.is_active ? "Jeda" : "Aktifkan"}
        </button>

        <Link
          href={`/scheduled/${item.id}/edit`}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-strong)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)]"
        >
          <Pencil size={14} />
          Edit
        </Link>

        <button
          type="button"
          disabled={busy}
          onClick={() => onDelete(item)}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--expense-soft)] hover:text-[var(--expense)] disabled:opacity-60"
        >
          <Trash2 size={14} />
          Hapus
        </button>
      </div>
    </div>
  );
}

export default function ScheduledPage() {
  const client = useQueryClient();
  const feedback = useActionFeedback();
  const [payTarget, setPayTarget] = useState<ScheduledTransaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ScheduledTransaction | null>(null);

  const { data: accounts = [] } = useQuery({ queryKey: ["accounts"], queryFn: endpoints.accounts });
  const {
    data: schedules = [],
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({ queryKey: ["scheduled"], queryFn: () => endpoints.scheduled() });

  const groups = useMemo(() => groupSchedules(schedules), [schedules]);

  function invalidateAll() {
    client.invalidateQueries({ queryKey: ["scheduled"] });
    client.invalidateQueries({ queryKey: ["transactions"] });
    client.invalidateQueries({ queryKey: ["summary"] });
    client.invalidateQueries({ queryKey: ["accounts"] });
  }

  const toggle = useMutation({
    mutationFn: (item: ScheduledTransaction) => endpoints.toggleScheduled(item.id, !item.is_active),
    onSuccess: (_, item) => {
      invalidateAll();
      feedback.showSuccess(item.is_active ? "Jadwal dijeda" : "Jadwal diaktifkan", item.name);
    },
    onError: (err) => feedback.showError("Gagal mengubah status", (err as Error).message)
  });

  const remove = useMutation({
    mutationFn: (id: string) => endpoints.deleteScheduled(id),
    onSuccess: () => {
      invalidateAll();
      setDeleteTarget(null);
      feedback.showSuccess("Jadwal dihapus", "Transaksi yang sudah dibuat tetap tersimpan.");
    },
    onError: (err) => feedback.showError("Gagal menghapus jadwal", (err as Error).message)
  });

  const pay = useMutation({
    mutationFn: (values: { id: string; amount: string; transaction_date: string }) =>
      endpoints.payScheduled(values.id, { amount: values.amount, transaction_date: values.transaction_date }),
    onSuccess: () => {
      invalidateAll();
      setPayTarget(null);
      feedback.showSuccess("Tagihan dicatat", "Transaksi dibuat dan saldo diperbarui.");
    },
    onError: (err) => feedback.showError("Gagal mencatat tagihan", (err as Error).message)
  });

  const skip = useMutation({
    mutationFn: (id: string) => endpoints.skipScheduled(id),
    onSuccess: (updated) => {
      invalidateAll();
      feedback.showSuccess(
        "Periode dilewati",
        `Jatuh tempo berikutnya ${formatDateID(updated.next_due_date)}. Tidak ada transaksi dibuat.`
      );
    },
    onError: (err) => feedback.showError("Gagal melewati periode", (err as Error).message)
  });

  const runNow = useMutation({
    mutationFn: () => endpoints.runScheduled(),
    onSuccess: (result) => {
      invalidateAll();
      feedback.showSuccess(
        "Proses jadwal selesai",
        `${result.created} transaksi dibuat dari ${result.processed} jadwal yang diperiksa.`
      );
    },
    onError: (err) => feedback.showError("Gagal memproses jadwal", (err as Error).message)
  });

  const busy = toggle.isPending || remove.isPending || skip.isPending;

  return (
    <AppShell>
      <ActionFeedback feedback={feedback.feedback} onClose={feedback.clear} />

      <div className="mx-auto max-w-3xl">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)] lg:text-2xl">Transaksi Terjadwal</h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Catat otomatis tagihan rutin, atau simpan sebagai pengingat.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => runNow.mutate()}
              disabled={runNow.isPending}
              title="Proses jadwal yang sudah jatuh tempo sekarang"
              className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-[var(--border-strong)] bg-white px-3 py-2.5 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)] disabled:opacity-60"
            >
              <RefreshCw size={16} className={runNow.isPending ? "animate-spin" : undefined} />
              Proses
            </button>
            <Link
              href="/scheduled/add"
              className="inline-flex items-center gap-2 rounded-[var(--radius)] bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--primary-strong)] active:scale-95"
            >
              <Plus size={18} />
              Buat Jadwal
            </Link>
          </div>
        </header>

        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((index) => (
              <div key={index} className="h-24 animate-pulse rounded-[var(--radius-lg)] bg-white" />
            ))}
          </div>
        ) : null}

        {isError ? (
          <div className="panel p-6 text-center">
            <p className="text-sm font-semibold text-[var(--expense)]">Gagal memuat jadwal.</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{(error as Error).message}</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-4 inline-flex items-center gap-2 rounded-[var(--radius)] bg-[var(--primary-strong)] px-4 py-2.5 text-sm font-semibold text-white"
            >
              <RefreshCw size={16} />
              Coba lagi
            </button>
          </div>
        ) : null}

        {!isLoading && !isError && schedules.length === 0 ? (
          <div className="panel p-8 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--primary-soft)] text-[var(--primary-strong)]">
              <CalendarClock size={24} />
            </span>
            <h2 className="mt-3 text-base font-semibold text-[var(--text-primary)]">Belum ada jadwal</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-[var(--text-secondary)]">
              Buat jadwal untuk gaji, kos, cicilan, atau langganan supaya tidak perlu dicatat manual setiap bulan.
            </p>
            <Link
              href="/scheduled/add"
              className="mt-5 inline-flex items-center gap-2 rounded-[var(--radius)] bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--primary-strong)]"
            >
              <Plus size={18} />
              Buat Jadwal
            </Link>
          </div>
        ) : null}

        {!isLoading && !isError && schedules.length > 0 ? (
          <div className="space-y-6">
            {groups.due.length > 0 ? (
              <section className="panel px-4 py-2 sm:px-5">
                <div className="flex items-center justify-between border-b border-[var(--border)] py-2">
                  <h2 className="section-heading">Jatuh tempo</h2>
                  <span className="text-xs font-semibold text-[var(--text-secondary)]">{groups.due.length}</span>
                </div>
                <div className="list-divider">
                  {groups.due.map((item) => (
                    <ScheduleRow
                      key={item.id}
                      item={item}
                      accounts={accounts}
                      busy={busy}
                      onMarkPaid={setPayTarget}
                      onSkip={(value) => skip.mutate(value.id)}
                      onToggle={(value) => toggle.mutate(value)}
                      onDelete={setDeleteTarget}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {groups.upcoming.length > 0 ? (
              <section className="panel px-4 py-2 sm:px-5">
                <div className="flex items-center justify-between border-b border-[var(--border)] py-2">
                  <h2 className="section-heading">Akan datang</h2>
                  <span className="text-xs font-semibold text-[var(--text-secondary)]">{groups.upcoming.length}</span>
                </div>
                <div className="list-divider">
                  {groups.upcoming.map((item) => (
                    <ScheduleRow
                      key={item.id}
                      item={item}
                      accounts={accounts}
                      busy={busy}
                      onMarkPaid={setPayTarget}
                      onSkip={(value) => skip.mutate(value.id)}
                      onToggle={(value) => toggle.mutate(value)}
                      onDelete={setDeleteTarget}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {groups.paused.length > 0 ? (
              <section className="panel px-4 py-2 sm:px-5">
                <div className="flex items-center justify-between border-b border-[var(--border)] py-2">
                  <h2 className="section-heading">Dijeda</h2>
                  <span className="text-xs font-semibold text-[var(--text-secondary)]">{groups.paused.length}</span>
                </div>
                <div className="list-divider">
                  {groups.paused.map((item) => (
                    <ScheduleRow
                      key={item.id}
                      item={item}
                      accounts={accounts}
                      busy={busy}
                      onMarkPaid={setPayTarget}
                      onSkip={(value) => skip.mutate(value.id)}
                      onToggle={(value) => toggle.mutate(value)}
                      onDelete={setDeleteTarget}
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        ) : null}
      </div>

      <MarkPaidDialog
        schedule={payTarget}
        loading={pay.isPending}
        error={pay.error ? (pay.error as Error).message : null}
        onCancel={() => {
          if (!pay.isPending) {
            setPayTarget(null);
            pay.reset();
          }
        }}
        onConfirm={(values) => {
          if (payTarget) pay.mutate({ id: payTarget.id, ...values });
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Hapus jadwal ${deleteTarget?.name ?? ""}?`}
        description="Jadwal ini akan dihapus permanen. Transaksi yang sudah pernah dibuat dari jadwal ini tetap tersimpan dan saldo tidak berubah."
        confirmLabel={remove.isPending ? "Menghapus..." : "Ya, Hapus"}
        cancelLabel="Batal"
        tone="danger"
        loading={remove.isPending}
        onCancel={() => {
          if (!remove.isPending) setDeleteTarget(null);
        }}
        onConfirm={() => {
          if (deleteTarget) remove.mutate(deleteTarget.id);
        }}
      />
    </AppShell>
  );
}
