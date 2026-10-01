"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlarmClock, CalendarClock, RefreshCw } from "lucide-react";
import { endpoints } from "@/services/api/easysaving";
import { formatIDR } from "@/lib/utils";
import { dueBucket, dueLabel, dueThisWeek } from "@/lib/schedule-display";

const MAX_ITEMS = 5;

/**
 * Dashboard widget listing schedules that fall due within the next week.
 * Renders nothing when there is nothing due, to avoid empty clutter.
 */
export function DueThisWeekWidget() {
  const { data: schedules = [] } = useQuery({ queryKey: ["scheduled"], queryFn: () => endpoints.scheduled() });
  const due = useMemo(() => dueThisWeek(schedules), [schedules]);

  if (due.length === 0) return null;

  const visible = due.slice(0, MAX_ITEMS);

  return (
    <section className="panel p-5 sm:p-6">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--warning-soft)] text-[var(--warning)]">
            <CalendarClock size={17} />
          </span>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Jatuh tempo minggu ini</h2>
        </div>
        <Link href="/scheduled" className="shrink-0 text-sm font-semibold text-[var(--primary-strong)]">
          Lihat semua
        </Link>
      </div>

      <div className="list-divider">
        {visible.map((item) => {
          const bucket = dueBucket(item);
          const isExpense = item.type === "expense";
          return (
            <Link key={item.id} href="/scheduled" className="flex items-center justify-between gap-3 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
                    item.mode === "auto"
                      ? "bg-[var(--primary-soft)] text-[var(--primary-strong)]"
                      : "bg-[var(--warning-soft)] text-[var(--warning)]"
                  }`}
                >
                  {item.mode === "auto" ? <RefreshCw size={16} /> : <AlarmClock size={16} />}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{item.name}</p>
                  <p
                    className={`text-xs font-medium ${
                      bucket === "overdue"
                        ? "text-[var(--expense)]"
                        : bucket === "today"
                          ? "text-[var(--warning)]"
                          : "text-[var(--text-secondary)]"
                    }`}
                  >
                    {dueLabel(item)}
                  </p>
                </div>
              </div>
              <p
                className={`number-align shrink-0 text-sm font-semibold ${
                  isExpense ? "text-[var(--expense)]" : "text-[var(--income)]"
                }`}
              >
                {item.amount ? `${isExpense ? "-" : "+"}${formatIDR(item.amount)}` : "—"}
              </p>
            </Link>
          );
        })}
      </div>

      {due.length > MAX_ITEMS ? (
        <p className="pt-3 text-xs text-[var(--text-secondary)]">
          +{due.length - MAX_ITEMS} jadwal lain menunggu.
        </p>
      ) : null}
    </section>
  );
}
