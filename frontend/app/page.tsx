"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BarChart3, CheckCircle2, LockKeyhole, ShieldCheck, ShoppingCart, Utensils, WalletCards } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { getToken } from "@/services/api/client";
import { cn } from "@/lib/utils";

const slides = [
  {
    title: "Kelola Keuangan dengan Lebih Cerdas",
    description: "Pantau saldo, pemasukan, dan pengeluaran dari satu tempat yang rapi dan mudah dibaca.",
    eyebrow: "EasySaving",
    visual: "wallet"
  },
  {
    title: "Pantau Pengeluaran Otomatis",
    description: "Catat transaksi harian, lihat kategori terbesar, dan pahami pola belanja tanpa ribet.",
    eyebrow: "Smart Tracking",
    visual: "tracking"
  },
  {
    title: "Catatan Keuangan Tetap Privat",
    description: "Data transaksi, kategori, dan saldo hanya tampil di akun Anda tanpa perlu menyimpan nomor rekening bank.",
    eyebrow: "Private Notes",
    visual: "security"
  }
] as const;

function WalletVisual() {
  return (
    <div className="relative grid h-72 w-72 place-items-center">
      <div className="absolute h-64 w-64 rounded-full bg-[#d8e5e0] opacity-50 blur-2xl" />
      <div className="onboarding-float relative w-56 rounded-[28px] border border-white/70 bg-white p-5 shadow-[0_22px_60px_rgba(0,104,67,0.16)]">
        <div className="mb-6 flex items-center justify-between">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#006843] text-white">
            <WalletCards size={25} />
          </span>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#64748b]">Balance</p>
            <p className="mt-1 text-lg font-black text-[#006843] number-align">Rp 12.450k</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="h-3 w-28 rounded-full bg-[#d8e5e0]" />
          <div className="h-3 w-40 rounded-full bg-[#e6e8ea]" />
          <div className="h-3 w-24 rounded-full bg-[#e6e8ea]" />
        </div>
      </div>
    </div>
  );
}

