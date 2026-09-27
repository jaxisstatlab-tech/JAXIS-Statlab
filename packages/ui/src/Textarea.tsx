"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";

export const textareaVariants = cva(
  "flex min-h-[96px] w-full rounded-[4px] border bg-[#0A0A18] px-4 py-3.5 text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-1 focus:ring-[#CC6600]/60 focus:border-[#CC6600] disabled:cursor-not-allowed disabled:opacity-50 transition-colors font-sans resize-y box-border leading-relaxed",
  {
    variants: {
      hasError: {
        true: "border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]",
        false: "border-white/15 hover:border-white/25 focus:border-[#CC6600]",
      },
    },
    defaultVariants: {
      hasError: false,
    },
  }
);

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof textareaVariants> {
  error?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, style, ...props }, ref) => {
    return (
      <textarea
        className={cn(textareaVariants({ hasError: Boolean(error), className }))}
        style={{
          padding: "0.875rem 1rem",
          boxSizing: "border-box",
          ...style,
        }}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";
