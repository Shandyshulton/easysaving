"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
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
    <main className="min-h-screen bg-[#f7f9fb] pb-10">
      <ActionFeedback feedback={feedback.feedback} onClose={feedback.clear} />
      <header className="sticky top-0 z-30 w-full bg-white shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
        <div className="mx-auto grid h-14 max-w-[1200px] grid-cols-[40px_1fr_40px] items-center px-5 py-2">
          <Link href="/transactions" className="grid h-10 w-10 place-items-center rounded-full text-[#3c4a42] transition hover:bg-[#f2f4f6] active:scale-95">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-center text-xl font-semibold leading-7 text-[#006c49]">Tambah Transaksi</h1>
          <div />
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-[1200px] flex-col items-center px-5 py-8">
        <form
          className="flex w-full max-w-lg flex-col gap-8 rounded-xl bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.05)]"
          onSubmit={form.handleSubmit((values) => save.mutate(values))}
        >
          <div className="grid grid-cols-2 rounded-lg bg-[#f2f4f6] p-1">
            <button
              type="button"
              className={`rounded-md py-2 text-sm font-semibold leading-5 transition ${type === "expense" ? "bg-[#10b981] text-[#00422b] shadow-sm" : "text-[#3c4a42]"}`}
              onClick={() => {
                form.setValue("type", "expense");
                form.setValue("category_id", "");
              }}
            >
              Pengeluaran
            </button>
            <button
              type="button"
              className={`rounded-md py-2 text-sm font-semibold leading-5 transition ${type === "income" ? "bg-[#10b981] text-[#00422b] shadow-sm" : "text-[#3c4a42]"}`}
              onClick={() => {
                form.setValue("type", "income");
                form.setValue("category_id", "");
              }}
            >
              Pemasukan
            </button>
          </div>

          <div className="flex flex-col items-center justify-center border-b border-[#e0e3e5] py-5">
            <label className="mb-2 text-sm font-semibold leading-5 text-[#64748b]">Jumlah</label>
            <div className={`amount-display-font flex w-full items-center ${type === "expense" ? "text-[#a83639]" : "text-[#006c49]"}`}>
              <span className="mr-3 text-[38px] font-black leading-10">Rp</span>
              <NumericInput
                placeholder="0"
                className={`amount-display-font w-full border-none bg-transparent p-0 text-center text-[40px] font-black leading-[48px] outline-none ring-0 placeholder:text-[#e0e3e5] focus:ring-0 sm:text-[56px] sm:leading-[64px] ${type === "expense" ? "text-[#a83639]" : "text-[#006c49]"}`}
                value={amount}
                onValueChange={(value) => form.setValue("amount", value, { shouldDirty: true, shouldValidate: true })}
              />
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <label className="flex flex-col gap-3">
              <span className="text-sm font-semibold leading-5 text-[#191c1e]">Kategori</span>
              <CustomDropdown
                value={categoryID}
                placeholder="Pilih Kategori"
                options={categories.map((item) => ({ value: item.id, label: item.name }))}
                onChange={(value) => form.setValue("category_id", value, { shouldValidate: true })}
              />
            </label>

            <label className="flex flex-col gap-3">
              <span className="text-sm font-semibold leading-5 text-[#191c1e]">Rekening</span>
              <CustomDropdown
                value={accountID}
                placeholder="Pilih Rekening"
                options={accounts.map((item) => ({ value: item.id, label: item.account_name }))}
                onChange={(value) => {
                  form.setValue("account_id", value, { shouldValidate: true });
                  setAccountId(value);
                }}
              />
            </label>

            <label className="flex flex-col gap-3">
              <span className="text-sm font-semibold leading-5 text-[#191c1e]">Tanggal</span>
              <div className="relative">
                <input
                  type="date"
                  className="w-full rounded-lg border border-[#bbcabf] bg-white px-4 py-3 text-base leading-6 text-[#191c1e] outline-none transition focus:border-[#006c49] focus:ring-1 focus:ring-[#006c49]"
                  {...form.register("transaction_date")}
                />
              </div>
            </label>

            <label className="flex flex-col gap-3">
              <span className="text-sm font-semibold leading-5 text-[#191c1e]">Catatan</span>
              <textarea
                className="min-h-[104px] w-full resize-none rounded-lg border border-[#bbcabf] bg-white px-4 py-3 text-base leading-6 text-[#191c1e] outline-none placeholder:text-[#64748b] transition focus:border-[#006c49] focus:ring-1 focus:ring-[#006c49]"
                placeholder="Tambahkan detail transaksi..."
                {...form.register("notes")}
              />
            </label>
          </div>

          {(form.formState.errors.amount || form.formState.errors.category_id || form.formState.errors.account_id || form.formState.errors.transaction_date) && (
            <p className="text-sm font-semibold text-[#a83639]">Lengkapi jumlah, kategori, rekening, dan tanggal.</p>
          )}
          {save.error && <p className="text-sm font-semibold text-[#a83639]">{save.error.message}</p>}

          <Button className="mt-4 w-full rounded-full bg-[#006c49] px-6 py-4 text-sm font-semibold leading-5 text-white shadow-[0_4px_20px_rgba(15,23,42,0.05)] transition active:scale-95 hover:bg-[#005236]" disabled={save.isPending || !amount}>
            Simpan Transaksi
          </Button>
        </form>
      </section>
    </main>
  );
}
