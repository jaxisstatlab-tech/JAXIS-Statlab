"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import {
  WarningOctagon,
  Warning,
  CheckCircle,
  Info,
  X,
} from "@phosphor-icons/react";
import { cn } from "./utils";

export const alertVariants = cva(
  "relative w-full rounded-[2px] border p-4 backdrop-blur-md transition-colors leading-relaxed",
  {
    variants: {
      variant: {
        default:
          "bg-[#01142B]/90 border-white/15 text-white/90 [&>svg]:text-white/60",
        info: "bg-[#0284C7]/10 border-[#38BDF8]/30 border-l-4 border-l-[#38BDF8] text-white/90 [&>svg]:text-[#38BDF8]",
        success:
          "bg-[#10B981]/10 border-[#10B981]/30 border-l-4 border-l-[#10B981] text-white/90 [&>svg]:text-[#10B981]",
        warning:
          "bg-[#F59E0B]/10 border-[#F59E0B]/30 border-l-4 border-l-[#F59E0B] text-white/90 [&>svg]:text-[#F59E0B]",
        destructive:
          "bg-[#EF4444]/10 border-[#EF4444]/30 border-l-4 border-l-[#EF4444] text-white/90 [&>svg]:text-[#EF4444]",
        danger:
          "bg-[#EF4444]/10 border-[#EF4444]/30 border-l-4 border-l-[#EF4444] text-white/90 [&>svg]:text-[#EF4444]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const defaultIcons = {
  default: Info,
  info: Info,
  success: CheckCircle,
  warning: Warning,
  destructive: WarningOctagon,
  danger: WarningOctagon,
};

export type AlertVariant = "default" | "info" | "success" | "warning" | "destructive" | "danger";

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  title?: string;
  badgeText?: string;
  showIcon?: boolean;
  onClose?: () => void;
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  (
    {
      className,
      variant = "default",
      title,
      badgeText,
      showIcon = true,
      onClose,
      children,
      ...props
    },
    ref
  ) => {
    const Icon = defaultIcons[variant ?? "default"];

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(alertVariants({ variant }), className)}
        {...props}
      >
        <div className="flex items-start gap-3">
          {showIcon && Icon && (
            <div className="shrink-0 mt-0.5">
              <Icon size={18} weight="fill" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            {(title || badgeText) && (
              <div className="flex items-center gap-2 mb-1">
                {badgeText && (
                  <span className="font-mono text-[0.625rem] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-[1px] bg-white/10 text-white/80">
                    {badgeText}
                  </span>
                )}
                {title && <AlertTitle>{title}</AlertTitle>}
              </div>
            )}
            {typeof children === "string" ? (
              <AlertDescription>{children}</AlertDescription>
            ) : (
              children
            )}
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-[2px] p-1 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X size={14} weight="bold" />
              <span className="sr-only">Dismiss</span>
            </button>
          )}
        </div>
      </div>
    );
  }
);
Alert.displayName = "Alert";

export const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("font-mono text-xs font-bold uppercase tracking-wide leading-none", className)}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

export const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-xs leading-relaxed font-sans text-white/80", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";
