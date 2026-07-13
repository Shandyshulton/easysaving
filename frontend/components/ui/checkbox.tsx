"use client";

import { forwardRef, InputHTMLAttributes } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> & {
  /** Visual size in pixels. Defaults to 20 (touch-friendly on mobile lists). */
  size?: number;
};

/**
 * Custom-styled checkbox that keeps a real <input type="checkbox"> underneath
 * for accessibility (labels, keyboard, screen readers) while rendering the
 * brand-consistent (emerald) tick mark on top.
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, size = 20, onClick, ...props }, ref) => {
    return (
      <span
        className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
        style={{ width: size, height: size }}
        onClick={(event) => {
          // Prevent parent rows (which may have their own click handlers) from
          // double-toggling when the checkbox itself is clicked.
          event.stopPropagation();
          onClick?.(event as unknown as React.MouseEvent<HTMLInputElement>);
        }}
      >
        <input
          ref={ref}
          type="checkbox"
          checked={checked}
          className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
          {...props}
        />
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none grid h-full w-full place-items-center rounded-[6px] border-2 border-[#bbcabf] bg-white transition-all duration-150",
            "peer-checked:border-[#006c49] peer-checked:bg-[#006c49]",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-[#10b981]/40 peer-focus-visible:ring-offset-1"
          )}
        >
          <Check
            size={Math.round(size * 0.7)}
            strokeWidth={3}
            className={cn(
              "scale-50 text-white opacity-0 transition-all duration-150",
              checked && "scale-100 opacity-100"
            )}
          />
        </span>
      </span>
    );
  }
);
Checkbox.displayName = "Checkbox";
