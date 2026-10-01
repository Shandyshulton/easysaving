"use client";

import { NumericInput } from "@/components/ui/numeric-input";
import { cn } from "@/lib/utils";

type AmountFieldProps = {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  /** Extra classes for the wrapper (e.g. size or color overrides). */
  className?: string;
  ariaLabel?: string;
};

/** Formats the mirror text the same way NumericInput displays it. */
function formatThousands(value: string) {
  const raw = value.replace(/\D/g, "");
  if (!raw) return "";
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(Number(raw));
}

/**
 * Balanced Rupiah amount input: a small "Rp" prefix followed by an
 * auto-width editable number. The hidden mirror makes the input grow with its
 * content so the whole field stays visually centered and the prefix hugs the digits.
 */
export function AmountField({ value, onValueChange, placeholder = "0", className, ariaLabel = "Jumlah dalam Rupiah" }: AmountFieldProps) {
  const display = formatThousands(value) || placeholder;
  return (
    <label className={cn("amount-field", className)}>
      <span className="amount-prefix" aria-hidden="true">
        Rp
      </span>
      <span className="amount-value">
        <span className="mirror" aria-hidden="true">
          {display}
        </span>
        <NumericInput value={value} onValueChange={onValueChange} placeholder={placeholder} aria-label={ariaLabel} />
      </span>
    </label>
  );
}
