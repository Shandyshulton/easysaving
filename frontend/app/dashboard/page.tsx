"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Banknote, Car, ChevronRight, PieChartIcon, ReceiptText, Utensils, WalletCards } from "lucide-react";
import { Cell, Pie, PieChart } from "recharts";
import { AccountSelector } from "@/components/account/account-selector";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { getStoredUser } from "@/services/api/client";
import { endpoints } from "@/services/api/easysaving";
import { useActiveAccountId } from "@/hooks/use-active-account";
import { formatIDR, today } from "@/lib/utils";
import type { Account, CategoryTotal, Transaction } from "@/types/api";

function trendRows(rows?: CategoryTotal[] | null) {
  const source = Array.isArray(rows) ? rows : [];
  return source.filter((item) => Number(item.total) > 0);
}

function transactionTitle(item: Transaction) {
  if (item.notes?.trim()) return item.notes;
  return item.type === "income" ? "Pemasukan" : "Pengeluaran";
}

function TransactionIcon({ item }: { item: Transaction }) {
  if (item.type === "income") {
    return (
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-[#007a50]">
        <Banknote size={22} />
      </div>
    );
  }
  if (transactionTitle(item).toLowerCase().includes("transport")) {
    return (
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#9ba2bb]/20 text-[#565e74]">
        <Car size={22} />
      </div>
    );
  }
  return (
    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#ffdad8] text-[#a83639]">
      <Utensils size={22} />
    </div>
  );
}

function AccountList({ accounts }: { accounts: Account[] }) {
  if (accounts.length === 0) {
    return (
      <Card className="p-5">
        <div className="flex items-center gap-3 text-[#64748b]">
          <WalletCards size={22} />
          <p className="text-sm">Belum ada rekening. Tambahkan rekening pertama untuk mulai mencatat transaksi.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold leading-6 text-[#0f172a]">Semua Rekening</h2>
          <p className="text-sm leading-5 text-[#64748b]">Klik rekening untuk membuka detail saldo dan transaksi.</p>
        </div>
        <Link href="/accounts" className="shrink-0 text-sm font-semibold text-[#007a50]">
          Kelola
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {accounts.map((account) => (
          <Link
            key={account.id}
            href={`/accounts/${account.id}`}
            className="group flex items-center justify-between gap-4 rounded-2xl border border-[#e0e3e5] bg-[#f7f9fb] p-4 transition hover:border-[#b7e4d1] hover:bg-[#e8f7f0]"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-[#006c49] shadow-sm">
                <WalletCards size={21} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-[#0f172a]">{account.account_name}</p>
                <p className="mt-0.5 truncate text-xs text-[#64748b]">{account.category}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 text-right">
              <p className="text-sm font-bold text-[#0f172a] number-align">{formatIDR(account.current_balance)}</p>
              <ChevronRight size={18} className="text-[#64748b] transition group-hover:translate-x-0.5 group-hover:text-[#006c49]" />
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const [date, setDate] = useState("");
  const { accountId, setAccountId } = useActiveAccountId();
  const { data: user } = useQuery({
    queryKey: ["profile"],
    queryFn: endpoints.profile,
    initialData: getStoredUser,
    staleTime: 1000 * 60 * 5
  });
  const { data: accounts = [] } = useQuery({ queryKey: ["accounts"], queryFn: endpoints.accounts });
  const transactionQuery = useMemo(() => {
    const params = new URLSearchParams({ limit: "3" });
    if (accountId) params.set("account_id", accountId);
    return `?${params.toString()}`;
  }, [accountId]);
  const { data, isLoading } = useQuery({ queryKey: ["summary", "monthly", date, accountId], queryFn: () => endpoints.summary("monthly", date, accountId), enabled: Boolean(date) });
  const { data: transactions = [] } = useQuery({ queryKey: ["transactions", transactionQuery], queryFn: () => endpoints.transactions(transactionQuery) });
  const chartRows = useMemo(() => {
    const rows = trendRows(data?.category_totals);
    return rows.slice(0, 3).map((item, index) => ({
      ...item,
      value: Number(item.percentage ?? item.total ?? 0),
      color: item.color || ["#FF6B6B", "#9AA4BF", "#C4D3C5"][index % 3]
    }));
  }, [data?.category_totals]);
  const recent = transactions;
  const totalExpense = Number(data?.total_expense ?? 0);
  const chartTotal = formatIDR(data?.total_expense ?? 0);
  const greetingName = user?.name?.trim() || "EasySaving User";

  useEffect(() => {
    setDate(today());
  }, []);

  useEffect(() => {
    if (accountId && accounts.length > 0 && !accounts.some((item) => item.id === accountId)) {
      setAccountId("");
    }
  }, [accountId, accounts, setAccountId]);

  return (
    <AppShell>
      <section className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold leading-8 text-[#0f172a]">Halo, {greetingName}</h1>
          <p className="mt-1 text-sm leading-5 text-[#64748b]">Here is your financial summary today.</p>
        </div>

        <AccountSelector accounts={accounts} value={accountId} onChange={setAccountId} />

        {!accountId && <AccountList accounts={accounts} />}

        <Card className="relative overflow-hidden p-6">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#10b981]/5 blur-3xl" />
          <div className="relative">
            <p className="text-sm leading-5 text-[#64748b]">{accountId ? "Saldo Rekening" : "Total Balance"}</p>
            <div className="mt-1 text-[32px] font-bold leading-10 text-[#0f172a] number-align lg:text-[40px] lg:leading-[48px]">
              {isLoading ? "..." : formatIDR(data?.total_balance ?? 0)}
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card className="min-h-[112px] border-l-4 border-[#007a50] p-4">
            <div className="flex items-center gap-2 text-[#007a50]">
              <ArrowDown size={20} />
              <p className="text-sm text-[#64748b]">Income</p>
            </div>
            <p className="mt-2 break-words text-xl font-semibold leading-7 text-[#0f172a] number-align">{formatIDR(data?.total_income ?? 0)}</p>
          </Card>
          <Card className="min-h-[112px] border-l-4 border-[#a83639] p-4">
            <div className="flex items-center gap-2 text-[#a83639]">
              <ArrowUp size={20} />
              <p className="text-sm text-[#64748b]">Expense</p>
            </div>
            <p className="mt-2 break-words text-xl font-semibold leading-7 text-[#0f172a] number-align">{formatIDR(data?.total_expense ?? 0)}</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <Card className="rounded-[24px] bg-white p-5 shadow-[0_4px_20px_rgba(15,23,42,0.05)] lg:col-span-5 lg:p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold leading-7 text-[#0f172a]">Trend Pengeluaran</h2>
              <Link href="/reports" className="text-sm font-semibold text-[#007a50]">See all</Link>
            </div>
            {chartRows.length > 0 ? (
              <>
                <div className="relative mx-auto h-[224px] w-[224px] sm:h-[240px] sm:w-[240px]">
                  <PieChart width={240} height={240} className="absolute left-1/2 top-1/2 h-[224px] w-[224px] -translate-x-1/2 -translate-y-1/2 sm:h-[240px] sm:w-[240px]">
                    <Pie
                      data={chartRows}
                      dataKey="value"
                      nameKey="category_name"
                      cx="50%"
                      cy="50%"
                      innerRadius={76}
                      outerRadius={112}
                      startAngle={90}
                      endAngle={-270}
                      paddingAngle={0}
                      isAnimationActive={false}
                      stroke="none"
                    >
                      {chartRows.map((item) => <Cell key={item.category_id} fill={item.color} />)}
                    </Pie>
                  </PieChart>
                  <div className="pointer-events-none absolute inset-0 grid place-items-center">
                    <div className="text-center">
                      <p className="text-base font-medium text-[#64748b]">Total</p>
                      <p className="mt-1 text-xl font-bold text-[#0f172a] number-align">{chartTotal}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {chartRows.map((item) => (
                    <div key={item.category_id} className="flex items-center justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="truncate text-sm text-[#64748b]">{item.category_name}</span>
                      </div>
                      <span className="text-sm font-semibold text-[#0f172a]">{item.value.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="grid min-h-[304px] place-items-center rounded-2xl bg-[#f7f9fb] px-6 text-center">
                <div>
                  <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-[#007a50]">
                    <PieChartIcon size={24} />
                  </span>
                  <div className="mt-3 text-sm font-semibold text-[#0f172a]">Belum ada data pengeluaran.</div>
                  <p className="mt-1 text-sm leading-5 text-[#64748b]">Trend akan muncul setelah transaksi pengeluaran dicatat.</p>
                  <div className="mt-4 text-base font-bold text-[#0f172a] number-align">{chartTotal}</div>
                </div>
              </div>
            )}
          </Card>

          <Card className="p-6 lg:col-span-7">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-semibold leading-7 text-[#0f172a]">Transaksi Terbaru</h2>
              <Link href="/transactions" className="text-sm font-semibold text-[#007a50]">See all</Link>
            </div>
            <div className="space-y-4">
              {recent.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl p-2 transition hover:bg-[#f2f4f6]">
                  <div className="flex min-w-0 items-center gap-4">
                    <TransactionIcon item={item} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#0f172a]">{transactionTitle(item)}</p>
                      <p className="text-xs text-[#64748b]">{item.transaction_date?.slice(0, 10)}</p>
                    </div>
                  </div>
                  <p className={`shrink-0 text-sm font-semibold number-align ${item.type === "income" ? "text-[#007a50]" : "text-[#a83639]"}`}>
                    {item.type === "income" ? "+" : "-"}{formatIDR(item.amount)}
                  </p>
                </div>
              ))}
              {recent.length === 0 && (
                <div className="rounded-2xl bg-[#f2f4f6] p-6 text-center">
                  <ReceiptText className="mx-auto mb-2 text-[#64748b]" />
                  <p className="text-sm text-[#64748b]">Belum ada transaksi terbaru.</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </section>
    </AppShell>
  );
}
