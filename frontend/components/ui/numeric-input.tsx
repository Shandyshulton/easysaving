import { forwardRef, InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type NumericInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "inputMode" | "value" | "onChange"> & {
  value?: string;
  onValueChange?: (value: string) => void;
};

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function formatThousands(value: string) {
  const raw = digitsOnly(value);
  if (!raw) return "";
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(Number(raw));
}

export const NumericInput = forwardRef<HTMLInputElement, NumericInputProps>(function NumericInput({ className, onValueChange, onKeyDown, value = "", ...props }, ref) {
  return (
    <input
      ref={ref}
      type="text"
      inputMode="numeric"
      value={formatThousands(value)}
      className={cn("font-semibold number-align", className)}
      onKeyDown={(event) => {
        const allowed = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Tab", "Home", "End", "Enter"];
        if (!allowed.includes(event.key) && !/^\d$/.test(event.key)) {
          event.preventDefault();
        }
        onKeyDown?.(event);
      }}
      onChange={(event) => {
        onValueChange?.(digitsOnly(event.currentTarget.value));
      }}
      {...props}
    />
  );
});
