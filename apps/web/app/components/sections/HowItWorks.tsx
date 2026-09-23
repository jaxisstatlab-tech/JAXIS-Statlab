"use client";

import React from "react";
import Image from "next/image";

interface WorkflowStep {
  step: string;
  tag: string;
  duration: string;
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
}

const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    step: "01",
    tag: "SUBMIT",
    duration: "5 MINUTES",
    title: "Describe your research study",
    description:
      "Tell us your statement of the problem, research design, and upload your raw survey data through our encrypted intake portal.",
    imageSrc: "/images/how-it-works/step-1-submit.jpg",
    imageAlt: "3D isometric research study intake portal",
  },
  {
    step: "02",
    tag: "QUOTE",
    duration: "< 24 HOURS",
    title: "Receive your custom quote & SOW",
    description:
      "Get exact statistical test selections, milestone delivery timeline, and a fixed Scope of Work. Zero scope creep, no commitment required.",
    imageSrc: "/images/how-it-works/step-2-quote.jpg",
    imageAlt: "3D isometric quotation and statement of work sheet",
  },
  {
    step: "03",
    tag: "CALCULATE",
    duration: "2–5 DAYS",
    title: "We analyze & double-verify",
    description:
      "Our statisticians run your models, followed by an independent Senior QA Lead calculation concordance check to guarantee 100% decimal accuracy.",
    imageSrc: "/images/how-it-works/step-3-validate.jpg",
    imageAlt: "3D isometric computational statistical engine",
  },
  {
    step: "04",
    tag: "DELIVER",
    duration: "DEFENSE READY",
    title: "Download tables & defense script",
    description:
      "Receive publication-ready APA 7th Edition tables, reproducible computational scripts (.R / SPSS / Python), and word-for-word oral defense scripts.",
    imageSrc: "/images/how-it-works/step-4-deliver.jpg",
    imageAlt: "3D isometric database deliverable vault",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="section relative py-16 sm:py-20 lg:py-24 bg-[#010114] text-white">
      <div className="w-full max-w-[90rem] mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-14 sm:mb-20">
          <div className="font-mono text-xs uppercase tracking-[0.15em] text-[#CC6600] mb-2 font-medium">
            HOW IT WORKS
          </div>
          <h2 className="font-sans text-2xl sm:text-3xl lg:text-[2rem] font-medium text-white tracking-[-0.03em] leading-tight">
            From request to ready
          </h2>
        </div>

        {/* Step Flow List */}
        <div className="max-w-2xl lg:max-w-3xl mx-auto flex flex-col gap-12 sm:gap-16">
          {WORKFLOW_STEPS.map((step) => (
            <div
              key={step.step}
              className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-10 md:gap-12 group"
            >
              {/* Left Column: 3D Isometric Visual Asset */}
              <div className="w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40 shrink-0 flex items-center justify-center relative">
                <div className="relative w-full h-full flex items-center justify-center">
                  <Image
                    src={step.imageSrc}
                    alt={step.imageAlt}
                    width={320}
                    height={320}
                    priority={step.step === "01"}
                    className="w-full h-full object-contain mix-blend-screen transition-transform duration-500 group-hover:scale-105 select-none pointer-events-none"
                  />
                </div>
              </div>

              {/* Right Column: Step Telemetry, Title & Description */}
              <div className="flex-1 flex flex-col justify-center text-center sm:text-left pt-1 sm:pt-2">
                <div className="flex items-center justify-center sm:justify-start gap-2.5 mb-2 font-mono text-xs">
                  <span className="font-semibold uppercase tracking-wider text-[#CC6600]">
                    {step.tag}
                  </span>
                  <span className="text-white/40 tracking-wider">
                    {step.duration}
                  </span>
                </div>

                <h3 className="font-sans text-lg sm:text-xl md:text-[1.375rem] font-medium text-white mb-2 tracking-[-0.02em] leading-snug">
                  {step.title}
                </h3>

                <p className="font-mono text-xs sm:text-sm text-white/60 leading-relaxed max-w-xl">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
