import React from "react";
import Image from "next/image";
import { AuthVisualShowcase } from "@/components/auth/AuthVisualShowcase";
import { BackToWebsiteButton } from "@/components/auth/BackToWebsiteButton";
import { AuthCurtain } from "@/components/auth/AuthCurtain";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full bg-[#010114] text-white flex flex-col lg:flex-row font-sans selection:bg-[#CC6600]/30 selection:text-white">
      <AuthCurtain />
      {/* ── Left Side: Focused Auth Form Desk ─────────── */}
      <aside className="w-full lg:w-1/2 min-h-screen lg:h-screen lg:max-h-screen flex-shrink-0 bg-[#010B18] border-b lg:border-b-0 lg:border-r border-white/[0.08] flex flex-col justify-between overflow-y-auto p-5 sm:p-7 lg:p-8 xl:p-10 z-10 shadow-2xl">
        {/* Top Header: Borderless Back to Website Link on Top-Left */}
        <header className="flex items-center justify-start w-full flex-shrink-0 mb-4 lg:mb-0">
          <BackToWebsiteButton />
        </header>

        {/* Dynamic Form Content: Centered with comfortable breathing room */}
        <div className="w-full max-w-[420px] mx-auto my-auto py-3 flex flex-col gap-6">
          <div className="inline-flex items-center gap-2.5 w-fit select-none pointer-events-none">
            <Image
              src="/jaxislogo.png"
              alt="JAXIS Logo"
              width={26}
              height={26}
              className="h-6.5 w-auto"
              priority
            />
            <div className="flex items-baseline gap-1.5 font-sans">
              <span className="font-bold text-sm tracking-wider text-white">
                JAXIS
              </span>
              <span className="font-bold text-sm tracking-wider text-[#CC6600]">
                STATLAB
              </span>
              <span className="text-[0.625rem] font-mono uppercase text-white/50 tracking-wider ml-1">
                Studio
              </span>
            </div>
          </div>

          {children}
        </div>

        {/* Bottom Compliance & Security Footer */}
        <footer className="border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-2 text-[0.688rem] text-slate-400 font-mono w-full flex-shrink-0 pt-4 sm:pt-5 mt-6 lg:mt-0">
          <span>© 2026 JAXIS StatLab Inc.</span>
          <span className="text-slate-500">v2.4.0</span>
        </footer>
      </aside>

      {/* ── Right Side: Atmospheric Visual Showcase with 3D Globe & Steps ─────────── */}
      <div className="hidden lg:flex lg:w-1/2 min-h-screen h-screen max-h-screen sticky top-0 overflow-hidden">
        <AuthVisualShowcase />
      </div>
    </div>
  );
}
