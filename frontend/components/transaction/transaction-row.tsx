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

/** Compact list row for mobile: no per-item card, divider-based grouping. */
function TransactionRowBase({ item, accounts, categories, checked, onToggle }: TransactionRowProps) {
  const cat = categoryName(categories, item.category_id, item.type);
  const account = accountName(accounts, item.account_id);
  const Icon = iconForTransaction(`${cat} ${item.notes ?? ""}`, item.type);
  const isIncome = item.type === "income";
  const title = item.notes?.trim() || cat;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-[var(--radius)] px-2 py-3 transition-colors",
        checked && "bg-[var(--primary-soft)]"
      )}
    >
      <Checkbox
        checked={checked}
        onChange={(event) => onToggle(item.id, event.target.checked)}
        aria-label={`Pilih transaksi ${title}`}
      />

      <div
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-full",
          isIncome ? "bg-[var(--income-soft)] text-[var(--income)]" : "bg-[var(--expense-soft)] text-[var(--expense)]"
        )}
      >
        <Icon size={20} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{title}</p>
        <p className="truncate text-xs text-[var(--text-secondary)]">{cat} · {account}</p>
      </div>

      <div className="shrink-0 text-right">
        <p className={cn("number-align text-sm font-semibold", isIncome ? "text-[var(--income)]" : "text-[var(--expense)]")}>
          {isIncome ? "+" : "-"}
          {formatIDR(item.amount)}
        </p>
      </div>
    </div>
  );
}

export const TransactionRow = memo(TransactionRowBase);

/** Dense table row for desktop. */
function TransactionTableRowBase({ item, accounts, categories, checked, onToggle }: TransactionRowProps) {
  const cat = categoryName(categories, item.category_id, item.type);
  const account = accountName(accounts, item.account_id);
  const isIncome = item.type === "income";
  const title = item.notes?.trim() || cat;

  return (
    <tr className={cn("transition-colors hover:bg-[var(--surface-subtle)]", checked && "bg-[var(--primary-soft)]")}>
      <td className="py-3 pl-3 pr-2 align-middle">
        <Checkbox
          checked={checked}
          onChange={(event) => onToggle(item.id, event.target.checked)}
          aria-label={`Pilih transaksi ${title}`}
        />
      </td>
      <td className="number-align whitespace-nowrap py-3 pr-4 text-sm text-[var(--text-secondary)]">{item.transaction_date?.slice(0, 10)}</td>
      <td className="py-3 pr-4 text-sm font-semibold text-[var(--text-primary)]">
        <span className="line-clamp-1">{title}</span>
      </td>
      <td className="py-3 pr-4 text-sm text-[var(--text-secondary)]">{cat}</td>
      <td className="py-3 pr-4 text-sm text-[var(--text-secondary)]">{account}</td>
      <td className="py-3 pr-3 text-right">
        <span className={cn("number-align text-sm font-semibold", isIncome ? "text-[var(--income)]" : "text-[var(--expense)]")}>
          {isIncome ? "+" : "-"}
          {formatIDR(item.amount)}
        </span>
      </td>
    </tr>
  );
}

export const TransactionTableRow = memo(TransactionTableRowBase);
