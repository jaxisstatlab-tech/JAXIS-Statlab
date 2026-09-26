"use client";

import React from "react";
import { Check } from "@phosphor-icons/react";

interface PasswordRequirementsProps {
  password: string;
  className?: string;
}

const LABELS = ["Weak", "Weak", "Fair", "Good", "Strong"];

// Four-part strength bar plus the rules still to meet. Appears once the person starts typing.
export function PasswordRequirements({ password, className = "" }: PasswordRequirementsProps) {
  const value = password || "";
  const isVisible = value.length > 0;

  const requirements = [
    { label: "8+ characters", isMet: value.length >= 8 },
    { label: "Uppercase letter", isMet: /[A-Z]/.test(value) },
    { label: "Lowercase letter", isMet: /[a-z]/.test(value) },
    { label: "Number", isMet: /[0-9]/.test(value) },
  ];
  const met = requirements.filter((r) => r.isMet).length;

  return (
    <div
      style={{ gridTemplateRows: isVisible ? "1fr" : "0fr" }}
      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${
        isVisible ? "opacity-100" : "pointer-events-none opacity-0"
      } ${className}`}
      aria-live="polite"
    >
      <div className="min-h-0 overflow-hidden">
        <div className="flex flex-col gap-2.5 px-0.5 pt-3">
          <div className="flex items-center gap-3">
            <div className="grid flex-1 grid-cols-4 gap-1" aria-hidden="true">
              {requirements.map((_, i) => (
                <span
                  key={i}
                  className={`h-1 rounded-[1px] transition-colors duration-300 ${
                    i < met ? (met === 4 ? "bg-[#CC6600]" : "bg-[#CC6600]/60") : "bg-white/10"
                  }`}
                />
              ))}
            </div>
            <span className={`w-12 text-right font-mono text-[11px] ${met === 4 ? "text-[#FFA040]" : "text-white/50"}`}>
              {LABELS[met]}
            </span>
          </div>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            {requirements.map((req) => (
              <li
                key={req.label}
                className={`flex items-center gap-1.5 font-sans text-xs transition-colors duration-200 ${
                  req.isMet ? "text-white/80" : "text-white/40"
                }`}
              >
                <span
                  className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[2px] border transition-colors duration-200 ${
                    req.isMet ? "border-[#CC6600] bg-[#CC6600] text-white" : "border-white/20 text-transparent"
                  }`}
                >
                  <Check size={9} weight="bold" />
                </span>
                {req.label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
