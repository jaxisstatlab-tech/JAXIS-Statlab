"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { CircleNotch } from "@phosphor-icons/react";
import { cn } from "./utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-sans font-semibold rounded-[2px] transition-colors duration-150 select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CC6600]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#010114] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:opacity-90",
  {
    variants: {
      variant: {
        default:
          "bg-[#CC6600] hover:bg-[#E67300] active:bg-[#B35900] text-white border border-[#E67300]/40 shadow-sm",
        primary:
          "bg-[#CC6600] hover:bg-[#E67300] active:bg-[#B35900] text-white border border-[#E67300]/40 shadow-sm",
        secondary:
          "bg-[#011B38] hover:bg-[#01254D] active:bg-[#01142B] text-white border border-white/15 hover:border-white/25 shadow-sm",
        outline:
          "bg-transparent hover:bg-white/[0.08] active:bg-white/[0.12] text-white/90 hover:text-white border border-white/20 hover:border-white/40",
        ghost:
          "bg-transparent hover:bg-white/[0.08] active:bg-white/[0.12] text-white/80 hover:text-white border border-transparent",
        destructive:
          "bg-[#DC2626] hover:bg-[#EF4444] active:bg-[#B91C1C] text-white border border-red-400/30 shadow-sm",
        danger:
          "bg-[#DC2626] hover:bg-[#EF4444] active:bg-[#B91C1C] text-white border border-red-400/30 shadow-sm",
        link:
          "text-[#38BDF8] underline-offset-4 hover:underline border-transparent bg-transparent font-medium",
      },
      size: {
        default: "text-xs sm:text-sm px-5 py-2.5 min-h-[40px] tracking-wide",
        sm: "text-xs px-4 py-2 min-h-[36px] tracking-wide",
        md: "text-xs sm:text-sm px-5 py-2.5 min-h-[40px] tracking-wide",
        lg: "text-sm sm:text-base px-7 py-3.5 min-h-[48px] tracking-wide",
        icon: "h-10 w-10 p-0 min-h-[40px] min-w-[40px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export type ButtonVariant =
  | "default"
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive"
  | "danger"
  | "link";

export type ButtonSize = "default" | "sm" | "md" | "lg" | "icon";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "default",
      asChild = false,
      loading = false,
      disabled = false,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    const isDisabled = disabled || loading;

    return (
      <Comp
        ref={ref}
        disabled={isDisabled}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        {loading && (
          <CircleNotch
            size={size === "sm" ? 14 : size === "lg" ? 18 : 16}
            weight="bold"
            className="animate-spin text-white/90 shrink-0"
          />
        )}
        {typeof children === "string" ? <span>{children}</span> : children}
      </Comp>
    );
  }
);
Button.displayName = "Button";
