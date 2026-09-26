import React from "react";
import Image from "next/image";
import { AuthVisualShowcase } from "@/components/auth/AuthVisualShowcase";
import { BackToWebsiteButton } from "@/components/auth/BackToWebsiteButton";
import { AuthCurtain } from "@/components/auth/AuthCurtain";
import { AuthModeTabs } from "@/components/auth/AuthModeTabs";
import { SITE_PRIVACY_URL, SITE_TERMS_URL } from "@/lib/site";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-[#010114] font-sans text-white selection:bg-[#CC6600]/30 selection:text-white lg:flex-row">
      <AuthCurtain />

      {/* Left: the form */}
      <aside className="relative z-10 flex min-h-screen w-full flex-shrink-0 flex-col justify-between overflow-y-auto border-white/[0.08] bg-[#010114] bg-[radial-gradient(70%_45%_at_30%_0%,rgba(204,102,0,0.07),transparent_70%)] p-5 sm:p-7 lg:h-screen lg:max-h-screen lg:w-1/2 lg:border-r lg:p-8 xl:p-10">
        <header className="flex w-full flex-shrink-0 items-center justify-between gap-4">
          <div className="inline-flex select-none items-center gap-2.5">
            <Image src="/jaxislogo.png" alt="" width={24} height={24} className="h-6 w-6" priority />
            <span className="font-sans text-[15px] font-semibold tracking-[-0.01em] text-white">
              JAXIS <span className="font-normal text-white/60">StatLab</span>
            </span>
          </div>
          <BackToWebsiteButton />
        </header>

        <div className="auth-shell-content mx-auto my-auto flex w-full max-w-[400px] flex-col gap-6 py-6">
          <AuthModeTabs />

          {children}
        </div>

        <footer className="auth-shell-footer flex w-full flex-shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-white/[0.08] pt-5 font-mono text-[11px] text-white/45">
          <span>© 2026 JAXIS StatLab</span>
          <span className="flex items-center gap-4">
            <a href={SITE_PRIVACY_URL} className="!text-white/45 transition-colors hover:!text-white">
              Privacy
            </a>
            <a href={SITE_TERMS_URL} className="!text-white/45 transition-colors hover:!text-white">
              Terms
            </a>
          </span>
        </footer>
      </aside>

      {/* Right: brand panel (desktop only) */}
      <div className="sticky top-0 hidden h-screen max-h-screen min-h-screen overflow-hidden lg:flex lg:w-1/2">
        <AuthVisualShowcase />
      </div>
    </div>
  );
}
