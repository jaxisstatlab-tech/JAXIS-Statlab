"use client";

import React from "react";
import { IconCheck } from "@tabler/icons-react";

export interface StepItem {
  id: number | string;
  title: string;
  shortTitle?: string;
  subtitle?: string;
}

export interface StepperProps {
  steps: StepItem[];
  currentStep: number; // 1-indexed
  onStepClick?: (stepIndex: number) => void;
  className?: string;
}

const getCleanTitle = (title: string) => title.replace(/^\d+\.\s*/, "");

const getShortTitle = (title: string, shortTitle?: string) => {
  if (shortTitle) return shortTitle;
  const clean = getCleanTitle(title);
  const parts = clean.split("&");
  const firstPart = parts[0]?.trim();
  if (firstPart) return firstPart;
  return clean.split(" ")[0] ?? clean;
};

export const Stepper: React.FC<StepperProps> = ({
  steps,
  currentStep,
  onStepClick,
  className = "",
}) => {
  return (
    <nav
      aria-label="Submission Progress"
      className={`grid grid-cols-3 rounded-[2px] border border-white/[0.09] divide-x divide-white/[0.08] backdrop-blur-md shadow-lg overflow-hidden ${className}`}
      style={{
        borderRadius: "2px",
        border: "1px solid rgba(255, 255, 255, 0.09)",
        backgroundColor: "rgba(1, 22, 46, 0.75)",
      }}
    >
      {steps.map((step, idx) => {
        const stepNumber = idx + 1;
        const isCompleted = stepNumber < currentStep;
        const isActive = stepNumber === currentStep;
        const isClickable = isCompleted && Boolean(onStepClick);

        return (
          <button
            key={step.id}
            type="button"
            disabled={!isClickable}
            onClick={() => isClickable && onStepClick?.(stepNumber)}
            className={`relative flex flex-col justify-center md:justify-between text-left transition-all group py-2.5 px-2 sm:py-3 sm:px-3 md:p-5 md:min-h-[96px] ${
              isClickable
                ? "cursor-pointer hover:bg-white/[0.04]"
                : "cursor-default"
            } ${isActive ? "bg-white/[0.04]" : ""}`}
          >
            {/* Top Indicator Accent Line */}
            {isActive && (
              <span className="absolute top-0 left-0 right-0 h-[2px] bg-[#CC6600]" />
            )}
            {isCompleted && (
              <span className="absolute top-0 left-0 right-0 h-[2px] bg-emerald-500/50" />
            )}

            {/* Mobile / Tablet Compact Layout (< md) */}
            <div className="flex md:hidden items-center justify-center gap-1.5 sm:gap-2 w-full">
              <div
                className={`w-5 h-5 rounded-[2px] font-mono text-[10px] font-bold flex items-center justify-center border transition-colors shrink-0 ${
                  isCompleted
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                    : isActive
                    ? "bg-[#CC6600]/20 text-[#CC6600] border-[#CC6600]/40"
                    : "bg-white/[0.03] text-white/30 border-white/[0.08]"
                }`}
              >
                {isCompleted ? (
                  <IconCheck size={11} stroke={2.5} />
                ) : (
                  <span>{String(stepNumber).padStart(2, "0")}</span>
                )}
              </div>

              <span
                className={`text-xs truncate ${
                  isActive
                    ? "font-sans font-bold text-white"
                    : isCompleted
                    ? "font-sans font-semibold text-emerald-400/90 group-hover:text-white"
                    : "font-sans font-medium text-white/40"
                }`}
              >
                <span className="sm:hidden">{step.shortTitle || getShortTitle(step.title, step.shortTitle)}</span>
                <span className="hidden sm:inline">{getCleanTitle(step.title)}</span>
              </span>

              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#CC6600] animate-pulse shrink-0 hidden sm:inline-block" />
              )}
            </div>

            {/* Desktop Detailed Layout (>= md) */}
            <div className="hidden md:flex flex-col justify-between w-full h-full gap-3">
              {/* Top Row: Index Badge + Status Indicator */}
              <div className="flex items-center justify-between w-full">
                <div
                  className={`w-7 h-7 rounded-[2px] font-mono text-xs font-bold flex items-center justify-center border transition-colors ${
                    isCompleted
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                      : isActive
                      ? "bg-[#CC6600]/20 text-[#CC6600] border-[#CC6600]/40"
                      : "bg-white/[0.03] text-white/30 border-white/[0.08]"
                  }`}
                >
                  {isCompleted ? (
                    <IconCheck size={14} stroke={2.5} />
                  ) : (
                    <span>{String(stepNumber).padStart(2, "0")}</span>
                  )}
                </div>

                {/* Status Badge */}
                {isCompleted ? (
                  <span className="text-[0.625rem] font-mono text-emerald-400 font-semibold uppercase px-2 py-0.5 rounded-[2px] bg-emerald-500/10 border border-emerald-500/20">
                    Done
                  </span>
                ) : isActive ? (
                  <span className="text-[0.625rem] font-mono text-amber-400 font-semibold uppercase px-2 py-0.5 rounded-[2px] bg-[#CC6600]/20 border border-[#CC6600]/40 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#CC6600] animate-pulse" />
                    Active
                  </span>
                ) : (
                  <span className="text-[0.625rem] font-mono text-white/30 uppercase px-2 py-0.5 rounded-[2px] bg-white/[0.02] border border-white/[0.05]">
                    Stage {stepNumber}
                  </span>
                )}
              </div>

              {/* Bottom Content: Title + Subtitle */}
              <div className="flex flex-col gap-1 w-full">
                <span
                  className={`font-mono text-xs font-bold uppercase tracking-wider ${
                    isActive
                      ? "text-white"
                      : isCompleted
                      ? "text-white/80 group-hover:text-white"
                      : "text-white/40"
                  }`}
                >
                  {getCleanTitle(step.title)}
                </span>

                {step.subtitle && (
                  <p
                    className={`text-xs font-sans leading-relaxed ${
                      isActive
                        ? "text-white/70"
                        : isCompleted
                        ? "text-white/50"
                        : "text-white/30"
                    }`}
                  >
                    {step.subtitle}
                  </p>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </nav>
  );
};
