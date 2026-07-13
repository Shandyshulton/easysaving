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
  if (lower.includes("transport")) return { bg: "bg-[#dae2fd]/55", text: "text-[#565e74]" };
  if (lower.includes("belanja") || lower.includes("shop")) return { bg: "bg-[#ffdad8]", text: "text-[#a83639]" };
  if (lower.includes("lain")) return { bg: "bg-[#eceef0]", text: "text-[#64748b]" };
  return { bg: "bg-[#8B4513]/10", text: "text-[#8B4513]" };
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
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8">
        <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="mb-1 text-2xl font-semibold leading-8 text-[#006c49]">Category Trends</h1>
            <p className="text-sm leading-5 text-[#64748B]">Track where your money goes.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex w-fit rounded-lg bg-[#f2f4f6] p-1 shadow-sm">
              {(["daily", "weekly", "monthly"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPeriod(item)}
                  className={`rounded-md px-4 py-3 text-sm font-semibold leading-5 transition ${
                    period === item ? "bg-white text-[#006c49] shadow-sm" : "text-[#3c4a42] hover:bg-[#eceef0]"
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
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#b7e4d1] bg-white px-4 py-3 text-sm font-semibold text-[#006c49] shadow-sm transition hover:bg-[#e8f7f0] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download size={17} />
              Download PDF
            </button>
          </div>
        </section>

        <section className="rounded-[20px] border border-[#e0e3e5] bg-white p-4 shadow-[0_4px_20px_rgba(15,23,42,0.04)]">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#64748B]">
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
                      ? "bg-[#006c49] text-white shadow-sm"
                      : "bg-[#f2f4f6] text-[#3c4a42] hover:bg-[#e8f7f0] hover:text-[#006c49]"
                  }`}
                >
                  {month.label}
                </button>
              ))}
            </div>
            <label className="flex shrink-0 items-center gap-2 text-sm font-semibold text-[#64748B]">
              Bulan lain
              <input
                type="month"
                value={selectedMonth}
                onChange={(event) => {
                  if (!event.target.value) return;
                  setPeriod("monthly");
                  setDate(`${event.target.value}-01`);
                }}
                className="h-10 rounded-lg border border-[#d1d5db] bg-white px-3 text-sm text-[#191c1e] outline-none transition focus:border-[#006c49] focus:ring-1 focus:ring-[#006c49]"
              />
            </label>
          </div>
        </section>

        <section className="rounded-[24px] bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#64748B]">Total {period} Expense</h2>
            <span className="grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-[#006c49]">
              <TrendingUp size={25} />
            </span>
          </div>
          <p className="text-[32px] font-bold leading-10 text-[#191c1e] number-align md:text-[40px] md:leading-[48px]">
            {formatIDR(totalExpense)}
          </p>
        </section>

        <section className="relative overflow-hidden rounded-[24px] border border-[#e0e3e5] bg-white/80 p-6 shadow-[0_4px_20px_rgba(15,23,42,0.05)] backdrop-blur-md">
          <div className="absolute -right-20 -top-20 -z-10 h-64 w-64 rounded-full bg-[#006c49]/5 blur-3xl" />
          <h2 className="mb-6 text-xl font-semibold leading-7 text-[#191c1e]">Spending Trends</h2>
          <div className="h-56 min-h-[224px] min-w-0">
            {trend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <BarChart data={trend} margin={{ top: 28, right: 4, left: -28, bottom: 0 }}>
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#64748B", fontSize: 12, fontWeight: 600 }} />
                  <YAxis hide domain={[0, maxTrend]} />
                  <Tooltip cursor={{ fill: "rgba(0,108,73,0.04)" }} formatter={(value) => formatIDR(String(value))} />
                  <Bar dataKey="expense" fill="#006c49" radius={[4, 4, 0, 0]} maxBarSize={56} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center rounded-2xl bg-[#f7f9fb] text-center text-sm text-[#64748B]">
                Belum ada data report untuk periode ini.
              </div>
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <h2 className="text-2xl font-semibold leading-8 text-[#191c1e] md:col-span-2">Top Categories</h2>
          {categories.length === 0 && (
            <div className="rounded-[24px] bg-white p-6 text-center text-sm text-[#64748B] shadow-[0_4px_20px_rgba(15,23,42,0.05)] md:col-span-2">
              Belum ada kategori pengeluaran dari database.
            </div>
          )}
          {categories.slice(0, 4).map((item, index) => {
            const Icon = categoryIcon(item.category_name);
            const tone = categoryTone(item.category_name);
            const percentage = Math.min(Math.max(Number(item.percentage) || 0, 0), 100);
            return (
              <div
                key={item.category_id}
                className={`flex items-center gap-4 rounded-[24px] bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.05)] transition hover:shadow-md ${
                  index === 3 ? "border border-dashed border-[#e0e3e5] opacity-80" : ""
                }`}
              >
                <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${tone.bg} ${tone.text}`}>
                  <Icon size={23} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold leading-5 text-[#191c1e]">{item.category_name}</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#f2f4f6]">
                    <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: item.color || "#006c49" }} />
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold leading-5 text-[#191c1e] number-align">{formatIDR(item.total)}</p>
                  <p className="text-xs leading-4 text-[#64748B]">{percentage.toFixed(0)}%</p>
                </div>
              </div>
            );
          })}
        </section>
      </div>
    </AppShell>
  );
}
