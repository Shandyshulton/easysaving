"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Save, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomDropdown } from "@/components/ui/custom-dropdown";
import { NumericInput } from "@/components/ui/numeric-input";
import { ActionFeedback, setActionFeedbackFlash, useActionFeedback } from "@/components/ui/action-feedback";
import { endpoints } from "@/services/api/easysaving";
import { accountCategoryOptions } from "@/lib/account-options";

const editAccountSchema = z.object({
  account_name: z.string().min(2, "Nama rekening minimal 2 karakter").max(120),
  category: z.enum(["bank", "wallet", "cash", "investment", "other"]),
  current_balance: z.string().refine((v) => Number(v) > 0, "Saldo harus lebih besar dari 0"),
  notes: z.string().optional()
});

type EditAccountForm = z.infer<typeof editAccountSchema>;

export default function EditAccountPage() {
  const params = useParams<{ id: string }>();
  const accountID = params.id;
  const router = useRouter();
  const client = useQueryClient();
  const feedback = useActionFeedback();
  const { data: accounts = [], isLoading } = useQuery({ queryKey: ["accounts"], queryFn: endpoints.accounts });
  const account = accounts.find((item) => item.id === accountID);
  const form = useForm<EditAccountForm>({
    resolver: zodResolver(editAccountSchema),
    defaultValues: { account_name: "", category: "bank", current_balance: "", notes: "" }
  });
  const balance = form.watch("current_balance");
  const category = form.watch("category");
  const save = useMutation({
    mutationFn: (values: EditAccountForm) => endpoints.updateAccount(accountID, values),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["accounts"] });
      client.invalidateQueries({ queryKey: ["transactions", accountID] });
      client.invalidateQueries({ queryKey: ["summary"] });
      setActionFeedbackFlash({ type: "success", title: "Rekening diperbarui", message: "Perubahan rekening sudah tersimpan." });
      router.push("/accounts");
    },
    onError: (error) => {
      feedback.showError("Gagal memperbarui rekening", (error as Error).message);
    }
  });

  useEffect(() => {
    if (!account) return;
    form.reset({
      account_name: account.account_name,
      category: account.category ?? "bank",
      current_balance: account.current_balance,
      notes: account.notes ?? ""
    });
  }, [account, form]);

  return (
    <main className="min-h-screen bg-[#f7f9fb] pb-32 text-[#0F172A]">
      <ActionFeedback feedback={feedback.feedback} onClose={feedback.clear} />
      <header className="fixed top-0 z-50 w-full bg-[#f7f9fb]/90 shadow-[0_4px_20px_rgba(15,23,42,0.02)] backdrop-blur-md">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-5 py-4">
          <Link href="/accounts" className="grid h-10 w-10 place-items-center rounded-full transition hover:bg-[#e6e8ea] active:scale-95">
            <ArrowLeft size={28} />
          </Link>
          <h1 className="absolute left-1/2 -translate-x-1/2 text-xl font-semibold leading-7">Edit Rekening</h1>
          <div className="h-10 w-10" />
        </div>
      </header>

      <form onSubmit={form.handleSubmit((values) => save.mutate(values))}>
        <main className="mx-auto flex w-full max-w-[600px] flex-col px-5 pb-8 pt-24">
          <section className="flex flex-col items-center justify-center py-8">
            <span className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#64748B]">Saldo Saat Ini</span>
            <div className="group flex w-full items-baseline justify-center">
              <span className="mr-2 text-[46px] font-black leading-[54px] text-[#006c49] transition group-focus-within:text-[#00543a]">Rp</span>
              <NumericInput
                placeholder="0"
                className="m-0 w-full max-w-[270px] border-none bg-transparent p-0 text-left text-[46px] font-black leading-[54px] tracking-normal text-[#006c49] outline-none placeholder:text-[#d8dadc] focus:ring-0"
                value={balance}
                onValueChange={(value) => form.setValue("current_balance", value, { shouldDirty: true, shouldValidate: true })}
              />
            </div>
            <div className="mt-3 h-0.5 w-32 rounded-full bg-[#e6e8ea]" />
          </section>

          <section className="rounded-xl bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
            <label className="mb-6 block">
              <span className="mb-1 block text-sm font-semibold leading-5">Nama Rekening</span>
              <div className="relative">
                <WalletCards className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" size={20} />
                <input
                  className="w-full rounded-lg border border-[#bbcabf] bg-[#f7f9fb] py-3 pl-10 pr-4 text-sm leading-5 outline-none placeholder:text-[#64748B]/50 focus:border-[#006c49] focus:ring-1 focus:ring-[#006c49]"
                  placeholder="Misal: BCA, Dompet Utama"
                  {...form.register("account_name")}
                />
              </div>
            </label>

            <label className="mb-6 block">
              <span className="mb-1 block text-sm font-semibold leading-5">Jenis</span>
              <CustomDropdown
                value={category}
                options={accountCategoryOptions}
                placeholder="Pilih jenis rekening"
                onChange={(value) => form.setValue("category", value as EditAccountForm["category"], { shouldValidate: true })}
                buttonClassName="rounded-lg border-[#bbcabf] bg-[#f7f9fb] text-sm"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-semibold leading-5">
                Catatan <span className="font-normal text-[#64748B]">(Opsional)</span>
              </span>
              <textarea
                className="min-h-[104px] w-full resize-none rounded-lg border border-[#bbcabf] bg-[#f7f9fb] px-4 py-3 text-sm leading-5 outline-none placeholder:text-[#64748B]/50 focus:border-[#006c49] focus:ring-1 focus:ring-[#006c49]"
                placeholder="Tujuan atau deskripsi rekening..."
                {...form.register("notes")}
              />
            </label>
          </section>

          {isLoading && <p className="mt-4 text-sm font-semibold text-[#64748B]">Memuat rekening...</p>}
          {!isLoading && !account && <p className="mt-4 text-sm font-semibold text-[#ba1a1a]">Rekening tidak ditemukan.</p>}
          {(form.formState.errors.account_name || form.formState.errors.category || form.formState.errors.current_balance) && (
            <p className="mt-4 text-sm font-semibold text-[#ba1a1a]">{form.formState.errors.account_name?.message ?? form.formState.errors.category?.message ?? form.formState.errors.current_balance?.message}</p>
          )}
          {save.error && <p className="mt-4 text-sm font-semibold text-[#ba1a1a]">{save.error.message}</p>}
        </main>

        <div className="fixed bottom-0 z-40 w-full bg-gradient-to-t from-[#f7f9fb] via-[#f7f9fb]/95 to-transparent px-5 pb-5 pt-8">
          <div className="mx-auto max-w-[600px]">
            <Button
              className="w-full rounded-full bg-[#006c49] px-6 py-4 text-sm font-semibold text-white shadow-[0_4px_20px_rgba(0,108,73,0.3)] hover:bg-[#006c49]"
              disabled={save.isPending || !balance || !account}
            >
              <Save size={20} />
              Simpan Perubahan
            </Button>
          </div>
        </div>
      </form>
    </main>
  );
}
