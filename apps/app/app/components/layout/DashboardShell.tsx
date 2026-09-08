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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("jaxis_sidebar_collapsed");
      if (saved !== null) {
        setIsSidebarCollapsed(saved === "true");
      }
    } catch {
      // fallback
    }
  }, []);

  const handleToggleCollapse = React.useCallback(() => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("jaxis_sidebar_collapsed", String(next));
      } catch {
        // fallback
      }
      return next;
    });
  }, []);

  return (
    <div
      className="h-[100dvh] max-h-[100dvh] w-full flex flex-col bg-[#010114] text-white overflow-hidden print:h-auto print:max-h-none print:overflow-visible print:bg-white"
    >
      {/* Mobile Topbar (56px / h-14), visible exclusively on mobile viewports (< lg) */}
      <div className="print:hidden lg:hidden">
        <Topbar
          userFullName={userFullName}
          userRole={userRole}
          userEmail={userEmail}
          clientProfileIncomplete={clientProfileIncomplete}
          initialActiveShift={initialActiveShift}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
        />
      </div>

      {/* Main Workspace Body (Full 100dvh on desktop canvas; y=0 start for PageHeader) */}
      <div
        className="flex flex-1 h-[calc(100dvh-56px)] lg:h-[100dvh] max-h-[calc(100dvh-56px)] lg:max-h-[100dvh] w-full overflow-hidden relative print:h-auto print:max-h-none print:overflow-visible"
      >
        {/* Mobile Backdrop */}
        {isMobileSidebarOpen && (
          <div
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 bg-[#010114]/60 backdrop-blur-sm z-40 lg:hidden animate-modal-backdrop-in print:hidden"
            aria-hidden="true"
          />
        )}

        {/* Dashdark X Collapsible Sidebar Rail */}
        <div className="print:hidden h-full flex-shrink-0">
          <Sidebar
            role={userRole}
            roleLabel={userRole}
            userFullName={userFullName}
            userEmail={userEmail}
            clientProfileIncomplete={clientProfileIncomplete}
            initialUnreadMessagesCount={initialUnreadMessagesCount}
            initialActiveShift={initialActiveShift}
            isOpen={isMobileSidebarOpen}
            onClose={() => setIsMobileSidebarOpen(false)}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={handleToggleCollapse}
          />
        </div>

        {/* Content Area with Guaranteed Consistent Responsive Padding */}
        <main
          data-role={userRole}
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
