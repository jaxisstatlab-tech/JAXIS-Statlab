import React from "react";
import Link from "next/link";
import { Compass, ArrowLeft } from "@phosphor-icons/react/dist/ssr";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#010114] text-white px-4">
      <div className="max-w-md w-full p-8 sm:p-10 bg-[#01142B] border border-white/10 rounded-[2px] flex flex-col items-center gap-6 text-center animate-content-fade">
        <div className="w-14 h-14 rounded-[2px] bg-[#38BDF8]/10 border border-[#38BDF8]/30 flex items-center justify-center text-[#38BDF8]">
          <Compass size={28} weight="fill" />
        </div>

        <div className="flex flex-col gap-2">
          <span className="font-mono text-xs text-[#38BDF8] tracking-wider uppercase font-semibold">
            404 Not Found
          </span>
          <h1 className="font-sans font-bold text-xl sm:text-2xl text-white">
            Page Not Found
          </h1>
          <p className="font-sans text-sm text-white/60 leading-relaxed">
            The page or workspace desk you are looking for does not exist or may have been relocated.
          </p>
        </div>

        <div className="pt-2 w-full flex justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#CC6600] hover:bg-[#B35500] text-white font-sans font-medium text-sm rounded-[2px] transition-colors focus:outline-none focus:ring-0"
          >
            <ArrowLeft size={16} weight="bold" />
            <span>Return to Workspace</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
