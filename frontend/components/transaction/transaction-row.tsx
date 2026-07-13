"use client";

import { memo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn, formatIDR } from "@/lib/utils";
import { accountName, categoryName, iconForTransaction } from "@/lib/transaction-display";
import type { Account, Category, Transaction } from "@/types/api";

type TransactionRowProps = {
  item: Transaction;
  accounts: Account[];
  categories: Category[];
  checked: boolean;
  onToggle: (id: string, checked: boolean) => void;
};

function TransactionRowBase({ item, accounts, categories, checked, onToggle }: TransactionRowProps) {
  const cat = categoryName(categories, item.category_id, item.type);
  const account = accountName(accounts, item.account_id);
  const Icon = iconForTransaction(`${cat} ${item.notes ?? ""}`, item.type);
  const isIncome = item.type === "income";
  const title = item.notes?.trim() || cat;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border bg-white p-4 shadow-[0_4px_20px_rgba(15,23,42,0.035)] transition-colors sm:p-5",
        checked ? "border-[#a7d9c4] bg-[#f2fbf7]" : "border-transparent"
      )}
      style={{ animation: "row-pop-in 0.15s ease-out" }}
    >
      <Checkbox
        checked={checked}
        onChange={(event) => onToggle(item.id, event.target.checked)}
        aria-label={`Pilih transaksi ${title}`}
      />

      <div
        className={cn(
          "grid h-12 w-12 shrink-0 place-items-center rounded-xl",
          isIncome ? "bg-emerald-100 text-[#007a50]" : "bg-[#ffdad8]/60 text-[#a83639]"
        )}
      >
        <Icon size={22} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[#0f172a]">{title}</p>
        <p className="truncate text-xs text-[#64748b]">{cat}</p>
      </div>

      <div className="shrink-0 text-right">
        <p className={cn("text-sm font-bold number-align", isIncome ? "text-[#007a50]" : "text-[#c23b3f]")}>
          {isIncome ? "+" : "-"}
          {formatIDR(item.amount)}
        </p>
        <p className="truncate text-xs text-[#64748b]">{account}</p>
      </div>
    </div>
  );
}

export const TransactionRow = memo(TransactionRowBase);
