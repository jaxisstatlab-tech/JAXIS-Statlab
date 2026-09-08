"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import type { RoleName } from "@prisma/client";
import { getUnreadMessagesCount } from "@/features/messaging/actions";
import { DutyClockWidget } from "@/features/attendance/components/DutyClockWidget";
import type { ActiveShiftStatus } from "@/features/attendance/schemas";
import { NotificationDrawer } from "../notifications/NotificationDrawer";
import {
  UserAvatar,
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@repo/ui";
import {
  SquaresFour,
  Files,
  FilePlus,
  Database,
  Receipt,
  FileText,
  TerminalWindow,
  Code,
  CloudArrowUp,
  ChatCenteredText,
  ShieldCheck,
  ClipboardText,
  Medal,
  Coins,
  Key,
  Users,
  Shield,
  Pulse,
  Clock,
  CalendarCheck,
  Calendar,
  X,
  ArrowsCounterClockwise,
  Scales,
  Archive,
  ChartBar,
  ShieldWarning,
  PaperPlaneRight,
  Gavel,
  CaretLeft,
  CaretRight,
  CaretDown,
  User,
  GraduationCap,
  SignOut,
} from "@phosphor-icons/react";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  count?: number;
  badge?: string;
  badgeColor?: "orange" | "emerald" | "sky" | "amber" | "indigo" | "gray";
  disabled?: boolean;
}

export interface NavGroup {
  groupTitle: string;
  items: NavItem[];
}

