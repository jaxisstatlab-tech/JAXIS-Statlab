"use client";

import React, { useId } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Info } from "@phosphor-icons/react";
import { Card } from "./Card";

export type KpiCardVariant = "default" | "emerald" | "amber" | "sky" | "red" | "orange";

export interface KpiCardProps {
  /** Card title, e.g. "Ready to price". Older pages pass ALL-CAPS labels; those keep a compact mono style. */
  label: string;
  value: string | number | React.ReactNode;
  unit?: string;
  /** Short line under the title, e.g. "Year to date" or what the number means. */
  description?: string | React.ReactNode;
  /** Only `"red"` changes the look (an alert that needs action); other values are kept for existing callers. */
  variant?: KpiCardVariant;
  /** Small neutral tag under the number (shown when there is no `change`). */
  badge?: React.ReactNode;
  /** @deprecated Badges are always neutral now (colour restraint); kept so existing callers still compile. */
  badgeColor?: "orange" | "emerald" | "sky" | "amber" | "indigo" | "gray";
  /** Icon shown in a small tile beside the title. */
  icon?: React.ReactNode;
  href?: string;
  className?: string;
  /** @deprecated Titles choose their style from their casing; kept so existing callers still compile. */
  monoLabel?: boolean;
  /** Help text behind an info icon in the top-right corner. */
  info?: string;
  /** Change line under the number, e.g. { text: "up 8.4%", direction: "up" }. */
  change?: { text: string; direction?: "up" | "down" | "flat" };
  /** Optional chart (oldest to newest) drawn in the bottom-right corner. Only pass real data. */
  trend?: number[];
  /** How the trend is drawn: a filled line (default), bars, or a line with a dot per point. */
  trendStyle?: "area" | "bars" | "dots";
  /** Screen-reader summary of the trend, e.g. "Studies sent per week, last 8 weeks". */
  trendLabel?: string;
  /** Optional progress bar under the value (e.g. paid vs total). */
  meter?: { value: number; max: number; label?: string };
  /** @deprecated Every card now uses the charcoal surface; kept so existing callers still compile. */
  surface?: "navy" | "neutral";
}

// Layout follows a calm analytics card: icon tile, title and subtitle on top; the number, a change line, and an
// optional chart at the bottom. Colour restraint (AGENTS.md rule 16): numbers are white, tiles and tags are
// neutral, charts are the one brand orange. Red is kept for `variant="red"`; a zero is dimmed so the numbers
// that matter stand out.
const ORANGE = "#CC6600";

function Chart({ points, style, label }: { points: number[]; style: "area" | "bars" | "dots"; label?: string }) {
  // useId() can contain characters that break url(#…) references in SVG; keep letters and digits only.
  const gradientId = `kpi-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  if (points.length < 2) return null;
  const w = 112;
  const h = 48;
  const pad = 4;
  const max = Math.max(...points);
  const min = style === "bars" ? 0 : Math.min(...points);
  const span = max - min || 1;

  if (style === "bars") {
    const gap = 3;
    const barW = (w - gap * (points.length - 1)) / points.length;
    return (
      <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} role="img" aria-label={label} className="shrink-0">
        {label ? <title>{label}</title> : null}
        {points.map((v, i) => {
          const bh = Math.max(2, ((v - min) / span) * (h - pad));
          const last = i === points.length - 1;
          return (
            <rect
              key={i}
              x={i * (barW + gap)}
              y={h - bh}
              width={barW}
              height={bh}
              rx={1.5}
              fill={ORANGE}
              fillOpacity={last ? 1 : 0.35}
            />
          );
        })}
      </svg>
    );
  }

  const xy = points.map((v, i) => [
    pad + (i * (w - pad * 2)) / (points.length - 1),
    h - pad - ((v - min) / span) * (h - pad * 2),
  ]);
  // A gently smoothed line through the points.
  let line = `M${xy[0]![0]!.toFixed(1)},${xy[0]![1]!.toFixed(1)}`;
  for (let i = 1; i < xy.length; i++) {
    const [x0, y0] = xy[i - 1]!;
    const [x1, y1] = xy[i]!;
    const mx = (x0! + x1!) / 2;
    line += ` C${mx.toFixed(1)},${y0!.toFixed(1)} ${mx.toFixed(1)},${y1!.toFixed(1)} ${x1!.toFixed(1)},${y1!.toFixed(1)}`;
  }
  const first = xy[0]!;
  const last = xy[xy.length - 1]!;
  const area = `${line} L${last[0]!.toFixed(1)},${h} L${first[0]!.toFixed(1)},${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} role="img" aria-label={label} className="shrink-0 overflow-visible">
      {label ? <title>{label}</title> : null}
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={ORANGE} stopOpacity={0.28} />
          <stop offset="100%" stopColor={ORANGE} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path d={line} fill="none" stroke={ORANGE} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
      {style === "dots"
        ? xy.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={2.25} fill={ORANGE} stroke="#0A0A18" strokeWidth={1.5} />)
        : <circle cx={last[0]} cy={last[1]} r={3} fill={ORANGE} stroke="#0A0A18" strokeWidth={2} />}
    </svg>
  );
}

