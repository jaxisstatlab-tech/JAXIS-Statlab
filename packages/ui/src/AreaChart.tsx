"use client";

import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from "recharts";
import { cn } from "./utils";

export interface AreaChartProps extends React.HTMLAttributes<HTMLDivElement> {
  data: Record<string, unknown>[];
  index: string;
  categories: string[];
  colors?: string[];
  valueFormatter?: (value: number) => string;
  yAxisFormatter?: (value: number) => string;
  yAxisWidth?: number;
  showLegend?: boolean;
  showGridLines?: boolean;
  height?: number | string;
  allowDecimals?: boolean;
}

const defaultColors = ["#CC6600", "#38BDF8", "#10B981"];

export function AreaChart({
  data = [],
  index,
  categories = [],
  colors = defaultColors,
  valueFormatter = (value: number) => `${value}`,
  yAxisFormatter,
  yAxisWidth = 28,
  showLegend = true,
  showGridLines = true,
  height = 280,
  allowDecimals = false,
  className,
  ...props
}: AreaChartProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className={cn("w-full space-y-3", className)} {...props}>
        {showLegend && (
          <div className="h-4 w-48 bg-white/[0.04] rounded-[2px] animate-pulse" />
        )}
        <div
          style={{ height, width: "100%" }}
          className="bg-white/[0.02] border border-white/[0.06] rounded-[2px] animate-pulse flex items-center justify-center text-xs font-mono text-white/30"
        >
          Loading telemetry chart...
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full space-y-3", className)} {...props}>
      {showLegend && (
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
          {categories.map((cat, idx) => (
            <div key={cat} className="flex items-center gap-1.5 text-white/80">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: colors[idx % colors.length] }}
              />
              <span>{cat}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ height, width: "100%" }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsAreaChart data={data} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
            {showGridLines && (
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" vertical={false} />
            )}
            <XAxis
              dataKey={index}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "rgba(255, 255, 255, 0.5)", fontSize: 11, fontFamily: "monospace" }}
              dy={8}
            />
            <YAxis
              width={yAxisWidth}
              allowDecimals={allowDecimals}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "rgba(255, 255, 255, 0.5)", fontSize: 11, fontFamily: "monospace" }}
              tickFormatter={yAxisFormatter || ((val: number) => `${Math.round(val)}`)}
            />
            <RechartsTooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                return (
                  <div className="rounded-[2px] border border-white/15 bg-[#01142B] p-3 shadow-xl backdrop-blur-md">
                    {label && <p className="text-xs font-mono font-bold text-white/70 mb-1.5">{label}</p>}
                    {payload.map((entry, i: number) => {
                      const item = entry as { color?: string; name?: string; value?: number | string };
                      return (
                        <div key={i} className="flex items-center justify-between gap-4 text-xs font-mono py-0.5">
                          <span className="flex items-center gap-1.5 text-white/80">
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: item.color }}
                            />
                            {item.name}
                          </span>
                          <span className="font-bold text-white">
                            {valueFormatter(Number(item.value ?? 0))}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              }}
            />
            <defs>
              {categories.map((cat, idx) => {
                const color = colors[idx % colors.length];
                const gradId = `color-${cat.replace(/\s+/g, "-")}-${idx}`;
                return (
                  <linearGradient key={gradId} id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                );
              })}
            </defs>
            {categories.map((cat, idx) => {
              const color = colors[idx % colors.length];
              const gradId = `color-${cat.replace(/\s+/g, "-")}-${idx}`;
              return (
                <Area
                  key={cat}
                  type="monotone"
                  dataKey={cat}
                  stroke={color}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill={`url(#${gradId})`}
                />
              );
            })}
          </RechartsAreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
