import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@repo/ui";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { AuthVisualShowcase } from "@/components/auth/AuthVisualShowcase";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full bg-[#010114] text-white flex flex-col lg:flex-row font-sans selection:bg-[#CC6600]/30 selection:text-white">
      {/* ── Left Side: Focused Auth Form Desk ─────────── */}
      <aside className="w-full lg:w-1/2 min-h-screen lg:h-screen lg:max-h-screen flex-shrink-0 bg-[#010B18] border-b lg:border-b-0 lg:border-r border-white/[0.08] flex flex-col justify-between overflow-y-auto p-6 sm:p-10 lg:p-12 xl:p-14 z-10 shadow-2xl">
        {/* Top Header: Brand Logo Anchor & Mobile Website Link */}
        <header className="flex items-center justify-between w-full flex-shrink-0 mb-6 lg:mb-0">
          <Link href="/login" className="flex items-center gap-2.5 group">
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
              <span className="text-[0.625rem] font-mono uppercase px-1.5 py-0.5 rounded-[2px] bg-white/[0.06] border border-white/10 text-white/50 tracking-wider ml-1">
                Studio
              </span>
            </div>
          </Link>

          {/* Mobile-only Back to Website button */}
          <div className="lg:hidden">
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
                <span>Website</span>
              </Button>
            </a>
          </div>
        </header>

        {/* Dynamic Form Content: Centered with comfortable breathing room */}
        <div className="w-full max-w-[420px] mx-auto my-auto py-6">
          {children}
        </div>

        {/* Bottom Compliance & Security Footer */}
        <footer className="border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-2 text-[0.688rem] text-slate-400 font-mono w-full flex-shrink-0 pt-4 sm:pt-5 mt-6 lg:mt-0">
          <span>© 2026 JAXIS StatLab Inc.</span>
          <div className="flex items-center gap-3 text-slate-500">
            <span>ISO/IEC 27001</span>
            <span>·</span>
            <span>APA 7th</span>
          </div>
        </footer>
      </aside>

      {/* ── Right Side: Atmospheric Visual Showcase with 3D Globe & Steps ─────────── */}
      <div className="hidden lg:flex lg:w-1/2 min-h-screen h-screen max-h-screen sticky top-0 overflow-hidden">
        <AuthVisualShowcase />
      </div>
    </div>
  );
}
