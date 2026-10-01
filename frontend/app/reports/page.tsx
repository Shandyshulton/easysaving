"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarDays, Car, Download, MoreHorizontal, ShoppingBag, TrendingUp, Utensils } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { endpoints } from "@/services/api/easysaving";
import { formatIDR, today } from "@/lib/utils";
import type { CategoryTotal, Summary } from "@/types/api";

function safeCategories(rows?: CategoryTotal[] | null) {
  const source = Array.isArray(rows) ? rows.filter((item) => Number(item.total) > 0) : [];
  return source;
}

function categoryIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("transport")) return Car;
  if (lower.includes("belanja") || lower.includes("shop")) return ShoppingBag;
  if (lower.includes("lain")) return MoreHorizontal;
  return Utensils;
}

function categoryTone(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("transport")) return { bg: "bg-[var(--surface-muted)]", text: "text-[var(--text-secondary)]" };
  if (lower.includes("belanja") || lower.includes("shop")) return { bg: "bg-[var(--expense-soft)]", text: "text-[var(--expense)]" };
  if (lower.includes("lain")) return { bg: "bg-[var(--surface-muted)]", text: "text-[var(--text-secondary)]" };
  return { bg: "bg-[var(--income-soft)]", text: "text-[var(--primary-strong)]" };
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("id-ID", { month: "short", year: "numeric" }).format(date);
}

function monthOptions(count = 6) {
  const base = new Date();
  base.setDate(1);

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(base);
    date.setMonth(base.getMonth() - index);
    const value = date.toISOString().slice(0, 10);
    return {
      value,
      monthValue: value.slice(0, 7),
      label: index === 0 ? "Bulan ini" : monthLabel(date)
    };
  });
}

