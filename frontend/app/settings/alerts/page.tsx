"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, BellRing, Save } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { NumericInput } from "@/components/ui/numeric-input";
import { ActionFeedback, useActionFeedback } from "@/components/ui/action-feedback";
import { useSpendingAlertSettings, type SpendingAlertPeriod } from "@/hooks/use-spending-alert";

const periods: Array<{ value: SpendingAlertPeriod; label: string; description: string }> = [
  { value: "daily", label: "Daily", description: "Reset setiap hari" },
  { value: "weekly", label: "Weekly", description: "Pantau minggu berjalan" },
  { value: "monthly", label: "Monthly", description: "Cocok untuk budget bulanan" }
];

export default function SpendingAlertPage() {
  const { settings, setSettings } = useSpendingAlertSettings();
  const [enabled, setEnabled] = useState(settings.enabled);
  const [period, setPeriod] = useState<SpendingAlertPeriod>(settings.period);
  const [limit, setLimit] = useState(settings.limit);
  const feedback = useActionFeedback();

  function saveSettings() {
    const trimmedLimit = limit.trim();
    if (enabled && Number(trimmedLimit) <= 0) {
      feedback.showError("Limit belum valid", "Isi nominal batas pengeluaran lebih dari 0.");
      return;
    }

    setSettings({ enabled, period, limit: trimmedLimit });
    feedback.showSuccess("Peringatan disimpan", "Notifikasi akan muncul saat pengeluaran melewati batas.");
  }

  return (
    <AppShell>
      <ActionFeedback feedback={feedback.feedback} onClose={feedback.clear} />

      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/settings"
            className="grid h-10 w-10 place-items-center rounded-full text-[var(--text-primary)] transition hover:bg-[var(--surface-muted)] active:scale-95"
            aria-label="Kembali ke Settings"
          >
            <ArrowLeft size={24} strokeWidth={2.25} />
          </Link>
          <div>
            <p className="text-sm font-semibold text-[var(--primary-strong)]">Notifikasi</p>
            <h1 className="text-xl font-semibold text-[var(--text-primary)] lg:text-2xl">Peringatan Pengeluaran</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.4fr_0.6fr]">
          {/* Settings */}
          <section className="panel p-5 sm:p-6">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 flex items-center gap-2 text-[var(--primary-strong)]">
                  <BellRing size={20} />
                  <h2 className="text-base font-semibold text-[var(--text-primary)]">Atur Batas Pengeluaran</h2>
                </div>
                <p className="text-sm leading-6 text-[var(--text-secondary)]">
                  Jika total pengeluaran melewati batas, notifikasi akan muncul di icon lonceng.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEnabled((current) => !current)}
                className={`relative h-7 w-12 shrink-0 rounded-full transition ${enabled ? "bg-[var(--primary-strong)]" : "bg-[var(--border-strong)]"}`}
                aria-pressed={enabled}
                aria-label="Aktifkan peringatan pengeluaran"
              >
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${enabled ? "left-6" : "left-1"}`} />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Batas nominal</label>
                <div className="flex items-center rounded-[var(--radius)] border border-[var(--border-strong)] bg-[var(--surface-subtle)] px-4 focus-within:border-[var(--primary-strong)] focus-within:ring-1 focus-within:ring-[var(--primary-strong)]">
                  <span className="mr-2 text-sm font-bold text-[var(--primary-strong)]">Rp</span>
                  <NumericInput
                    value={limit}
                    onValueChange={setLimit}
                    placeholder="Contoh: 1500000"
                    className="h-12 w-full border-none bg-transparent p-0 text-base font-semibold text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:ring-0"
                  />
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-[var(--text-primary)]">Periode monitoring</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {periods.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setPeriod(item.value)}
                      className={`rounded-[var(--radius)] border p-4 text-left transition ${
                        period === item.value
                          ? "border-[var(--primary-strong)] bg-[var(--primary-soft)] text-[var(--primary-strong)]"
                          : "border-[var(--border)] bg-white text-[var(--text-primary)] hover:border-[var(--primary-border)]"
                      }`}
                    >
                      <span className="block text-sm font-semibold">{item.label}</span>
                      <span className="mt-1 block text-xs leading-4 text-[var(--text-secondary)]">{item.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Button type="button" onClick={saveSettings} className="w-full rounded-full bg-[var(--primary-strong)] hover:bg-[var(--primary)] sm:w-auto">
                <Save size={18} />
                Simpan Peringatan
              </Button>
            </div>
          </section>

          {/* Current status */}
          <section className="panel p-5 sm:p-6">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Status Saat Ini</h2>
            <div className="mt-4 rounded-[var(--radius)] bg-[var(--surface-subtle)] p-4">
              <p className="section-heading">Peringatan</p>
              <p className={`mt-2 text-2xl font-bold ${enabled ? "text-[var(--primary-strong)]" : "text-[var(--text-secondary)]"}`}>
                {enabled ? "Aktif" : "Nonaktif"}
              </p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-[var(--radius)] bg-[var(--surface-subtle)] p-4">
                <p className="section-heading">Periode</p>
                <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">{period}</p>
              </div>
              <div className="rounded-[var(--radius)] bg-[var(--surface-subtle)] p-4">
                <p className="section-heading">Limit</p>
                <p className="number-align mt-2 text-sm font-semibold text-[var(--text-primary)]">{limit ? `Rp ${limit}` : "-"}</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
