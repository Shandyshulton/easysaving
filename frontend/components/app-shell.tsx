"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, BarChart3, Bell, BellRing, CalendarClock, CreditCard, LayoutDashboard, LogOut, Plus, ReceiptText, UserRound } from "lucide-react";
import { clearToken, getStoredUser, setStoredUser } from "@/services/api/client";
import { endpoints } from "@/services/api/easysaving";
import { BrandLogo } from "@/components/brand-logo";
import { cn, formatIDR } from "@/lib/utils";
import { ActionFeedbackHost } from "@/components/ui/action-feedback";
import { useSpendingAlertStatus } from "@/hooks/use-spending-alert";
import type { User } from "@/types/api";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "History", icon: ReceiptText },
  { href: "/transactions/add", label: "Add", icon: Plus, fab: true },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/accounts", label: "Accounts", icon: CreditCard }
];

// Extra destinations shown only in the desktop sidebar. The mobile bottom bar is
// deliberately left at five slots; these are reachable from the dashboard widget
// and the profile menu instead.
const sidebarExtraNav = [{ href: "/scheduled", label: "Terjadwal", icon: CalendarClock }];

function initials(name?: string) {
  const words = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (words.length === 0) return "ES";
  return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase();
}

function UserAvatar({ user }: { user?: User | null }) {
  return (
    <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--primary-soft)] text-sm font-bold leading-none text-[var(--primary-strong)] ring-1 ring-[var(--primary-border)]">
      <span className="-translate-y-[1px]">{initials(user?.name)}</span>
    </span>
  );
}

