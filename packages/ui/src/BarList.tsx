"use client";

import React from "react";
import { cn } from "./utils";

export interface BarListItem {
  name: string;
  value: number;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface BarListProps extends React.HTMLAttributes<HTMLDivElement> {
  data: BarListItem[];
  valueFormatter?: (value: number) => string;
}

export const BarList = React.forwardRef<HTMLDivElement, BarListProps>(
  ({ data = [], valueFormatter = (val: number) => `${val}`, className, ...props }, ref) => {
    const maxValue = Math.max(...data.map((item) => item.value), 0);

    return (
      <div ref={ref} className={cn("flex flex-col space-y-2 w-full", className)} {...props}>
        {data.map((item, index) => {
          const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
          const Icon = item.icon;

          return (
            <div
              key={item.name + index}
              className="group relative flex items-center justify-between py-1 text-xs"
            >
              <div
                className="absolute inset-y-0 left-0 rounded-[2px] bg-[#171725]/70 border-l-2 border-[#38BDF8] transition-all duration-300 group-hover:bg-[#171725]"
                style={{ width: `${percentage}%` }}
              />
              <div className="relative z-10 flex items-center gap-2 px-2.5 py-1 text-white/90 font-medium truncate">
                {Icon && <Icon className="h-4 w-4 text-[#38BDF8] shrink-0" />}
                <span className="truncate">{item.name}</span>
              </div>
              <span className="relative z-10 font-mono font-bold text-white px-2.5 shrink-0">
                {valueFormatter(item.value)}
              </span>
            </div>
          );
        })}
      </div>
    );
  }
);
BarList.displayName = "BarList";
