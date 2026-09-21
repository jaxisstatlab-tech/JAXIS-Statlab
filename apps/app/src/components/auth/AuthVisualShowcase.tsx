"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Button } from "@repo/ui";
import { ArrowLeft } from "@phosphor-icons/react";
import { AuthGlobeClient } from "@/components/ui/AuthGlobeClient";

interface StepCard {
  step: number;
  label: string;
  isActive?: boolean;
}

export function AuthVisualShowcase() {
  const pathname = usePathname();

  // Dynamic content based on auth route
  let headline = "Get Started with Us";
  let subtitle = "Complete these easy steps to register your research account.";
  let steps: StepCard[] = [
    { step: 1, label: "Sign up your account", isActive: true },
    { step: 2, label: "Set up your workspace", isActive: false },
    { step: 3, label: "Start consultation", isActive: false },
  ];

  if (pathname === "/login") {
    headline = "Welcome to JAXIS StatLab";
    subtitle = "Precision Statistical Consultation, Biostatistics & Quantitative Science.";
    steps = [
      { step: 1, label: "Verified Statisticians", isActive: true },
      { step: 2, label: "ISO 27001 Security", isActive: false },
      { step: 3, label: "Milestone Escrow", isActive: false },
    ];
  } else if (pathname?.includes("forgot-password") || pathname?.includes("reset-password")) {
    headline = "Account Security Desk";
    subtitle = "Verified single-use cryptographic recovery to protect your research data.";
    steps = [
      { step: 1, label: "Verify account email", isActive: true },
      { step: 2, label: "Receive recovery link", isActive: false },
      { step: 3, label: "Reset password", isActive: false },
    ];
  }

  return (
    <div className="relative w-full h-full min-h-screen bg-[#010114] flex flex-col justify-between p-8 sm:p-10 lg:p-12 xl:p-14 overflow-hidden select-none">
      {/* 3D Hardware-Accelerated Particle Canvas */}
      <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
        <AuthGlobeClient />
      </div>

      {/* Atmospheric Ambient Glow Layers centered with the particle globe */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none z-0 bg-[radial-gradient(ellipse_90%_80%_at_65%_50%,rgba(16,185,129,0.12),transparent_70%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none z-0 bg-[radial-gradient(circle_at_65%_50%,rgba(2,132,199,0.22),transparent_65%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none z-0 bg-[radial-gradient(ellipse_100%_60%_at_50%_100%,rgba(1,22,57,0.50)_0%,rgba(0,4,20,0)_70%)]"
      />

      {/* Top: Desktop Back to Website Button */}
      <header className="relative z-10 flex items-center justify-end w-full">
        <a
          href={process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}
          className="no-underline"
        >
          <Button
            variant="outline"
            size="sm"
            className="font-sans text-xs font-semibold rounded-[2px] gap-1.5 border-white/15 hover:bg-white/[0.06] text-white/80 hover:text-white h-9 px-3"
          >
            <ArrowLeft size={14} weight="bold" />
            <span>Back to Website</span>
          </Button>
        </a>
      </header>

      {/* Middle: Authoritative Headline & Subtitle */}
      <div className="relative z-10 flex flex-col gap-3 my-auto max-w-[560px]">
        <h1 className="text-3xl sm:text-4xl xl:text-5xl font-bold font-sans text-white tracking-tight leading-[1.15]">
          {headline}
        </h1>
        <p className="text-sm sm:text-base text-white/70 font-sans leading-relaxed max-w-[460px]">
          {subtitle}
        </p>
      </div>

      {/* Bottom: 3 Step Cards + Grounding System Footer */}
      <div className="relative z-10 flex flex-col gap-6 w-full max-w-[560px]">
        {/* 3 Step Progress Cards Row (exact layout from inspiration image, anchored at bottom) */}
        <div className="grid grid-cols-3 gap-3 w-full">
          {steps.map((item) =>
            item.isActive ? (
              /* Active Step Card: High-contrast white card with dark badge */
              <div
                key={item.step}
                className="bg-white text-slate-900 rounded-[2px] p-3.5 sm:p-4 shadow-xl flex flex-col justify-between min-h-[96px] sm:min-h-[108px] transition-all"
              >
                <div className="w-5 h-5 rounded-full bg-slate-950 text-white text-[11px] font-bold font-mono flex items-center justify-center">
                  {item.step}
                </div>
                <span className="text-xs sm:text-[13px] font-semibold text-slate-900 leading-snug font-sans">
                  {item.label}
                </span>
              </div>
            ) : (
              /* Inactive Step Card: Sleek glassmorphic card with muted badge */
              <div
                key={item.step}
                className="bg-white/[0.06] backdrop-blur-md border border-white/12 rounded-[2px] p-3.5 sm:p-4 flex flex-col justify-between min-h-[96px] sm:min-h-[108px] transition-all hover:bg-white/[0.09]"
              >
                <div className="w-5 h-5 rounded-full bg-white/15 border border-white/20 text-white/80 text-[11px] font-semibold font-mono flex items-center justify-center">
                  {item.step}
                </div>
                <span className="text-xs sm:text-[13px] font-medium text-white/70 leading-snug font-sans">
                  {item.label}
                </span>
              </div>
            )
          )}
        </div>

        {/* Grounding System Badge */}
        <footer className="flex items-center gap-3 text-xs text-white/40 font-mono">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>System Operational · Studio v2.4.0</span>
        </footer>
      </div>
    </div>
  );
}
