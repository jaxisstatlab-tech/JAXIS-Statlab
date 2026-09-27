"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "./utils";

export const TooltipProvider = TooltipPrimitive.Provider;
export const TooltipRoot = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 overflow-hidden rounded-[2px] border border-white/20 bg-[#0A0A18] px-3 py-2 text-xs text-white shadow-2xl backdrop-blur-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 max-w-sm",
        className
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

// Backward-compatible high-level component
export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  className?: string;
  delayDuration?: number;
}

export function Tooltip({
  content,
  children,
  position = "top",
  className = "",
  delayDuration = 150,
}: TooltipProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          <span className="inline-flex items-center cursor-default">{children}</span>
        </TooltipPrimitive.Trigger>
        <TooltipContent side={position} className={className}>
          {content}
          <TooltipPrimitive.Arrow className="fill-[#0A0A18]" />
        </TooltipContent>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

export interface TagsOverflowProps {
  tags: string[];
  limit?: number;
  title?: string;
  emptyText?: string;
  position?: "top" | "bottom" | "left" | "right";
  className?: string;
}

/**
 * Reusable enterprise tag chip display with overflow +N badge & hover tooltip.
 */
export function TagsOverflow({
  tags,
  limit = 2,
  title = "Additional Items",
  emptyText = "--",
  position = "bottom",
  className = "",
}: TagsOverflowProps) {
  if (!tags || tags.length === 0) {
    return <span className="text-xs text-white/25 italic">{emptyText}</span>;
  }

  const visibleTags = tags.slice(0, limit);
  const remainingTags = tags.slice(limit);

  return (
    <div className={cn("flex items-center gap-1.5 whitespace-nowrap", className)}>
      {visibleTags.map((tag) => (
        <span
          key={tag}
          className="text-[0.6875rem] font-mono px-2 py-0.5 rounded-[2px] bg-white/[0.03] text-slate-300/80 border border-white/[0.08] whitespace-nowrap truncate max-w-[130px]"
          title={tag}
        >
          {tag}
        </span>
      ))}

      {remainingTags.length > 0 && (
        <Tooltip
          position={position}
          content={
            <div className="flex flex-col gap-2 text-left">
              <span className="text-[0.625rem] font-mono uppercase tracking-widest text-white/50 font-semibold border-b border-white/[0.08] pb-1.5">
                {title} (+{remainingTags.length})
              </span>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {remainingTags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded-[2px] bg-white/[0.06] text-slate-200 border border-white/10 text-[0.6875rem] font-mono whitespace-nowrap shadow-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          }
        >
          <span className="text-[0.6875rem] font-mono px-1.5 py-0.5 rounded-[2px] bg-[#1E1E2C]/80 text-[#38BDF8] border border-[#38BDF8]/30 whitespace-nowrap cursor-help hover:bg-[#1E1E2C] hover:border-[#38BDF8] transition-colors select-none">
            +{remainingTags.length}
          </span>
        </Tooltip>
      )}
    </div>
  );
}
