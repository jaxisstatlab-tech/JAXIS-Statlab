"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";

export const inputVariants = cva(
  "flex w-full h-11 sm:h-12 px-4 py-2.5 text-sm rounded-[4px] text-white placeholder:text-white/35 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-sans box-border border focus:outline-none focus:ring-1 focus:ring-[#CC6600]/60 focus:border-[#CC6600] file:border-0 file:bg-transparent file:text-sm file:font-medium [&::-webkit-calendar-picker-indicator]:brightness-0 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-[#0A0A18] border-white/15 hover:border-white/25 focus:border-[#CC6600]",
        terminal: "bg-[#060614] border-white/15 hover:border-white/25 focus:border-[#CC6600] font-mono",
        auth: "bg-[#0A0A18] border-white/15 hover:border-white/25 focus:border-[#CC6600]",
      },
      hasError: {
        true: "!border-[#EF4444] focus:!border-[#EF4444] focus:!ring-[#EF4444]",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      hasError: false,
    },
  }
);

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", variant, error, style, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ variant, hasError: Boolean(error), className }))}
        style={{
          paddingLeft: "1rem",
          paddingRight: "1rem",
          boxSizing: "border-box",
          ...style,
        }}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
