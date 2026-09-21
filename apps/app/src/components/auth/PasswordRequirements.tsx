"use client";

import React from "react";
import { Check, X } from "@phosphor-icons/react";

interface PasswordRequirementsProps {
  password: string;
  className?: string;
}

export function PasswordRequirements({
  password,
  className = "",
}: PasswordRequirementsProps) {
  const isVisible = Boolean(password && password.length > 0);

  const requirements = [
    {
      label: "At least one lowercase letter",
      isMet: /[a-z]/.test(password || ""),
    },
    {
      label: "Minimum 8 characters",
      isMet: (password || "").length >= 8,
    },
    {
      label: "At least one uppercase letter",
      isMet: /[A-Z]/.test(password || ""),
    },
    {
      label: "At least one number",
      isMet: /[0-9]/.test(password || ""),
    },
  ];

  return (
    <div
      style={{
        gridTemplateRows: isVisible ? "1fr" : "0fr",
      }}
      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
      } ${className}`}
      aria-live="polite"
    >
      <div className="overflow-hidden min-h-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5 pt-2 pb-0.5 px-0.5">
          {requirements.map((req) => {
            const Icon = req.isMet ? Check : X;
            return (
              <div
                key={req.label}
                className={`flex items-center gap-2 text-xs font-sans transition-colors duration-150 ${
                  req.isMet
                    ? "text-emerald-400 font-medium"
                    : "text-white/40 font-normal"
                }`}
              >
                <Icon
                  size={13}
                  weight="bold"
                  className={`shrink-0 ${
                    req.isMet ? "text-emerald-400" : "text-white/40"
                  }`}
                />
                <span>{req.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
