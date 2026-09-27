"use client";

import React from "react";
import { cn } from "./utils";

export interface CategoryBarProps extends React.HTMLAttributes<HTMLDivElement> {
  values: number[];
  colors?: string[];
}

const defaultColors = ["#10B981", "#38BDF8", "#CC6600", "#EF4444", "#6B7280"];

export const CategoryBar = React.forwardRef<HTMLDivElement, CategoryBarProps>(
  ({ values = [], colors = defaultColors, className, ...props }, ref) => {
    const total = values.reduce((sum, v) => sum + v, 0);

    return (
      <div ref={ref} className={cn("w-full space-y-2", className)} {...props}>
        <div className="flex h-2.5 w-full overflow-hidden rounded-[2px] bg-[#0A0A18] border border-white/[0.08] gap-0.5">
          {values.map((val, idx) => {
            const percentage = total > 0 ? (val / total) * 100 : 0;
            const color = colors[idx % colors.length];

            return (
              <div
                key={idx}
                className="h-full transition-all duration-300 first:rounded-l-[1px] last:rounded-r-[1px]"
                style={{ width: `${percentage}%`, backgroundColor: color }}
              />
            );
          })}
        </div>
      </div>
    );
  }
);
CategoryBar.displayName = "CategoryBar";
