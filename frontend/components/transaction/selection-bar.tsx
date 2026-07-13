"use client";

import { Trash2, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

type SelectionBarProps = {
  count: number;
  allSelected: boolean;
  onToggleAll: () => void;
  onClear: () => void;
  onDeleteRequest: () => void;
  deleting?: boolean;
};

export function SelectionBar({ count, allSelected, onToggleAll, onClear, onDeleteRequest, deleting }: SelectionBarProps) {
  if (count === 0) return null;

  return (
    <div
      className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-[#a7d9c4] bg-white px-4 py-3 shadow-[0_8px_24px_rgba(0,108,73,0.12)]"
      style={{ animation: "dialog-slide-up 0.18s ease-out" }}
    >
      <label className="flex min-w-0 cursor-pointer items-center gap-3">
        <Checkbox checked={allSelected} onChange={onToggleAll} aria-label="Pilih semua transaksi yang tampil" />
        <span className="truncate text-sm font-semibold text-[#0f172a]">{count} dipilih</span>
      </label>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onClear}
          disabled={deleting}
          className="grid h-9 w-9 place-items-center rounded-full text-[#64748b] transition hover:bg-gray-100 disabled:opacity-60"
          aria-label="Batalkan pilihan"
          title="Batalkan pilihan"
        >
          <X size={18} />
        </button>
        <button
          type="button"
          disabled={deleting}
          onClick={onDeleteRequest}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-[#ba1a1a] px-4 text-sm font-semibold text-white shadow-[0_2px_10px_rgba(186,26,26,0.2)] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Trash2 size={16} />
          Hapus Terpilih ({count})
        </button>
      </div>
    </div>
  );
}
