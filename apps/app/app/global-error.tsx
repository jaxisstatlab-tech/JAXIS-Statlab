"use client";

import React, { useEffect } from "react";
import { Warning, ArrowClockwise, House } from "@phosphor-icons/react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Root Global Error Caught]:", error);
  }, [error]);

  return (
    <html lang="en" style={{ backgroundColor: "#010114" }}>
      <body className="font-sans antialiased m-0 p-0" style={{ backgroundColor: "#010114", color: "#ffffff" }}>
        <div className="min-h-screen w-full flex items-center justify-center bg-[#010114] text-white px-4">
          <div className="max-w-md w-full p-8 sm:p-10 bg-[#01142B] border border-white/10 rounded-[2px] flex flex-col items-center gap-6 text-center shadow-2xl">
            <div className="w-14 h-14 rounded-[2px] bg-[#CC6600]/15 border border-[#CC6600]/30 flex items-center justify-center text-[#CC6600]">
              <Warning size={28} weight="fill" />
            </div>

            <div className="flex flex-col gap-2">
              <h1 className="font-sans font-bold text-xl text-white m-0">
                System Error
              </h1>
              <p className="font-sans text-sm text-white/60 leading-relaxed m-0">
                We encountered an unexpected issue while loading the workspace. Please reload to try again.
              </p>
            </div>

            {error.digest && (
              <div className="px-3 py-1.5 bg-black/40 border border-white/5 rounded-[2px]">
                <span className="font-mono text-xs text-white/40">
                  Reference: {error.digest}
                </span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3 w-full pt-2">
              <button
                type="button"
                onClick={() => reset()}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#CC6600] hover:bg-[#B35500] active:scale-95 text-white font-sans font-medium text-sm rounded-[2px] transition-all cursor-pointer border-0 outline-none"
              >
                <ArrowClockwise size={16} weight="bold" />
                <span>Reload</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  window.location.href = "/dashboard";
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 active:scale-95 text-white/80 hover:text-white border border-white/10 font-sans font-medium text-sm rounded-[2px] transition-all cursor-pointer outline-none"
              >
                <House size={16} weight="fill" />
                <span>Return to Workspace</span>
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
