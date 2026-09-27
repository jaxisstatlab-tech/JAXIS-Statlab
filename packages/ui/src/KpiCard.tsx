"use client";

import React from "react";
import Link from "next/link";
import { Card } from "./Card";

export type KpiCardVariant = "default" | "emerald" | "amber" | "sky" | "red" | "orange";

export interface KpiCardProps {
  label: string;
  value: string | number | React.ReactNode;
  unit?: string;
  description?: string | React.ReactNode;
  variant?: KpiCardVariant;
  badge?: React.ReactNode;
  badgeColor?: "orange" | "emerald" | "sky" | "amber" | "indigo" | "gray";
  icon?: React.ReactNode;
  href?: string;
  className?: string;
  monoLabel?: boolean;
  /** Optional sparkline (oldest to newest) drawn beside the value. */
  trend?: number[];
  /** Screen-reader summary of the trend, e.g. "Studies sent per month, last 6 months". */
  trendLabel?: string;
  /** Optional progress bar under the value (e.g. paid vs total). */
  meter?: { value: number; max: number; label?: string };
  /** @deprecated Every card now uses the charcoal surface; kept so existing callers still compile. */
  surface?: "navy" | "neutral";
}

const SURFACE_HEX = "#0A0A18";

// Single-series sparkline: 2px line, 10% area wash, end dot with a surface-coloured ring.
function Sparkline({ points, label, ring }: { points: number[]; label?: string; ring: string }) {
  if (points.length < 2) return null;
  const w = 88;
  const h = 32;
  const pad = 4;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const xy = points.map((v, i) => [
    pad + (i * (w - pad * 2)) / (points.length - 1),
    h - pad - ((v - min) / span) * (h - pad * 2),
  ]);
  const line = xy.map(([x, y], i) => `${i ? "L" : "M"}${x!.toFixed(1)},${y!.toFixed(1)}`).join(" ");
  const first = xy[0]!;
  const last = xy[xy.length - 1]!;
  const area = `${line} L${last[0]!.toFixed(1)},${h} L${first[0]!.toFixed(1)},${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} role="img" aria-label={label} className="shrink-0 overflow-visible">
      {label ? <title>{label}</title> : null}
      <path d={area} fill="#CC6600" fillOpacity={0.1} />
      <path d={line} fill="none" stroke="#CC6600" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r={3.5} fill="#CC6600" stroke={ring} strokeWidth={2} />
    </svg>
  );
}

const VARIANT_VALUE_COLORS: Record<KpiCardVariant, string> = {
  default: "text-white",
  emerald: "text-emerald-400",
  amber: "text-amber-400",
  sky: "text-sky-400",
  red: "text-red-400",
  orange: "text-[#CC6600]",
};

const VARIANT_DOT_COLORS: Record<KpiCardVariant, string> = {
  default: "bg-white/40",
  emerald: "bg-emerald-400",
  amber: "bg-amber-400",
  sky: "bg-sky-400",
  red: "bg-red-400",
  orange: "bg-[#CC6600]",
};

const BADGE_STYLES: Record<string, string> = {
  orange: "bg-[#CC6600]/20 text-[#FFA040] border-[#CC6600]/40",
  emerald: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  sky: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  amber: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  indigo: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  gray: "bg-white/[0.06] text-white/60 border-white/10",
};

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  unit,
  description,
  variant = "default",
  badge,
  badgeColor = "gray",
  icon,
  href,
  className = "",
  monoLabel = true,
  trend,
  trendLabel,
  meter,
}) => {
  const surfaceClasses = `bg-[#0A0A18] border border-white/[0.07] hover:border-white/[0.14] shadow-none ${
    href ? "cursor-pointer hover:bg-[#0F0F1D]" : ""
  }`;
  const meterPct = meter && meter.max > 0 ? Math.min(100, Math.max(0, (meter.value / meter.max) * 100)) : 0;
  const content = (
    <Card
      variant="kpi"
      className={`rounded-[2px] transition-all duration-200 group h-full flex flex-col justify-between min-h-[140px] ${surfaceClasses} ${className}`}
      style={{
        padding: "1.25rem 1.5rem",
        boxSizing: "border-box",
        minHeight: "140px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div className="flex flex-col justify-between h-full w-full gap-2.5 flex-1">
        {/* Header Row: Icon + Label (Left) and Micro-Badge (Right) matching Dashdark X */}
        <div className="flex items-center justify-between gap-2 min-h-[1.5rem]">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {icon && (
              <span className="shrink-0 text-white/50">
                {icon}
              </span>
            )}
            <span
              className={`text-xs select-none uppercase tracking-wider font-semibold truncate ${
                monoLabel ? "font-mono text-white/50" : "font-sans text-white/60"
              }`}
              title={label}
            >
              {label}
            </span>
          </div>
          {badge && (
            <div className="flex items-center gap-1.5 shrink-0">
              <span
                className={`text-[0.688rem] font-mono px-2 py-0.5 rounded-[2px] border font-semibold tracking-wider ${
                  BADGE_STYLES[badgeColor] || BADGE_STYLES.gray
                }`}
              >
                {badge}
              </span>
            </div>
          )}
        </div>

        {/* Value Row: Canonical Telemetry Metric Typography (font-mono font-bold tracking-tight) */}
        <div className="my-auto flex items-end justify-between gap-3">
        <div className="py-0.5 flex items-baseline gap-1.5 flex-wrap min-w-0">
          <span
            className={`font-mono font-bold tracking-tight block ${
              typeof value === "string" && value.length > 10
                ? "text-xl sm:text-2xl"
                : "text-2xl sm:text-3xl"
            } ${VARIANT_VALUE_COLORS[variant]}`}
          >
            {typeof value === "string" && value.includes("₱") ? (
              (() => {
                const parts = value.split("₱");
                return (
                  <span className="inline-flex items-baseline font-mono">
                    {parts[0] && <span>{parts[0]}</span>}
                    <span className="peso-symbol font-sans font-normal text-[0.8em] opacity-85 mr-0.5 select-none">
                      ₱
                    </span>
                    <span>{parts.slice(1).join("₱")}</span>
                  </span>
                );
              })()
            ) : (
              value
            )}
          </span>
          {unit && (
            <span className="text-xs text-white/40 font-mono select-none">
              {unit}
            </span>
          )}
        </div>
        {trend && trend.length > 1 ? (
          <Sparkline points={trend} label={trendLabel} ring={SURFACE_HEX} />
        ) : null}
        </div>

        {meter ? (
          <div
            className="h-1 w-full overflow-hidden rounded-[1px] bg-white/[0.08]"
            role="meter"
            aria-label={meter.label ?? label}
            aria-valuemin={0}
            aria-valuemax={meter.max}
            aria-valuenow={meter.value}
          >
            <div className="h-full rounded-[1px] bg-[#CC6600] transition-[width] duration-500" style={{ width: `${meterPct}%` }} />
          </div>
        ) : null}

        {/* Footer / Subtitle Row */}
        <div className="pt-2.5 border-t border-white/[0.06] flex items-center min-h-[1.5rem]">
          {description ? (
            <div className="flex items-center gap-1.5 text-xs font-sans font-normal text-white/50 select-none w-full truncate">
              {typeof description === "string" && (
                <span className={`h-1.5 w-1.5 rounded-full ${VARIANT_DOT_COLORS[variant]} shrink-0`} />
              )}
              <div className="truncate">{description}</div>
            </div>
          ) : (
            <div className="text-xs text-transparent select-none">&nbsp;</div>
          )}
        </div>
      </div>
    </Card>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block no-underline h-full flex flex-col group"
      >
        {content}
      </Link>
    );
  }

  return content;
};
