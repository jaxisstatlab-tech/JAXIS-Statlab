"use client";

import * as React from "react";
import { cn } from "./utils";

export type CardVariant = "default" | "kpi" | "glass" | "bordered";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  contentClassName?: string;
  contentStyle?: React.CSSProperties;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant = "default",
      header,
      footer,
      contentClassName = "",
      contentStyle,
      style,
      children,
      ...props
    },
    ref
  ) => {
    const isKpi = variant === "kpi";
    const hasZeroPadding = className?.includes("p-0");

    const defaultPadding = hasZeroPadding
      ? "0px"
      : isKpi
      ? "1.5rem"
      : "1.75rem";

    return (
      <div
        ref={ref}
        className={cn(
          "relative overflow-hidden rounded-[2px] border border-white/10 hover:border-white/20 transition-all duration-200 backdrop-blur-md flex flex-col box-border shadow-xl",
          isKpi
            ? "bg-[#01142B]/95 justify-between"
            : "bg-[#01142B]/90 justify-start",
          hasZeroPadding ? "p-0" : isKpi ? "p-6" : "p-6 sm:p-8",
          className
        )}
        style={{
          boxSizing: "border-box",
          padding: defaultPadding,
          ...style,
        }}
        {...props}
      >
        {/* Subtle top edge specular highlight */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.15] to-transparent"
          aria-hidden="true"
        />

        {/* Legacy header support */}
        {header && (
          <div className="border-b border-white/10 pb-4 mb-6 w-full">
            {header}
          </div>
        )}

        {/* If legacy header/footer props are used, wrap children with contentClassName */}
        {header || footer ? (
          <div
            className={cn("flex-1 w-full flex flex-col", contentClassName)}
            style={contentStyle}
          >
            {children}
          </div>
        ) : (
          children
        )}

        {/* Legacy footer support */}
        {footer && (
          <div className="border-t border-white/10 pt-4 mt-6 w-full">
            {footer}
          </div>
        )}
      </div>
    );
  }
);
Card.displayName = "Card";

export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 pb-4 border-b border-white/10 mb-6 w-full", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "font-sans text-base sm:text-lg font-semibold text-white tracking-normal",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-white/60 leading-relaxed font-sans mt-1", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex-1 w-full flex flex-col", className)} {...props} />
));
CardContent.displayName = "CardContent";

export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center pt-4 border-t border-white/10 mt-6 w-full", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";
