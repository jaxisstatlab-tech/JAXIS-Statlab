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
  CaretDown,
  User,
  GraduationCap,
  SignOut,
  CircleNotch,
  Trash,
  Plus,
  SidebarSimple,
  ArrowSquareOut,
} from "@phosphor-icons/react";
import { SITE_URL } from "@/lib/site";

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
  Trash: <Trash size={16} weight="fill" className="flex-shrink-0" />,
};

// ─── Role-Specific Navigation Definitions ─────────────────────────────────────

const ROLE_NAV_GROUPS: Record<string, NavGroup[]> = {
  // "Send a new study" is the orange button above these groups, not a nav row.
  CLIENT: [
    {
      groupTitle: "Workspace",
      items: [
        {
          label: "My studies",
          href: "/dashboard/client",
          icon: Icons.Overview,
        },
        {
          label: "Quotes",
          href: "/dashboard/client/quotations",
          icon: Icons.Invoice,
        },
        {
          label: "DefenseLab practice",
          href: "/dashboard/client/defenselab",
          icon: Icons.Terminal,
        },
      ],
    },
    {
      groupTitle: "Support",
      items: [
        {
          label: "Messages",
          href: "/dashboard/client/messages",
          icon: Icons.Feedback,
        },
        {
          label: "Revisions & help",
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
        {
          label: "Deleted Studies Ledger",
          href: "/dashboard/ceo/deleted-studies",
          icon: Icons.Trash,
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
        {
          label: "Deleted Studies Ledger",
          href: "/dashboard/ceo/deleted-studies",
          icon: Icons.Trash,
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
  // Collapse mode is strictly for desktop viewports.
  // When mobile drawer is open (isOpen === true), sidebar is always expanded.
  // On desktop (isOpen === false), collapse state is directly driven by propIsCollapsed with 0ms lag.
  const isCollapsed = !isOpen && propIsCollapsed;

  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const prevPathnameRef = useRef<string>(pathname);
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



  // Reset pending state once navigation completes (pathname changes to target or any new route)
  useEffect(() => {
    // If the URL pathname has transitioned to a new route, clear pending state immediately
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;
      setPendingHref(null);
      try {
        window.dispatchEvent(new CustomEvent("jaxis:navigating-end"));
      } catch {
        // Safe fallback
      }
      return;
    }

    if (pendingHref) {
      const isTargetRoute =
        pathname === pendingHref ||
        (pendingHref !== "/dashboard" &&
          pendingHref !== "/dashboard/admin" &&
          pendingHref !== "/dashboard/ceo" &&
          pendingHref !== "/dashboard/client" &&
          pendingHref !== "/dashboard/statistician" &&
          pendingHref !== "/dashboard/qa" &&
          pendingHref !== "/dashboard/finance" &&
          pathname.startsWith(pendingHref + "/")) ||
        (pendingHref === "/dashboard/client" &&
          pathname.startsWith("/dashboard/client/projects") &&
          !pathname.startsWith("/dashboard/client/projects/new"));

      if (isTargetRoute) {
        setPendingHref(null);
        try {
          window.dispatchEvent(new CustomEvent("jaxis:navigating-end"));
        } catch {
          // Safe fallback
        }
      }
    }
  }, [pathname, pendingHref]);

  // Safety watchdog: clear pending state ONLY if navigation takes longer than 20s (e.g. network failure)
  useEffect(() => {
    if (!pendingHref) return;
    const timeout = setTimeout(() => {
      setPendingHref(null);
      try {
        window.dispatchEvent(new CustomEvent("jaxis:navigating-end"));
      } catch {
        // Safe fallback
      }
    }, 20000);
    return () => clearTimeout(timeout);
  }, [pendingHref]);

  const handleNavClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
        return;
      }

      if (onClose) onClose();

      // Ignore duplicate rapid clicks if navigation to this exact route is already in flight
      if (pendingHref === href) {
        return;
      }

      // If already at this exact route and no route is pending, trigger a clean 800ms refresh pulse
      if (pathname === href && !pendingHref) {
        setPendingHref(href);
        router.refresh();
        setTimeout(() => setPendingHref(null), 800);
        return;
      }

      setPendingHref(href);
      try {
        window.dispatchEvent(
          new CustomEvent("jaxis:navigating-start", { detail: { href } })
        );
      } catch {
        // Safe fallback
      }
    },
    [onClose, pathname, pendingHref, router]
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

  const navGroups = ROLE_NAV_GROUPS[effectiveRole] || ROLE_NAV_GROUPS.ADMIN!;

  // Role home pages only match exactly; deeper pages match their own nav row.
  const matchesHref = (target: string, href: string) => {
    if (target === href) return true;
    if (href === "/dashboard/client") {
      return target.startsWith("/dashboard/client/projects") && !target.startsWith(NEW_STUDY_HREF);
    }
    return !ROLE_HOMES.has(href) && target.startsWith(href + "/");
  };

  const newStudyActive = pendingHref !== null ? pendingHref === NEW_STUDY_HREF : pathname.startsWith(NEW_STUDY_HREF);
  const closeAndNavigate = () => {
    setIsProfileExpanded(false);
    if (onClose) onClose();
  };

  return (
    <aside
      className={`
        fixed lg:static inset-y-0 left-0 z-50 lg:z-20
        h-full max-h-full bg-[#010114] border-r border-white/[0.08] flex flex-col
        select-none flex-shrink-0 overflow-hidden
        transition-transform duration-300 ease-in-out lg:transition-none
        w-64 lg:w-full
        ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        ${className}
      `}
    >
      {/* ── Header: logo + wordmark (matches the website nav) and the collapse toggle ── */}
      <div className="h-16 flex items-center justify-between gap-2 border-b border-white/[0.08] px-3.5 shrink-0 overflow-hidden">
        {isCollapsed ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="w-10 h-10 flex items-center justify-center rounded-[2px] hover:bg-white/[0.06] transition-colors shrink-0"
            aria-label="Expand sidebar"
            title="Expand sidebar (Ctrl+B)"
          >
            <Image src="/jaxislogo.png" alt="JAXIS StatLab" width={22} height={22} className="h-[22px] w-[22px]" priority />
          </button>
        ) : (
          <Link
            href="/dashboard"
            onClick={onClose}
            className="flex items-center gap-2.5 min-w-0 h-10 px-2.5 -ml-0.5 rounded-[2px] hover:bg-white/[0.04] transition-colors"
            aria-label="JAXIS StatLab workspace home"
          >
            <Image src="/jaxislogo.png" alt="" width={22} height={22} className="h-[22px] w-[22px] shrink-0" priority />
            <span className="font-sans text-[15px] font-semibold tracking-[-0.01em] text-white whitespace-nowrap">
              JAXIS <span className="font-normal text-white/60">StatLab</span>
            </span>
          </Link>
        )}

        {!isCollapsed && (
          <>
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden lg:flex w-8 h-8 items-center justify-center rounded-[2px] text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors shrink-0"
              aria-label="Collapse sidebar"
              title="Collapse sidebar (Ctrl+B)"
            >
              <SidebarSimple size={18} weight="fill" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex lg:hidden w-8 h-8 items-center justify-center rounded-[2px] text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors shrink-0"
              aria-label="Close navigation"
            >
              <X size={18} weight="bold" />
            </button>
          </>
        )}
      </div>

      {/* ── Primary action (clients): the same orange button as "Send your study" on the website ── */}
      {isClient && (
        <div className={`pt-4 shrink-0 ${isCollapsed ? "flex justify-center" : "px-3.5"}`}>
          <Link
            href={NEW_STUDY_HREF}
            onClick={(e) => handleNavClick(e, NEW_STUDY_HREF)}
            aria-current={newStudyActive ? "page" : undefined}
            title={isCollapsed ? "Send a new study" : undefined}
            className={`flex items-center justify-center gap-2 h-10 rounded-[2px] font-sans text-[13px] font-medium text-white transition-[background-color,transform] duration-150 ease-out active:scale-[0.97] ${
              newStudyActive ? "bg-[#B35900]" : "bg-[#CC6600] hover:bg-[#E67300]"
            } ${isCollapsed ? "w-10" : "w-full px-4"}`}
          >
            {pendingHref === NEW_STUDY_HREF ? (
              <CircleNotch size={16} weight="bold" className="animate-spin shrink-0" />
            ) : (
              <Plus size={16} weight="bold" className="shrink-0" />
            )}
            {!isCollapsed && <span className="whitespace-nowrap">Send a new study</span>}
          </Link>
        </div>
      )}

      {/* ── Navigation ── */}
      <div
        data-no-scrollbar
        className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden [scrollbar-width:none] ${
          isCollapsed ? "px-0 py-5" : "px-3.5 py-5"
        }`}
      >
        <nav aria-label="Sidebar navigation" className={`flex flex-col gap-6 ${isCollapsed ? "items-center" : ""}`}>
          {navGroups.map((group, gIdx) => (
            <div key={group.groupTitle} className={`flex flex-col gap-0.5 w-full ${isCollapsed ? "items-center" : ""}`}>
              {isCollapsed ? (
                gIdx > 0 && <span aria-hidden="true" className="mb-3 h-px w-6 bg-white/[0.1]" />
              ) : (
                <span className="mb-2 px-2.5 font-mono text-[11px] uppercase tracking-wider text-white/40 whitespace-nowrap">
                  {group.groupTitle.toLowerCase()}
                </span>
              )}

              {group.items.map((item) => {
                const isActive = matchesHref(pathname, item.href);
                const isPending = pendingHref !== null && matchesHref(pendingHref, item.href);
                const active = pendingHref !== null ? isPending : isActive;

                if (item.disabled) {
                  return (
                    <div
                      key={item.href + item.label}
                      title={`${item.label} (coming soon)`}
                      className={`flex items-center h-9 rounded-[2px] opacity-40 cursor-not-allowed ${
                        isCollapsed ? "w-10 justify-center" : "w-full gap-3 px-2.5"
                      }`}
                    >
                      <span className="text-white/40 flex items-center">{item.icon}</span>
                      {!isCollapsed && (
                        <>
                          <span className="font-sans text-[13px] text-white/50 truncate">{item.label}</span>
                          <span className="ml-auto font-mono text-[10px] uppercase text-white/40">{item.badge || "Soon"}</span>
                        </>
                      )}
                    </div>
                  );
                }

                const isMessagesLink = item.href.endsWith("/messages");
                const unread = isMessagesLink ? unreadMessagesCount : 0;

                return (
                  <Link
                    key={`${item.href}-${item.label}`}
                    href={item.href}
                    prefetch={true}
                    onMouseEnter={() => router.prefetch(item.href)}
                    onClick={(e) => handleNavClick(e, item.href)}
                    aria-current={isActive ? "page" : undefined}
                    title={
                      isCollapsed ? `${item.label}${unread > 0 ? ` (${unread} unread)` : ""}` : undefined
                    }
                    className={`group relative flex items-center h-9 rounded-[2px] transition-[background-color,color] duration-150 ease-out ${
                      isCollapsed ? "w-10 justify-center" : "w-full gap-3 px-2.5"
                    } ${active ? "bg-white/[0.08] text-white" : "text-white/60 hover:text-white hover:bg-white/[0.04]"}`}
                  >
                    <span
                      className={`flex items-center justify-center shrink-0 transition-colors duration-150 ${
                        active ? "text-white" : "text-white/40 group-hover:text-white/80"
                      }`}
                    >
                      {isCollapsed && isPending ? (
                        <CircleNotch size={16} weight="bold" className="animate-spin" />
                      ) : (
                        item.icon
                      )}
                    </span>

                    {isCollapsed ? (
                      unread > 0 && (
                        <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-[#CC6600]" aria-hidden="true" />
                      )
                    ) : (
                      <>
                        <span className={`font-sans text-[13px] truncate ${active ? "font-medium" : ""}`}>
                          {item.label}
                        </span>
                        <span className="ml-auto flex items-center shrink-0">
                          {isPending ? (
                            <CircleNotch size={14} weight="bold" className="animate-spin text-white/60" />
                          ) : unread > 0 ? (
                            <span
                              className="min-w-5 h-5 px-1.5 inline-flex items-center justify-center rounded-[2px] bg-[#CC6600] font-mono text-[11px] font-medium text-white"
                              aria-label={`${unread} unread`}
                            >
                              {unread > 99 ? "99+" : unread}
                            </span>
                          ) : item.count !== undefined && item.count > 0 ? (
                            <span className="min-w-5 h-5 px-1.5 inline-flex items-center justify-center rounded-[2px] bg-white/[0.06] font-mono text-[11px] text-white/60">
                              {item.count}
                            </span>
                          ) : item.badge ? (
                            <span
                              className={`font-mono text-[10px] uppercase px-1.5 py-0.5 rounded-[2px] border ${
                                BADGE_STYLES[item.badgeColor || "gray"]
                              }`}
                            >
                              {item.badge}
                            </span>
                          ) : null}
                        </span>
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* ── Footer: duty clock (staff), notifications, account ── */}
      <div className="flex flex-col gap-1 shrink-0 border-t border-white/[0.08] p-3.5">
        {isInternal && (
          <div className="pb-2.5 mb-1.5 border-b border-white/[0.08]">
            <DutyClockWidget userRole={role} initialActiveShift={initialActiveShift} isSidebarCollapsed={isCollapsed} />
          </div>
        )}

        <NotificationDrawer triggerVariant="row" isSidebarCollapsed={isCollapsed} side="right" align="end" />

        {isCollapsed ? (
          <DropdownMenuRoot>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="w-10 h-10 mx-auto flex items-center justify-center rounded-[2px] hover:bg-white/[0.06] transition-colors"
                aria-label="Account menu"
                title={`${userFullName} (${getRoleDisplayLabel(role)})`}
              >
                <AccountAvatar name={userFullName} role={role} needsSetup={isClient && clientProfileIncomplete} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="right"
              align="end"
              sideOffset={12}
              className="w-64 p-1.5 bg-[#07071C] border border-white/[0.1] rounded-[2px] z-50"
            >
              <AccountHeader name={userFullName} email={userEmail} role={role} />
              <DropdownMenuSeparator className="-mx-1.5 my-1.5 bg-white/[0.08]" />
              <DropdownMenuItem asChild>
                <Link href={getProfileHref(role)} className={MENU_ITEM}>
                  <ProfileRowContent isClient={isClient} needsSetup={isClient && clientProfileIncomplete} />
                </Link>
              </DropdownMenuItem>
              {isInternal && (
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/staff/hr" className={MENU_ITEM}>
                    <CalendarCheck size={16} weight="fill" className="text-white/50 shrink-0" />
                    <span>My HR & timeclock</span>
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild>
                <a href={SITE_URL} className={MENU_ITEM}>
                  <ArrowSquareOut size={16} weight="fill" className="text-white/50 shrink-0" />
                  <span>JAXIS website</span>
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="-mx-1.5 my-1.5 bg-white/[0.08]" />
              <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut} className={MENU_ITEM_DANGER}>
                <SignOutIcon loading={isLoggingOut} />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenuRoot>
        ) : (
          <div ref={profileContainerRef} className="flex flex-col">
            {/* Account menu opens upward, above the account row */}
            <div
              className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
                isProfileExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 pointer-events-none"
              }`}
              inert={!isProfileExpanded}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="mb-1.5 p-1.5 bg-[#07071C] border border-white/[0.1] rounded-[2px] flex flex-col">
                  <AccountHeader name={userFullName} email={userEmail} role={role} />
                  <div className="-mx-1.5 my-1.5 h-px bg-white/[0.08]" />
                  <Link href={getProfileHref(role)} onClick={closeAndNavigate} className={MENU_ITEM}>
                    <ProfileRowContent isClient={isClient} needsSetup={isClient && clientProfileIncomplete} />
                  </Link>
                  {isInternal && (
                    <Link href="/dashboard/staff/hr" onClick={closeAndNavigate} className={MENU_ITEM}>
                      <CalendarCheck size={16} weight="fill" className="text-white/50 shrink-0" />
                      <span>My HR & timeclock</span>
                    </Link>
                  )}
                  <a href={SITE_URL} className={MENU_ITEM}>
                    <ArrowSquareOut size={16} weight="fill" className="text-white/50 shrink-0" />
                    <span>JAXIS website</span>
                  </a>
                  <div className="-mx-1.5 my-1.5 h-px bg-white/[0.08]" />
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileExpanded(false);
                      handleLogout();
                    }}
                    disabled={isLoggingOut}
                    className={`${MENU_ITEM_DANGER} text-left`}
                  >
                    <SignOutIcon loading={isLoggingOut} />
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsProfileExpanded((prev) => !prev)}
              className={`w-full flex items-center gap-3 h-12 px-1.5 rounded-[2px] text-left transition-colors ${
                isProfileExpanded ? "bg-white/[0.08]" : "hover:bg-white/[0.04]"
              }`}
              aria-label="Account menu"
              aria-expanded={isProfileExpanded}
            >
              <AccountAvatar name={userFullName} role={role} needsSetup={isClient && clientProfileIncomplete} />
              <span className="flex flex-col min-w-0 flex-1">
                <span className="font-sans text-[13px] font-medium text-white truncate">{userFullName}</span>
                <span className="font-mono text-[11px] text-white/45 truncate">{getRoleDisplayLabel(role)}</span>
              </span>
              <CaretDown
                size={12}
                weight="bold"
                className={`shrink-0 mr-1 transition-transform duration-200 ${
                  isProfileExpanded ? "rotate-180 text-white" : "text-white/40"
                }`}
              />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