export interface SidebarProps {
  role?: RoleName | string;
  roleLabel?: string;
  userFullName?: string;
  userEmail?: string;
  clientProfileIncomplete?: boolean;
  initialUnreadMessagesCount?: number;
  initialActiveShift?: ActiveShiftStatus | null;
  className?: string;
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

// ─── Phosphor Fill Icons (Dashdark X Precision Standard) ────────────────────

const Icons = {
  Overview: <SquaresFour size={16} weight="fill" className="flex-shrink-0" />,
  Studies: <Files size={16} weight="fill" className="flex-shrink-0" />,
  Intake: <FilePlus size={16} weight="fill" className="flex-shrink-0" />,
  Vault: <Database size={16} weight="fill" className="flex-shrink-0" />,
  Receipt: <Receipt size={16} weight="fill" className="flex-shrink-0" />,
  Invoice: <FileText size={16} weight="fill" className="flex-shrink-0" />,
  Terminal: <TerminalWindow size={16} weight="fill" className="flex-shrink-0" />,
  Scripts: <Code size={16} weight="bold" className="flex-shrink-0" />,
  UploadCloud: <CloudArrowUp size={16} weight="fill" className="flex-shrink-0" />,
  Feedback: <ChatCenteredText size={16} weight="fill" className="flex-shrink-0" />,
  ShieldCheck: <ShieldCheck size={16} weight="fill" className="flex-shrink-0" />,
  CheckQueue: <ClipboardText size={16} weight="fill" className="flex-shrink-0" />,
  Award: <Medal size={16} weight="fill" className="flex-shrink-0" />,
  FinanceVault: <Coins size={16} weight="fill" className="flex-shrink-0" />,
  KeyRelease: <Key size={16} weight="fill" className="flex-shrink-0" />,
  Users: <Users size={16} weight="fill" className="flex-shrink-0" />,
  Audit: <Shield size={16} weight="fill" className="flex-shrink-0" />,
  Activity: <Pulse size={16} weight="bold" className="flex-shrink-0" />,
  Clock: <Clock size={16} weight="fill" className="flex-shrink-0" />,
  LeaveDesk: <CalendarCheck size={16} weight="fill" className="flex-shrink-0" />,
  Schedule: <Calendar size={16} weight="fill" className="flex-shrink-0" />,
  Revisions: <ArrowsCounterClockwise size={16} weight="bold" className="flex-shrink-0" />,
  Claims: <Scales size={16} weight="fill" className="flex-shrink-0" />,
  Archive: <Archive size={16} weight="fill" className="flex-shrink-0" />,
  Reports: <ChartBar size={16} weight="fill" className="flex-shrink-0" />,
  Firewall: <ShieldWarning size={16} weight="fill" className="flex-shrink-0" />,
  Emails: <PaperPlaneRight size={16} weight="fill" className="flex-shrink-0" />,
  Gavel: <Gavel size={16} weight="fill" className="flex-shrink-0" />,
};

// ─── Role-Specific Navigation Definitions ─────────────────────────────────────

const ROLE_NAV_GROUPS: Record<string, NavGroup[]> = {
  CLIENT: [
    {
      groupTitle: "RESEARCH WORKSPACE",
      items: [
        {
          label: "My Studies",
          href: "/dashboard/client",
          icon: Icons.Overview,
        },
        {
          label: "Submit New Request",
          href: "/dashboard/client/projects/new",
          icon: Icons.Intake,
        },
        {
          label: "Quotes & Proposals",
          href: "/dashboard/client/quotations",
          icon: Icons.Invoice,
        },
        {
          label: "DefenseLab Practice",
          href: "/dashboard/client/defenselab",
          icon: Icons.Terminal,
        },
      ],
    },
    {
      groupTitle: "COMMUNICATION & SUPPORT",
      items: [
        {
          label: "Messages",
          href: "/dashboard/client/messages",
          icon: Icons.Feedback,
        },
        {
          label: "Revisions & Help",
          href: "/dashboard/client/disputes",
          icon: Icons.Claims,
        },
      ],
    },
  ],

  STATISTICIAN: [
    {
      groupTitle: "STUDIES & DATA",
      items: [
        {
          label: "Statistician Workbench",
          href: "/dashboard/statistician",
          icon: Icons.Terminal,
        },
        {
          label: "Messages",
          href: "/dashboard/statistician/messages",
          icon: Icons.Feedback,
        },
      ],
    },
    {
      groupTitle: "MY WORKSPACE",
      items: [
        {
          label: "Milestone Payouts",
          href: "/dashboard/statistician/payouts",
          icon: Icons.Award,
        },
        {
          label: "My HR & Timeclock",
          href: "/dashboard/staff/hr",
          icon: Icons.LeaveDesk,
        },
        {
          label: "My Profile",
          href: "/dashboard/statistician/profile",
          icon: Icons.Users,
        },
      ],
    },
  ],

  SENIOR_QA_LEAD: [
    {
      groupTitle: "QUALITY CHECKS",
      items: [
        {
          label: "QA Review Desk",
          href: "/dashboard/qa",
          icon: Icons.ShieldCheck,
        },
        {
          label: "Messages",
          href: "/dashboard/qa/messages",
          icon: Icons.Feedback,
        },
      ],
    },
    {
      groupTitle: "MY WORKSPACE",
      items: [
        {
          label: "QA Audit Earnings",
          href: "/dashboard/qa/payouts",
          icon: Icons.Award,
        },
        {
          label: "My HR & Timeclock",
          href: "/dashboard/staff/hr",
          icon: Icons.LeaveDesk,
        },
        {
          label: "My Profile",
          href: "/dashboard/qa/profile",
          icon: Icons.Users,
        },
      ],
    },
  ],

  FINANCE_OFFICER: [
    {
      groupTitle: "PAYMENTS & ESCROW",
      items: [
        {
          label: "Finance Overview",
          href: "/dashboard/finance",
          icon: Icons.FinanceVault,
        },
        {
          label: "Deposit Queue",
          href: "/dashboard/finance/payments",
          icon: Icons.CheckQueue,
        },
        {
          label: "Milestone Payments",
          href: "/dashboard/finance/payouts",
          icon: Icons.Award,
        },
        {
          label: "Refunds & Disputes",
          href: "/dashboard/finance/disputes",
          icon: Icons.Claims,
        },
      ],
    },
    {
      groupTitle: "RECORDS & AUDIT",
      items: [
        {
          label: "Financial Ledger",
          href: "/dashboard/finance/ledger",
          icon: Icons.Audit,
        },
        {
          label: "Financial Reports",
          href: "/dashboard/finance/reports",
          icon: Icons.Reports,
        },
      ],
    },
    {
      groupTitle: "HR & PAYROLL",
      items: [
        {
          label: "Staff Timesheets",
          href: "/dashboard/finance/attendance",
          icon: Icons.Clock,
        },
        {
          label: "Payroll & Payslips",
          href: "/dashboard/finance/payroll",
          icon: Icons.Receipt,
        },
        {
          label: "Leave Approvals",
          href: "/dashboard/finance/leaves",
          icon: Icons.LeaveDesk,
        },
      ],
    },
    {
      groupTitle: "MY WORKSPACE",
      items: [
        {
          label: "My HR & Timeclock",
          href: "/dashboard/staff/hr",
          icon: Icons.LeaveDesk,
        },
        {
          label: "My Profile",
          href: "/dashboard/finance/profile",
          icon: Icons.Users,
        },
      ],
    },
  ],

  CEO: [
    {
      groupTitle: "EXECUTIVE OVERVIEW",
      items: [
        {
          label: "CEO Overview",
          href: "/dashboard/ceo",
          icon: Icons.Overview,
        },
        {
          label: "Pricing & Quotations",
          href: "/dashboard/admin/quotations",
          icon: Icons.Invoice,
        },
        {
          label: "Treasury & Rates",
          href: "/dashboard/ceo/finance",
          icon: Icons.FinanceVault,
        },
      ],
    },
    {
      groupTitle: "OPERATIONS & GOVERNANCE",
      items: [
        {
          label: "Finance & Payments",
          href: "/dashboard/finance",
          icon: Icons.FinanceVault,
        },
        {
          label: "QA Review Desk",
          href: "/dashboard/qa",
          icon: Icons.ShieldCheck,
        },
        {
          label: "Staff Directory",
          href: "/dashboard/admin/staff",
          icon: Icons.Users,
        },
        {
          label: "Staff Timesheets",
          href: "/dashboard/ceo/attendance",
          icon: Icons.Clock,
        },
        {
          label: "Payroll Settings",
          href: "/dashboard/ceo/payroll",
          icon: Icons.Receipt,
        },
      ],
    },
    {
      groupTitle: "AUDIT & SECURITY",
      items: [
        {
          label: "Intelligence Reports",
          href: "/dashboard/ceo/reports",
          icon: Icons.Reports,
        },
        {
          label: "Dispute Rulings",
          href: "/dashboard/ceo/disputes",
          icon: Icons.Gavel,
        },
        {
          label: "Firewall Logs",
          href: "/dashboard/admin/messages",
          icon: Icons.Firewall,
        },
        {
          label: "Storage & Purge Policy",
          href: "/dashboard/ceo/retention",
          icon: Icons.Vault,
        },
      ],
    },
    {
      groupTitle: "MY WORKSPACE",
      items: [
        {
          label: "My HR & Timeclock",
          href: "/dashboard/staff/hr",
          icon: Icons.LeaveDesk,
        },
        {
          label: "My Profile",
          href: "/dashboard/ceo/profile",
          icon: Icons.Users,
        },
      ],
    },
  ],

  ADMIN: [
    {
      groupTitle: "STUDIES & INTAKE",
      items: [
        {
          label: "Admin Overview",
          href: "/dashboard/admin",
          icon: Icons.Terminal,
        },
        {
          label: "New Study Requests",
          href: "/dashboard/admin/intake",
          icon: Icons.Intake,
        },
        {
          label: "Pricing & Quotations",
          href: "/dashboard/admin/quotations",
          icon: Icons.Invoice,
        },
        {
          label: "Assign Experts",
          href: "/dashboard/admin/assignments",
          icon: Icons.KeyRelease,
        },
        {
          label: "Client Revisions",
          href: "/dashboard/admin/revisions",
          icon: Icons.Revisions,
        },
        {
          label: "DefenseLab Schedule",
          href: "/dashboard/admin/defenselab",
          icon: Icons.Schedule,
        },
      ],
    },
    {
      groupTitle: "TEAM & OPERATIONS",
      items: [
        {
          label: "Staff Directory",
          href: "/dashboard/admin/staff",
          icon: Icons.Users,
        },
        {
          label: "Staff Timesheets",
          href: "/dashboard/finance/attendance",
          icon: Icons.Clock,
        },
        {
          label: "Study Claims",
          href: "/dashboard/admin/disputes",
          icon: Icons.Claims,
        },
      ],
    },
    {
      groupTitle: "SYSTEM & AUDIT LOGS",
      items: [
        {
          label: "Activity Log",
          href: "/dashboard/admin/audit",
          icon: Icons.Audit,
        },
        {
          label: "Firewall Logs",
          href: "/dashboard/admin/messages",
          icon: Icons.Firewall,
        },
        {
          label: "Email Delivery Logs",
          href: "/dashboard/admin/notifications",
          icon: Icons.Emails,
        },
        {
          label: "System Reports",
          href: "/dashboard/admin/reports",
          icon: Icons.Reports,
        },
        {
          label: "Project Archive",
          href: "/dashboard/admin/archive",
          icon: Icons.Archive,
        },
      ],
    },
    {
      groupTitle: "MY WORKSPACE",
      items: [
        {
          label: "My HR & Timeclock",
          href: "/dashboard/staff/hr",
          icon: Icons.LeaveDesk,
        },
        {
          label: "My Profile",
          href: "/dashboard/admin/profile",
          icon: Icons.Users,
        },
      ],
    },
  ],
};

const BADGE_STYLES: Record<string, string> = {
  orange: "bg-[#CC6600]/20 text-[#FFA040] border-[#CC6600]/40",
  emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  sky: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  amber: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  indigo: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  gray: "bg-white/[0.04] text-white/35 border-white/[0.08]",
};

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

export const Sidebar: React.FC<SidebarProps> = ({
  role = "ADMIN",
  userFullName = "Developer Account",
  userEmail = "dev@jaxis.local",
  clientProfileIncomplete = false,
  initialUnreadMessagesCount = 0,
  initialActiveShift,
  className = "",
  isOpen = false,
  onClose,
  isCollapsed: propIsCollapsed = false,
  onToggleCollapse,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    setIsDesktop(media.matches);
    const listener = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  // Collapse mode is strictly for desktop viewports (>= 1024px).
  // Mobile drawer is ALWAYS full-width expanded.
  const isCollapsed = isDesktop && propIsCollapsed;

  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const [isProfileExpanded, setIsProfileExpanded] = useState<boolean>(false);
  const profileContainerRef = useRef<HTMLDivElement>(null);

  // Close inline profile dropdown on click outside
  useEffect(() => {
    if (!isProfileExpanded) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        profileContainerRef.current &&
        !profileContainerRef.current.contains(e.target as Node)
      ) {
        setIsProfileExpanded(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isProfileExpanded]);

  // Close profile dropdown when navigating or when sidebar collapses
  useEffect(() => {
    setIsProfileExpanded(false);
  }, [pathname, isCollapsed]);

  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(
    initialUnreadMessagesCount ?? 0
  );

  // Synchronize state when server preloaded count changes
  useEffect(() => {
    if (typeof initialUnreadMessagesCount === "number") {
      setUnreadMessagesCount(initialUnreadMessagesCount);
    }
  }, [initialUnreadMessagesCount]);

  // Client-side fetcher to refresh unread messages count
  const refreshUnreadCount = useCallback(async () => {
    try {
      const count = await getUnreadMessagesCount();
      setUnreadMessagesCount(count);
    } catch {
      // silent fallback
    }
  }, []);

  // When visiting any messages desk, refresh unread count after receipts settle
  useEffect(() => {
    if (pathname.includes("/messages")) {
      const timer = setTimeout(() => {
        refreshUnreadCount();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [pathname, refreshUnreadCount]);

  // Listen to global messaging events, tab focus, and background pulse
  useEffect(() => {
    const handleUnreadUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ count?: number }>;
      if (typeof customEvent.detail?.count === "number") {
        setUnreadMessagesCount(customEvent.detail.count);
      } else {
        refreshUnreadCount();
      }
    };

    window.addEventListener("jaxis:unread-count-updated", handleUnreadUpdate);
    window.addEventListener("jaxis:message-read", refreshUnreadCount);
    window.addEventListener("jaxis:new-message", refreshUnreadCount);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        refreshUnreadCount();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Periodic 25-second background refresh
    const interval = setInterval(refreshUnreadCount, 25000);

    return () => {
      window.removeEventListener("jaxis:unread-count-updated", handleUnreadUpdate);
      window.removeEventListener("jaxis:message-read", refreshUnreadCount);
      window.removeEventListener("jaxis:new-message", refreshUnreadCount);
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(interval);
    };
  }, [refreshUnreadCount]);



  // Reset pending state once navigation completes or URL matches target
  useEffect(() => {
    if (pendingHref) {
      const isCurrentRoute =
        pathname === pendingHref ||
        (pendingHref !== "/dashboard" &&
          pendingHref !== "/dashboard/admin" &&
          pendingHref !== "/dashboard/ceo" &&
          pendingHref !== "/dashboard/client" &&
          pendingHref !== "/dashboard/statistician" &&
          pendingHref !== "/dashboard/qa" &&
          pendingHref !== "/dashboard/finance" &&
          pathname.startsWith(pendingHref + "/"));

      if (isCurrentRoute) {
        setPendingHref(null);
      }
    }
  }, [pathname, pendingHref]);

  // Safety watchdog: clear pending state if navigation settles or takes longer than 3.5s
  useEffect(() => {
    if (!pendingHref) return;
    const timeout = setTimeout(() => {
      setPendingHref(null);
    }, 3500);
    return () => clearTimeout(timeout);
  }, [pendingHref]);

  const handleNavClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
        return;
      }

      if (onClose) onClose();

      if (pathname === href && !pendingHref) {
        e.preventDefault();
        return;
      }

      setPendingHref(href);
    },
    [onClose, pathname, pendingHref]
  );

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

  const normalizedRole = (role?.toUpperCase() || "ADMIN") as string;
  let effectiveRole = normalizedRole;
  if (normalizedRole === "QA" || normalizedRole === "SENIOR_QA_LEAD") {
    effectiveRole = "SENIOR_QA_LEAD";
  } else if (normalizedRole === "FINANCE" || normalizedRole === "FINANCE_OFFICER") {
    effectiveRole = "FINANCE_OFFICER";
  } else if (normalizedRole === "OPERATIONS_MANAGER" || normalizedRole === "OPERATIONS") {
    effectiveRole = "ADMIN";
  }

  const isInternal = ["STATISTICIAN", "SENIOR_QA_LEAD", "FINANCE_OFFICER", "ADMIN", "CEO"].includes(
    effectiveRole
  );
  const isClient = effectiveRole === "CLIENT";

  let navGroups = ROLE_NAV_GROUPS[effectiveRole] || ROLE_NAV_GROUPS.ADMIN!;

  if (effectiveRole === "CLIENT" && clientProfileIncomplete) {
    navGroups = navGroups.map((group) => ({
      ...group,
      items: group.items.map((item) => {
        if (item.href === "/dashboard/client/projects/new") {
          return {
            ...item,
            badge: "NEW STUDY",
            badgeColor: "amber" as const,
          };
        }
        return item;
      }),
    }));
  }

  const filteredNavGroups = navGroups;

  return (
    <aside
      className={`
        fixed lg:static inset-y-0 left-0 z-50 lg:z-20
        h-full max-h-full bg-[#010114] border-r border-white/[0.08] flex flex-col justify-between
        select-none flex-shrink-0 overflow-hidden
        transition-transform duration-300 ease-in-out lg:transition-none shadow-2xl lg:shadow-none
        w-[18.5rem] lg:w-full
        ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        ${className}
      `}
    >
      {/* Top Header & Navigation Container */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* ── 1. Header (Logo + Title + Single Caret Collapse Toggle) ── */}
        <div className="h-16 flex items-center border-b border-white/[0.08] shrink-0 overflow-hidden px-3.5 justify-between">
          <div className="flex items-center min-w-0">
            {/* Logo: Anchored at center x = 34px (px-3.5 [14px] + w-10/2 [20px] = 34px) */}
            {isCollapsed ? (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="w-10 h-10 flex items-center justify-center rounded-[2px] hover:bg-white/[0.06] transition-colors cursor-pointer group active:scale-95 outline-none shrink-0"
                aria-label="Expand sidebar"
                title="Expand sidebar (Ctrl+B)"
              >
                <Image
                  src="/jaxislogo.png"
                  alt="JAXIS Logo"
                  width={24}
                  height={24}
                  className="h-6 w-auto transition-transform group-hover:scale-110 shrink-0"
                  priority
                />
              </button>
            ) : (
              <Link
                href="/dashboard"
                className="w-10 h-10 flex items-center justify-center rounded-[2px] hover:bg-white/[0.06] transition-colors cursor-pointer group active:scale-95 outline-none shrink-0"
                title="JAXIS StatLab Studio"
              >
                <Image
                  src="/jaxislogo.png"
                  alt="JAXIS Logo"
                  width={24}
                  height={24}
                  className="h-6 w-auto transition-transform group-hover:scale-105 shrink-0"
                  priority
                />
              </Link>
            )}

            {/* Brand Title: Smoothly fades in/out with no layout jump or text wrapping */}
            <div
              className={`flex items-center gap-1 font-sans whitespace-nowrap overflow-hidden transition-all duration-200 ${
                isCollapsed ? "max-w-0 opacity-0 pointer-events-none ml-0" : "max-w-[200px] opacity-100 ml-1.5"
              }`}
            >
              <span className="font-extrabold text-sm tracking-wider text-white">JAXIS</span>
              <span className="font-extrabold text-sm tracking-wider text-[#CC6600]">STATLAB</span>
              <span className="inline-flex items-center text-[0.625rem] font-sans uppercase px-1.5 py-0.2 rounded-[2px] bg-white/[0.08] border border-white/15 text-white/60 font-semibold tracking-wider ml-0.5">
                Studio
              </span>
            </div>
          </div>

          {/* Desktop Caret & Mobile Close Buttons */}
          <div
            className={`flex items-center gap-1 shrink-0 transition-all duration-200 ${
              isCollapsed ? "w-0 opacity-0 pointer-events-none overflow-hidden" : "w-auto opacity-100"
            }`}
          >
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden lg:flex items-center justify-center p-1.5 text-white/50 hover:text-[#FFA040] transition-colors duration-150 cursor-pointer group active:scale-90 outline-none"
              aria-label="Collapse sidebar"
              title="Collapse sidebar (Ctrl+B)"
            >
              <CaretLeft size={18} weight="bold" className="group-hover:-translate-x-0.5 transition-transform" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex lg:hidden p-1.5 rounded-[2px] text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
              aria-label="Close navigation drawer"
            >
              <X size={18} weight="bold" />
            </button>
          </div>
        </div>

        {/* ── 3. Navigation Links List ── */}
        <div className="p-3.5 flex flex-col gap-4 overflow-y-auto flex-1 scrollbar-thin">
          <nav aria-label="Sidebar navigation" className="flex flex-col gap-3">
            {filteredNavGroups.map((group, gIdx) => (
              <div key={gIdx} className="flex flex-col gap-0.5">
                <div
                  className={`overflow-hidden transition-all duration-200 ${
                    isCollapsed ? "h-0 opacity-0 my-0 pointer-events-none" : "h-6 opacity-100 my-1 px-1 flex items-center"
                  }`}
                >
                  <span className="text-[10px] font-mono font-medium tracking-widest text-white/35 uppercase select-none whitespace-nowrap">
                    {group.groupTitle}
                  </span>
                </div>

                {group.items.map((item) => {
                  const isExact = pathname === item.href;
                  const isChild =
                    item.href !== "/dashboard" &&
                    item.href !== "/dashboard/admin" &&
                    item.href !== "/dashboard/ceo" &&
                    item.href !== "/dashboard/client" &&
                    item.href !== "/dashboard/statistician" &&
                    item.href !== "/dashboard/qa" &&
                    item.href !== "/dashboard/finance" &&
                    pathname.startsWith(item.href + "/");

                  // Special match: /dashboard/client/projects matches My Studies (/dashboard/client)
                  const isClientProjectsMatch =
                    item.href === "/dashboard/client" &&
                    pathname.startsWith("/dashboard/client/projects") &&
                    !pathname.startsWith("/dashboard/client/projects/new");

                  const isActive = isExact || isChild || isClientProjectsMatch;

                  const isPendingActive =
                    pendingHref !== null &&
                    (pendingHref === item.href ||
                      (item.href !== "/dashboard" &&
                        item.href !== "/dashboard/admin" &&
                        item.href !== "/dashboard/ceo" &&
                        item.href !== "/dashboard/client" &&
                        item.href !== "/dashboard/statistician" &&
                        item.href !== "/dashboard/qa" &&
                        item.href !== "/dashboard/finance" &&
                        pendingHref.startsWith(item.href + "/")));

                  const effectivelyActive = pendingHref !== null ? isPendingActive : isActive;
                  const isDisabled = Boolean(item.disabled);

                  if (isDisabled) {
                    return (
                      <div
                        key={item.href + item.label}
                        className="w-full h-10 flex items-center text-xs rounded-[2px] select-none opacity-40 cursor-not-allowed overflow-hidden border border-transparent"
                        title={`${item.label} (Under Active Development)`}
                      >
                        <div className="w-10 h-10 shrink-0 flex items-center justify-center">
                          <span className="text-white/30 flex-shrink-0 w-5 h-5 flex items-center justify-center">
                            {item.icon}
                          </span>
                        </div>
                        <div
                          className={`flex items-center justify-between flex-1 min-w-0 whitespace-nowrap overflow-hidden transition-all duration-200 ${
                            isCollapsed
                              ? "max-w-0 opacity-0 pointer-events-none ml-0 pr-0"
                              : "max-w-[220px] opacity-100 ml-1.5 pr-2"
                          }`}
                        >
                          <span className="font-sans font-normal text-white/40 text-[0.8125rem] truncate">
                            {item.label}
                          </span>
                          <span className="text-[10px] font-sans px-1.5 py-0.5 rounded-[2px] border font-medium bg-white/[0.04] text-white/30 border-white/[0.08] shrink-0 ml-auto">
                            {item.badge || "SOON"}
                          </span>
                        </div>
                      </div>
                    );
                  }

                  const isMessagesLink =
                    item.label === "Messages" || item.href.endsWith("/messages");
                  const hasNewMessages = isMessagesLink && unreadMessagesCount > 0;

                  return (
                    <Link
                      key={`${item.href}-${item.label}`}
                      href={item.href}
                      prefetch={true}
                      onMouseEnter={() => router.prefetch(item.href)}
                      onClick={(e) => handleNavClick(e, item.href)}
                      className={`relative flex items-center h-10 w-full rounded-[2px] transition-all duration-150 ease-out group overflow-hidden active:scale-[0.98] border ${
                        effectivelyActive
                          ? "bg-[#CC6600]/12 text-white font-medium border-[#CC6600]/30 shadow-sm"
                          : hasNewMessages
                          ? "border border-[#CC6600]/30 bg-[#CC6600]/[0.08] text-white hover:bg-[#CC6600]/[0.14]"
                          : "border border-transparent text-white/65 hover:text-white hover:bg-white/[0.05]"
                      }`}
                      title={
                        isCollapsed
                          ? `${item.label}${item.count ? ` (${item.count})` : ""}${hasNewMessages ? ` (${unreadMessagesCount} new)` : ""}`
                          : undefined
                      }
                    >
                      {/* Precision Vertical Accent Bar */}
                      {effectivelyActive && (
                        <span
                          className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-[2px] bg-[#CC6600]"
                          aria-hidden="true"
                        />
                      )}

                      {/* Nav Icon Container: Anchored on x = 34px axis */}
                      <div className="w-10 h-10 shrink-0 flex items-center justify-center relative">
                        <span
                          style={{
                            color: effectivelyActive
                              ? "#FFA040"
                              : hasNewMessages
                              ? "#FFA040"
                              : undefined,
                          }}
                          className={`${
                            effectivelyActive
                              ? "text-[#FFA040]"
                              : hasNewMessages
                              ? "text-[#FFA040]"
                              : "text-white/40 group-hover:text-white/80 group-hover:scale-105"
                          } transition-all duration-150 flex-shrink-0 flex items-center justify-center`}
                        >
                          {item.icon}
                        </span>

                        {/* Collapsed mode unread ping beacon */}
                        {isCollapsed && hasNewMessages && (
                          <span className="absolute top-2 right-2 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#CC6600] opacity-80" />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#CC6600]" />
                          </span>
                        )}
                      </div>

                      {/* Text Label & Badges: Smoothly fades in/out */}
                      <div
                        className={`flex items-center justify-between flex-1 min-w-0 whitespace-nowrap overflow-hidden transition-all duration-200 ${
                          isCollapsed
                            ? "max-w-0 opacity-0 pointer-events-none ml-0 pr-0"
                            : "max-w-[220px] opacity-100 ml-1.5 pr-2"
                        }`}
                      >
                        <span
                          className={`font-sans text-[0.8125rem] truncate transition-colors duration-150 ${
                            effectivelyActive
                              ? "font-semibold text-white tracking-wide"
                              : hasNewMessages
                              ? "font-semibold text-white"
                              : "font-normal text-white/70 group-hover:text-white"
                          }`}
                          title={item.label}
                        >
                          {item.label}
                        </span>

                        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                          {isPendingActive && !isActive && (
                            <span
                              className="h-1.5 w-1.5 rounded-full bg-[#CC6600] animate-ping flex-shrink-0 mr-1"
                              title="Navigating..."
                            />
                          )}

                          {hasNewMessages ? (
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <span
                                className="relative flex h-2 w-2 items-center justify-center flex-shrink-0"
                                aria-label="New unread message activity"
                              >
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#CC6600] opacity-80" />
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#CC6600]" />
                              </span>
                              <span
                                className="text-[10px] font-mono px-1.5 py-0.5 rounded-[2px] bg-[#CC6600] text-white font-bold leading-none shadow-sm transition-transform duration-150 active:scale-90 select-none flex-shrink-0 tracking-tight"
                                title={`${unreadMessagesCount} unread message${unreadMessagesCount > 1 ? "s" : ""}`}
                              >
                                {unreadMessagesCount > 9 ? "9+" : unreadMessagesCount} NEW
                              </span>
                            </div>
                          ) : item.count !== undefined && item.count > 0 ? (
                            <span
                              className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full flex-shrink-0 border leading-none ${
                                effectivelyActive
                                  ? "bg-[#CC6600]/25 text-[#FFA040] border-[#CC6600]/40 font-bold"
                                  : "bg-white/[0.06] text-white/60 border-white/10 group-hover:text-white"
                              }`}
                            >
                              {item.count}
                            </span>
                          ) : item.badge ? (
                            <span
                              className={`text-[10px] font-sans px-1.5 py-0.5 rounded-[2px] border font-semibold flex-shrink-0 tracking-wide uppercase ${
                                BADGE_STYLES[item.badgeColor || "indigo"]
                              }`}
                            >
                              {item.badge}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>
      </div>

      {/* ── 4. Bottom Identity & Operational Footer (Dashdark X Precision Standard) ── */}
      <div className="flex flex-col shrink-0 border-t border-white/[0.08] bg-[#010D1F]/75 overflow-hidden">
        {/* Staff Duty Clock (internal staff only) */}
        {isInternal && (
          <div className={`p-3.5 border-b border-white/[0.08] overflow-hidden ${isCollapsed ? "flex justify-center" : ""}`}>
            <DutyClockWidget userRole={role} initialActiveShift={initialActiveShift} />
          </div>
        )}

        {/* Notifications Bar (Alerts & Activity) */}
        <div className="p-3.5 border-b border-white/[0.08] overflow-hidden">
          <NotificationDrawer
            triggerVariant="row"
            isSidebarCollapsed={isCollapsed}
            side="right"
            align="end"
          />
        </div>

        {/* User Identity Card: Collapsed Popover (Desktop Rail) vs Expanded Inline Accordion */}
        <div className="p-3.5 overflow-hidden">
          {isCollapsed ? (
            <DropdownMenuRoot>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center h-12 rounded-[2px] hover:bg-white/[0.06] border border-transparent hover:border-white/10 transition-all duration-150 cursor-pointer outline-none focus:outline-none group text-left active:scale-[0.98] overflow-hidden"
                  aria-label="User account menu"
                  title={`${userFullName} (${getRoleDisplayLabel(role)})`}
                >
                  {/* Avatar: Anchored on x = 34px axis (14px padding + 20px = 34px) */}
                  <div className="w-10 h-10 shrink-0 flex items-center justify-center">
                    <div className="relative shrink-0 flex items-center justify-center">
                      <UserAvatar name={userFullName} role={role} size="sm" />
                      {isClient && clientProfileIncomplete && (
                        <span
                          className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#CC6600] ring-2 ring-[#010114]"
                          title="Profile setup required"
                        />
                      )}
                    </div>
                  </div>
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                side="right"
                align="end"
                sideOffset={12}
                className="w-64 p-2 bg-[#01142B] border border-white/15 shadow-2xl rounded-[2px] backdrop-blur-xl z-50"
              >
                {/* Header User Identity */}
                <div className="px-3 py-2.5 mb-1 flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-white truncate font-sans">
                      {userFullName}
                    </span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-[2px] text-[10px] font-mono uppercase bg-white/[0.08] text-white/70 border border-white/10 tracking-wider shrink-0">
                      {getRoleDisplayLabel(role)}
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
                    href={getProfileHref(role)}
                    className="flex items-center justify-between cursor-pointer w-full text-sm font-sans font-medium text-white/85 px-3 py-2.5 rounded-[2px] hover:bg-white/[0.06] hover:text-white transition-colors outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 border-0 ring-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {isClient ? (
                        <GraduationCap size={18} weight="fill" className="text-white/60 shrink-0" />
                      ) : (
                        <User size={18} weight="fill" className="text-white/60 shrink-0" />
                      )}
                      <span className="truncate">
                        {isClient ? "School & Profile" : "My Profile"}
                      </span>
                    </div>
                    {isClient && clientProfileIncomplete && (
                      <span className="text-[9px] font-mono font-bold text-[#FFA040] bg-[#CC6600]/20 border border-[#CC6600]/40 px-1.5 py-0.5 rounded-[2px] shrink-0 ml-2">
                        SETUP
                      </span>
                    )}
                  </Link>
                </DropdownMenuItem>

                {isInternal && (
                  <DropdownMenuItem asChild>
                    <Link
                      href="/dashboard/staff/hr"
                      className="flex items-center gap-3 cursor-pointer w-full text-sm font-sans font-medium text-white/85 px-3 py-2.5 rounded-[2px] hover:bg-white/[0.06] hover:text-white transition-colors outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 border-0 ring-0"
                    >
                      <CalendarCheck size={18} weight="fill" className="text-white/60 shrink-0" />
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
                    <SignOut size={18} weight="fill" className="text-red-400 shrink-0" />
                  )}
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenuRoot>
          ) : (
            <div ref={profileContainerRef} className="flex flex-col">
              <button
                type="button"
                onClick={() => setIsProfileExpanded((prev) => !prev)}
                className={`w-full flex items-center h-12 rounded-[2px] border transition-all duration-150 cursor-pointer outline-none focus:outline-none group text-left active:scale-[0.98] ${
                  isProfileExpanded
                    ? "bg-white/[0.08] border-white/15"
                    : "hover:bg-white/[0.06] border-transparent hover:border-white/10"
                }`}
                aria-label="User account menu"
                aria-expanded={isProfileExpanded}
              >
                {/* Avatar: Anchored on x = 34px axis (14px padding + 20px = 34px) */}
                <div className="w-10 h-10 shrink-0 flex items-center justify-center">
                  <div className="relative shrink-0 flex items-center justify-center">
                    <UserAvatar name={userFullName} role={role} size="sm" />
                    {isClient && clientProfileIncomplete && (
                      <span
                        className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#CC6600] ring-2 ring-[#010114]"
                        title="Profile setup required"
                      />
                    )}
                  </div>
                </div>

                {/* User Details & CaretDown Arrow */}
                <div className="flex items-center justify-between flex-1 min-w-0 ml-1.5 pr-2">
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-xs font-semibold text-white truncate font-sans group-hover:text-white transition-colors">
                      {userFullName}
                    </span>
                    <span className="text-[11px] text-white/40 truncate font-sans">
                      {getRoleDisplayLabel(role)}
                    </span>
                  </div>
                  <CaretDown
                    size={13}
                    weight="bold"
                    className={`shrink-0 ml-2 transition-transform duration-200 ${
                      isProfileExpanded
                        ? "rotate-180 text-white"
                        : "text-white/40 group-hover:text-white/70"
                    }`}
                  />
                </div>
              </button>

              {/* Accordion dropdown body that expands height */}
              <div
                className={`overflow-hidden transition-all duration-200 ease-in-out flex flex-col ${
                  isProfileExpanded
                    ? "max-h-96 opacity-100 mt-2 p-2 bg-[#01142B] border border-white/15 rounded-[2px]"
                    : "max-h-0 opacity-0 pointer-events-none p-0 border-0 m-0"
                }`}
              >
                {/* Header User Identity */}
                <div className="px-2.5 py-1.5 mb-1 flex flex-col gap-0.5 border-b border-white/[0.08] pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-white truncate font-sans">
                      {userFullName}
                    </span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-[2px] text-[10px] font-mono uppercase bg-white/[0.08] text-white/70 border border-white/10 tracking-wider shrink-0">
                      {getRoleDisplayLabel(role)}
                    </span>
                  </div>
                  <span className="text-[11px] font-sans font-normal text-white/50 truncate">
                    {userEmail}
                  </span>
                </div>

                {/* Profile Link */}
                <Link
                  href={getProfileHref(role)}
                  onClick={() => {
                    setIsProfileExpanded(false);
                    if (onClose) onClose();
                  }}
                  className="flex items-center justify-between cursor-pointer w-full text-xs font-sans font-medium text-white/85 px-2.5 py-2 rounded-[2px] hover:bg-white/[0.06] hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {isClient ? (
                      <GraduationCap size={16} weight="fill" className="text-white/60 shrink-0" />
                    ) : (
                      <User size={16} weight="fill" className="text-white/60 shrink-0" />
                    )}
                    <span className="truncate">
                      {isClient ? "School & Profile" : "My Profile"}
                    </span>
                  </div>
                  {isClient && clientProfileIncomplete && (
                    <span className="text-[9px] font-mono font-bold text-[#FFA040] bg-[#CC6600]/20 border border-[#CC6600]/40 px-1.5 py-0.5 rounded-[2px] shrink-0 ml-2">
                      SETUP
                    </span>
                  )}
                </Link>

                {/* Staff HR Link */}
                {isInternal && (
                  <Link
                    href="/dashboard/staff/hr"
                    onClick={() => {
                      setIsProfileExpanded(false);
                      if (onClose) onClose();
                    }}
                    className="flex items-center gap-2.5 cursor-pointer w-full text-xs font-sans font-medium text-white/85 px-2.5 py-2 rounded-[2px] hover:bg-white/[0.06] hover:text-white transition-colors"
                  >
                    <CalendarCheck size={16} weight="fill" className="text-white/60 shrink-0" />
                    <span>My HR & Timeclock</span>
                  </Link>
                )}

                <div className="my-1 border-t border-white/[0.08]" />

                {/* Logout Action */}
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileExpanded(false);
                    handleLogout();
                  }}
                  disabled={isLoggingOut}
                  className="flex items-center gap-2.5 cursor-pointer w-full text-xs font-sans font-semibold text-red-400 px-2.5 py-2 rounded-[2px] hover:bg-red-500/10 hover:text-red-300 transition-colors text-left"
                >
                  {isLoggingOut ? (
                    <span className="h-3.5 w-3.5 border-2 border-white/20 border-t-red-400 rounded-full animate-spin mr-1 shrink-0" />
                  ) : (
                    <SignOut size={16} weight="fill" className="text-red-400 shrink-0" />
                  )}
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* System Operational Status Badge */}
        <div
          className="h-8 px-3.5 border-t border-white/[0.08] flex items-center text-white/40 shrink-0 bg-white/[0.01] overflow-hidden"
          title={isCollapsed ? "System Operational v2.4.0" : undefined}
        >
          {/* Status Dot: Anchored on x = 34px axis */}
          <div className="w-10 h-full shrink-0 flex items-center justify-center">
            <span className="relative flex h-2 w-2 items-center justify-center shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
            </span>
          </div>

          {/* Status Text & Version: Smoothly fades in/out */}
          <div
            className={`flex items-center justify-between flex-1 min-w-0 whitespace-nowrap overflow-hidden transition-all duration-200 ${
              isCollapsed
                ? "max-w-0 opacity-0 pointer-events-none ml-0 pr-0"
                : "max-w-[200px] opacity-100 ml-1.5 pr-1"
            }`}
          >
            <span className="font-sans text-[10px] text-white/50 tracking-tight select-none truncate">
              System Operational
            </span>
            <span className="font-mono text-[9px] text-white/30 tracking-wider select-none ml-2 shrink-0">
              v2.4.0
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
