"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  UserAvatar,
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@repo/ui";
import {
  IconChevronDown,
  IconUser,
  IconCalendarTime,
  IconLogout,
  IconMenu2,
} from "@tabler/icons-react";
import { DutyClockWidget } from "@/features/attendance/components/DutyClockWidget";
import type { ActiveShiftStatus } from "@/features/attendance/schemas";
import { NotificationDrawer } from "../notifications/NotificationDrawer";

export interface TopbarProps {
  userFullName?: string;
  userRole?: string;
  userEmail?: string;
  initialActiveShift?: ActiveShiftStatus | null;
  className?: string;
  onToggleMobileSidebar?: () => void;
}

function getProfileHref(role?: string): string {
  const normalized = role?.toUpperCase() || "";
  if (normalized === "CLIENT") return "/dashboard/client/profile";
  if (normalized === "STATISTICIAN") return "/dashboard/statistician/profile";
  if (normalized === "SENIOR_QA_LEAD" || normalized === "QA") return "/dashboard/qa/profile";
  if (normalized === "FINANCE_OFFICER" || normalized === "FINANCE") return "/dashboard/finance/profile";
  if (normalized === "CEO") return "/dashboard/ceo/profile";
  return "/dashboard/admin/profile";
}

function getRoleDisplayLabel(role?: string): string {
  const normalized = role?.toUpperCase() || "";
  switch (normalized) {
    case "CLIENT":
      return "Client";
    case "STATISTICIAN":
      return "Lead Statistician";
    case "SENIOR_QA_LEAD":
    case "QA":
      return "Senior QA Lead";
    case "FINANCE_OFFICER":
    case "FINANCE":
      return "Finance Officer";
    case "CEO":
      return "Chief Executive";
    case "ADMIN":
    case "OPERATIONS_MANAGER":
      return "Operations Admin";
    default:
      return role ? role.replace(/_/g, " ") : "Staff";
  }
}

export const Topbar: React.FC<TopbarProps> = ({
  userFullName = "Developer Account",
  userRole = "ADMIN",
  userEmail = "dev@jaxis.local",
  initialActiveShift,
  className = "",
  onToggleMobileSidebar,
}) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut({
        callbackUrl: "/login",
        redirect: true,
      });
    } catch (err) {
      console.error("Logout error:", err);
      window.location.href = "/login";
    }
  };

  return (
    <header
      className={`h-16 sm:h-18 w-full bg-[#010114] border-b border-white/10 px-3.5 sm:px-6 lg:px-10 flex items-center justify-between z-30 select-none ${className}`}
    >
      {/* Brand logo mark & title */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0 min-w-0">
        <Link href="/dashboard" className="flex items-center gap-2 sm:gap-2.5 text-decoration-none group py-1 shrink-0">
          <Image
            src="/jaxislogo.png"
            alt="JAXIS Logo"
            width={28}
            height={28}
            className="h-6.5 sm:h-7 w-auto transition-transform group-hover:scale-105 shrink-0"
            priority
          />
          <div className="flex items-center gap-1.5 sm:gap-2 font-sans shrink-0">
            <span className="font-extrabold text-sm sm:text-base tracking-wider text-white">
              JAXIS
            </span>
            <span className="font-extrabold text-sm sm:text-base tracking-wider text-[#CC6600] hidden min-[360px]:inline">
              STATLAB
            </span>
            <span className="hidden md:inline-flex items-center text-[0.688rem] font-sans uppercase px-2 py-0.5 rounded-[4px] bg-white/[0.08] border border-white/15 text-white/70 font-semibold tracking-wider ml-0.5">
              Studio
            </span>
          </div>
        </Link>
      </div>

      {/* Right Controls: Notification Center + Duty Clock Widget + User Profile + Mobile Hamburger */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* In-App Notification Center Drawer */}
        <NotificationDrawer />

        {/* Topbar Duty Clock Widget for internal staff */}
        <DutyClockWidget userRole={userRole} initialActiveShift={initialActiveShift} />

        {/* Radix / Shadcn Dropdown Menu */}
        <DropdownMenuRoot>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2.5 sm:gap-3 py-1.5 px-2 sm:px-2.5 rounded-[2px] bg-transparent hover:bg-white/[0.06] transition-all duration-150 cursor-pointer outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 ring-0 group select-none"
            >
              <UserAvatar
                name={userFullName}
                role={userRole}
                size="sm"
              />

              <span className="hidden sm:inline-block text-sm font-semibold text-white tracking-tight">
                {userFullName}
              </span>

              <IconChevronDown
                size={16}
                stroke={2}
                className="hidden sm:block text-white/50 group-hover:text-white/80 transition-transform duration-150"
              />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            className="w-64 p-2 bg-[#01142B] border border-white/15 shadow-2xl rounded-[2px] backdrop-blur-xl"
          >
            {/* Header User Identity */}
            <div className="px-3 py-2.5 mb-1 flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-white truncate font-sans">
                  {userFullName}
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-[2px] text-[10px] font-mono uppercase bg-white/[0.08] text-white/70 border border-white/10 tracking-wider shrink-0">
                  {getRoleDisplayLabel(userRole)}
                </span>
              </div>
              <span className="text-xs font-sans font-normal text-white/50 truncate">
                {userEmail}
              </span>
            </div>

            <DropdownMenuSeparator className="-mx-2 my-1.5 bg-white/10" />

            {/* Menu Options */}
            <DropdownMenuItem asChild>
              <Link
                href={getProfileHref(userRole)}
                className="flex items-center gap-3 cursor-pointer w-full text-sm font-sans font-medium text-white/85 px-3 py-2.5 rounded-[2px] hover:bg-white/[0.06] hover:text-white transition-colors outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 border-0 ring-0"
              >
                <IconUser size={18} stroke={1.5} className="text-white/60 shrink-0" />
                <span>My Profile</span>
              </Link>
            </DropdownMenuItem>

            {userRole?.toUpperCase() !== "CLIENT" && (
              <DropdownMenuItem asChild>
                <Link
                  href="/dashboard/staff/hr"
                  className="flex items-center gap-3 cursor-pointer w-full text-sm font-sans font-medium text-white/85 px-3 py-2.5 rounded-[2px] hover:bg-white/[0.06] hover:text-white transition-colors outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 border-0 ring-0"
                >
                  <IconCalendarTime size={18} stroke={1.5} className="text-white/60 shrink-0" />
                  <span>My HR & Timeclock</span>
                </Link>
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator className="-mx-2 my-1.5 bg-white/10" />

            {/* Logout Action */}
            <DropdownMenuItem
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center gap-3 cursor-pointer w-full text-sm font-sans font-semibold text-red-400 px-3 py-2.5 rounded-[2px] hover:bg-red-500/10 hover:text-red-300 transition-colors outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 border-0 ring-0"
            >
              {isLoggingOut ? (
                <span className="h-4 w-4 border-2 border-white/20 border-t-red-400 rounded-full animate-spin mr-1 shrink-0" />
              ) : (
                <IconLogout size={18} stroke={1.5} className="text-red-400 shrink-0" />
              )}
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuRoot>

        {/* Mobile Sidebar Hamburger Button */}
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 rounded-[2px] text-white/70 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer border border-white/10 outline-none focus:outline-none focus:ring-0 ring-0"
          aria-label="Toggle navigation menu"
        >
          <IconMenu2 size={22} stroke={1.5} />
        </button>
      </div>
    </header>
  );
};
