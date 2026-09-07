"use client";

import React, { useState, useEffect, useId, useMemo } from "react";
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
  valueFormatter?: (value: number, category?: string) => string;
  yAxisFormatter?: (value: number) => string;
  yAxisWidth?: number;
  showLegend?: boolean;
  showGridLines?: boolean;
  height?: number | string;
  allowDecimals?: boolean;
  domain?: React.ComponentProps<typeof YAxis>["domain"];
  ticks?: number[];
}

const defaultColors = ["#CC6600", "#38BDF8", "#10B981"];

export function AreaChart({
  data = [],
  index,
  categories = [],
  colors = defaultColors,
  valueFormatter = (value: number) => `${value}`,
  yAxisFormatter,
  yAxisWidth = 32,
  showLegend = true,
  showGridLines = true,
  height = 280,
  allowDecimals = false,
  domain: customDomain,
  ticks: customTicks,
  className,
  ...props
}: AreaChartProps) {
  const [isMounted, setIsMounted] = useState(false);
  const reactId = useId();
  const safeId = reactId.replace(/[^a-zA-Z0-9_-]/g, "");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Compute maximum value in the dataset across all active categories
  const maxValue = useMemo(() => {
    let max = 0;
    for (const item of data) {
      for (const cat of categories) {
        const val = Number(item[cat]);
        if (!isNaN(val) && val > max) {
          max = val;
        }
      }
    }
    return max;
  }, [data, categories]);

  // Compute clean integer ticks and domain when allowDecimals is false
  const { domain: computedDomain, ticks: computedTicks } = useMemo(() => {
    if (customDomain && customTicks) {
      return { domain: customDomain, ticks: customTicks };
    }
    if (allowDecimals) {
      return {
        domain: customDomain ?? ([0, "auto"] as const),
        ticks: customTicks,
      };
    }

    // Discrete integer counts (e.g. studies, milestones, deliverables)
    // Scale 0 to 4 baseline for low counts, or calculate clean integer steps
    const safeMax = Math.max(0, Math.ceil(maxValue));

    if (safeMax <= 4) {
      const defaultDomain: [number, number] = [0, 4];
      const defaultTicks: number[] = [0, 1, 2, 3, 4];
      return {
        domain: customDomain ?? defaultDomain,
        ticks: customTicks ?? defaultTicks,
      };
    }

    // Determine an ideal integer step (2, 5, 10, 20, 50, etc.)
    const roughStep = safeMax / 4;
    const power = Math.pow(10, Math.floor(Math.log10(roughStep)));
    const normalized = roughStep / power;

    let step: number;
    if (normalized <= 1) step = 1 * power;
    else if (normalized <= 2) step = 2 * power;
    else if (normalized <= 5) step = 5 * power;
    else step = 10 * power;

    step = Math.max(1, Math.round(step));
    const finalMax = Math.ceil(safeMax / step) * step;
    const tickCount = Math.round(finalMax / step);
    const ticks: number[] = [];
    for (let i = 0; i <= tickCount; i++) {
      ticks.push(i * step);
    }

    const defaultDomain: [number, number] = [0, finalMax];
    return {
      domain: customDomain ?? defaultDomain,
      ticks: customTicks ?? ticks,
    };
  }, [allowDecimals, customDomain, customTicks, maxValue]);

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
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.04] pb-2.5">
          <div className="flex flex-wrap items-center gap-4">
            {categories.map((cat, idx) => {
              const color = colors[idx % colors.length];
              return (
                <div key={cat} className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full ring-1 ring-white/20"
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-sans text-xs font-medium text-white/80">
                    {cat}
                  </span>
                </div>
              );
            })}
          </div>
          <span className="text-[11px] text-white/40 font-mono hidden sm:inline-block">
            Scale: Units
          </span>
        </div>
      )}
      <div style={{ height, width: "100%" }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsAreaChart
            data={data}
            margin={{ top: 8, right: 12, left: -4, bottom: 0 }}
          >
            {showGridLines && (
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255, 255, 255, 0.08)"
                vertical={false}
              />
            )}
            <XAxis
              dataKey={index}
              tickLine={false}
              axisLine={false}
              tick={{
                fill: "rgba(255, 255, 255, 0.5)",
                fontSize: 11,
                fontFamily: "monospace",
              }}
              dy={8}
            />
            <YAxis
              width={yAxisWidth}
              domain={computedDomain}
              ticks={computedTicks}
              allowDecimals={allowDecimals}
              tickLine={false}
              axisLine={false}
              tick={{
                fill: "rgba(255, 255, 255, 0.5)",
                fontSize: 11,
                fontFamily: "monospace",
              }}
              tickFormatter={
                yAxisFormatter || ((val: number) => `${Math.round(val)}`)
              }
            />
            <RechartsTooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                return (
                  <div className="rounded-[2px] border border-white/15 bg-[#01142B] p-3 shadow-xl backdrop-blur-md">
                    {label && (
                      <p className="text-xs font-mono font-bold text-white/70 mb-1.5">
                        {label}
                      </p>
                    )}
                    {payload.map((entry, i: number) => {
                      const item = entry as {
                        color?: string;
                        name?: string;
                        value?: number | string;
                      };
                      return (
                        <div
                          key={i}
                          className="flex items-center justify-between gap-4 text-xs font-mono py-0.5"
                        >
                          <span className="flex items-center gap-1.5 text-white/80">
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: item.color }}
                            />
                            {item.name}
                          </span>
                          <span className="font-bold text-white">
                            {valueFormatter(
                              Number(item.value ?? 0),
                              item.name
                            )}
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
                const gradId = `color-${safeId}-${idx}`;
                return (
                  <linearGradient
                    key={gradId}
                    id={gradId}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                );
              })}
            </defs>
            {categories.map((cat, idx) => {
              const color = colors[idx % colors.length];
              const gradId = `color-${safeId}-${idx}`;
              return (
                <Area
                  key={cat}
                  type="monotone"
                  dataKey={cat}
                  stroke={color}
                  strokeWidth={2}
                  baseValue={0}
                  fillOpacity={1}
                  fill={`url(#${gradId})`}
                  isAnimationActive={true}
                  animationDuration={500}
                  animationEasing="ease-out"
                />
              );
            })}
          </RechartsAreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
