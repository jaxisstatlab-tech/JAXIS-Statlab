"use client";

import React from "react";
import { CheckCircle } from "@phosphor-icons/react";

export interface FeatureItem {
  tag: string;
  title: string;
  desc: string;
  metric: string;
  metricLabel: string;
}

export interface StackedCardData {
  id: string;
  step: string;
  badge: string;
  title: string;
  subtitle: string;
  accent: string;
  bgGradient?: string;
  tabBg?: string;
  borderColor?: string;
  pills: string[];
  features: FeatureItem[];
}

interface SolutionCardProps {
  card: StackedCardData;
  index: number;
  isLast?: boolean;
  topOffset?: string;
  isStaticLayout?: boolean;
}

export default function SolutionCard({
  card,
  index,
  isLast = false,
  topOffset,
  isStaticLayout = false,
}: SolutionCardProps) {
  const calculatedTop = topOffset ?? `calc(165px + ${index * 52}px)`;

  return (
    <div
      id={card.id}
      className={[
        "stacked-card-wrapper w-full box-border rounded-[2px] overflow-hidden transition-all duration-300",
        "bg-[#01142B] border border-white/10 hover:border-white/20",
        "shadow-2xl shadow-black/80",
        isStaticLayout ? "relative mb-0" : "sticky",
        !isStaticLayout && (isLast ? "mb-12" : "mb-[18vh]"),
      ].join(" ")}
      style={{
        top: isStaticLayout ? undefined : calculatedTop,
        zIndex: index + 1,
      }}
    >
      {/* ── 50px Dedicated Header Tab Bar (Always visible in the stack) ── */}
      <div className="h-12 flex justify-between items-center px-6 bg-[#011B38] border-b border-white/10 select-none">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 bg-[#CC6600] inline-block" />
          <span className="font-mono text-xs tracking-wider text-[#CC6600] font-semibold uppercase">
            {card.badge}
          </span>
        </div>

        <div className="font-mono text-base font-bold text-[#CC6600]">
          {card.step}
        </div>
      </div>

      {/* ── Card Content Body ── */}
      <div className="p-6 sm:p-8">
        {/* Title */}
        <h3 className="text-xl sm:text-2xl lg:text-3xl font-sans font-normal text-white tracking-tight mb-2">
          {card.title}
        </h3>

        {/* Subtitle */}
        <p className="text-sm font-sans text-white/70 leading-relaxed max-w-3xl mb-5">
          {card.subtitle}
        </p>

        {/* Tab Pills / Check Tags */}
        <div className="flex flex-wrap gap-2 mb-6 pb-5 border-b border-white/10">
          {card.pills.map((pill, pIdx) => (
            <div
              key={pIdx}
              className="bg-white/[0.04] border border-white/10 px-3 py-1.5 rounded-[2px] font-mono text-xs text-white/90 inline-flex items-center gap-2"
            >
              <CheckCircle size={13} weight="fill" className="text-[#CC6600] shrink-0" />
              <span>{pill}</span>
            </div>
          ))}
        </div>

        {/* 4-Column Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {card.features.map((feat, fIdx) => (
            <div
              key={fIdx}
              className="bg-[#010114]/70 border border-white/10 rounded-[2px] p-4 flex flex-col justify-between min-h-[140px] hover:border-white/20 transition-colors"
            >
              <div>
                <div className="font-mono text-[10px] tracking-wider text-white/40 uppercase mb-1.5">
                  {feat.tag}
                </div>

                <div className="font-sans text-sm font-medium text-white mb-1.5 leading-snug">
                  {feat.title}
                </div>

                <div className="font-sans text-xs text-white/60 leading-relaxed">
                  {feat.desc}
                </div>
              </div>

              {/* Bottom Metric Badge */}
              <div className="mt-4 pt-3 border-t border-white/10 flex justify-between items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#38bdf8]">
                  {feat.metric}
                </span>

                <span className="font-mono text-[9px] tracking-wider text-white/40 uppercase">
                  {feat.metricLabel}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
