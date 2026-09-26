"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { AuthField } from "./AuthField";
import { StepTrack } from "./StepTrack";

type Copy = { kicker: string; headline: string; subtitle: string };

const COPY: Record<"login" | "register" | "recovery", Copy> = {
  login: {
    kicker: "Welcome back",
    headline: "Pick up where you left off",
    subtitle: "Check your study's progress, read messages from your statistician, and download your files.",
  },
  register: {
    kicker: "Free account",
    headline: "Get your study checked by two statisticians",
    subtitle: "Send your study, get a fixed written price within 24 hours, and pay only when you're ready.",
  },
  recovery: {
    kicker: "Account help",
    headline: "Get back into your account",
    subtitle: "We'll email you a secure link to set a new password. It works once and expires in 60 minutes.",
  },
};

// Right half of the sign-in screens: the marketing site's navy, dot grid, and horizon glow,
// so arriving from the site feels like the same place.
export function AuthVisualShowcase() {
  const pathname = usePathname() ?? "";
  const copy =
    pathname.startsWith("/register")
      ? COPY.register
      : pathname.includes("password")
        ? COPY.recovery
        : COPY.login;

  return (
    <div className="relative flex h-full min-h-screen w-full select-none flex-col justify-between overflow-hidden bg-[#010114] p-8 xl:p-12">
      <div aria-hidden="true" className="auth-horizon pointer-events-none absolute" />
      <AuthField />

      <div className="h-9 shrink-0" aria-hidden="true" />

      <div key={copy.headline} className="auth-copy relative z-10 my-auto flex max-w-[24rem] flex-col gap-3 xl:max-w-[34rem]">
        <div className="font-mono text-xs font-medium uppercase tracking-[0.15em] text-white/55">{copy.kicker}</div>
        <h2 className="text-balance font-sans text-[2rem] font-medium leading-[1.05] tracking-[-0.04em] text-white xl:text-[3.25rem]">
          {copy.headline}
        </h2>
        <p className="max-w-md pt-2 font-mono text-xs leading-relaxed text-white/60 sm:text-sm">{copy.subtitle}</p>
      </div>

      <StepTrack className="z-10 w-full max-w-[26rem] xl:max-w-[34rem]" />
    </div>
  );
}
