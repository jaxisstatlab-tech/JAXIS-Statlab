"use client";

import React, { useState } from "react";
import { Topbar } from "./Topbar";
import { Sidebar } from "./Sidebar";
import type { RoleName } from "@prisma/client";
import type { ActiveShiftStatus } from "@/features/attendance/schemas";

export interface DashboardShellProps {
  userFullName: string;
  userRole: RoleName | string;
  userEmail: string;
  clientProfileIncomplete?: boolean;
  initialActiveShift?: ActiveShiftStatus | null;
  initialUnreadMessagesCount?: number;
  children: React.ReactNode;
}

export function DashboardShell({
  userFullName,
  userRole,
  userEmail,
  clientProfileIncomplete = false,
  initialActiveShift,
  initialUnreadMessagesCount = 0,
  children,
}: DashboardShellProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div
      className="h-[100dvh] max-h-[100dvh] w-full flex flex-col bg-[#010114] text-white overflow-hidden print:h-auto print:max-h-none print:overflow-visible print:bg-white"
    >
      {/* Topbar (72px / 4.5rem) with Mobile Hamburger */}
      <div className="print:hidden">
        <Topbar
          userFullName={userFullName}
          userRole={userRole}
          userEmail={userEmail}
          clientProfileIncomplete={clientProfileIncomplete}
          initialActiveShift={initialActiveShift}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
        />
      </div>

      {/* Main Workspace Body */}
      <div
        className="flex flex-1 h-[calc(100dvh-64px)] sm:h-[calc(100dvh-72px)] max-h-[calc(100dvh-64px)] sm:max-h-[calc(100dvh-72px)] w-full overflow-hidden relative print:h-auto print:max-h-none print:overflow-visible"
      >
        {/* Mobile Backdrop */}
        {isMobileSidebarOpen && (
          <div
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 bg-[#010114]/60 backdrop-blur-sm z-40 lg:hidden animate-modal-backdrop-in print:hidden"
            aria-hidden="true"
          />
        )}

        {/* Responsive Role-Aware Sidebar */}
        <div className="print:hidden">
          <Sidebar
            role={userRole}
            roleLabel={userRole}
            userFullName={userFullName}
            userEmail={userEmail}
            clientProfileIncomplete={clientProfileIncomplete}
            initialUnreadMessagesCount={initialUnreadMessagesCount}
            isOpen={isMobileSidebarOpen}
            onClose={() => setIsMobileSidebarOpen(false)}
          />
        </div>

        {/* Content Area with Guaranteed Consistent Responsive Padding */}
        <main
          className="flex-1 min-w-0 h-full max-h-full bg-[#010114] overflow-y-auto overflow-x-hidden p-3.5 sm:p-6 md:p-[clamp(2rem,4vw,3.5rem)] flex flex-col print:p-0 print:h-auto print:max-h-none print:overflow-visible print:bg-white"
        >
          <div
            className="w-full max-w-7xl mx-auto flex-1 min-h-full flex flex-col print:max-w-none print:w-full print:m-0"
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
