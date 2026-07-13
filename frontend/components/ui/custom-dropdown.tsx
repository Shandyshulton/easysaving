"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type DropdownOption = {
  value: string;
  label: string;
  description?: string;
};

type CustomDropdownProps = {
  value: string;
  options: DropdownOption[];
  placeholder: string;
  onChange: (value: string) => void;
  className?: string;
  buttonClassName?: string;
  disabled?: boolean;
};

export function CustomDropdown({ value, options, placeholder, onChange, className, buttonClassName, disabled }: CustomDropdownProps) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const selected = options.find((item) => item.value === value);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target as Node;
      if (!ref.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!open) return;

    function updateMenuPosition() {
      const rect = ref.current?.getBoundingClientRect();
      if (!rect) return;

      setMenuStyle({
        left: rect.left,
        top: rect.bottom + 8,
        width: rect.width
      });
    }

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open]);

  const menu =
    open && menuStyle
      ? createPortal(
          <div
            ref={menuRef}
            style={menuStyle}
            className="fixed z-[100] max-h-64 overflow-auto rounded-xl border border-[#e0e3e5] bg-white p-1 shadow-[0_12px_32px_rgba(15,23,42,0.12)]"
          >
            {options.length === 0 ? (
              <div className="px-3 py-3 text-sm text-[#64748b]">Belum ada pilihan.</div>
            ) : (
              options.map((item) => {
                const active = item.value === value;
                return (
                  <button
                    key={item.value || "empty"}
                    type="button"
                    onClick={() => {
                      onChange(item.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-left text-sm transition hover:bg-[#e8f7f0]",
                      active && "bg-[#e8f7f0] text-[#006c49]"
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{item.label}</span>
                      {item.description ? <span className="block truncate text-xs font-normal text-[#64748b]">{item.description}</span> : null}
                    </span>
                    {active ? <Check size={18} className="shrink-0" /> : null}
                  </button>
                );
              })
            )}
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-lg border border-[#bbcabf] bg-white px-4 py-3 text-left text-base leading-6 text-[#191c1e] shadow-none transition hover:bg-[#f7f9fb] focus:border-[#006c49] focus:outline-none focus:ring-1 focus:ring-[#006c49] disabled:cursor-not-allowed disabled:opacity-60",
          buttonClassName
        )}
      >
        <span className={cn("truncate", !selected && "text-[#64748b]")}>{selected?.label ?? placeholder}</span>
        <ChevronDown size={21} className={cn("shrink-0 text-[#3c4a42] transition", open && "rotate-180")} />
      </button>

      {menu}
    </div>
  );
}