const valueColor = (variant: KpiCardVariant, value: KpiCardProps["value"]) => {
  if (variant === "red") return "text-red-400";
  return value === 0 || value === "0" ? "text-white/40" : "text-white";
};

// "TOTAL REVENUE"-style labels from older pages keep a compact mono look; "Total revenue" gets the title style.
const isAllCaps = (s: string) => /[A-Z]/.test(s) && s === s.toUpperCase();

function renderValue(value: KpiCardProps["value"]) {
  if (typeof value === "string" && value.includes("₱")) {
    const parts = value.split("₱");
    return (
      <span className="inline-flex items-baseline">
        {parts[0] ? <span>{parts[0]}</span> : null}
        <span className="peso-symbol font-sans font-normal text-[0.8em] opacity-85 mr-0.5 select-none">₱</span>
        <span>{parts.slice(1).join("₱")}</span>
      </span>
    );
  }
  return value;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  unit,
  description,
  variant = "default",
  badge,
  icon,
  href,
  className = "",
  info,
  change,
  trend,
  trendStyle = "area",
  trendLabel,
  meter,
}) => {
  const hasTrend = Boolean(trend && trend.length > 1);
  const meterPct = meter && meter.max > 0 ? Math.min(100, Math.max(0, (meter.value / meter.max) * 100)) : 0;
  const longValue = typeof value === "string" && value.length > 10;
  const ChangeArrow = change?.direction === "down" ? ArrowDownRight : change?.direction === "flat" ? ArrowRight : ArrowUpRight;

  const content = (
    <Card
      variant="kpi"
      className={`rounded-[2px] bg-[#0A0A18] border border-white/[0.07] shadow-none transition-colors duration-200 h-full ${
        href ? "cursor-pointer hover:border-white/[0.14] hover:bg-[#0F0F1D]" : ""
      } ${className}`}
      style={{ padding: "1.25rem", boxSizing: "border-box", minHeight: "148px", display: "flex", flexDirection: "column" }}
    >
      <div className="flex h-full w-full flex-1 flex-col gap-5">
        {/* Icon tile, title and subtitle; optional info */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            {icon ? (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[2px] border border-white/[0.08] bg-white/[0.05] text-white/80">
                {icon}
              </span>
            ) : null}
            <div className="min-w-0 pt-0.5">
              <p
                className={
                  isAllCaps(label)
                    ? "truncate font-mono text-xs font-semibold tracking-wider text-white/60"
                    : "truncate font-sans text-sm font-semibold text-white"
                }
                title={label}
              >
                {label}
              </p>
              {description ? (
                <div className="mt-0.5 line-clamp-2 font-sans text-xs leading-snug text-white/50">{description}</div>
              ) : null}
            </div>
          </div>
          {info ? (
            <span title={info} aria-label={info} role="img" className="shrink-0 text-white/30 transition-colors hover:text-white/70">
              <Info size={16} weight="fill" />
            </span>
          ) : null}
        </div>

        {/* Number, change line or tag, chart */}
        <div className="mt-auto flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-1.5">
              <span
                className={`block font-sans font-semibold tabular-nums tracking-tight ${
                  longValue ? "text-2xl" : "text-3xl"
                } ${valueColor(variant, value)}`}
              >
                {renderValue(value)}
              </span>
              {unit ? <span className="select-none font-sans text-xs text-white/45">{unit}</span> : null}
            </div>
            {change ? (
              <p className="mt-1 inline-flex items-center gap-1 font-sans text-xs text-white/55">
                {change.text}
                <ChangeArrow size={12} weight="bold" className="text-white/45" />
              </p>
            ) : badge ? (
              <span className="mt-1.5 inline-block whitespace-nowrap rounded-[2px] border border-white/10 bg-white/[0.05] px-1.5 py-0.5 font-mono text-[0.688rem] font-semibold tracking-wider text-white/65">
                {badge}
              </span>
            ) : null}
          </div>
          {hasTrend ? <Chart points={trend!} style={trendStyle} label={trendLabel} /> : null}
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
      </div>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block no-underline h-full flex flex-col group">
        {content}
      </Link>
    );
  }

  return content;
};
