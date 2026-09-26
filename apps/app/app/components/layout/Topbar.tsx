"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { List } from "@phosphor-icons/react";
import { DutyClockWidget } from "@/features/attendance/components/DutyClockWidget";
import type { ActiveShiftStatus } from "@/features/attendance/schemas";
import { NotificationDrawer } from "../notifications/NotificationDrawer";

export interface TopbarProps {
  userFullName?: string;
  userRole?: string;
  userEmail?: string;
  clientProfileIncomplete?: boolean;
  initialActiveShift?: ActiveShiftStatus | null;
  className?: string;
  onToggleMobileSidebar?: () => void;
}

// Mobile-only bar, laid out like the website's mobile nav: logo on the left, menu on the right.
// The account menu lives in the navigation drawer (Sidebar), so it isn't repeated here.
export const Topbar: React.FC<TopbarProps> = ({
  userRole = "ADMIN",
  clientProfileIncomplete = false,
  initialActiveShift,
  className = "",
  onToggleMobileSidebar,
}) => {
  const needsSetup = userRole?.toUpperCase() === "CLIENT" && clientProfileIncomplete;

  return (
    <header
      className={`h-14 w-full bg-[#010114] border-b border-white/[0.08] px-4 sm:px-6 flex items-center justify-between gap-3 z-30 select-none lg:hidden ${className}`}
    >
      <Link href="/dashboard" className="flex items-center gap-2.5 py-1 shrink-0" aria-label="JAXIS StatLab workspace home">
        <Image src="/jaxislogo.png" alt="" width={22} height={22} className="h-[22px] w-[22px] shrink-0" priority />
        <span className="font-sans text-[15px] font-semibold tracking-[-0.01em] text-white whitespace-nowrap">
          JAXIS <span className="font-normal text-white/60 hidden min-[360px]:inline">StatLab</span>
        </span>
      </Link>

      <div className="flex items-center gap-1.5 shrink-0">
        <NotificationDrawer />
        <DutyClockWidget userRole={userRole} initialActiveShift={initialActiveShift} />
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="relative flex h-10 w-10 items-center justify-center rounded-[2px] text-white hover:bg-white/[0.06] transition-[background-color,transform] duration-150 active:scale-[0.97]"
          aria-label="Open navigation menu"
        >
          <List size={22} weight="bold" />
          {needsSetup && (
            <span
              className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#CC6600] ring-2 ring-[#010114]"
              title="Finish setting up your profile"
            />
          )}
        </button>
      </div>
    </header>
  );
};
