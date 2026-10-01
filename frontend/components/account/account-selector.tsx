"use client";

import { WalletCards } from "lucide-react";
import { CustomDropdown } from "@/components/ui/custom-dropdown";
import { formatIDR } from "@/lib/utils";
import type { Account } from "@/types/api";

type AccountSelectorProps = {
  accounts: Account[];
  value: string;
  onChange: (value: string) => void;
  includeAll?: boolean;
  label?: string;
};

export function AccountSelector({ accounts, value, onChange, includeAll = true, label = "Rekening Aktif" }: AccountSelectorProps) {
  const options = [
    ...(includeAll ? [{ value: "", label: "Semua Rekening", description: "Gabungan seluruh saldo" }] : []),
    ...accounts.map((account) => ({
      value: account.id,
      label: account.account_name,
      description: formatIDR(account.current_balance)
    }))
  ];

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--primary-border)] bg-[var(--primary-soft)] p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--primary-strong)]">
        <WalletCards size={18} />
        {label}
      </div>
      <CustomDropdown
        value={value}
        options={options}
        placeholder="Pilih rekening"
        onChange={onChange}
        buttonClassName="rounded-[var(--radius)] border-[var(--primary-border)] bg-white font-semibold"
      />
    </div>
  );
}
