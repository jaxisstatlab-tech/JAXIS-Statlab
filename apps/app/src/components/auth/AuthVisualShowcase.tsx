"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Button } from "@repo/ui";
import { ArrowLeft } from "@phosphor-icons/react";
import { AuthGlobeClient } from "@/components/ui/AuthGlobeClient";

interface StepWorkflowCard {
  step: string;
  title: string;
  description: string;
}

export function AuthVisualShowcase() {
  const pathname = usePathname();

  // Dynamic headlines based on auth route
  let headline = "Get Started with Us";
  let subtitle = "Complete these easy steps to register your research account.";

  if (pathname === "/login") {
    headline = "Welcome to JAXIS StatLab Studio";
    subtitle = "Precision Statistical Consultation, Biostatistics & Quantitative Science.";
  } else if (
    pathname?.includes("forgot-password") ||
    pathname?.includes("reset-password")
  ) {
    headline = "Account Security Desk";
    subtitle = "Secure single-use password recovery to access your research workspace.";
  }

  // Authentic 3-Step Research Workflow (Concise 1-line titles)
  const workflowSteps: StepWorkflowCard[] = [
    {
      step: "01",
      title: "Submit Scope",
      description: "Upload dataset & research questions",
    },
    {
      step: "02",
      title: "Analysis & QA",
      description: "Statistical modeling & formula audit",
    },
    {
      step: "03",
      title: "Deliverables",
      description: "APA 7th tables, scripts & defense prep",
    },
  ];

  return (
    <div className="relative w-full h-full min-h-screen bg-[#010114] flex flex-col justify-between p-5 sm:p-7 lg:p-8 xl:p-10 overflow-hidden select-none">
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
        <h1 className="text-3xl sm:text-4xl xl:text-5xl font-medium font-sans text-white tracking-tight leading-[1.15]">
          {headline}
        </h1>
        <p className="text-sm sm:text-base text-white/70 font-sans leading-relaxed max-w-[460px]">
          {subtitle}
        </p>
      </div>

      {/* Bottom: 3-Step Research Workflow Cards [Number][Title] + [Subtitle/Description] */}
      <div className="relative z-10 w-full max-w-[580px]">
        <div className="grid grid-cols-3 gap-3 w-full">
          {workflowSteps.map((item) => (
            <div
              key={item.step}
              className="bg-[#01142B]/75 hover:bg-[#01142B]/95 backdrop-blur-md border border-white/10 hover:border-white/20 rounded-[2px] p-3.5 sm:p-4 flex flex-col justify-center transition-all duration-200 group"
            >
              <div className="flex items-baseline gap-1.5 min-w-0">
                <span className="font-mono text-xs font-bold text-[#CC6600] group-hover:text-[#FFA040] transition-colors shrink-0">
                  {item.step}
                </span>
                <span className="text-xs sm:text-[13px] font-semibold text-white font-sans leading-snug whitespace-nowrap truncate">
                  {item.title}
                </span>
              </div>
              <p className="text-[11px] text-white/50 font-sans leading-relaxed mt-1">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
