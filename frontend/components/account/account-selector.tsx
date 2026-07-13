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
    <div className="rounded-[24px] border border-[#d7eadf] bg-[#e8f7f0]/80 p-4 shadow-[0_4px_20px_rgba(0,108,73,0.08)]">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#006c49]">
        <WalletCards size={18} />
        {label}
      </div>
      <CustomDropdown
        value={value}
        options={options}
        placeholder="Pilih rekening"
        onChange={onChange}
        buttonClassName="rounded-2xl border-[#b7e4d1] bg-white/90 font-semibold"
      />
    </div>
  );
}