function TrackingVisual() {
  return (
    <div className="relative grid h-72 w-72 place-items-center">
      <div className="absolute h-60 w-60 rounded-full bg-[#93f7c1] opacity-25 blur-3xl" />
      <div className="onboarding-float relative w-64 rounded-[32px] border border-white/70 bg-white p-5 shadow-[0_22px_60px_rgba(0,104,67,0.14)]">
        <div className="mb-5 flex items-center justify-between">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#006843] text-white">
            <BarChart3 size={22} />
          </span>
          <p className="text-sm font-black text-[#006843] number-align">+18%</p>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-2xl bg-[#f2f4f6] p-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-[#a83639]">
              <ShoppingCart size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="mb-1 h-2 w-20 rounded-full bg-[#d8dadc]" />
              <div className="h-1.5 w-12 rounded-full bg-[#e0e3e5]" />
            </div>
            <span className="text-xs font-bold text-[#a83639]">-Rp120k</span>
          </div>
          <div className="flex scale-105 items-center gap-3 rounded-2xl border border-[#b7e4d1] bg-[#e8f7f0] p-3 shadow-[0_14px_34px_rgba(0,104,67,0.10)]">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#006843] text-white">
              <WalletCards size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="mb-1 h-2 w-24 rounded-full bg-[#77daa6]" />
              <div className="h-1.5 w-14 rounded-full bg-[#93f7c1]" />
            </div>
            <span className="text-xs font-bold text-[#006843]">+Rp2.5m</span>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-[#f2f4f6] p-3 opacity-70">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-[#a83639]">
              <Utensils size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="mb-1 h-2 w-16 rounded-full bg-[#d8dadc]" />
              <div className="h-1.5 w-10 rounded-full bg-[#e0e3e5]" />
            </div>
            <span className="text-xs font-bold text-[#a83639]">-Rp85k</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SecurityVisual() {
  return (
    <div className="relative grid h-72 w-72 place-items-center">
      <div className="absolute h-64 w-64 rounded-full bg-[#d8e5e0] opacity-45 blur-3xl" />
      <div className="onboarding-float relative w-64 rounded-[32px] border border-white/70 bg-white p-5 shadow-[0_22px_60px_rgba(0,104,67,0.14)]">
        <div className="mb-5 flex items-center justify-between">
          <span className="onboarding-shimmer grid h-14 w-14 place-items-center rounded-2xl text-white">
            <ShieldCheck size={30} fill="currentColor" strokeWidth={1.6} />
          </span>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#64748b]">Akun</p>
            <p className="mt-1 text-sm font-black text-[#006843]">Privat</p>
          </div>
        </div>

        <div className="space-y-3">
          {[
            ["Transaksi pribadi", "Hanya akun Anda"],
            ["Kategori pengeluaran", "Tersusun rapi"],
            ["Saldo per rekening", "Tanpa nomor rekening"]
          ].map(([title, caption]) => (
            <div key={title} className="flex items-center gap-3 rounded-2xl bg-[#f7f9fb] p-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#e8f7f0] text-[#006843]">
                <CheckCircle2 size={17} />
              </span>
              <div className="min-w-0 text-left">
                <p className="truncate text-xs font-black text-[#191c1e]">{title}</p>
                <p className="mt-0.5 truncate text-[11px] text-[#64748b]">{caption}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="absolute -right-1 top-12 flex items-center gap-2 rounded-xl border border-[#e0e3e5] bg-white px-3 py-2 shadow-lg">
        <LockKeyhole size={17} className="text-[#006843]" />
        <span className="text-[10px] font-black uppercase tracking-widest text-[#64748b]">Login</span>
      </div>
    </div>
  );
}

function SlideVisual({ type }: { type: (typeof slides)[number]["visual"] }) {
  if (type === "tracking") return <TrackingVisual />;
  if (type === "security") return <SecurityVisual />;
  return <WalletVisual />;
}

export default function Home() {
  const router = useRouter();
  const [active, setActive] = useState(0);
  const slide = slides[active];
  const isLast = active === slides.length - 1;

  useEffect(() => {
    if (getToken()) {
      router.replace("/dashboard");
    }
  }, [router]);

  const progressLabel = useMemo(() => `${active + 1} dari ${slides.length}`, [active]);

  function finish() {
    router.push("/auth");
  }

  function next() {
    if (isLast) {
      finish();
      return;
    }
    setActive((current) => Math.min(current + 1, slides.length - 1));
  }

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#f7f9fb] text-[#191c1e]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-[#d8e5e0] opacity-60 blur-3xl" />
        <div className="absolute -right-24 bottom-20 h-72 w-72 rounded-full bg-[#93f7c1] opacity-25 blur-3xl" />
      </div>

      <header className="relative z-10 flex h-16 items-center justify-between px-6">
        <BrandLogo priority className="w-36" />
        <button type="button" onClick={finish} className="rounded-xl px-4 py-2 text-sm font-bold text-[#3e4942] transition hover:bg-[#e8f7f0]">
          Lewati
        </button>
      </header>

      <section className="relative z-10 mx-auto flex w-full max-w-[1100px] flex-1 flex-col items-center justify-center gap-8 px-6 pb-10 pt-4 lg:grid lg:grid-cols-2 lg:gap-12">
        <div className="order-2 w-full text-center lg:order-1 lg:text-left">
          <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-[#006843]">{slide.eyebrow}</p>
          <h1 className="mx-auto max-w-md text-[32px] font-black leading-[40px] tracking-normal text-[#191c1e] lg:mx-0 lg:text-[44px] lg:leading-[52px]">
            {slide.title}
          </h1>
          <p className="mx-auto mt-4 max-w-md text-base leading-7 text-[#3e4942] lg:mx-0">{slide.description}</p>

          <div className="mt-8 flex items-center justify-center gap-2 lg:justify-start" aria-label={progressLabel}>
            {slides.map((item, index) => (
              <button
                key={item.title}
                type="button"
                onClick={() => setActive(index)}
                className={cn(
                  "h-2 rounded-full transition-all",
                  index === active ? "w-8 bg-[#006843]" : "w-2 bg-[#bdcac0] hover:bg-[#77daa6]"
                )}
                aria-label={`Slide ${index + 1}`}
              />
            ))}
          </div>

          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row lg:items-start">
            <button
              type="button"
              onClick={next}
              className="inline-flex h-14 w-full max-w-sm items-center justify-center gap-2 rounded-xl bg-[#006843] px-6 text-sm font-black text-white shadow-[0_16px_36px_rgba(0,104,67,0.22)] transition hover:bg-[#108357] active:scale-95 sm:w-auto"
            >
              {isLast ? "Mulai Sekarang" : "Lanjut"}
              <ArrowRight size={19} />
            </button>
            {!isLast && (
              <button
                type="button"
                onClick={finish}
                className="inline-flex h-14 w-full max-w-sm items-center justify-center rounded-xl border border-[#bdcac0] bg-white px-6 text-sm font-bold text-[#006843] transition hover:bg-[#e8f7f0] active:scale-95 sm:w-auto"
              >
                Masuk
              </button>
            )}
          </div>
        </div>

        <div className="order-1 flex w-full justify-center lg:order-2">
          <SlideVisual type={slide.visual} />
        </div>
      </section>
    </main>
  );
}
