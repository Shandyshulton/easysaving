"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, CheckCircle2, Landmark, Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ActionFeedback, useActionFeedback } from "@/components/ui/action-feedback";
import { endpoints } from "@/services/api/easysaving";
import { useActiveAccountId } from "@/hooks/use-active-account";
import { formatIDR } from "@/lib/utils";
import { accountCategoryLabel } from "@/lib/account-options";
import type { Account } from "@/types/api";

function iconTone(name: string, index: number) {
  const lower = name.toLowerCase();
  if (lower.includes("dana")) return { Icon: Wallet, iconText: "text-[#0ea5e9]", accent: "from-[#0ea5e9] via-[#0284c7] to-[#2563eb]" };
  if (lower.includes("gopay")) return { Icon: Wallet, iconText: "text-[#059669]", accent: "from-[#059669] via-[#0d9488] to-[#14b8a6]" };
  if (lower.includes("bca")) return { Icon: Landmark, iconText: "text-[#1d4ed8]", accent: "from-[#1e3a8a] via-[#1d4ed8] to-[#0ea5e9]" };
  if (index % 2 === 1) return { Icon: Landmark, iconText: "text-[#006c49]", accent: "from-[#0f172a] via-[#1e293b] to-[#334155]" };
  return { Icon: Building2, iconText: "text-[#006c49]", accent: "from-[#006c49] via-[#07865f] to-[#10b981]" };
}

