import type { ScheduledTransaction, ScheduleFrequency } from "@/types/api";
import { today } from "@/lib/utils";

/** Human label for a recurrence, e.g. "Tiap 2 bulan". */
export function frequencyLabel(frequency: ScheduleFrequency, interval: number) {
  const unit: Record<ScheduleFrequency, string> = {
    daily: "hari",
    weekly: "minggu",
    monthly: "bulan",
    yearly: "tahun"
  };
  if (interval <= 1) {
    const simple: Record<ScheduleFrequency, string> = {
      daily: "Harian",
      weekly: "Mingguan",
      monthly: "Bulanan",
      yearly: "Tahunan"
    };
    return simple[frequency];
  }
  return `Tiap ${interval} ${unit[frequency]}`;
}

export function modeLabel(mode: ScheduledTransaction["mode"]) {
  return mode === "auto" ? "Otomatis" : "Pengingat";
}

/** Formats YYYY-MM-DD (or an ISO timestamp) as "30 Sep 2026". */
export function formatDateID(value: string) {
  const iso = value?.slice(0, 10);
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

/** Whole days between two YYYY-MM-DD dates (b - a). */
export function daysBetween(a: string, b: string) {
  const start = new Date(`${a.slice(0, 10)}T00:00:00`).getTime();
  const end = new Date(`${b.slice(0, 10)}T00:00:00`).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.round((end - start) / 86_400_000);
}

export type DueBucket = "overdue" | "today" | "week" | "upcoming";

/**
 * How many days ahead an *auto* schedule starts appearing in the "Jatuh tempo"
 * group. Reminder schedules use their own `remind_days_before` instead.
 */
export const AUTO_LOOKAHEAD_DAYS = 7;

/** Upper bound for `remind_days_before`, mirrored by the API and the database. */
export const MAX_REMIND_DAYS_BEFORE = 30;

/** Fallback lead time when a schedule has none stored. */
export const DEFAULT_REMIND_DAYS_BEFORE = 3;

/**
 * Maximum number of missed periods the scheduler replays per run. Mirrors
 * `scheduledusecase.MaxCatchUp` in the backend and is only used for wording; the
 * authoritative numbers always come from the /scheduled/preview endpoint.
 */
export const MAX_CATCH_UP_PERIODS = 12;

/**
 * Classifies a schedule by how close its next due date is.
 *
 * Reminder schedules use their own `remind_days_before` value as the lookahead
 * window, so a bill set to warn 3 days ahead only surfaces 3 days ahead.
 */
export function dueBucket(schedule: ScheduledTransaction, reference = today()): DueBucket {
  const diff = daysBetween(reference, schedule.next_due_date);
  if (diff < 0) return "overdue";
  if (diff === 0) return "today";
  const window =
    schedule.mode === "remind"
      ? Math.min(Math.max(schedule.remind_days_before ?? DEFAULT_REMIND_DAYS_BEFORE, 0), MAX_REMIND_DAYS_BEFORE)
      : AUTO_LOOKAHEAD_DAYS;
  if (diff <= window) return "week";
  return "upcoming";
}

/** Relative wording for the next due date. */
export function dueLabel(schedule: ScheduledTransaction, reference = today()) {
  const diff = daysBetween(reference, schedule.next_due_date);
  if (diff < -1) return `Terlambat ${Math.abs(diff)} hari`;
  if (diff === -1) return "Terlambat 1 hari";
  if (diff === 0) return "Jatuh tempo hari ini";
  if (diff === 1) return "Besok";
  if (dueBucket(schedule, reference) === "week") return `${diff} hari lagi`;
  return formatDateID(schedule.next_due_date);
}

export type ScheduleGroups = {
  due: ScheduledTransaction[];
  upcoming: ScheduledTransaction[];
  paused: ScheduledTransaction[];
};

/**
 * Splits schedules into the groups the list page renders: everything that needs
 * attention now (overdue / today / this week), what is coming later, and paused
 * schedules.
 */
export function groupSchedules(items: ScheduledTransaction[], reference = today()): ScheduleGroups {
  const groups: ScheduleGroups = { due: [], upcoming: [], paused: [] };
  for (const item of items) {
    if (!item.is_active) {
      groups.paused.push(item);
      continue;
    }
    const bucket = dueBucket(item, reference);
    if (bucket === "upcoming") groups.upcoming.push(item);
    else groups.due.push(item);
  }
  const byDate = (a: ScheduledTransaction, b: ScheduledTransaction) =>
    a.next_due_date.localeCompare(b.next_due_date);
  groups.due.sort(byDate);
  groups.upcoming.sort(byDate);
  groups.paused.sort(byDate);
  return groups;
}

/** Schedules due within the next 7 days, for the dashboard widget. */
export function dueThisWeek(items: ScheduledTransaction[], reference = today()) {
  return items
    .filter((item) => item.is_active && dueBucket(item, reference) !== "upcoming")
    .sort((a, b) => a.next_due_date.localeCompare(b.next_due_date));
}
