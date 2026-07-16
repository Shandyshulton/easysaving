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
import { NumericInput } from "@/components/ui/numeric-input";
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
    <main className="flex min-h-screen justify-center bg-[#F8FAFC]">
      <ActionFeedback feedback={feedback.feedback} onClose={feedback.clear} />
      <form className="relative flex min-h-screen w-full max-w-md flex-col bg-[#F8FAFC]" onSubmit={form.handleSubmit((values) => save.mutate(values))}>
        <header className="sticky top-0 z-30 border-b border-[#E2E8F0]/70 bg-[#FFFFFF] px-4 py-4">
          <div className="grid grid-cols-[40px_1fr_40px] items-center">
            <Link href="/transactions" className="-ml-2 grid h-10 w-10 place-items-center text-[#0F172A] transition hover:text-[#065F46] active:scale-95" aria-label="Kembali">
              <ArrowLeft size={28} strokeWidth={2.25} />
            </Link>
            <h1 className="text-center text-[18px] font-semibold leading-7 text-[#0F172A]">Tambah Transaksi</h1>
            <div />
          </div>
        </header>

        <section className="scrollbar-hide flex-1 overflow-y-auto px-4 pb-28">
          <div className="mt-6 flex justify-center">
            <div className="grid w-full max-w-xs grid-cols-2 rounded-[12px] bg-[#F1F5F9] p-1">
              <button
                type="button"
                className={`rounded-lg px-4 py-2.5 text-[16px] font-medium leading-6 transition ${
                  type === "expense" ? "bg-[#10B981] text-white shadow-sm" : "bg-transparent text-[#64748B]"
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
                className={`rounded-lg px-4 py-2.5 text-[16px] font-medium leading-6 transition ${
                  type === "income" ? "bg-[#10B981] text-white shadow-sm" : "bg-transparent text-[#64748B]"
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

          <div className="mt-10 text-center">
            <label className="mb-1 block text-[12px] font-semibold uppercase leading-5 tracking-widest text-[#64748B]">Jumlah</label>
            <div className="transaction-amount-display flex items-baseline justify-center gap-1 text-[#0F172A]">
              <span className="translate-y-[-1px] text-[28px] font-medium leading-none text-[#94a3b8]">Rp</span>
              <NumericInput
                placeholder="0"
                className="transaction-amount-input w-auto max-w-[72vw] border-none bg-transparent p-0 text-left text-[62px] font-extrabold leading-none text-[#0F172A] outline-none ring-0 placeholder:text-[#CBD5E1] focus:ring-0"
                value={amount}
                onValueChange={(value) => form.setValue("amount", value, { shouldDirty: true, shouldValidate: true })}
              />
            </div>
            <div className="mx-auto mt-4 w-32 border-b border-[#E2E8F0]" />
          </div>

          <div className="mt-8 rounded-[24px] bg-[#FFFFFF] p-6 shadow-[0_4px_6px_-1px_rgb(0_0_0_/_0.05),0_2px_4px_-2px_rgb(0_0_0_/_0.05)]">
            <div className="mb-5">
              <label className="mb-2 block text-[14px] font-medium leading-5 text-[#64748B]">Kategori</label>
              <CustomDropdown
                value={categoryID}
                placeholder="Pilih Kategori"
                options={categories.map((item) => ({ value: item.id, label: item.name }))}
                onChange={(value) => form.setValue("category_id", value, { shouldValidate: true })}
                buttonClassName="rounded-[12px] border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-[16px] font-normal leading-6 text-[#0F172A] hover:bg-[#F8FAFC] focus:border-[#065F46] focus:ring-[#065F46] [&>svg]:text-[#94A3B8]"
              />
            </div>

            <div className="mb-5">
              <label className="mb-2 block text-[14px] font-medium leading-5 text-[#64748B]">Rekening</label>
              <CustomDropdown
                value={accountID}
                placeholder="Pilih Rekening"
                options={accounts.map((item) => ({ value: item.id, label: item.account_name }))}
                onChange={(value) => {
                  form.setValue("account_id", value, { shouldValidate: true });
                  setAccountId(value);
                }}
                buttonClassName="rounded-[12px] border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-[16px] font-normal leading-6 text-[#0F172A] hover:bg-[#F8FAFC] focus:border-[#065F46] focus:ring-[#065F46] [&>svg]:text-[#94A3B8]"
              />
            </div>

            <div className="mb-5">
              <label className="mb-2 block text-[14px] font-medium leading-5 text-[#64748B]">Tanggal</label>
              <div className="relative">
                <input
                  type="date"
                  className="w-full rounded-[12px] border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 pr-12 text-[16px] font-normal leading-6 text-[#0F172A] outline-none transition [color-scheme:light] placeholder:text-[#94A3B8] focus:border-[#065F46] focus:ring-1 focus:ring-[#065F46] [&::-webkit-calendar-picker-indicator]:opacity-0"
                  {...form.register("transaction_date")}
                />
                <CalendarDays className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#94A3B8]" strokeWidth={2.25} />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[14px] font-medium leading-5 text-[#64748B]">Catatan</label>
              <textarea
                className="min-h-[116px] w-full resize-none rounded-[12px] border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-[16px] font-normal leading-6 text-[#0F172A] outline-none placeholder:text-[#94A3B8] transition focus:border-[#065F46] focus:ring-1 focus:ring-[#065F46]"
                placeholder="Tambahkan detail transaksi..."
                {...form.register("notes")}
              />
            </div>

            {(form.formState.errors.amount || form.formState.errors.category_id || form.formState.errors.account_id || form.formState.errors.transaction_date) && (
              <p className="mt-4 text-sm font-semibold text-[#a83639]">Lengkapi jumlah, kategori, rekening, dan tanggal.</p>
            )}
            {save.error && <p className="mt-4 text-sm font-semibold text-[#a83639]">{save.error.message}</p>}
          </div>
        </section>

        <div className="fixed bottom-0 left-0 right-0 z-30 mx-auto max-w-md bg-[#F8FAFC]/80 p-4 backdrop-blur-sm">
          <Button
            className="w-full rounded-[16px] bg-[#065F46] px-6 py-4 text-[16px] font-semibold leading-6 text-[#FFFFFF] shadow-lg transition hover:bg-[#064E3B] active:scale-[0.98]"
            disabled={save.isPending || !amount}
          >
            <Save className="h-6 w-6" strokeWidth={2.5} />
            {save.isPending ? "Menyimpan..." : "Simpan Transaksi"}
          </Button>
        </div>
      </form>
    </main>
  );
}
