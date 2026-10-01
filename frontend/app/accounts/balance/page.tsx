"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, Save, Wallet } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { CustomDropdown } from "@/components/ui/custom-dropdown";
import { AmountField } from "@/components/ui/amount-field";
import { ActionFeedback, setActionFeedbackFlash, useActionFeedback } from "@/components/ui/action-feedback";
import { endpoints } from "@/services/api/easysaving";
import { accountCategoryLabel } from "@/lib/account-options";
import { formatIDR, today } from "@/lib/utils";

function UpdateBalanceForm() {
  const router = useRouter();
  const params = useSearchParams();
  const client = useQueryClient();
  const feedback = useActionFeedback();

  const [accountId, setAccountId] = useState("");
  const [newBalance, setNewBalance] = useState("");
  const [balanceDate, setBalanceDate] = useState("");

  const { data: accounts = [], isLoading } = useQuery({ queryKey: ["accounts"], queryFn: endpoints.accounts });
  const selected = useMemo(() => accounts.find((item) => item.id === accountId), [accounts, accountId]);

  // Preselect account from ?account_id= or the first account.
  useEffect(() => {
    if (accountId) return;
    const fromQuery = params.get("account_id");
    if (fromQuery && accounts.some((item) => item.id === fromQuery)) {
      setAccountId(fromQuery);
    } else if (accounts.length > 0) {
      setAccountId(accounts[0].id);
    }
  }, [accounts, accountId, params]);

  useEffect(() => {
    setBalanceDate(today());
  }, []);

  const save = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error("Pilih rekening terlebih dahulu.");
      // Reuse existing updateAccount endpoint. Keep account_name & category unchanged,
      // only the current_balance is updated. Balance date (optional) is appended to
      // notes so no API/schema change is required.
      const trimmedDate = balanceDate?.trim();
      const baseNotes = selected.notes?.trim() ?? "";
      const notes = trimmedDate ? `${baseNotes ? `${baseNotes}\n` : ""}Saldo diperbarui pada ${trimmedDate}` : baseNotes;
      return endpoints.updateAccount(selected.id, {
        account_name: selected.account_name,
        category: selected.category,
        current_balance: newBalance,
        notes
      });
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["accounts"] });
      client.invalidateQueries({ queryKey: ["summary"] });
      setActionFeedbackFlash({ type: "success", title: "Saldo diperbarui", message: "Saldo rekening berhasil disimpan." });
      router.push("/accounts");
    },
    onError: (error) => feedback.showError("Gagal menyimpan saldo", (error as Error).message)
  });

  const amountValid = Number(newBalance) > 0;

  return (
    <AppShell>
      <ActionFeedback feedback={feedback.feedback} onClose={feedback.clear} />
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/accounts"
            className="grid h-10 w-10 place-items-center rounded-full text-[var(--text-primary)] transition hover:bg-[var(--surface-muted)] active:scale-95"
            aria-label="Kembali"
          >
            <ArrowLeft size={24} strokeWidth={2.25} />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)] lg:text-2xl">Input Saldo Rekening</h1>
            <p className="mt-0.5 text-sm text-[var(--text-secondary)]">Perbarui saldo rekening secara manual.</p>
          </div>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (amountValid && selected) save.mutate();
          }}
          className="space-y-6"
        >
          {/* Select account */}
          <div className="panel p-5 sm:p-6">
            <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Rekening</label>
            <CustomDropdown
              value={accountId}
              placeholder="Pilih rekening"
              options={accounts.map((item) => ({
                value: item.id,
                label: item.account_name,
                description: `${accountCategoryLabel(item.category)} · ${formatIDR(item.current_balance)}`
              }))}
              onChange={setAccountId}
              buttonClassName="rounded-[var(--radius)] border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-3 text-[15px] font-semibold text-[var(--text-primary)]"
            />

            {/* Current balance (read-only reference) */}
            <div className="mt-5 flex items-center gap-3 rounded-[var(--radius)] bg-[var(--surface-muted)] p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-[var(--primary-strong)]">
                <Wallet size={20} />
              </span>
              <div className="min-w-0">
                <p className="section-heading">Saldo Saat Ini</p>
                <p className="number-align mt-0.5 truncate text-lg font-bold text-[var(--text-primary)]">
                  {isLoading ? "…" : formatIDR(selected?.current_balance ?? 0)}
                </p>
              </div>
            </div>
          </div>

          {/* New balance — the prominent focal input */}
          <div className="panel flex flex-col items-center p-5 text-center sm:p-6">
            <label className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">Saldo Terbaru</label>
            <AmountField
              value={newBalance}
              onValueChange={setNewBalance}
              ariaLabel="Saldo terbaru dalam Rupiah"
              className="text-[var(--primary-strong)]"
            />
            <div className="mt-3 h-px w-24 bg-[var(--border)]" />
            {!amountValid && newBalance.length > 0 && (
              <p className="mt-3 text-sm font-semibold text-[var(--expense)]">Saldo harus lebih besar dari 0.</p>
            )}
          </div>

          {/* Balance date (optional) */}
          <div className="panel p-5 sm:p-6">
            <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
              Tanggal Saldo <span className="font-normal text-[var(--text-muted)]">(opsional)</span>
            </label>
            <div className="relative">
              <input
                type="date"
                value={balanceDate}
                onChange={(event) => setBalanceDate(event.target.value)}
                className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-3 pr-12 text-[15px] font-normal text-[var(--text-primary)] outline-none transition [color-scheme:light] focus:border-[var(--primary-strong)] focus:ring-1 focus:ring-[var(--primary-strong)] [&::-webkit-calendar-picker-indicator]:opacity-0"
              />
              <CalendarDays className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-muted)]" strokeWidth={2.25} />
            </div>
          </div>

          {save.error && <p className="text-sm font-semibold text-[var(--expense)]">{(save.error as Error).message}</p>}

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              className="rounded-[var(--radius)] bg-[var(--primary-strong)] px-6 py-4 text-[16px] font-semibold text-white transition hover:bg-[#005236] active:scale-[0.99]"
              disabled={save.isPending || !amountValid || !selected}
            >
              <Save className="h-5 w-5" strokeWidth={2.5} />
              {save.isPending ? "Menyimpan..." : "Simpan Saldo"}
            </Button>
            <Link
              href="/accounts"
              className="rounded-[var(--radius)] border border-[var(--border-strong)] bg-white px-6 py-4 text-[16px] font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)] active:scale-[0.99]"
            >
              Batal
            </Link>
          </div>
        </form>
      </div>
    </AppShell>
  );
}

export default function UpdateBalancePage() {
  return (
    <Suspense fallback={null}>
      <UpdateBalanceForm />
    </Suspense>
  );
}
