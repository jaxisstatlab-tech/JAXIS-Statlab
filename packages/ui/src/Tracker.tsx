"use client";

import React from "react";
import * as TooltipPrimitives from "@radix-ui/react-tooltip";
import { cn } from "./utils";

export interface TrackerBlock {
  key?: string | number;
  color?: "emerald" | "amber" | "sky" | "crimson" | "gray" | string;
  tooltip?: string;
}

export interface TrackerProps extends React.HTMLAttributes<HTMLDivElement> {
  data: TrackerBlock[];
  hoverEffect?: boolean;
}

const colorClassMap: Record<string, string> = {
  emerald: "bg-[#10B981] hover:bg-[#059669]",
  amber: "bg-[#CC6600] hover:bg-[#B35900]",
  sky: "bg-[#38BDF8] hover:bg-[#0284C7]",
  crimson: "bg-[#EF4444] hover:bg-[#DC2626]",
  gray: "bg-white/15 hover:bg-white/25",
};

export const Tracker = React.forwardRef<HTMLDivElement, TrackerProps>(
  ({ data = [], className, hoverEffect = true, ...props }, ref) => {
    return (
      <TooltipPrimitives.Provider delayDuration={50}>
        <div
          ref={ref}
          className={cn("flex h-8 w-full items-center gap-1 overflow-hidden", className)}
          {...props}
        >
          {data.map((item, index) => {
            const colorClass =
              (item.color && colorClassMap[item.color]) ||
              (item.color?.startsWith("bg-") ? item.color : "bg-white/20");

            const block = (
              <div
                key={item.key ?? index}
                className={cn(
                  "h-full flex-1 rounded-[1px] transition-all duration-150",
                  colorClass,
                  hoverEffect && "cursor-pointer hover:opacity-90 hover:scale-y-110"
                )}
              />
            );

            if (item.tooltip) {
              return (
                <TooltipPrimitives.Root key={item.key ?? index}>
                  <TooltipPrimitives.Trigger asChild>{block}</TooltipPrimitives.Trigger>
                  <TooltipPrimitives.Portal>
                    <TooltipPrimitives.Content
                      side="top"
                      sideOffset={6}
                      className="z-50 rounded-[2px] border border-white/15 bg-[#0A0A18] px-3 py-1.5 text-xs font-medium tracking-wide text-white shadow-xl backdrop-blur-md"
                    >
                      {item.tooltip}
                    </TooltipPrimitives.Content>
                  </TooltipPrimitives.Portal>
                </TooltipPrimitives.Root>
              );
            }

            return block;
          })}
        </div>
      </TooltipPrimitives.Provider>
    );
  }
);
Tracker.displayName = "Tracker";
