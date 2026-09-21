"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import {
  WarningCircle,
  CheckCircle,
  Info,
  X,
} from "@phosphor-icons/react";
import { cn } from "./utils";

export const alertVariants = cva(
  "relative w-full rounded-[2px] border p-3.5 backdrop-blur-sm transition-colors leading-relaxed animate-content-fade",
  {
    variants: {
      variant: {
        default:
          "bg-[#01142B]/90 border-white/15 text-white/90 [&>div>div>svg]:text-white/60",
        info: "bg-sky-500/[0.08] border-sky-500/30 text-white/90 [&>div>div>svg]:text-sky-400",
        success:
          "bg-emerald-500/[0.08] border-emerald-500/30 text-white/90 [&>div>div>svg]:text-emerald-400",
        warning:
          "bg-amber-500/[0.08] border-amber-500/30 text-white/90 [&>div>div>svg]:text-amber-400",
        destructive:
          "bg-red-500/[0.08] border-red-500/30 text-white/90 [&>div>div>svg]:text-red-400",
        danger:
          "bg-red-500/[0.08] border-red-500/30 text-white/90 [&>div>div>svg]:text-red-400",
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
  warning: WarningCircle,
  destructive: WarningCircle,
  danger: WarningCircle,
};

const titleColorVariants = {
  default: "text-white",
  info: "text-sky-200",
  success: "text-emerald-200",
  warning: "text-amber-200",
  destructive: "text-red-200",
  danger: "text-red-200",
};

const iconColorVariants = {
  default: "text-white/60",
  info: "text-sky-400",
  success: "text-emerald-400",
  warning: "text-amber-400",
  destructive: "text-red-400",
  danger: "text-red-400",
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
    const iconColor = iconColorVariants[variant ?? "default"];
    const titleColor = titleColorVariants[variant ?? "default"];

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
              <Icon size={18} weight="fill" className={iconColor} />
            </div>
          )}

          <div className="flex-1 min-w-0 flex flex-col gap-1 text-xs font-sans">
            {(title || badgeText) && (
              <div className="flex items-center gap-2">
                {badgeText && (
                  <span className="font-mono text-[0.625rem] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-[1px] bg-white/10 text-white/80">
                    {badgeText}
                  </span>
                )}
                {title && <AlertTitle className={titleColor}>{title}</AlertTitle>}
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
              className="shrink-0 rounded-[2px] p-1 text-white/50 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
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
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("font-sans text-sm font-semibold leading-snug tracking-tight", className)}
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
    className={cn("text-xs leading-relaxed font-sans text-white/70", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";
