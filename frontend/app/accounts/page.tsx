"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, CalendarClock, CheckCircle2, Coins, Landmark, Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ActionFeedback, useActionFeedback } from "@/components/ui/action-feedback";
import { endpoints } from "@/services/api/easysaving";
import { useActiveAccountId } from "@/hooks/use-active-account";
import { formatIDR } from "@/lib/utils";
import { accountCategoryLabel } from "@/lib/account-options";
import type { Account } from "@/types/api";

function accountIcon(name: string, index: number) {
  const lower = name.toLowerCase();
  if (lower.includes("dana") || lower.includes("gopay") || lower.includes("ovo") || lower.includes("wallet")) return Wallet;
  if (lower.includes("bca") || lower.includes("bank") || lower.includes("mandiri") || index % 2 === 1) return Landmark;
  return Building2;
}

export default function AccountsPage() {
  const client = useQueryClient();
  const { accountId, setAccountId } = useActiveAccountId();
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);
  const feedback = useActionFeedback();
  const { data: accounts = [] } = useQuery({ queryKey: ["accounts"], queryFn: endpoints.accounts });
  // Schedules cascade with their account, so the confirmation dialog must say how
  // many will disappear.
  const { data: schedules = [] } = useQuery({ queryKey: ["scheduled"], queryFn: () => endpoints.scheduled() });
  const scheduleCountForTarget = useMemo(
    () => (deleteTarget ? schedules.filter((item) => item.account_id === deleteTarget.id).length : 0),
    [deleteTarget, schedules]
  );
  const deleteAccount = useMutation({
    mutationFn: endpoints.deleteAccount,
    onSuccess: (_, deletedId) => {
      if (accountId === deletedId) setAccountId("");
      client.invalidateQueries({ queryKey: ["accounts"] });
      client.invalidateQueries({ queryKey: ["transactions"] });
      client.invalidateQueries({ queryKey: ["summary"] });
      client.invalidateQueries({ queryKey: ["scheduled"] });
      feedback.showSuccess("Rekening dihapus", "Rekening dan transaksi terkait sudah dibersihkan.");
    },
    onError: (error) => {
      feedback.showError("Gagal menghapus rekening", (error as Error).message);
    }
  });
  const totalBalance = accounts.reduce((sum, item) => sum + Number(item.current_balance || 0), 0);
  const activeAccount = useMemo(() => accounts.find((item) => item.id === accountId), [accountId, accounts]);

  return (
    <AppShell>
      <ActionFeedback feedback={feedback.feedback} onClose={feedback.clear} />
      <div className="mx-auto max-w-[1100px]">
        {/* Clean header with total balance */}
        <section className="panel mb-6 flex flex-col gap-4 p-5 sm:p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)] lg:text-2xl">Rekening</h1>
            <p className="mt-1 max-w-xl text-sm text-[var(--text-secondary)]">
              {activeAccount ? `${activeAccount.account_name} sedang aktif untuk dashboard dan history.` : "Semua rekening digabung sebagai saldo utama."}
            </p>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-right">
              <p className="section-heading">Total Saldo</p>
              <p className="number-align mt-1 text-2xl font-bold text-[var(--text-primary)] md:text-[28px]">{formatIDR(totalBalance)}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href="/scheduled"
                className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-[var(--border-strong)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)] active:scale-95"
              >
                <CalendarClock size={18} />
                Transaksi terjadwal
              </Link>
              <Link
                href="/accounts/balance"
                className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-[var(--primary-border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--primary-strong)] transition hover:bg-[var(--primary-soft)] active:scale-95"
              >
                <Coins size={18} />
                Update Saldo
              </Link>
              <Link
                href="/accounts/add"
                className="inline-flex items-center gap-2 rounded-[var(--radius)] bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--primary-strong)] active:scale-95"
              >
                <Plus size={18} />
                Tambah
              </Link>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((item, index) => {
            const Icon = accountIcon(item.account_name, index);
            const isActive = item.id === accountId;
            return (
              <article
                key={item.id}
                className={`panel flex flex-col p-5 transition ${isActive ? "border-[var(--primary-border)] ring-1 ring-[var(--primary-border)]" : "hover:border-[var(--border-strong)]"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/accounts/${item.id}`} className="flex min-w-0 items-center gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--surface-muted)] text-[var(--primary-strong)]">
                      <Icon size={22} />
                    </span>
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold text-[var(--text-primary)]">{item.account_name}</h2>
                      <p className="truncate text-xs text-[var(--text-secondary)]">{accountCategoryLabel(item.category)}</p>
                    </div>
                  </Link>
                  <div className="flex shrink-0 gap-1">
                    <Link
                      href={`/accounts/balance?account_id=${item.id}`}
                      aria-label={`Update saldo ${item.account_name}`}
                      className="grid h-8 w-8 place-items-center rounded-full text-[var(--text-secondary)] transition hover:bg-[var(--primary-soft)] hover:text-[var(--primary-strong)]"
                    >
                      <Coins size={16} />
                    </Link>
                    <Link
                      href={`/accounts/${item.id}/edit`}
                      aria-label={`Edit ${item.account_name}`}
                      className="grid h-8 w-8 place-items-center rounded-full text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--primary-strong)]"
                    >
                      <Pencil size={16} />
                    </Link>
                    <button
                      type="button"
                      aria-label={`Hapus ${item.account_name}`}
                      disabled={deleteAccount.isPending}
                      onClick={() => setDeleteTarget(item)}
                      className="grid h-8 w-8 place-items-center rounded-full text-[var(--text-secondary)] transition hover:bg-[var(--expense-soft)] hover:text-[var(--expense)] disabled:opacity-60"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <Link href={`/accounts/${item.id}`} className="mt-4 block">
                  <p className="section-heading">Saldo Terkini</p>
                  <p className="number-align mt-1 break-words text-2xl font-bold text-[var(--text-primary)]">{formatIDR(item.current_balance)}</p>
                  {item.notes ? <p className="mt-2 line-clamp-2 text-sm text-[var(--text-secondary)]">{item.notes}</p> : null}
                </Link>

                <button
                  type="button"
                  onClick={() => setAccountId(item.id)}
                  className={`mt-4 inline-flex items-center justify-center gap-1.5 rounded-[var(--radius)] px-3 py-2 text-sm font-semibold transition ${
                    isActive ? "bg-[var(--primary-soft)] text-[var(--primary-strong)]" : "bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:text-[var(--primary-strong)]"
                  }`}
                >
                  {isActive ? <CheckCircle2 size={16} /> : null}
                  {isActive ? "Rekening Aktif" : "Jadikan Aktif"}
                </button>
              </article>
            );
          })}

          <Link
            href="/accounts/add"
            className="group grid min-h-[200px] place-items-center rounded-[var(--radius-lg)] border border-dashed border-[var(--primary-border)] bg-[var(--surface-subtle)] p-6 text-center transition hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]"
          >
            <div>
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--primary)] text-white transition group-hover:scale-105">
                <Plus size={24} />
              </span>
              <h2 className="mt-3 text-base font-semibold text-[var(--text-primary)]">Tambah Rekening Baru</h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Hubungkan saldo lain untuk laporan lengkap.</p>
            </div>
          </Link>
        </section>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Hapus ${deleteTarget?.account_name ?? "rekening"}?`}
        description={
          scheduleCountForTarget > 0
            ? `Rekening dan seluruh transaksi yang terhubung akan dihapus permanen dari database. ${scheduleCountForTarget} transaksi terjadwal pada rekening ini juga akan ikut terhapus.`
            : "Rekening dan seluruh transaksi yang terhubung akan dihapus permanen dari database."
        }
        confirmLabel={deleteAccount.isPending ? "Menghapus..." : "Hapus Akun"}
        cancelLabel="Batal"
        tone="danger"
        loading={deleteAccount.isPending}
        onCancel={() => {
          if (!deleteAccount.isPending) setDeleteTarget(null);
        }}
        onConfirm={() => {
          if (deleteTarget) deleteAccount.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
        }}
      />
    </AppShell>
  );
}
