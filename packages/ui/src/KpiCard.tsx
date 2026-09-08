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
}) => {
  const content = (
    <Card
      variant="kpi"
      className={`rounded-[2px] transition-all duration-200 group h-full flex flex-col justify-between min-h-[140px] bg-[#01142B] border border-white/10 hover:border-white/20 shadow-xl ${
        href ? "cursor-pointer hover:bg-[#011B38]" : ""
      } ${className}`}
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
        <div className="py-0.5 my-auto flex items-baseline gap-1.5 flex-wrap">
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
