"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Eye, Filter, Pencil, Search } from "lucide-react";
import { endpoints } from "@/services/api/easysaving";
import { formatIDR } from "@/lib/utils";

export default function AccountDetailPage() {
  const params = useParams<{ id: string }>();
  const accountID = params.id;
  const { data: accounts = [] } = useQuery({ queryKey: ["accounts"], queryFn: endpoints.accounts });
  const { data: transactions = [] } = useQuery({ queryKey: ["transactions", accountID, "recent"], queryFn: () => endpoints.transactions(`?account_id=${accountID}&limit=5`) });
  const account = accounts.find((item) => item.id === accountID);

  return (
    <main className="min-h-screen bg-[#f7f9fb] pb-28">
      <header className="sticky top-0 z-40 bg-[#f7f9fb]/95 backdrop-blur">
        <div className="grid h-16 grid-cols-[44px_1fr_44px] items-center px-5">
          <Link href="/accounts" className="grid h-10 w-10 place-items-center rounded-full text-[#006c49]">
            <ArrowLeft size={23} />
          </Link>
          <h1 className="truncate text-center text-xl font-semibold leading-7 text-[#006c49]">Riwayat {account?.account_name ?? "Rekening"}</h1>
          <Link href={`/accounts/${accountID}/edit`} className="grid h-10 w-10 place-items-center rounded-full text-[#006c49] transition hover:bg-[#e6f4ee] active:scale-95" aria-label="Edit rekening">
            <Pencil size={21} />
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-5">
        <section className="rounded-xl bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.04)]">
          <p className="text-sm leading-5 text-[#64748B]">Saldo Saat Ini</p>
          <div className="mt-1 flex items-center gap-3">
            <p className="text-[32px] font-bold leading-10 text-[#007a50] number-align">{formatIDR(account?.current_balance ?? 0)}</p>
            <Eye size={18} className="text-[#64748B]" />
          </div>
          {account?.notes ? <p className="mt-4 rounded-lg border border-[#e0e3e5] bg-[#f7f9fb] px-4 py-2 text-sm font-medium text-[#64748B]">{account.notes}</p> : null}
        </section>

        <div className="mt-8 grid grid-cols-[1fr_56px] gap-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B]" size={22} />
            <input className="h-12 w-full rounded-lg border border-[#e0e3e5] bg-white pl-12 pr-4 text-sm outline-none focus:border-[#006c49] focus:ring-1 focus:ring-[#006c49]" placeholder="Cari transaksi..." />
          </div>
          <button className="grid h-12 place-items-center rounded-lg border border-[#e0e3e5] bg-white">
            <Filter size={20} />
          </button>
        </div>

        <section className="mt-8 space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[#64748B]">Hari Ini</h2>
          <div className="overflow-hidden rounded-xl bg-white shadow-[0_4px_20px_rgba(15,23,42,0.04)]">
            {transactions.map((item, index) => (
              <div key={item.id} className={`flex items-center justify-between gap-3 px-4 py-4 ${index > 0 ? "border-t border-[#e0e3e5]" : ""}`}>
                <div>
                  <p className="text-sm font-semibold text-[#191c1e]">{item.notes || (item.type === "income" ? "Pemasukan" : "Pengeluaran")}</p>
                  <p className="text-xs text-[#64748B]">{item.type} • {item.transaction_date?.slice(0, 10)}</p>
                </div>
                <p className={`text-sm font-semibold number-align ${item.type === "income" ? "text-[#007a50]" : "text-[#191c1e]"}`}>
                  {item.type === "income" ? "+" : "-"}{formatIDR(item.amount)}
                </p>
              </div>
            ))}
            {transactions.length === 0 && <p className="px-4 py-6 text-center text-sm text-[#64748B]">Belum ada transaksi untuk rekening ini.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}
