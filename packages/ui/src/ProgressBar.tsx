"use client";

import React from "react";
import { cn } from "./utils";

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  label?: string;
  variant?: "amber" | "sky" | "emerald" | "crimson" | "default";
}

const variantStyles = {
  amber: { bar: "bg-gradient-to-r from-[#B35900] to-[#CC6600]" },
  sky: { bar: "bg-gradient-to-r from-[#0284C7] to-[#38BDF8]" },
  emerald: { bar: "bg-gradient-to-r from-[#059669] to-[#10B981]" },
  crimson: { bar: "bg-gradient-to-r from-[#DC2626] to-[#EF4444]" },
  default: { bar: "bg-[#38BDF8]" },
} as const;

export const ProgressBar = React.forwardRef<HTMLDivElement, ProgressBarProps>(
  ({ value = 0, max = 100, variant = "amber", label, className, ...props }, ref) => {
    const percentage = Math.min(Math.max(0, (value / max) * 100), 100);
    const barClass = (variant in variantStyles ? variantStyles[variant as keyof typeof variantStyles].bar : variantStyles.default.bar);

    return (
      <div ref={ref} className={cn("w-full space-y-1.5", className)} {...props}>
        {label && (
          <div className="flex justify-between items-center text-xs font-mono tracking-wide text-white/70">
            <span>{label}</span>
            <span className="font-bold text-white">{Math.round(percentage)}%</span>
          </div>
        )}
        <div className="h-2 w-full overflow-hidden rounded-[2px] bg-[#0A0A18] border border-white/[0.08]">
          <div
            className={cn("h-full transition-all duration-500 ease-out rounded-[1px]", barClass)}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }
);
ProgressBar.displayName = "ProgressBar";
