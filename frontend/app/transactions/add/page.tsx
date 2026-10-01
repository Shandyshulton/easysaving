"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, CalendarDays, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomDropdown } from "@/components/ui/custom-dropdown";
import { AmountField } from "@/components/ui/amount-field";
import { ActionFeedback, setActionFeedbackFlash, useActionFeedback } from "@/components/ui/action-feedback";
import { endpoints } from "@/services/api/easysaving";
import { useActiveAccountId } from "@/hooks/use-active-account";
import { today } from "@/lib/utils";
import { transactionSchema } from "@/schemas/forms";

type TxForm = z.infer<typeof transactionSchema>;

const emptyForm: TxForm = { type: "expense", amount: "", category_id: "", account_id: "", transaction_date: today(), notes: "" };

export default function AddTransactionPage() {
  const router = useRouter();
  const client = useQueryClient();
  const feedback = useActionFeedback();
  const form = useForm<TxForm>({
    resolver: zodResolver(transactionSchema),
    defaultValues: emptyForm
  });
  const type = form.watch("type");
  const amount = form.watch("amount");
  const accountID = form.watch("account_id");
  const categoryID = form.watch("category_id");
  const { accountId, setAccountId } = useActiveAccountId();
  const { data: accounts = [] } = useQuery({ queryKey: ["accounts"], queryFn: endpoints.accounts });
  const { data: categories = [] } = useQuery({ queryKey: ["categories", type], queryFn: () => endpoints.categories(type) });
  const save = useMutation({
    mutationFn: (values: TxForm) => endpoints.createTransaction(values),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["transactions"] });
      client.invalidateQueries({ queryKey: ["summary"] });
      client.invalidateQueries({ queryKey: ["accounts"] });
      setActionFeedbackFlash({ type: "success", title: "Transaksi tersimpan", message: "Riwayat dan ringkasan saldo sudah diperbarui." });
      router.push("/transactions");
    },
    onError: (error) => {
      feedback.showError("Gagal menyimpan transaksi", (error as Error).message);
    }
  });

  useEffect(() => {
    if (accountId && !accountID) form.setValue("account_id", accountId, { shouldValidate: true });
  }, [accountID, accountId, form]);

  return (
    <main className="flex min-h-screen justify-center bg-[var(--background)]">
      <ActionFeedback feedback={feedback.feedback} onClose={feedback.clear} />
      <form className="relative flex min-h-screen w-full max-w-md flex-col bg-[var(--background)] lg:max-w-3xl" onSubmit={form.handleSubmit((values) => save.mutate(values))}>
        <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-white px-4 py-4">
          <div className="mx-auto grid w-full max-w-3xl grid-cols-[40px_1fr_40px] items-center">
            <Link href="/transactions" className="-ml-2 grid h-10 w-10 place-items-center text-[var(--text-primary)] transition hover:text-[var(--primary-strong)] active:scale-95" aria-label="Kembali">
              <ArrowLeft size={26} strokeWidth={2.25} />
            </Link>
            <h1 className="text-center text-lg font-semibold text-[var(--text-primary)]">Tambah Transaksi</h1>
            <div />
          </div>
        </header>

        <section className="scrollbar-hide flex-1 overflow-y-auto px-4 pb-28 lg:pb-8">
          <div className="mx-auto w-full max-w-3xl">
            {/* Type toggle + prominent amount */}
            <div className="mt-6 flex justify-center">
              <div className="grid w-full max-w-xs grid-cols-2 rounded-[var(--radius)] bg-[var(--surface-muted)] p-1">
                <button
                  type="button"
                  className={`rounded-[var(--radius-sm)] px-4 py-2.5 text-[15px] font-semibold leading-6 transition ${
                    type === "expense"
                      ? "bg-[var(--expense)] text-white shadow-sm"
                      : "bg-transparent text-[var(--expense)]"
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
                  className={`rounded-[var(--radius-sm)] px-4 py-2.5 text-[15px] font-semibold leading-6 transition ${
                    type === "income"
                      ? "bg-[var(--income)] text-white shadow-sm"
                      : "bg-transparent text-[var(--income)]"
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

            <div className="mt-8 flex flex-col items-center text-center lg:mt-10">
              <label className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">Jumlah</label>
              <AmountField
                value={amount}
                onValueChange={(value) => form.setValue("amount", value, { shouldDirty: true, shouldValidate: true })}
                className={type === "income" ? "text-[var(--income)]" : "text-[var(--expense)]"}
              />
              <div className="mt-3 h-px w-24 bg-[var(--border)]" />
            </div>

            {/* Fields: single column on mobile, two columns on desktop */}
            <div className="panel mt-8 p-5 sm:p-6">
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Kategori</label>
                  <CustomDropdown
                    value={categoryID}
                    placeholder="Pilih Kategori"
                    options={categories.map((item) => ({ value: item.id, label: item.name }))}
                    onChange={(value) => form.setValue("category_id", value, { shouldValidate: true })}
                    buttonClassName="rounded-[var(--radius)] border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-3 text-[15px] font-normal text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] focus:border-[var(--primary-strong)] focus:ring-[var(--primary-strong)] [&>svg]:text-[var(--text-muted)]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Rekening</label>
                  <CustomDropdown
                    value={accountID}
                    placeholder="Pilih Rekening"
                    options={accounts.map((item) => ({ value: item.id, label: item.account_name }))}
                    onChange={(value) => {
                      form.setValue("account_id", value, { shouldValidate: true });
                      setAccountId(value);
                    }}
                    buttonClassName="rounded-[var(--radius)] border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-3 text-[15px] font-normal text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] focus:border-[var(--primary-strong)] focus:ring-[var(--primary-strong)] [&>svg]:text-[var(--text-muted)]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Tanggal</label>
                  <div className="relative">
                    <input
                      type="date"
                      className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-3 pr-12 text-[15px] font-normal text-[var(--text-primary)] outline-none transition [color-scheme:light] placeholder:text-[var(--text-muted)] focus:border-[var(--primary-strong)] focus:ring-1 focus:ring-[var(--primary-strong)] [&::-webkit-calendar-picker-indicator]:opacity-0"
                      {...form.register("transaction_date")}
                    />
                    <CalendarDays className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-muted)]" strokeWidth={2.25} />
                  </div>
                </div>

                <div className="lg:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Catatan</label>
                  <textarea
                    className="min-h-[96px] w-full resize-none rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-3 text-[15px] font-normal leading-6 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] transition focus:border-[var(--primary-strong)] focus:ring-1 focus:ring-[var(--primary-strong)]"
                    placeholder="Tambahkan detail transaksi..."
                    {...form.register("notes")}
                  />
                </div>
              </div>

              {(form.formState.errors.amount || form.formState.errors.category_id || form.formState.errors.account_id || form.formState.errors.transaction_date) && (
                <p className="mt-4 text-sm font-semibold text-[var(--expense)]">Lengkapi jumlah, kategori, rekening, dan tanggal.</p>
              )}
              {save.error && <p className="mt-4 text-sm font-semibold text-[var(--expense)]">{save.error.message}</p>}

              {/* Desktop inline CTA */}
              <div className="mt-6 hidden items-center gap-3 lg:flex">
                <Button
                  className="rounded-[var(--radius)] bg-[var(--primary-strong)] px-6 py-4 text-[16px] font-semibold text-white transition hover:bg-[#005236] active:scale-[0.99]"
                  disabled={save.isPending || !amount}
                >
                  <Save className="h-5 w-5" strokeWidth={2.5} />
                  {save.isPending ? "Menyimpan..." : "Simpan Transaksi"}
                </Button>
                <Link
                  href="/transactions"
                  className="rounded-[var(--radius)] border border-[var(--border-strong)] bg-white px-6 py-4 text-[16px] font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)] active:scale-[0.99]"
                >
                  Batal
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Mobile sticky CTA */}
        <div className="fixed bottom-0 left-0 right-0 z-30 mx-auto max-w-md space-y-2 bg-[var(--background)]/90 p-4 backdrop-blur-sm lg:hidden">
          <Button
            className="w-full rounded-[var(--radius)] bg-[var(--primary-strong)] px-6 py-4 text-[16px] font-semibold text-white shadow-md transition hover:bg-[#005236] active:scale-[0.98]"
            disabled={save.isPending || !amount}
          >
            <Save className="h-6 w-6" strokeWidth={2.5} />
            {save.isPending ? "Menyimpan..." : "Simpan Transaksi"}
          </Button>
          <Link
            href="/transactions"
            className="flex w-full items-center justify-center rounded-[var(--radius)] border border-[var(--border-strong)] bg-white px-6 py-3 text-[15px] font-semibold text-[var(--text-secondary)] transition active:scale-[0.98]"
          >
            Batal
          </Link>
        </div>
      </form>
    </main>
  );
}