function ProfileMenu({ user }: { user?: User | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function logout() {
    clearToken();
    queryClient.clear();
    router.push("/auth");
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="rounded-full transition active:scale-95"
        aria-label="Buka menu profile"
      >
        <UserAvatar user={user} />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+10px)] z-[70] w-64 rounded-2xl border border-[#e0e3e5] bg-white p-3 text-left shadow-[0_18px_44px_rgba(15,23,42,0.14)] lg:left-0">
          <div className="mb-2 border-b border-[#eef2f5] px-2 pb-3">
            <p className="truncate text-sm font-bold text-[#0f172a]">{user?.name ?? "EasySaving User"}</p>
            <p className="mt-0.5 truncate text-xs text-[#64748b]">{user?.email ?? "Profile"}</p>
          </div>
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#475569] transition hover:bg-[#e8f7f0] hover:text-[#006c49]"
          >
            <UserRound size={17} />
            Edit Profile
          </Link>
          <Link
            href="/scheduled"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#475569] transition hover:bg-[#e8f7f0] hover:text-[#006c49] lg:hidden"
          >
            <CalendarClock size={17} />
            Transaksi Terjadwal
          </Link>
          <Link
            href="/settings/alerts"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#475569] transition hover:bg-[#e8f7f0] hover:text-[#006c49]"
          >
            <BellRing size={17} />
            Peringatan Pengeluaran
          </Link>
          <button
            type="button"
            onClick={logout}
            className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[#a83639] transition hover:bg-[#ffdad8]"
          >
            <LogOut size={17} />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

const periodLabel = {
  daily: "harian",
  weekly: "mingguan",
  monthly: "bulanan"
};

function NotificationButton() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const alert = useSpendingAlertStatus();

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "relative grid h-10 w-10 place-items-center rounded-full text-[var(--primary-strong)] transition hover:bg-[var(--primary-soft)]",
          alert.exceeded && "bg-[var(--warning-soft)] text-[var(--warning)] hover:bg-[var(--warning-soft)]"
        )}
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell size={22} />
        {alert.exceeded ? <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-[var(--expense)] ring-2 ring-white" /> : null}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-[70] w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-[#e0e3e5] bg-white p-4 text-left shadow-[0_18px_44px_rgba(15,23,42,0.14)]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-[#0f172a]">Notifikasi</p>
            {alert.exceeded ? <span className="rounded-full bg-[#ffdad8] px-2 py-1 text-xs font-bold text-[#a83639]">1 baru</span> : null}
          </div>

          {!alert.enabled && (
            <div className="rounded-xl bg-[#f7f9fb] p-4">
              <p className="text-sm font-semibold text-[#0f172a]">Peringatan pengeluaran belum aktif.</p>
              <p className="mt-1 text-sm leading-5 text-[#64748b]">Atur limit dari menu profile.</p>
            </div>
          )}

          {alert.enabled && !alert.exceeded && (
            <div className="rounded-xl bg-[#e8f7f0] p-4">
              <p className="text-sm font-semibold text-[#0f172a]">Pengeluaran masih aman.</p>
              <p className="mt-1 text-sm text-[#64748b]">
                Terpakai {formatIDR(alert.spent)} dari limit {periodLabel[alert.period]} {formatIDR(alert.limit)}.
              </p>
            </div>
          )}

          {alert.exceeded && (
            <div className="rounded-xl border border-[#ffd28a] bg-[#fff7e8] p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#ffe8ba] text-[#a15c00]">
                  <AlertTriangle size={19} />
                </span>
                <div>
                  <p className="text-sm font-bold text-[#0f172a]">Pengeluaran {periodLabel[alert.period]} melewati batas.</p>
                  <p className="mt-1 text-sm leading-5 text-[#64748b]">
                    Terpakai {formatIDR(alert.spent)} dari limit {formatIDR(alert.limit)} ({alert.percentage.toFixed(0)}%).
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: user } = useQuery({
    queryKey: ["profile"],
    queryFn: endpoints.profile,
    staleTime: 1000 * 60 * 5
  });

  useEffect(() => {
    const storedUser = getStoredUser();
    if (storedUser) queryClient.setQueryData(["profile"], storedUser);
  }, [queryClient]);

  useEffect(() => {
    if (user) setStoredUser(user);
  }, [user]);

  return (
    <div className="min-h-screen bg-[var(--background)] pb-28 lg:pb-0">
      <ActionFeedbackHost />
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-white/95 backdrop-blur lg:hidden">
        <div className="grid h-16 grid-cols-3 items-center px-4">
          <div className="flex items-center justify-start">
            <ProfileMenu user={user} />
          </div>
          <BrandLogo className="mx-auto w-28" />
          <div className="justify-self-end">
            <NotificationButton />
          </div>
        </div>
      </header>

      <aside className="fixed left-0 top-0 hidden h-screen w-64 flex-col border-r border-[var(--border)] bg-white px-4 py-6 lg:flex">
        <div className="flex items-center justify-between gap-3 px-2">
          <BrandLogo className="w-36" sizes="144px" />
          <NotificationButton />
        </div>

        <div className="mt-5 flex items-center gap-3 rounded-[var(--radius)] bg-[var(--surface-muted)] p-2.5">
          <ProfileMenu user={user} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{user?.name ?? "EasySaving User"}</p>
            <p className="mt-0.5 truncate text-xs text-[var(--text-secondary)]">{user?.email ?? "Profile"}</p>
          </div>
        </div>

        <nav className="mt-6 flex-1 space-y-1">
          {[...nav.filter((item) => !item.fab), ...sidebarExtraNav].map((item) => {
            const Icon = item.icon;
            const active = path.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-[var(--radius)] px-3 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--primary-strong)]",
                  active && "bg-[var(--primary-soft)] text-[var(--primary-strong)]"
                )}
              >
                <Icon size={19} strokeWidth={active ? 2.4 : 2} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          className="flex h-11 items-center gap-3 rounded-[var(--radius)] px-3 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--expense-soft)] hover:text-[var(--expense)]"
          onClick={() => {
            clearToken();
            queryClient.clear();
            router.push("/auth");
          }}
        >
          <LogOut size={19} /> Logout
        </button>
      </aside>

      <main className="mx-auto max-w-[1160px] px-4 py-6 lg:ml-64 lg:px-10 lg:py-10">{children}</main>

      <nav aria-label="Bottom Navigation" className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--border)] bg-white/95 px-2 pb-[calc(env(safe-area-inset-bottom,0px)+8px)] pt-2 backdrop-blur lg:hidden">
        <div className="relative mx-auto flex max-w-md items-center justify-between">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = item.fab ? path === item.href : item.href === "/transactions" ? path === item.href : path.startsWith(item.href);
            if (item.fab) {
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  aria-label="Tambah transaksi"
                  className="relative flex h-14 w-16 shrink-0 justify-center text-[10px] font-medium text-[var(--text-secondary)] transition active:scale-95"
                >
                  <span
                    className={cn(
                      "absolute -top-5 grid h-14 w-14 place-items-center rounded-full bg-[var(--primary)] text-white shadow-md shadow-emerald-500/25 ring-4 ring-white transition active:scale-90",
                      active && "bg-[var(--primary-strong)]"
                    )}
                  >
                    <Icon size={26} strokeWidth={2.6} />
                  </span>
                  <span className="absolute bottom-0.5">Add</span>
                </Link>
              );
            }
            return (
              <Link
                key={item.label}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-14 w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium text-[var(--text-secondary)] transition active:scale-95",
                  active && "font-semibold text-[var(--primary-strong)]"
                )}
              >
                <Icon size={22} strokeWidth={active ? 2.4 : 2} />
                <span className="leading-none">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
