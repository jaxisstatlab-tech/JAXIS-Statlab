"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";

export const badgeVariants = cva(
  "inline-flex items-center gap-1 font-sans uppercase tracking-wider font-semibold rounded-[3px] border select-none whitespace-nowrap transition-colors",
  {
    variants: {
      variant: {
        default: "bg-white/10 text-white border-white/20",
        secondary: "bg-[#02254B] text-[#38BDF8] border-[#38BDF8]/30",
        destructive: "bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30",
        outline: "text-white/90 border-white/30 bg-transparent",
        accent: "bg-[#CC6600]/20 text-[#CC6600] border-[#CC6600]/40",
        amber: "bg-[#CC6600]/20 text-[#CC6600] border-[#CC6600]/40",
        emerald: "bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30",
        success: "bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30",
        sky: "bg-[#38BDF8]/15 text-[#38BDF8] border-[#38BDF8]/30",
        info: "bg-[#38BDF8]/15 text-[#38BDF8] border-[#38BDF8]/30",
        warning: "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30",
        danger: "bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30",
        muted: "bg-white/5 text-white/50 border-white/10",
      },
      size: {
        default: "text-[0.625rem] px-2 py-0.5",
        sm: "text-[0.625rem] px-2 py-0.5",
        md: "text-xs px-2.5 py-1",
        lg: "text-xs px-3 py-1.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "accent"
  | "amber"
  | "emerald"
  | "success"
  | "sky"
  | "info"
  | "warning"
  | "danger"
  | "muted";

export type BadgeSize = "default" | "sm" | "md" | "lg";

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  label?: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
}

export function Badge({
  className,
  variant = "default",
  size = "default",
  label,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    >
      {children ?? label}
    </span>
  );
}
Badge.displayName = "Badge";
