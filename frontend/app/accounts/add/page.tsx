"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Save, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomDropdown } from "@/components/ui/custom-dropdown";
import { NumericInput } from "@/components/ui/numeric-input";
import { ActionFeedback, setActionFeedbackFlash, useActionFeedback } from "@/components/ui/action-feedback";
import { endpoints } from "@/services/api/easysaving";
import { accountSchema } from "@/schemas/forms";
import { accountCategoryOptions } from "@/lib/account-options";

export default function AddAccountPage() {
  const router = useRouter();
  const client = useQueryClient();
  const feedback = useActionFeedback();
  const form = useForm<z.infer<typeof accountSchema>>({
    resolver: zodResolver(accountSchema),
    defaultValues: { account_name: "", category: "bank", initial_balance: "", notes: "" }
  });
  const balance = form.watch("initial_balance");
  const category = form.watch("category");
  const save = useMutation({
    mutationFn: (values: z.infer<typeof accountSchema>) => endpoints.createAccount(values),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["accounts"] });
      setActionFeedbackFlash({ type: "success", title: "Rekening dibuat", message: "Rekening baru sudah siap digunakan." });
      router.push("/accounts");
    },
    onError: (error) => {
      feedback.showError("Gagal membuat rekening", (error as Error).message);
    }
  });

  return (
    <main className="min-h-screen bg-[#f7f9fb] pb-32 text-[#0F172A]">
      <ActionFeedback feedback={feedback.feedback} onClose={feedback.clear} />
      <header className="fixed top-0 z-50 w-full bg-[#f7f9fb]/90 shadow-[0_4px_20px_rgba(15,23,42,0.02)] backdrop-blur-md">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-5 py-4">
          <Link href="/accounts" className="grid h-10 w-10 place-items-center rounded-full transition hover:bg-[#e6e8ea] active:scale-95">
            <ArrowLeft size={28} />
          </Link>
          <h1 className="absolute left-1/2 -translate-x-1/2 text-xl font-semibold leading-7">Tambah Rekening</h1>
          <div className="h-10 w-10" />
        </div>
      </header>

      <form onSubmit={form.handleSubmit((values) => save.mutate(values))}>
        <div className="mx-auto flex w-full max-w-[600px] flex-col px-5 pb-8 pt-28">
          <section className="flex flex-col items-center justify-center pb-11 pt-7">
            <span className="mb-5 text-xs font-bold uppercase tracking-[0.26em] text-[#6b7788]">Saldo Awal</span>
            <div className="group flex min-h-[88px] w-full items-center justify-center">
              <span className="mr-3 block text-[60px] font-black leading-none text-[#006c49] transition group-focus-within:text-[#00543a] sm:text-[68px]">Rp</span>
              <NumericInput
                placeholder="0"
                className="m-0 h-[88px] min-w-0 max-w-[420px] flex-1 border-none bg-transparent p-0 text-left text-[60px] font-bold leading-none tracking-normal text-[#006c49] caret-[#00543a] outline-none placeholder:text-[#cbd1d6] focus:ring-0 sm:text-[68px]"
                value={balance}
                onValueChange={(value) => form.setValue("initial_balance", value, { shouldDirty: true, shouldValidate: true })}
              />
            </div>
            <div className="mt-5 h-0.5 w-36 rounded-full bg-[#dde3e6]" />
          </section>

          <section className="rounded-[28px] bg-white p-6 shadow-[0_16px_42px_rgba(15,23,42,0.06)] sm:p-7">
            <label className="mb-7 block">
              <span className="mb-3 block text-sm font-bold leading-5">Nama Rekening</span>
              <div className="relative">
                <WalletCards className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" size={20} />
                <input
                  className="h-14 w-full rounded-xl border border-[#bbcabf] bg-[#f7f9fb] pl-11 pr-4 text-base leading-6 outline-none placeholder:text-[#64748B]/50 focus:border-[#006c49] focus:ring-1 focus:ring-[#006c49]"
                  placeholder="Misal: BCA, Dompet Utama"
                  {...form.register("account_name")}
                />
              </div>
            </label>

            <label className="mb-7 block">
              <span className="mb-3 block text-sm font-bold leading-5">Jenis</span>
              <CustomDropdown
                value={category}
                options={accountCategoryOptions}
                placeholder="Pilih jenis rekening"
                onChange={(value) => form.setValue("category", value as z.infer<typeof accountSchema>["category"], { shouldValidate: true })}
                buttonClassName="min-h-14 rounded-xl border-[#bbcabf] bg-[#f7f9fb] text-base"
              />
            </label>

            <label className="block">
              <span className="mb-3 block text-sm font-bold leading-5">
                Catatan <span className="font-normal text-[#64748B]">(Opsional)</span>
              </span>
              <textarea
                className="min-h-[128px] w-full resize-none rounded-xl border border-[#bbcabf] bg-[#f7f9fb] px-4 py-4 text-base leading-6 outline-none placeholder:text-[#64748B]/50 focus:border-[#006c49] focus:ring-1 focus:ring-[#006c49]"
                placeholder="Tujuan atau deskripsi rekening..."
                {...form.register("notes")}
              />
            </label>
          </section>

          {(form.formState.errors.account_name || form.formState.errors.category || form.formState.errors.initial_balance) && (
            <p className="mt-4 text-sm font-semibold text-[#ba1a1a]">{form.formState.errors.account_name?.message ?? form.formState.errors.category?.message ?? form.formState.errors.initial_balance?.message}</p>
          )}
          {save.error && <p className="mt-4 text-sm font-semibold text-[#ba1a1a]">{save.error.message}</p>}
        </div>

        <div className="fixed bottom-0 z-40 w-full bg-gradient-to-t from-[#f7f9fb] via-[#f7f9fb]/95 to-transparent px-5 pb-5 pt-8">
          <div className="mx-auto max-w-[600px]">
            <Button className="w-full rounded-full bg-[#006c49] px-6 py-4 text-base font-semibold text-white shadow-[0_4px_20px_rgba(0,108,73,0.3)] hover:bg-[#006c49] disabled:bg-[#79ae99] disabled:text-white disabled:opacity-100 disabled:shadow-[0_4px_18px_rgba(0,108,73,0.16)]" disabled={save.isPending || !balance}>
              <Save size={20} />
              Simpan Rekening
            </Button>
          </div>
        </div>
      </form>
    </main>
  );
}