const NEW_STUDY_HREF = "/dashboard/client/projects/new";

const ROLE_HOMES = new Set([
  "/dashboard",
  "/dashboard/admin",
  "/dashboard/ceo",
  "/dashboard/client",
  "/dashboard/statistician",
  "/dashboard/qa",
  "/dashboard/finance",
]);

const MENU_ITEM =
  "flex items-center gap-2.5 w-full px-2.5 py-2 rounded-[2px] font-sans text-[13px] text-white/80 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer outline-none focus-visible:bg-white/[0.06]";
const MENU_ITEM_DANGER =
  "flex items-center gap-2.5 w-full px-2.5 py-2 rounded-[2px] font-sans text-[13px] font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer outline-none focus-visible:bg-red-500/10";

function AccountAvatar({ name, role, needsSetup }: { name: string; role?: string; needsSetup: boolean }) {
  return (
    <span className="relative shrink-0 flex items-center justify-center w-7">
      <UserAvatar name={name} role={role} size="sm" />
      {needsSetup && (
        <span
          className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#CC6600] ring-2 ring-[#010114]"
          title="Finish setting up your profile"
        />
      )}
    </span>
  );
}

function AccountHeader({ name, email, role }: { name: string; email: string; role?: string }) {
  return (
    <div className="px-2.5 py-2 flex flex-col gap-0.5 min-w-0">
      <span className="font-sans text-[13px] font-medium text-white truncate">{name}</span>
      <span className="font-mono text-[11px] text-white/45 truncate">{email}</span>
      <span className="mt-1 font-mono text-[10px] uppercase tracking-wider text-white/40">{getRoleDisplayLabel(role)}</span>
    </div>
  );
}

function ProfileRowContent({ isClient, needsSetup }: { isClient: boolean; needsSetup: boolean }) {
  return (
    <>
      {isClient ? (
        <GraduationCap size={16} weight="fill" className="text-white/50 shrink-0" />
      ) : (
        <User size={16} weight="fill" className="text-white/50 shrink-0" />
      )}
      <span className="truncate">{isClient ? "School & profile" : "My profile"}</span>
      {needsSetup && (
        <span className="ml-auto font-mono text-[10px] uppercase text-[#FFA040] border border-[#CC6600]/40 px-1.5 py-0.5 rounded-[2px] shrink-0">
          Set up
        </span>
      )}
    </>
  );
}

function SignOutIcon({ loading }: { loading: boolean }) {
  return loading ? (
    <CircleNotch size={16} weight="bold" className="animate-spin shrink-0" />
  ) : (
    <SignOut size={16} weight="fill" className="shrink-0" />
  );
}
