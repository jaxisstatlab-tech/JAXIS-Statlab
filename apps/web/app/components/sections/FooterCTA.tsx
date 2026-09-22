"use client";

import Image from "next/image";
import { Hero as FooterBackground } from "../ui/tailwind-css-background-snippet";
import { REGISTER_URL } from "@/lib/config";

const LEGAL_LINKS = [
  { label: "Privacy Policy", href: "#" },
  { label: "Terms of Service", href: "#" },
  { label: "Academic Integrity Standard", href: "#" },
  { label: "Escrow & QA Protocol", href: "#" },
];

export default function FooterCTA() {
  return (
    <footer
      id="contact"
      className="relative bg-[#010114] pt-24 sm:pt-32 pb-12 px-6 text-center text-white overflow-hidden border-t border-white/10"
    >
      {/* Background ambient texture */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
        <FooterBackground className="h-full" />
      </div>

      <div className="max-w-[1000px] mx-auto relative z-10">
        {/* Ambient Conversion Banner Container */}
        <div className="p-8 sm:p-14 lg:p-16 rounded-[2px] bg-[#01142B]/90 border border-white/10 relative overflow-hidden shadow-2xl">
          {/* Subtle Enterprise Orange radial glow */}
          <div
            className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[#CC6600]/15 blur-[100px] pointer-events-none rounded-full"
            aria-hidden="true"
          />

          <div className="relative z-10">
            <div className="text-[10px] font-mono text-white/40 tracking-[0.18em] uppercase mb-3">
              JAXIS STATLAB · DEFENSE READINESS CONSULTATION
            </div>

            <div className="text-xs font-mono text-[#CC6600] tracking-wider uppercase font-semibold inline-flex items-center gap-2 mb-4">
              <span className="inline-block w-1.5 h-1.5 bg-[#CC6600]" />
              GET YOUR FREE STATISTICAL REVIEW
            </div>

            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-sans font-light tracking-tight text-white leading-tight mb-4">
              Stop worrying about defense.
              <br />
              <span className="text-[#38bdf8] font-normal">
                Start feeling confident.
              </span>
            </h2>

            <p className="text-sm sm:text-base font-sans text-white/70 leading-relaxed max-w-xl mx-auto mb-8">
              Send us your Chapter 1 or raw survey spreadsheet. Our senior statisticians will review your study and give you an exact, custom Scope of Work quote within 24 hours at zero charge.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href={REGISTER_URL}
                id="footer-cta"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#CC6600] hover:bg-[#b35900] text-white text-xs font-sans font-semibold tracking-wider uppercase rounded-[2px] shadow-lg shadow-[#CC6600]/20 transition-all duration-150 active:scale-[0.97]"
              >
                <span>Get Free Thesis Review</span>
                <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
              </a>

              <a
                href="#approach"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 bg-white/[0.04] hover:bg-white/[0.08] text-white/80 hover:text-white text-xs font-sans font-medium tracking-wider uppercase rounded-[2px] border border-white/10 hover:border-white/20 transition-all duration-150 active:scale-[0.97]"
              >
                Review Our Process
              </a>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-center gap-3 text-[11px] font-mono text-white/45 flex-wrap">
              <span>● 24h Turnaround</span>
              <span>·</span>
              <span>100% Free Intake Review</span>
              <span>·</span>
              <span>No Obligation or Hidden Fees</span>
            </div>
          </div>
        </div>

        {/* Footer Navigation Bar */}
        <div className="mt-16 pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-6 text-left">
          {/* Brand Lockup */}
          <div className="flex items-center gap-3 shrink-0">
            <Image
              src="/jaxislogo.png"
              alt="JAXIS Logo"
              width={20}
              height={20}
              className="h-5 w-auto opacity-85"
            />
            <span className="font-sans text-xs font-semibold text-white/70 uppercase tracking-wider">
              JAXIS StatLab
            </span>
          </div>

          {/* Operational Status Indicator */}
          <div className="flex items-center gap-2 font-mono text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-[2px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
            <span>System Operational v2.4.0</span>
          </div>

          {/* Legal Links */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 justify-center sm:justify-end">
            {LEGAL_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="font-sans text-xs text-white/45 hover:text-white transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>

        {/* Copyright notice */}
        <div className="mt-6 text-center font-sans text-xs text-white/30">
          © {new Date().getFullYear()} JAXIS StatLab. All rights reserved. Professional statistical analysis & thesis defense consultation.
        </div>
      </div>
    </footer>
  );
}
