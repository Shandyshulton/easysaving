"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, Banknote, Car, ChevronRight, PieChartIcon, ReceiptText, Utensils, WalletCards } from "lucide-react";
import { Cell, Pie, PieChart } from "recharts";
import { AccountSelector } from "@/components/account/account-selector";
import { AppShell } from "@/components/app-shell";
import { DueThisWeekWidget } from "@/components/scheduled/due-this-week-widget";
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
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--income-soft)] text-[var(--income)]">
        <Banknote size={20} />
      </div>
    );
  }
  if (transactionTitle(item).toLowerCase().includes("transport")) {
    return (
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--surface-muted)] text-[var(--text-secondary)]">
        <Car size={20} />
      </div>
    );
  }
  return (
    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--expense-soft)] text-[var(--expense)]">
      <Utensils size={20} />
    </div>
  );
}

function AccountList({ accounts }: { accounts: Account[] }) {
  if (accounts.length === 0) {
    return (
      <div className="panel flex items-center gap-3 p-4 text-[var(--text-secondary)]">
        <WalletCards size={20} />
        <p className="text-sm">Belum ada rekening. Tambahkan rekening pertama untuk mulai mencatat transaksi.</p>
      </div>
    );
  }

  return (
    <section className="panel p-4 sm:p-5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="section-heading">Semua Rekening</h2>
        <Link href="/accounts" className="shrink-0 text-sm font-semibold text-[var(--primary-strong)]">
          Kelola
        </Link>
      </div>
      <div className="list-divider">
        {accounts.map((account) => (
          <Link
            key={account.id}
            href={`/accounts/${account.id}`}
            className="group flex items-center justify-between gap-4 py-3 transition"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--surface-muted)] text-[var(--primary-strong)]">
                <WalletCards size={19} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{account.account_name}</p>
                <p className="mt-0.5 truncate text-xs text-[var(--text-secondary)]">{account.category}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 text-right">
              <p className="number-align text-sm font-semibold text-[var(--text-primary)]">{formatIDR(account.current_balance)}</p>
              <ChevronRight size={16} className="text-[var(--text-muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--primary-strong)]" />
            </div>
          </Link>
        ))}
      </div>
    </section>
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
    const params = new URLSearchParams({ limit: "5" });
    if (accountId) params.set("account_id", accountId);
    return `?${params.toString()}`;
  }, [accountId]);
  const { data, isLoading } = useQuery({ queryKey: ["summary", "monthly", date, accountId], queryFn: () => endpoints.summary("monthly", date, accountId), enabled: Boolean(date) });
  const { data: transactions = [] } = useQuery({ queryKey: ["transactions", transactionQuery], queryFn: () => endpoints.transactions(transactionQuery) });
  const chartRows = useMemo(() => {
    const rows = trendRows(data?.category_totals);
    return rows.slice(0, 4).map((item, index) => ({
      ...item,
      value: Number(item.percentage ?? item.total ?? 0),
      color: item.color || ["#0b8a5b", "#c0392f", "#9AA4BF", "#b7791f"][index % 4]
    }));
  }, [data?.category_totals]);
  const recent = transactions;
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
      <div className="space-y-6">
        <header>
          <h1 className="text-xl font-semibold text-[var(--text-primary)] lg:text-2xl">Halo, {greetingName}</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Ringkasan keuangan Anda hari ini.</p>
        </header>

        <AccountSelector accounts={accounts} value={accountId} onChange={setAccountId} />

        {/* Balance focal point + income/expense */}
        <section className="panel p-5 sm:p-6">
          <p className="text-sm text-[var(--text-secondary)]">{accountId ? "Saldo Rekening" : "Total Balance"}</p>
          <div className="number-align mt-1 text-[34px] font-bold leading-tight text-[var(--text-primary)] lg:text-[44px]">
            {isLoading ? "…" : formatIDR(data?.total_balance ?? 0)}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 border-t border-[var(--border)] pt-4">
            <div>
              <div className="flex items-center gap-1.5 text-[var(--income)]">
                <ArrowDownLeft size={16} strokeWidth={2.4} />
                <span className="text-xs font-semibold uppercase tracking-wide">Income</span>
              </div>
              <p className="number-align mt-1 text-lg font-semibold text-[var(--text-primary)] sm:text-xl">{formatIDR(data?.total_income ?? 0)}</p>
            </div>
            <div className="border-l border-[var(--border)] pl-4">
              <div className="flex items-center gap-1.5 text-[var(--expense)]">
                <ArrowUpRight size={16} strokeWidth={2.4} />
                <span className="text-xs font-semibold uppercase tracking-wide">Expense</span>
              </div>
              <p className="number-align mt-1 text-lg font-semibold text-[var(--text-primary)] sm:text-xl">{formatIDR(data?.total_expense ?? 0)}</p>
            </div>
          </div>
        </section>

        {!accountId && <AccountList accounts={accounts} />}

        <DueThisWeekWidget />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Spending trend + categories */}
          <section className="panel p-5 sm:p-6 lg:col-span-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Trend Pengeluaran</h2>
              <Link href="/reports" className="text-sm font-semibold text-[var(--primary-strong)]">Detail</Link>
            </div>
            {chartRows.length > 0 ? (
              <>
                <div className="relative mx-auto h-[180px] w-[180px]">
                  <PieChart width={180} height={180} className="absolute inset-0">
                    <Pie
                      data={chartRows}
                      dataKey="value"
                      nameKey="category_name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={88}
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
                      <p className="text-xs text-[var(--text-secondary)]">Total</p>
                      <p className="number-align mt-0.5 text-base font-bold text-[var(--text-primary)]">{chartTotal}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-2.5">
                  {chartRows.map((item) => (
                    <div key={item.category_id} className="flex items-center justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="truncate text-sm text-[var(--text-secondary)]">{item.category_name}</span>
                      </div>
                      <span className="text-sm font-semibold text-[var(--text-primary)]">{item.value.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="grid min-h-[240px] place-items-center rounded-[var(--radius)] bg-[var(--surface-muted)] px-6 text-center">
                <div>
                  <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-[var(--income-soft)] text-[var(--income)]">
                    <PieChartIcon size={22} />
                  </span>
                  <div className="mt-3 text-sm font-semibold text-[var(--text-primary)]">Belum ada data pengeluaran.</div>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">Trend muncul setelah ada transaksi pengeluaran.</p>
                </div>
              </div>
            )}
          </section>

          {/* Recent transactions as list */}
          <section className="panel p-5 sm:p-6 lg:col-span-7">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Transaksi Terbaru</h2>
              <Link href="/transactions" className="text-sm font-semibold text-[var(--primary-strong)]">Lihat semua</Link>
            </div>
            {recent.length > 0 ? (
              <div className="list-divider">
                {recent.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <TransactionIcon item={item} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{transactionTitle(item)}</p>
                        <p className="text-xs text-[var(--text-secondary)]">{item.transaction_date?.slice(0, 10)}</p>
                      </div>
                    </div>
                    <p className={`number-align shrink-0 text-sm font-semibold ${item.type === "income" ? "text-[var(--income)]" : "text-[var(--expense)]"}`}>
                      {item.type === "income" ? "+" : "-"}{formatIDR(item.amount)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid min-h-[160px] place-items-center rounded-[var(--radius)] bg-[var(--surface-muted)] text-center">
                <div>
                  <ReceiptText className="mx-auto mb-2 text-[var(--text-muted)]" />
                  <p className="text-sm text-[var(--text-secondary)]">Belum ada transaksi terbaru.</p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