export default function AccountsPage() {
  const client = useQueryClient();
  const { accountId, setAccountId } = useActiveAccountId();
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);
  const feedback = useActionFeedback();
  const { data: accounts = [] } = useQuery({ queryKey: ["accounts"], queryFn: endpoints.accounts });
  const deleteAccount = useMutation({
    mutationFn: endpoints.deleteAccount,
    onSuccess: (_, deletedId) => {
      if (accountId === deletedId) setAccountId("");
      client.invalidateQueries({ queryKey: ["accounts"] });
      client.invalidateQueries({ queryKey: ["transactions"] });
      client.invalidateQueries({ queryKey: ["summary"] });
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
      <div className="mx-auto max-w-[1200px]">
        <section className="mb-8 overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0f172a] via-[#00543a] to-[#10b981] p-6 text-white shadow-[0_18px_48px_rgba(0,108,73,0.22)] md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/60">Halaman Akun Terpadu</p>
              <h1 className="mt-2 text-2xl font-bold leading-8 md:text-[32px] md:leading-10">Pilih & Kelola Rekening</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-white/72">
                {activeAccount ? `${activeAccount.account_name} sedang aktif untuk dashboard dan history.` : "Semua rekening sedang digabung sebagai saldo utama."}
              </p>
            </div>
            <div className="rounded-3xl bg-white/12 p-4 backdrop-blur-md">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">Total Saldo Gabungan</p>
              <p className="mt-1 text-[30px] font-bold leading-9 text-white number-align md:text-[38px] md:leading-[46px]">
                {formatIDR(totalBalance)}
              </p>
            </div>
          </div>
          <div className="mt-6">
            <Link
              href="/accounts/add"
              className="inline-flex items-center gap-3 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#006c49] shadow-[0_12px_30px_rgba(15,23,42,0.16)] transition hover:bg-[#e8f7f0] active:scale-95"
            >
              <Plus size={20} />
              Tambah Rekening
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((item, index) => {
            const tone = iconTone(item.account_name, index);
            const Icon = tone.Icon;
            const isActive = item.id === accountId;
            return (
              <article
                key={item.id}
                className={`group relative overflow-hidden rounded-[28px] bg-gradient-to-br ${tone.accent} p-[1px] shadow-[0_12px_34px_rgba(15,23,42,0.10)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_44px_rgba(15,23,42,0.16)] ${isActive ? "ring-4 ring-[#10b981]/25" : ""}`}
              >
                <div className="overflow-hidden rounded-[27px] bg-white">
                  <div className={`relative min-h-[148px] bg-gradient-to-br ${isActive ? "from-[#111827] via-[#1f2937] to-[#0f172a]" : tone.accent} px-5 pb-5 pt-5 text-white`}>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(255,255,255,0.26),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.10),transparent_42%)]" />
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setAccountId(item.id)}
                        className={`relative inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold shadow-sm transition active:scale-95 ${isActive ? "bg-white text-[#006c49]" : "bg-white/20 text-white backdrop-blur hover:bg-white/30"}`}
                      >
                        {isActive ? <CheckCircle2 size={16} /> : null}
                        {isActive ? "Aktif" : "Pilih Akun"}
                      </button>
                      <div className="flex gap-2">
                        <Link
                          href={`/accounts/${item.id}/edit`}
                          aria-label={`Edit ${item.account_name}`}
                          className="relative grid h-9 w-9 place-items-center rounded-full bg-white/20 text-white shadow-sm backdrop-blur transition hover:bg-white/30 active:scale-95"
                        >
                          <Pencil size={17} />
                        </Link>
                        <button
                          type="button"
                          aria-label={`Hapus ${item.account_name}`}
                          disabled={deleteAccount.isPending}
                          onClick={() => setDeleteTarget(item)}
                          className="relative grid h-9 w-9 place-items-center rounded-full bg-white/20 text-white shadow-sm backdrop-blur transition hover:bg-[#ffdad8] hover:text-[#ba1a1a] active:scale-95 disabled:opacity-60"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </div>

                    <Link href={`/accounts/${item.id}`} className="relative mt-7 flex items-center gap-4">
                        <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-[18px] bg-white ${tone.iconText} shadow-[0_12px_28px_rgba(15,23,42,0.22)] ring-1 ring-white/70`}>
                          <Icon size={27} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h2 className="truncate text-xl font-black leading-7 text-white drop-shadow-sm">{item.account_name}</h2>
                          <p className="mt-1 inline-flex max-w-full items-center rounded-full bg-white/16 px-2.5 py-1 text-xs font-bold text-white/90 shadow-sm backdrop-blur">
                            <span className="truncate">{accountCategoryLabel(item.category)}</span>
                          </p>
                        </div>
                    </Link>
                  </div>

                  <Link href={`/accounts/${item.id}`} className="block px-5 pb-5 pt-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748B]">Saldo Terkini</p>
                    <p className="mt-1 break-words text-[28px] font-bold leading-9 text-[#0F172A] number-align">{formatIDR(item.current_balance)}</p>
                    <div className="mt-5 rounded-2xl bg-[#f7f9fb] p-3.5 ring-1 ring-[#eef2f5]">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#64748B]">Kategori</p>
                      <p className="mt-1 truncate text-sm font-semibold text-[#0F172A]">{accountCategoryLabel(item.category)}</p>
                    </div>
                    {item.notes ? <p className="mt-3 line-clamp-2 text-sm leading-5 text-[#64748B]">{item.notes}</p> : null}
                  </Link>
                </div>
              </article>
            );
          })}

          <Link
            href="/accounts/add"
            className="group grid min-h-[238px] place-items-center rounded-[28px] border-2 border-dashed border-[#b7e4d1] bg-[#e8f7f0]/70 p-6 text-center shadow-[0_8px_24px_rgba(0,108,73,0.08)] transition duration-300 hover:-translate-y-1 hover:border-[#10b981] hover:bg-[#e8f7f0]"
          >
            <div>
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#006c49] text-white shadow-[0_12px_30px_rgba(0,108,73,0.24)] transition group-hover:scale-105">
                <Plus size={30} />
              </span>
              <h2 className="mt-4 text-lg font-bold text-[#0F172A]">Tambah Rekening Baru</h2>
              <p className="mt-1 text-sm leading-5 text-[#64748B]">Hubungkan saldo lain untuk laporan yang lebih lengkap.</p>
            </div>
          </Link>
        </section>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Hapus ${deleteTarget?.account_name ?? "rekening"}?`}
        description="Rekening dan seluruh transaksi yang terhubung akan dihapus permanen dari database."
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
