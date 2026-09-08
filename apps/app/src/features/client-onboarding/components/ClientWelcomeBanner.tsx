"use client";

import React from "react";
import Link from "next/link";
import { Card, Button } from "@repo/ui";
import {
  GraduationCap,
  CloudArrowUp,
  Question,
  Check,
  ArrowRight,
  Sparkle,
} from "@phosphor-icons/react";

export interface ClientWelcomeBannerProps {
  isProfileComplete: boolean | null;
  onOpenProfileModal: () => void;
  onOpenHowToUseModal: () => void;
}

export const ClientWelcomeBanner: React.FC<ClientWelcomeBannerProps> = ({
  isProfileComplete,
  onOpenProfileModal,
  onOpenHowToUseModal,
}) => {
  return (
    <Card className="p-6 sm:p-8 border border-white/15 bg-gradient-to-b from-[#011B38]/90 to-[#01142B]/90 rounded-[2px] shadow-2xl flex flex-col gap-6 animate-card-reveal">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-[#FF9433] bg-[#CC6600]/15 border border-[#CC6600]/30 px-2.5 py-0.5 rounded-[2px] uppercase flex items-center gap-1.5">
              <Sparkle size={13} weight="fill" className="text-[#FFA040]" />
              <span>Getting Started Guide</span>
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-white font-sans">
            Welcome to JAXIS StatLab!
          </h2>
          <p className="text-xs sm:text-sm text-white/70 font-sans leading-relaxed max-w-2xl">
            Getting defense-ready statistical analysis for your thesis or research paper is simple. Follow these 3 easy steps:
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenHowToUseModal}
          className="self-start sm:self-center px-3.5 py-2 rounded-[2px] bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-sans font-semibold text-white/80 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-[0.97]"
        >
          <Question size={15} weight="fill" className="text-sky-400" />
          <span>How It Works Guide</span>
        </button>
      </div>

      {/* ── 3 Action Steps Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 items-stretch">
        {/* Step 1: Save School */}
        <div
          className={`p-5 rounded-[2px] border transition-all flex flex-col justify-between gap-4 ${
            isProfileComplete
              ? "bg-[#01142B]/80 border-emerald-500/30"
              : "bg-[#01142B] border-[#CC6600]/40 ring-1 ring-[#CC6600]/20"
          }`}
        >
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span
                className={`text-[0.688rem] font-mono font-bold px-2 py-0.5 rounded-[2px] ${
                  isProfileComplete
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                    : "bg-[#CC6600]/20 text-[#FFA040] border border-[#CC6600]/40"
                }`}
              >
                {isProfileComplete ? (
                  <span className="flex items-center gap-1">
                    <Check size={11} weight="bold" />
                    <span>COMPLETED</span>
                  </span>
                ) : (
                  "1. START HERE"
                )}
              </span>
              <div className="w-8 h-8 rounded-[2px] bg-white/[0.04] border border-white/10 flex items-center justify-center text-sky-400">
                <GraduationCap size={16} weight="fill" />
              </div>
            </div>

            <h3 className="text-sm font-bold text-white font-sans mt-1">
              Save Your University
            </h3>
            <p className="text-xs text-white/60 font-sans leading-relaxed">
              Tell us your school so your analyst formats tables to your university&apos;s exact thesis style guidelines.
            </p>
          </div>

          <Button
            variant={isProfileComplete ? "secondary" : "primary"}
            size="sm"
            onClick={onOpenProfileModal}
            className={`font-sans text-xs font-semibold w-full flex items-center justify-center gap-1.5 rounded-[2px] active:scale-[0.97] ${
              !isProfileComplete ? "bg-[#CC6600] hover:bg-[#E67300] text-white" : ""
            }`}
          >
            <span>{isProfileComplete ? "Edit School Info" : "Add Your School →"}</span>
          </Button>
        </div>

        {/* Step 2: Submit Study */}
        <div className="p-5 rounded-[2px] bg-[#01142B] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[0.688rem] font-mono font-bold bg-white/[0.06] text-white/70 border border-white/10 px-2 py-0.5 rounded-[2px]">
                2. NEXT STEP
              </span>
              <div className="w-8 h-8 rounded-[2px] bg-white/[0.04] border border-white/10 flex items-center justify-center text-amber-400">
                <CloudArrowUp size={16} weight="fill" />
              </div>
            </div>

            <h3 className="text-sm font-bold text-white font-sans mt-1">
              Submit Study Questions &amp; Data
            </h3>
            <p className="text-xs text-white/60 font-sans leading-relaxed">
              Upload your survey questionnaire and raw Excel answers. Even if your data is messy, we clean it for you!
            </p>
          </div>

          <Link href="/dashboard/client/projects/new" className="w-full">
            <Button
              variant="outline"
              size="sm"
              className="font-sans text-xs font-semibold w-full flex items-center justify-center gap-1.5 border-white/15 text-white/90 hover:bg-white/[0.06] rounded-[2px] active:scale-[0.97]"
            >
              <span>Start Study Request</span>
              <ArrowRight size={14} weight="bold" />
            </Button>
          </Link>
        </div>

        {/* Step 3: Learn How It Works */}
        <div className="p-5 rounded-[2px] bg-[#01142B] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[0.688rem] font-mono font-bold bg-white/[0.06] text-white/70 border border-white/10 px-2 py-0.5 rounded-[2px]">
                3. HOW IT WORKS
              </span>
              <div className="w-8 h-8 rounded-[2px] bg-white/[0.04] border border-white/10 flex items-center justify-center text-emerald-400">
                <Check size={16} weight="bold" />
              </div>
            </div>

            <h3 className="text-sm font-bold text-white font-sans mt-1">
              Safe Escrow &amp; Fast Delivery
            </h3>
            <p className="text-xs text-white/60 font-sans leading-relaxed">
              Your deposit stays locked safely in escrow until you inspect your results. Chat directly with your PhD specialist.
            </p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenHowToUseModal}
            className="font-sans text-xs font-semibold w-full flex items-center justify-center gap-1.5 rounded-[2px] active:scale-[0.97]"
          >
            <span>Read 60-Sec Guide</span>
            <ArrowRight size={14} weight="bold" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
