"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Filter, Search, SlidersHorizontal, WalletCards, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { CustomDropdown } from "@/components/ui/custom-dropdown";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ActionFeedback, useActionFeedback } from "@/components/ui/action-feedback";
import { AccountSelector } from "@/components/account/account-selector";
import { TransactionRow } from "@/components/transaction/transaction-row";
import { SelectionBar } from "@/components/transaction/selection-bar";
import { endpoints } from "@/services/api/easysaving";
import { useActiveAccountId } from "@/hooks/use-active-account";
import { useSelection } from "@/hooks/use-selection";
import { formatIDR } from "@/lib/utils";
import { groupTransactionsByDate } from "@/lib/transaction-display";

const EMPTY_FILTER = { type: "", category_id: "", date: "" };

export default function TransactionsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState(EMPTY_FILTER);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { accountId, setAccountId } = useActiveAccountId();
  const client = useQueryClient();
  const feedback = useActionFeedback();

  // --- Data fetching, scoped to the active account ------------------------
  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (filter.type) params.set("type", filter.type);
    if (filter.category_id) params.set("category_id", filter.category_id);
    if (accountId) params.set("account_id", accountId);
    if (filter.date) {
      params.set("start_date", filter.date);
      params.set("end_date", filter.date);
    }
    return params.size ? `?${params.toString()}` : "?";
  }, [accountId, filter.category_id, filter.date, filter.type]);

  const { data: accounts = [] } = useQuery({ queryKey: ["accounts"], queryFn: endpoints.accounts });
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: () => endpoints.categories() });
  const {
    data: transactions = [],
    isLoading: transactionsLoading
  } = useQuery({ queryKey: ["transactions", query], queryFn: () => endpoints.transactions(query) });

  // --- Search (client-side, over the already account/filter-scoped data) --
  const visible = useMemo(() => {
    const needle = search.toLowerCase().trim();
    if (!needle) return transactions;
    const categoryById = new Map(categories.map((item) => [item.id, item.name]));
    const accountById = new Map(accounts.map((item) => [item.id, item.account_name]));
    return transactions.filter((item) => {
      const cat = categoryById.get(item.category_id) ?? (item.type === "income" ? "Income" : "Expense");
      const account = accountById.get(item.account_id) ?? "Account";
      return `${item.notes ?? ""} ${cat} ${account} ${item.type}`.toLowerCase().includes(needle);
    });
  }, [accounts, categories, search, transactions]);

  const visibleIds = useMemo(() => visible.map((item) => item.id), [visible]);
  const groups = useMemo(() => groupTransactionsByDate(visible), [visible]);
  const hasActiveFilters = Boolean(search || filter.type || filter.category_id || filter.date);

  // --- Bulk selection state ------------------------------------------------
  const selection = useSelection(visibleIds);

  // --- Bulk delete: confirm modal -> permanent backend deletion -----------
  const bulkDelete = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.allSettled(ids.map((id) => endpoints.deleteTransaction(id)));
      const failed = results.filter((result) => result.status === "rejected").length;
      if (failed > 0) {
        throw new Error(`${failed} dari ${ids.length} transaksi gagal dihapus. Silakan coba lagi.`);
      }
    },
    onSettled: () => {
      client.invalidateQueries({ queryKey: ["transactions"] });
      client.invalidateQueries({ queryKey: ["summary"] });
      client.invalidateQueries({ queryKey: ["accounts"] });
    },
    onSuccess: () => {
      selection.clear();
      setConfirmOpen(false);
      feedback.showSuccess("Transaksi dihapus", "Data dan saldo rekening sudah diperbarui.");
    },
    onError: (error) => {
      feedback.showError("Gagal menghapus transaksi", (error as Error).message);
    }
  });

  return (
    <AppShell>
      <ActionFeedback feedback={feedback.feedback} onClose={feedback.clear} />
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-5 text-[22px] font-semibold leading-8 text-[#0f172a] sm:text-[24px]">Transaction History</h1>

        <div className="mb-4">
          <AccountSelector
            accounts={accounts}
            value={accountId}
            onChange={(value) => {
              setAccountId(value);
              selection.clear();
            }}
          />
        </div>

        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#64748b]" size={20} />
          <Input
            className="h-12 rounded-full border-gray-200 bg-white pl-12 text-base shadow-[0_2px_10px_rgba(15,23,42,0.04)]"
            placeholder="Cari transaksi..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <label className="relative shrink-0">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[#64748b]" size={17} />
            <Input
              type="date"
              className="h-11 w-[164px] rounded-full border-gray-200 bg-white pl-9 pr-3 text-sm shadow-[0_2px_10px_rgba(15,23,42,0.04)]"
              value={filter.date}
              onChange={(event) => setFilter((current) => ({ ...current, date: event.target.value }))}
            />
          </label>

          <div className="relative w-[136px] shrink-0">
            <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[#64748b]" size={17} />
            <CustomDropdown
              value={filter.type}
              onChange={(value) => setFilter((current) => ({ ...current, type: value }))}
              placeholder="Type"
              options={[
                { value: "", label: "Semua Type" },
                { value: "income", label: "Income" },
                { value: "expense", label: "Expense" }
              ]}
              buttonClassName="h-11 rounded-full border-gray-200 pl-9 pr-2 text-sm shadow-[0_2px_10px_rgba(15,23,42,0.04)]"
            />
          </div>

          <div className="relative w-[164px] shrink-0">
            <Filter className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[#64748b]" size={17} />
            <CustomDropdown
              value={filter.category_id}
              onChange={(value) => setFilter((current) => ({ ...current, category_id: value }))}
              placeholder="Category"
              options={[{ value: "", label: "Semua Kategori" }, ...categories.map((item) => ({ value: item.id, label: item.name }))]}
              buttonClassName="h-11 rounded-full border-gray-200 pl-9 pr-2 text-sm shadow-[0_2px_10px_rgba(15,23,42,0.04)]"
            />
          </div>

          {hasActiveFilters && (
            <>
              <div className="h-6 w-px shrink-0 bg-gray-200" />
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setFilter(EMPTY_FILTER);
                }}
                className="inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-2 text-sm font-bold text-[#006c49] transition hover:bg-emerald-50"
              >
                <X size={15} />
                Clear All
              </button>
            </>
          )}
        </div>

        <SelectionBar
          count={selection.count}
          allSelected={selection.allVisibleSelected}
          onToggleAll={selection.toggleAllVisible}
          onClear={selection.clear}
          onDeleteRequest={() => setConfirmOpen(true)}
          deleting={bulkDelete.isPending}
        />

        {bulkDelete.isError && (
          <div className="mb-4 rounded-xl border border-[#ffb3b0] bg-[#ffdad8]/50 px-4 py-3 text-sm text-[#a01616]">
            {(bulkDelete.error as Error).message}
          </div>
        )}

        <div className="space-y-8">
          {transactionsLoading && (
            <div className="space-y-3">
              {[0, 1, 2].map((index) => (
                <div key={index} className="h-[76px] animate-pulse rounded-xl bg-white shadow-[0_4px_20px_rgba(15,23,42,0.035)]" />
              ))}
            </div>
          )}

          {!transactionsLoading &&
            groups.map((group) => (
              <section key={group.label}>
                <div className="mb-3 flex items-center justify-between border-b border-gray-200 pb-2">
                  <h2 className="text-sm font-bold tracking-wide text-[#64748b]">{group.label}</h2>
                  <p className={`text-sm number-align ${group.total >= 0 ? "text-[#007a50]" : "text-[#64748b]"}`}>
                    {group.total >= 0 ? "+" : "-"}
                    {formatIDR(Math.abs(group.total))}
                  </p>
                </div>
                <div className="space-y-3">
                  {group.items.map((item) => (
                    <TransactionRow
                      key={item.id}
                      item={item}
                      accounts={accounts}
                      categories={categories}
                      checked={selection.isSelected(item.id)}
                      onToggle={selection.toggle}
                    />
                  ))}
                </div>
              </section>
            ))}

          {!transactionsLoading && groups.length === 0 && (
            <div className="rounded-3xl bg-white p-8 text-center shadow-[0_4px_20px_rgba(15,23,42,0.04)]">
              <WalletCards className="mx-auto mb-3 text-[#64748b]" />
              <p className="text-sm text-[#64748b]">Belum ada transaksi pada filter ini.</p>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={`Hapus ${selection.count} transaksi?`}
        description="Transaksi yang dihapus akan hilang permanen dari database dan tidak dapat dikembalikan. Saldo rekening terkait akan disesuaikan otomatis."
        confirmLabel={bulkDelete.isPending ? "Menghapus..." : "Ya, Hapus"}
        cancelLabel="Batal"
        tone="danger"
        loading={bulkDelete.isPending}
        onCancel={() => {
          if (!bulkDelete.isPending) setConfirmOpen(false);
        }}
        onConfirm={() => bulkDelete.mutate(selection.selectedIds)}
      />
    </AppShell>
  );
}
