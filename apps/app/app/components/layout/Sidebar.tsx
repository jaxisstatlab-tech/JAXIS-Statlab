"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
  MagnifyingGlass,
  CaretLeft,
  CaretRight,
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
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  // Keyboard shortcut: "/" to focus search (and expand sidebar if collapsed), "Esc" to blur/clear
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)
      ) {
        e.preventDefault();
        if (isCollapsed && onToggleCollapse) {
          onToggleCollapse();
        }
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 60);
      } else if (
        e.key === "Escape" &&
        document.activeElement === searchInputRef.current
      ) {
        setSearchQuery("");
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCollapsed, onToggleCollapse]);

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

  // Live filter groups when user types in sidebar search box
  const filteredNavGroups = useMemo(() => {
    if (!searchQuery.trim()) return navGroups;
    const q = searchQuery.toLowerCase().trim();
    return navGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          item.label.toLowerCase().includes(q)
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [navGroups, searchQuery]);

  return (
    <aside
      className={`
        fixed lg:static inset-y-0 left-0 z-50 lg:z-20
        h-full max-h-full bg-[#010114] border-r border-white/[0.08] flex flex-col justify-between
        select-none flex-shrink-0 overflow-hidden
        transition-[width,transform] duration-300 ease-[cubic-bezier(0.2,0,0,1)] shadow-2xl lg:shadow-none
        ${isCollapsed ? "lg:w-[5rem] lg:min-w-[5rem] lg:max-w-[5rem]" : "lg:w-[17.5rem] lg:min-w-[17.5rem] lg:max-w-[17.5rem]"}
        w-[18rem]
        ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        ${className}
      `}
    >
      {/* Top Header & Navigation Container */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* ── 1. Header (Logo + Title + Opposing Caret Toggle < >) ── */}
        {isCollapsed ? (
          <div className="p-3.5 flex flex-col items-center justify-center border-b border-white/[0.08] shrink-0 gap-2.5">
            <button
              type="button"
              onClick={onToggleCollapse}
              className="flex items-center justify-center p-1 rounded-[2px] hover:bg-white/[0.08] transition-colors cursor-pointer group"
              title="Expand sidebar"
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
            <button
              type="button"
              onClick={onToggleCollapse}
              className="p-1 rounded-[2px] text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <CaretRight size={13} weight="bold" />
            </button>
          </div>
        ) : (
          <div className="px-4 py-4 sm:px-5 flex items-center justify-between border-b border-white/[0.08] shrink-0">
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <Image
                src="/jaxislogo.png"
                alt="JAXIS Logo"
                width={24}
                height={24}
                className="h-6 w-auto transition-transform group-hover:scale-105 shrink-0"
                priority
              />
              <div className="flex items-center gap-1.5 font-sans shrink-0">
                <span className="font-extrabold text-sm tracking-wider text-white">JAXIS</span>
                <span className="font-extrabold text-sm tracking-wider text-[#CC6600]">STATLAB</span>
                <span className="hidden sm:inline-flex items-center text-[0.625rem] font-sans uppercase px-1.5 py-0.2 rounded-[2px] bg-white/[0.08] border border-white/15 text-white/60 font-semibold tracking-wider ml-0.5">
                  Studio
                </span>
              </div>
            </Link>

            <div className="flex items-center gap-1">
              {/* Desktop Collapse Opposing Carets Toggle (< >) */}
              <button
                type="button"
                onClick={onToggleCollapse}
                className="hidden lg:flex items-center justify-center p-1.5 rounded-[2px] text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer border border-transparent hover:border-white/10"
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
              >
                <div className="flex items-center -space-x-1">
                  <CaretLeft size={11} weight="bold" />
                  <CaretRight size={11} weight="bold" />
                </div>
              </button>

              {/* Mobile Drawer Close Button */}
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
        )}

        {/* ── 2. Integrated Search Input (Dashdark X Standard) ── */}
        {isCollapsed ? (
          <div className="flex justify-center py-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (onToggleCollapse) onToggleCollapse();
                setTimeout(() => searchInputRef.current?.focus(), 100);
              }}
              className="h-9 w-9 rounded-[2px] bg-[#010D1F] border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/20 transition-colors cursor-pointer"
              title="Search (Press / or click to expand)"
            >
              <MagnifyingGlass size={14} weight="bold" />
            </button>
          </div>
        ) : (
          <div className="px-3.5 pt-3 pb-1 shrink-0">
            <div className="relative flex items-center">
              <MagnifyingGlass
                size={14}
                weight="bold"
                className="absolute left-2.5 text-white/40 pointer-events-none"
              />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search for..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-7 bg-[#010D1F] border border-white/10 rounded-[2px] text-xs font-sans text-white placeholder:text-white/30 focus:outline-none focus:border-[#CC6600]/70 transition-colors"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 text-white/40 hover:text-white p-0.5 cursor-pointer"
                  title="Clear search"
                >
                  <X size={12} weight="bold" />
                </button>
              ) : (
                <kbd className="absolute right-2 text-[10px] font-mono px-1 py-0.2 rounded bg-white/[0.06] text-white/40 border border-white/10 select-none">
                  /
                </kbd>
              )}
            </div>
          </div>
        )}

        {/* ── 3. Navigation Links List ── */}
        <div className="p-3 sm:p-3.5 flex flex-col gap-4 overflow-y-auto flex-1 scrollbar-thin">
          <nav aria-label="Sidebar navigation" className="flex flex-col gap-3">
            {filteredNavGroups.map((group, gIdx) => (
              <div key={gIdx} className="flex flex-col gap-0.5">
                {isCollapsed ? (
                  gIdx > 0 && <div className="my-1.5 border-t border-white/[0.08] mx-2" />
                ) : (
                  <span className="text-[10px] font-sans font-semibold tracking-wider text-white/40 px-3 uppercase mb-1 mt-1 select-none">
                    {group.groupTitle}
                  </span>
                )}

                {group.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/dashboard" &&
                      item.href !== "/dashboard/admin" &&
                      item.href !== "/dashboard/ceo" &&
                      item.href !== "/dashboard/client" &&
                      item.href !== "/dashboard/statistician" &&
                      item.href !== "/dashboard/qa" &&
                      item.href !== "/dashboard/finance" &&
                      pathname.startsWith(item.href + "/"));

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
                    if (isCollapsed) {
                      return (
                        <div
                          key={item.href + item.label}
                          className="flex items-center justify-center h-10 w-10 mx-auto rounded-[2px] opacity-30 cursor-not-allowed text-white/40"
                          title={`${item.label} (Coming Soon)`}
                        >
                          {item.icon}
                        </div>
                      );
                    }

                    return (
                      <div
                        key={item.href + item.label}
                        className="flex items-center justify-between px-3 py-1.5 text-xs rounded-[2px] select-none opacity-40 cursor-not-allowed border-l-2 border-transparent"
                        title={`${item.label} (Under Active Development)`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                          <span className="text-white/30 flex-shrink-0">
                            {item.icon}
                          </span>
                          <span className="font-sans font-normal text-white/40 text-[0.8125rem] truncate">
                            {item.label}
                          </span>
                        </div>
                        <span className="text-[10px] font-sans px-1.5 py-0.5 rounded-[2px] border font-medium bg-white/[0.04] text-white/30 border-white/[0.08]">
                          {item.badge || "SOON"}
                        </span>
                      </div>
                    );
                  }

                  const isMessagesLink =
                    item.label === "Messages" || item.href.endsWith("/messages");
                  const hasNewMessages = isMessagesLink && unreadMessagesCount > 0;

                  // Collapsed Icon Rail Link
                  if (isCollapsed) {
                    return (
                      <Link
                        key={`${item.href}-${item.label}`}
                        href={item.href}
                        prefetch={true}
                        onMouseEnter={() => router.prefetch(item.href)}
                        onClick={(e) => handleNavClick(e, item.href)}
                        className={`relative flex items-center justify-center h-10 w-10 mx-auto rounded-[2px] transition-all duration-150 group border ${
                          effectivelyActive
                            ? "bg-[#CC6600]/15 text-[#FFA040] border-[#CC6600]/40 shadow-sm"
                            : hasNewMessages
                            ? "border-[#CC6600]/40 bg-[#CC6600]/[0.08] text-[#FFA040]"
                            : "border-transparent text-white/50 hover:text-white hover:bg-white/[0.06]"
                        }`}
                        title={`${item.label}${item.count ? ` (${item.count})` : ""}${hasNewMessages ? ` (${unreadMessagesCount} new)` : ""}`}
                      >
                        <span className="flex-shrink-0">
                          {item.icon}
                        </span>
                        {hasNewMessages && (
                          <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#CC6600] opacity-80" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#CC6600]" />
                          </span>
                        )}
                        {!hasNewMessages && item.count !== undefined && item.count > 0 && (
                          <span className="absolute -top-1 -right-1 min-w-[15px] h-3.5 px-0.5 rounded-[2px] bg-white/10 text-white font-mono text-[9px] font-bold flex items-center justify-center border border-white/20">
                            {item.count}
                          </span>
                        )}
                      </Link>
                    );
                  }

                  // Expanded Nav Item Link (Icon + Label + Chevron >)
                  return (
                    <Link
                      key={`${item.href}-${item.label}`}
                      href={item.href}
                      prefetch={true}
                      onMouseEnter={() => router.prefetch(item.href)}
                      onClick={(e) => handleNavClick(e, item.href)}
                      className={`flex items-center justify-between px-3 py-2 text-xs font-medium rounded-[2px] transition-all duration-150 ease-out group border-l-2 active:scale-[0.98] ${
                        effectivelyActive
                          ? "bg-[#CC6600]/12 text-white font-semibold border-[#CC6600]"
                          : hasNewMessages
                          ? "border-[#CC6600] bg-[#CC6600]/[0.08] text-white hover:bg-[#CC6600]/[0.14]"
                          : "border-transparent text-white/65 hover:text-white hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                        <span
                          className={`${
                            effectivelyActive
                              ? "text-[#CC6600]"
                              : hasNewMessages
                              ? "text-[#FFA040]"
                              : "text-white/40 group-hover:text-white/80"
                          } transition-colors flex-shrink-0`}
                        >
                          {item.icon}
                        </span>
                        <span
                          className={`font-sans text-[0.8125rem] truncate ${
                            effectivelyActive
                              ? "font-semibold text-white"
                              : hasNewMessages
                              ? "font-semibold text-white"
                              : "font-normal text-white/70 group-hover:text-white"
                          }`}
                          title={item.label}
                        >
                          {item.label}
                        </span>
                      </div>

                      {/* Badges / Dynamic Counters / Right Caret */}
                      <div className="flex items-center gap-1.5 flex-shrink-0 ml-auto">
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
                        ) : (
                          <CaretRight
                            size={11}
                            weight="bold"
                            className={`text-white/20 group-hover:text-white/50 transition-transform duration-150 group-hover:translate-x-0.5 ${
                              effectivelyActive ? "text-[#CC6600]/70" : ""
                            }`}
                          />
                        )}
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
      <div className="flex flex-col shrink-0 border-t border-white/[0.08] bg-[#010D1F]/60">
        {/* Operational Strip: Notifications & Duty Clock */}
        {isCollapsed ? (
          <div className="py-2.5 flex flex-col items-center gap-2 border-b border-white/[0.08]">
            <NotificationDrawer />
            {isInternal && (
              <DutyClockWidget userRole={role} initialActiveShift={initialActiveShift} />
            )}
          </div>
        ) : (
          <div className="px-3.5 py-2.5 flex items-center justify-between gap-2 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <NotificationDrawer />
              <span className="text-xs font-sans text-white/50">Alerts</span>
            </div>
            {isInternal && (
              <DutyClockWidget userRole={role} initialActiveShift={initialActiveShift} />
            )}
          </div>
        )}

        {/* User Identity Card with Popover Dropdown Menu */}
        <div className="p-2">
          <DropdownMenuRoot>
            <DropdownMenuTrigger asChild>
              {isCollapsed ? (
                <button
                  type="button"
                  className="w-full flex items-center justify-center p-1.5 rounded-[2px] hover:bg-white/[0.08] transition-colors cursor-pointer outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 border-0 ring-0 group"
                  aria-label="User account menu"
                  title={`${userFullName} (${getRoleDisplayLabel(role)})`}
                >
                  <div className="relative shrink-0">
                    <UserAvatar
                      name={userFullName}
                      role={role}
                      size="sm"
                    />
                    {isClient && clientProfileIncomplete && (
                      <span
                        className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#CC6600] ring-2 ring-[#010114]"
                        title="Profile setup required"
                      />
                    )}
                  </div>
                </button>
              ) : (
                <button
                  type="button"
                  className="w-full flex items-center justify-between p-2 rounded-[2px] hover:bg-white/[0.06] transition-colors cursor-pointer outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 border-0 ring-0 group text-left"
                  aria-label="User account menu"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-1">
                    <div className="relative shrink-0">
                      <UserAvatar
                        name={userFullName}
                        role={role}
                        size="sm"
                      />
                      {isClient && clientProfileIncomplete && (
                        <span
                          className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#CC6600] ring-2 ring-[#010114]"
                          title="Profile setup required"
                        />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-xs font-semibold text-white truncate font-sans">
                        {userFullName}
                      </span>
                      <span className="text-[11px] text-white/40 truncate font-sans">
                        {getRoleDisplayLabel(role)}
                      </span>
                    </div>
                  </div>
                  <CaretRight
                    size={13}
                    weight="bold"
                    className="text-white/30 group-hover:text-white/70 transition-colors shrink-0"
                  />
                </button>
              )}
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
        </div>

        {/* System Operational Status Badge */}
        {isCollapsed ? (
          <div
            className="py-2 border-t border-white/[0.08] flex items-center justify-center text-white/40 shrink-0"
            title="System Operational v2.4.0"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </div>
        ) : (
          <div className="px-3.5 py-2 border-t border-white/[0.08] flex items-center justify-between text-white/40 shrink-0 bg-white/[0.01]">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="font-sans text-[10px] text-white/50 tracking-tight">System Operational</span>
            </div>
            <span className="font-mono text-[9px] text-white/30 tracking-wider">v2.4.0</span>
          </div>
        )}
      </div>
    </aside>
  );
};