function escapeHtml(value: string | number | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function periodLabel(period: string) {
  if (period === "daily") return "Harian";
  if (period === "weekly") return "Mingguan";
  return "Bulanan";
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric" }).format(date);
}

function downloadReportPdf(summary: Summary | undefined, period: string, date: string) {
  if (!summary) return;

  const categoryRows = summary.category_totals.length
    ? summary.category_totals
        .map(
          (item) => `
            <tr>
              <td>${escapeHtml(item.category_name)}</td>
              <td>${escapeHtml(item.type === "income" ? "Pemasukan" : "Pengeluaran")}</td>
              <td class="right">${escapeHtml(formatIDR(item.total))}</td>
              <td class="right">${escapeHtml(`${Number(item.percentage || 0).toFixed(0)}%`)}</td>
            </tr>
          `
        )
        .join("")
    : `<tr><td colspan="4" class="empty">Belum ada kategori pada periode ini.</td></tr>`;

  const dailyRows = summary.daily_totals.length
    ? summary.daily_totals
        .map(
          (item) => `
            <tr>
              <td>${escapeHtml(formatDate(item.date))}</td>
              <td class="right">${escapeHtml(formatIDR(item.income))}</td>
              <td class="right">${escapeHtml(formatIDR(item.expense))}</td>
            </tr>
          `
        )
        .join("")
    : `<tr><td colspan="3" class="empty">Belum ada trend harian pada periode ini.</td></tr>`;

  const fileName = `easysaving-report-${period}-${date}`;
  const printable = window.open("", "_blank", "width=900,height=1200");
  if (!printable) {
    window.alert("Popup diblokir browser. Izinkan popup untuk download PDF report.");
    return;
  }

  printable.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${escapeHtml(fileName)}</title>
        <meta charset="utf-8" />
        <style>
          @page { size: A4; margin: 16mm; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            color: #191c1e;
            font-family: Inter, Arial, sans-serif;
            font-size: 12px;
            line-height: 1.45;
          }
          header {
            border-bottom: 2px solid #006c49;
            margin-bottom: 22px;
            padding-bottom: 16px;
          }
          .brand {
            color: #006c49;
            font-size: 22px;
            font-weight: 800;
            margin-bottom: 6px;
          }
          .muted { color: #64748b; }
          .summary {
            display: grid;
            gap: 10px;
            grid-template-columns: repeat(2, 1fr);
            margin-bottom: 24px;
          }
          .card {
            border: 1px solid #dce5df;
            border-radius: 12px;
            padding: 12px;
          }
          .label {
            color: #64748b;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }
          .value {
            font-size: 18px;
            font-weight: 800;
            margin-top: 4px;
          }
          h2 {
            color: #006c49;
            font-size: 15px;
            margin: 24px 0 10px;
          }
          table {
            border-collapse: collapse;
            width: 100%;
          }
          th {
            background: #e8f7f0;
            color: #006c49;
            font-size: 10px;
            text-align: left;
            text-transform: uppercase;
          }
          th, td {
            border: 1px solid #dce5df;
            padding: 9px;
            vertical-align: top;
          }
          .right { text-align: right; }
          .empty {
            color: #64748b;
            text-align: center;
          }
          footer {
            color: #64748b;
            font-size: 10px;
            margin-top: 28px;
            text-align: center;
          }
          @media print {
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <header>
          <div class="brand">EasySaving Report</div>
          <div class="muted">${escapeHtml(periodLabel(period))} - ${escapeHtml(formatDate(summary.start_date))} sampai ${escapeHtml(formatDate(summary.end_date))}</div>
        </header>

        <section class="summary">
          <div class="card">
            <div class="label">Total Saldo</div>
            <div class="value">${escapeHtml(formatIDR(summary.total_balance))}</div>
          </div>
          <div class="card">
            <div class="label">Cashflow Bersih</div>
            <div class="value">${escapeHtml(formatIDR(summary.net_cashflow))}</div>
          </div>
          <div class="card">
            <div class="label">Pemasukan</div>
            <div class="value">${escapeHtml(formatIDR(summary.total_income))}</div>
          </div>
          <div class="card">
            <div class="label">Pengeluaran</div>
            <div class="value">${escapeHtml(formatIDR(summary.total_expense))}</div>
          </div>
        </section>

        <section>
          <h2>Top Categories</h2>
          <table>
            <thead>
              <tr>
                <th>Kategori</th>
                <th>Tipe</th>
                <th class="right">Total</th>
                <th class="right">Persentase</th>
              </tr>
            </thead>
            <tbody>${categoryRows}</tbody>
          </table>
        </section>

        <section>
          <h2>Daily Trend</h2>
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th class="right">Pemasukan</th>
                <th class="right">Pengeluaran</th>
              </tr>
            </thead>
            <tbody>${dailyRows}</tbody>
          </table>
        </section>

        <footer>Dicetak dari EasySaving pada ${escapeHtml(new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short" }).format(new Date()))}</footer>
      </body>
    </html>
  `);
  printable.document.close();
  window.setTimeout(() => {
    printable.focus();
    printable.print();
  }, 250);
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("monthly");
  const [date, setDate] = useState("");
  const [months, setMonths] = useState<ReturnType<typeof monthOptions>>([]);
  const { data } = useQuery({ queryKey: ["summary", period, date], queryFn: () => endpoints.summary(period, date), enabled: Boolean(date) });
  const categories = safeCategories(data?.category_totals);
  const totalExpense = Number(data?.total_expense ?? 0);
  const selectedMonth = date.slice(0, 7);

  useEffect(() => {
    setDate(today());
    setMonths(monthOptions(6));
  }, []);

  const trend = useMemo(() => {
    const daily = Array.isArray(data?.daily_totals) ? data.daily_totals : [];
    if (daily.length > 0) {
      return daily.map((item) => ({
        label: item.date.slice(5),
        expense: Number(item.expense) || 0
      }));
    }
    return [];
  }, [data?.daily_totals]);

  const maxTrend = Math.max(...trend.map((item) => item.expense), 1);

  return (
    <AppShell>
      <div className="mx-auto flex max-w-[1100px] flex-col gap-6">
        <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)] lg:text-2xl">Category Trends</h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Lihat ke mana uang Anda mengalir.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex w-fit rounded-[var(--radius)] bg-[var(--surface-muted)] p-1">
              {(["daily", "weekly", "monthly"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPeriod(item)}
                  className={`rounded-[var(--radius-sm)] px-4 py-2.5 text-sm font-semibold transition ${
                    period === item ? "bg-white text-[var(--primary-strong)] shadow-sm" : "text-[var(--text-secondary)] hover:text-[var(--primary-strong)]"
                  }`}
                >
                  {item === "daily" ? "Daily" : item === "weekly" ? "Weekly" : "Monthly"}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => downloadReportPdf(data, period, date)}
              disabled={!data}
              className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius)] border border-[var(--primary-border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--primary-strong)] transition hover:bg-[var(--primary-soft)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download size={17} />
              Download PDF
            </button>
          </div>
        </section>

        <section className="panel p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)]">
            <CalendarDays size={17} />
            Bulan laporan
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {months.map((month) => (
                <button
                  key={month.value}
                  type="button"
                  onClick={() => {
                    setPeriod("monthly");
                    setDate(month.value);
                  }}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    period === "monthly" && selectedMonth === month.monthValue
                      ? "bg-[var(--primary-strong)] text-white"
                      : "bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:text-[var(--primary-strong)]"
                  }`}
                >
                  {month.label}
                </button>
              ))}
            </div>
            <label className="flex shrink-0 items-center gap-2 text-sm font-semibold text-[var(--text-secondary)]">
              Bulan lain
              <input
                type="month"
                value={selectedMonth}
                onChange={(event) => {
                  if (!event.target.value) return;
                  setPeriod("monthly");
                  setDate(`${event.target.value}-01`);
                }}
                className="h-10 rounded-[var(--radius-sm)] border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--primary-strong)] focus:ring-1 focus:ring-[var(--primary-strong)]"
              />
            </label>
          </div>
        </section>

        {/* Total expense + trend chart side by side on desktop */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <section className="panel p-5 sm:p-6 lg:col-span-4">
            <div className="flex items-center justify-between">
              <h2 className="section-heading">Total {period} Expense</h2>
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--income-soft)] text-[var(--primary-strong)]">
                <TrendingUp size={20} />
              </span>
            </div>
            <p className="number-align mt-3 text-[30px] font-bold leading-tight text-[var(--text-primary)] md:text-[36px]">
              {formatIDR(totalExpense)}
            </p>
          </section>

          <section className="panel p-5 sm:p-6 lg:col-span-8">
            <h2 className="mb-4 text-base font-semibold text-[var(--text-primary)]">Spending Trends</h2>
            <div className="h-52 min-h-[208px] min-w-0">
              {trend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  <BarChart data={trend} margin={{ top: 16, right: 4, left: -28, bottom: 0 }}>
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#5b6b7b", fontSize: 12, fontWeight: 600 }} />
                    <YAxis hide domain={[0, maxTrend]} />
                    <Tooltip cursor={{ fill: "rgba(11,138,91,0.06)" }} formatter={(value) => formatIDR(String(value))} />
                    <Bar dataKey="expense" fill="#0b8a5b" radius={[4, 4, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="grid h-full place-items-center rounded-[var(--radius)] bg-[var(--surface-muted)] text-center text-sm text-[var(--text-secondary)]">
                  Belum ada data report untuk periode ini.
                </div>
              )}
            </div>
          </section>
        </div>

        <section>
          <h2 className="mb-4 text-base font-semibold text-[var(--text-primary)]">Top Categories</h2>
          {categories.length === 0 ? (
            <div className="panel p-6 text-center text-sm text-[var(--text-secondary)]">
              Belum ada kategori pengeluaran dari database.
            </div>
          ) : (
            <div className="panel divide-y divide-[var(--border)] px-4 sm:px-5">
              {categories.slice(0, 4).map((item) => {
                const Icon = categoryIcon(item.category_name);
                const tone = categoryTone(item.category_name);
                const percentage = Math.min(Math.max(Number(item.percentage) || 0, 0), 100);
                return (
                  <div key={item.category_id} className="flex items-center gap-4 py-4">
                    <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${tone.bg} ${tone.text}`}>
                      <Icon size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{item.category_name}</p>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--surface-muted)]">
                        <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: item.color || "var(--primary)" }} />
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="number-align text-sm font-semibold text-[var(--text-primary)]">{formatIDR(item.total)}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{percentage.toFixed(0)}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
