"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import {
  LockKey,
  Scales,
  FileText,
  ShieldCheck,
  CheckCircle,
} from "@phosphor-icons/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const SECURITY_PILLARS = [
  {
    code: "SEC 01 · ANONYMITY",
    icon: LockKey,
    title: "100% Anonymity & Data Privacy",
    subtitle: "ZERO IDENTITY LEAKAGE",
    desc: "We remove all participant names, student IDs, emails, and school identifiers from your raw data before our analysts begin work. Your participants stay 100% anonymous.",
    badge: "CONFIDENTIAL & PRIVATE",
    specs: [
      { label: "IDENTITY PROTECTION", value: "NAMES & IDS REMOVED" },
      { label: "STORAGE SECURITY", value: "ENCRYPTED AT REST" },
    ],
  },
  {
    code: "SEC 02 · HONEST MATH",
    icon: Scales,
    title: "We Never Fake or Manipulate Data",
    subtitle: "ZERO P-HACKING POLICY",
    desc: "We never fabricate numbers or alter survey data to force statistical significance. If your results show no significant difference, we provide legitimate academic explanations so your panel respects your research integrity.",
    badge: "ACADEMIC HONESTY",
    specs: [
      { label: "DATA MANIPULATION", value: "0.00 ZERO TOLERANCE" },
      { label: "NULL FINDINGS", value: "SCIENTIFICALLY DEFENDED" },
    ],
  },
  {
    code: "SEC 03 · OWNERSHIP",
    icon: FileText,
    title: "You Own 100% of Your Research & Code",
    subtitle: "STRICT NON-DISCLOSURE AGREEMENTS",
    desc: "Every JAXIS statistician signs a legally binding Non-Disclosure Agreement (NDA). Your data, analysis scripts, and findings belong 100% to you. We never publish or claim co-authorship.",
    badge: "100% YOUR PROPERTY",
    specs: [
      { label: "NDA SIGNED", value: "ALL STAFF LEGALLY BOUND" },
      { label: "AUTHORSHIP", value: "100% RETAINED BY YOU" },
    ],
  },
  {
    code: "SEC 04 · ESCROW PROTECTION",
    icon: ShieldCheck,
    title: "Safe Escrow Payment Protection",
    subtitle: "VERIFIED BEFORE FINAL RELEASE",
    desc: "Your payment is held safely in escrow upon project agreement. Deliverables are only released once an independent Senior QA Lead validates 100% decimal accuracy.",
    badge: "PAYMENT PROTECTED",
    specs: [
      { label: "QUALITY CHECK", value: "SENIOR QA STAMP REQUIRED" },
      { label: "PAYMENT GATING", value: "ESCROW SECURITY VERIFIED" },
    ],
  },
];

export default function Security() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // 1. Header Animation
      gsap.fromTo(
        ".security-header",
        { opacity: 0, y: 25 },
        {
          opacity: 1,
          y: 0,
          duration: 0.75,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".security-header",
            start: "top 85%",
          },
        }
      );

      // 2. Security Cards Entry
      gsap.fromTo(
        ".security-card-box",
        { opacity: 0, y: 35 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".security-grid-wrap",
            start: "top 85%",
            once: true,
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="security"
      ref={sectionRef}
      className="relative bg-[#010114] text-white py-24 sm:py-32 px-6 z-10"
    >
      <div className="max-w-[1280px] mx-auto relative z-10">
        
        {/* Header Block */}
        <div className="security-header border-b border-white/10 pb-10 mb-12 grid grid-cols-1 lg:grid-cols-2 gap-6 items-end">
          <div>
            <div className="text-[10px] font-mono text-white/40 tracking-[0.18em] uppercase mb-3">
              JAXIS STATLAB · DATA PRIVACY & RESEARCH ETHICS
            </div>
            <div className="text-xs font-mono text-[#CC6600] tracking-wider uppercase font-semibold flex items-center gap-2 mb-3">
              <span className="inline-block w-1.5 h-1.5 bg-[#CC6600]" />
              SECTION 05 · PRIVACY & INTEGRITY
            </div>

            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-sans font-light tracking-tight text-white leading-tight">
              Your Research Data Is Safe.
              <br />
              <span className="text-[#38bdf8] font-normal">
                Guaranteed 100%.
              </span>
            </h2>
          </div>

          <div>
            <p className="text-sm sm:text-base font-sans text-white/70 leading-relaxed max-w-lg">
              We protect your student identity, intellectual property, and academic reputation with four strict privacy and ethical guarantees.
            </p>
          </div>
        </div>

        {/* 2x2 Security Grid */}
        <div className="security-grid-wrap grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {SECURITY_PILLARS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="security-card-box bg-[#01142B] border border-white/10 rounded-[2px] p-6 sm:p-8 flex flex-col justify-between relative hover:border-white/20 transition-all duration-200"
              >
                {/* Corner crosshairs */}
                <span className="absolute top-1.5 left-2 font-mono text-[9px] text-white/20 select-none">+</span>
                <span className="absolute top-1.5 right-2 font-mono text-[9px] text-white/20 select-none">+</span>
                <span className="absolute bottom-1.5 left-2 font-mono text-[9px] text-white/20 select-none">+</span>
                <span className="absolute bottom-1.5 right-2 font-mono text-[9px] text-white/20 select-none">+</span>

                <div>
                  <div className="flex justify-between items-center border-b border-white/10 pb-3 mb-5 gap-2">
                    <div className="flex items-center gap-2">
                      <Icon size={18} weight="fill" className="text-[#CC6600] shrink-0" />
                      <span className="font-mono text-xs text-[#CC6600] tracking-wider font-semibold">
                        {item.code}
                      </span>
                    </div>

                    <span className="font-mono text-[10px] text-[#38bdf8] tracking-wider uppercase px-2 py-0.5 bg-[#38bdf8]/10 border border-[#38bdf8]/25 rounded-[2px]">
                      {item.badge}
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-sans font-normal text-white mb-2 tracking-tight">
                    {item.title}
                  </h3>

                  <p className="text-sm font-sans text-white/70 leading-relaxed mb-6">
                    {item.desc}
                  </p>
                </div>

                {/* Spec Rows */}
                <div className="border-t border-white/10 pt-4 grid grid-cols-2 gap-2">
                  {item.specs.map((spec, sIdx) => (
                    <div
                      key={sIdx}
                      className="p-2 bg-white/[0.02] border-l border-sky-400/40 font-mono flex flex-col gap-0.5"
                    >
                      <span className="text-white/40 tracking-wider text-[9px] uppercase">
                        {spec.label}
                      </span>
                      <span className="text-xs text-white font-medium tracking-wide">
                        {spec.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Security Matrix Certification Footer */}
        <div className="pt-6 border-t border-white/10 flex justify-between items-center flex-wrap gap-4">
          <span className="font-mono text-[10px] text-white/40 tracking-wider uppercase">
            SYS · STRICT NDA LOCK · PII CLEANSED · ZERO DATA MANIPULATION · JAXIS SEC
          </span>

          <span className="font-mono text-[10px] text-[#38bdf8] tracking-wider uppercase flex items-center gap-1.5">
            <CheckCircle size={12} weight="fill" className="text-emerald-400" />
            ETHICAL INTEGRITY STANDARDS [VERIFIED]
          </span>
        </div>

      </div>
    </section>
  );
}
