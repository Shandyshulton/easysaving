import { Briefcase, Car, ShoppingBag, Utensils, Zap, type LucideIcon } from "lucide-react";
import { today } from "@/lib/utils";
import type { Account, Category, Transaction } from "@/types/api";

export function categoryName(categories: Category[], id: string, type: Transaction["type"]) {
  return categories.find((item) => item.id === id)?.name ?? (type === "income" ? "Income" : "Expense");
}

export function accountName(accounts: Account[], id: string) {
  return accounts.find((item) => item.id === id)?.account_name ?? "Account";
}

export function iconForTransaction(label: string, type: Transaction["type"]): LucideIcon {
  const lower = label.toLowerCase();
  if (type === "income") return Briefcase;
  if (lower.includes("transport") || lower.includes("uber") || lower.includes("car")) return Car;
  if (lower.includes("bill") || lower.includes("tagihan") || lower.includes("util")) return Zap;
  if (lower.includes("shop") || lower.includes("grocery") || lower.includes("belanja")) return ShoppingBag;
  return Utensils;
}

export type TransactionGroup = {
  label: string;
  total: number;
  items: Transaction[];
};

function dateOnly(value: string) {
  return value?.slice(0, 10);
}

function groupLabel(date: string) {
  const current = today();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const y = yesterday.toISOString().slice(0, 10);
  if (date === current) return "HARI INI";
  if (date === y) return "KEMARIN";
  return new Date(`${date}T00:00:00`)
    .toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
    .toUpperCase();
}

/** Groups a flat transaction list into date-labeled buckets with a running total per bucket. */
export function groupTransactionsByDate(transactions: Transaction[]): TransactionGroup[] {
  const bucket = new Map<string, TransactionGroup>();
  for (const item of transactions) {
    const date = dateOnly(item.transaction_date);
    if (!bucket.has(date)) {
      bucket.set(date, { label: groupLabel(date), total: 0, items: [] });
    }
    const group = bucket.get(date)!;
    const amount = Number(item.amount) || 0;
    group.total += item.type === "income" ? amount : -amount;
    group.items.push(item);
  }
  return Array.from(bucket.values());
}
