"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { Warning, ArrowClockwise, House } from "@phosphor-icons/react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Global Error Boundary Caught]:", error);
  }, [error]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#010114] text-white px-4">
      <div className="max-w-md w-full p-8 sm:p-10 bg-[#01142B] border border-white/10 rounded-[2px] flex flex-col items-center gap-6 text-center">
        <div className="w-14 h-14 rounded-[2px] bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
          <Warning size={28} weight="fill" />
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="font-sans font-bold text-xl text-white">
            Application Error
          </h1>
          <p className="font-sans text-sm text-white/60 leading-relaxed">
            The application encountered an unexpected error. You can try refreshing the page or navigating back home.
          </p>
        </div>

        {error.digest && (
          <div className="px-3 py-1.5 bg-black/40 border border-white/5 rounded-[2px]">
            <span className="font-mono text-xs text-white/40">
              Error ID: {error.digest}
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3 w-full pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#CC6600] hover:bg-[#B35500] text-white font-sans font-medium text-sm rounded-[2px] transition-colors focus:outline-none focus:ring-0"
          >
            <ArrowClockwise size={16} weight="bold" />
            <span>Try Again</span>
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 font-sans font-medium text-sm rounded-[2px] transition-colors focus:outline-none focus:ring-0"
          >
            <House size={16} weight="fill" />
            <span>Go to Workspace</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
