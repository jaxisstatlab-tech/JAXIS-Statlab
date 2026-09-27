"use client";

import * as React from "react";
import { cn } from "./utils";

export interface DividerWithTextProps extends React.HTMLAttributes<HTMLDivElement> {
  lineClassName?: string;
  badgeClassName?: string;
}

export function DividerWithText({
  children,
  className = "",
  lineClassName = "",
  badgeClassName = "",
  ...props
}: DividerWithTextProps) {
  return (
    <div
      className={cn("relative flex items-center justify-center my-2", className)}
      {...props}
    >
      <div className="absolute inset-0 flex items-center">
        <div className={cn("w-full border-t border-white/[0.12]", lineClassName)} />
      </div>
      <span
        className={cn(
          "relative px-3.5 bg-[#040412] text-[0.688rem] text-slate-400 font-mono uppercase tracking-wider select-none",
          badgeClassName
        )}
      >
        {children}
      </span>
    </div>
  );
}
