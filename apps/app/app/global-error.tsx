"use client";

import React, { useEffect } from "react";
import "./globals.css";

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
              <svg width="28" height="28" viewBox="0 0 256 256" fill="currentColor">
                <path d="M236.8,188.09,149.35,36.22h0a24.76,24.76,0,0,0-42.7,0L19.2,188.09a23.51,23.51,0,0,0,0,23.72A24.35,24.35,0,0,0,40.55,224h174.9a24.35,24.35,0,0,0,21.33-12.19A23.51,23.51,0,0,0,236.8,188.09ZM120,104a8,8,0,0,1,16,0v40a8,8,0,0,1-16,0Zm8,88a12,12,0,1,1,12-12A12,12,0,0,1,128,192Z"/>
              </svg>
            </div>

            <div className="flex flex-col gap-2">
              <h1 className="font-sans font-bold text-xl text-white m-0">
                System Error
              </h1>
              <p className="font-sans text-sm text-white/60 leading-relaxed m-0">
                We encountered an unexpected issue while loading the workspace. Please reload to try again.
              </p>
            </div>

            {error?.digest && (
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
                <span>Reload</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  window.location.href = "/dashboard";
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 active:scale-95 text-white/80 hover:text-white border border-white/10 font-sans font-medium text-sm rounded-[2px] transition-all cursor-pointer outline-none"
              >
                <span>Return to Workspace</span>
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
