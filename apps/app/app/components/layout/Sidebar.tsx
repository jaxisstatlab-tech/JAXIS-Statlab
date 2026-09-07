"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import type { RoleName } from "@prisma/client";
import {
  IconLayoutDashboard,
  IconFiles,
  IconFilePlus,
  IconDatabase,
  IconReceipt,
  IconTerminal2,
  IconCode,
  IconCloudUpload,
  IconMessageReport,
  IconShieldCheck,
  IconClipboardCheck,
  IconAward,
  IconCoins,
  IconKey,
  IconUsers,
  IconShieldLock,
  IconActivity,
  IconClock,
  IconCalendarTime,
  IconX,
  IconFileInvoice,
  IconCalendarEvent,
  IconRotate,
  IconScale,
  IconArchive,
  IconChartBar,
  IconShieldExclamation,
  IconMailForward,
  IconGavel,
} from "@tabler/icons-react";

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
  className?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

// ─── Tabler Icons ───────────────────────────────────────────────────────────

const Icons = {
  Overview: <IconLayoutDashboard size={16} stroke={1.5} className="flex-shrink-0" />,
  Studies: <IconFiles size={16} stroke={1.5} className="flex-shrink-0" />,
  Intake: <IconFilePlus size={16} stroke={1.5} className="flex-shrink-0" />,
  Vault: <IconDatabase size={16} stroke={1.5} className="flex-shrink-0" />,
  Receipt: <IconReceipt size={16} stroke={1.5} className="flex-shrink-0" />,
  Invoice: <IconFileInvoice size={16} stroke={1.5} className="flex-shrink-0" />,
  Terminal: <IconTerminal2 size={16} stroke={1.5} className="flex-shrink-0" />,
  Scripts: <IconCode size={16} stroke={1.5} className="flex-shrink-0" />,
  UploadCloud: <IconCloudUpload size={16} stroke={1.5} className="flex-shrink-0" />,
  Feedback: <IconMessageReport size={16} stroke={1.5} className="flex-shrink-0" />,
  ShieldCheck: <IconShieldCheck size={16} stroke={1.5} className="flex-shrink-0" />,
  CheckQueue: <IconClipboardCheck size={16} stroke={1.5} className="flex-shrink-0" />,
  Award: <IconAward size={16} stroke={1.5} className="flex-shrink-0" />,
  FinanceVault: <IconCoins size={16} stroke={1.5} className="flex-shrink-0" />,
  KeyRelease: <IconKey size={16} stroke={1.5} className="flex-shrink-0" />,
  Users: <IconUsers size={16} stroke={1.5} className="flex-shrink-0" />,
  Audit: <IconShieldLock size={16} stroke={1.5} className="flex-shrink-0" />,
  Activity: <IconActivity size={16} stroke={1.5} className="flex-shrink-0" />,
  Clock: <IconClock size={16} stroke={1.5} className="flex-shrink-0" />,
  LeaveDesk: <IconCalendarTime size={16} stroke={1.5} className="flex-shrink-0" />,
  Schedule: <IconCalendarEvent size={16} stroke={1.5} className="flex-shrink-0" />,
  Revisions: <IconRotate size={16} stroke={1.5} className="flex-shrink-0" />,
  Claims: <IconScale size={16} stroke={1.5} className="flex-shrink-0" />,
  Archive: <IconArchive size={16} stroke={1.5} className="flex-shrink-0" />,
  Reports: <IconChartBar size={16} stroke={1.5} className="flex-shrink-0" />,
  Firewall: <IconShieldExclamation size={16} stroke={1.5} className="flex-shrink-0" />,
  Emails: <IconMailForward size={16} stroke={1.5} className="flex-shrink-0" />,
  Gavel: <IconGavel size={16} stroke={1.5} className="flex-shrink-0" />,
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
      groupTitle: "COMMUNICATION & ACCOUNT",
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
        {
          label: "School & Profile",
          href: "/dashboard/client/profile",
          icon: Icons.Users,
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
  userFullName = "User",
  userEmail = "",
  clientProfileIncomplete = false,
  className = "",
  isOpen = false,
  onClose,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const handleLogout = async () => {
    try {
      await signOut({
        callbackUrl: "/login",
        redirect: true,
      });
    } catch {
      window.location.href = "/login";
    }
  };

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
      // Allow browser native behavior for modified clicks (e.g. Cmd/Ctrl + Click to open new tab)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
        return;
      }

      if (onClose) onClose();

      // If already at this exact route and no other route is pending, ignore redundant click
      if (pathname === href && !pendingHref) {
        e.preventDefault();
        return;
      }

      // Optimistically activate the clicked tab immediately so the UI responds instantaneously (0ms)
      setPendingHref(href);
    },
    [onClose, pathname, pendingHref]
  );

  const normalizedRole = (role?.toUpperCase() || "ADMIN") as string;
  let effectiveRole = normalizedRole;
  if (normalizedRole === "QA" || normalizedRole === "SENIOR_QA_LEAD") {
    effectiveRole = "SENIOR_QA_LEAD";
  } else if (normalizedRole === "FINANCE" || normalizedRole === "FINANCE_OFFICER") {
    effectiveRole = "FINANCE_OFFICER";
  } else if (normalizedRole === "OPERATIONS_MANAGER" || normalizedRole === "OPERATIONS") {
    effectiveRole = "ADMIN";
  }
  let navGroups = ROLE_NAV_GROUPS[effectiveRole] || ROLE_NAV_GROUPS.ADMIN!;

  if (effectiveRole === "CLIENT" && clientProfileIncomplete) {
    navGroups = navGroups.map((group) => ({
      ...group,
      items: group.items.map((item) => {
        if (item.href === "/dashboard/client/profile") {
          return {
            ...item,
            badge: "1. START HERE",
            badgeColor: "orange" as const,
          };
        }
        if (item.href === "/dashboard/client/projects/new") {
          return {
            ...item,
            badge: "2. NEXT STEP",
            badgeColor: "amber" as const,
          };
        }
        return item;
      }),
    }));
  }

  return (
    <aside
      className={`
        fixed lg:static inset-y-0 left-0 z-50 lg:z-20
        w-[18.5rem] min-w-[18.5rem] max-w-[18.5rem] h-full max-h-full
        bg-[#010114] border-r border-white/[0.08] flex flex-col justify-between
        select-none flex-shrink-0 overflow-hidden
        transition-transform duration-200 ease-out shadow-2xl lg:shadow-none
        ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        ${className}
      `}
      style={{
        width: "18.5rem",
        minWidth: "18.5rem",
        maxWidth: "18.5rem",
        height: "100%",
        maxHeight: "100%",
        flexShrink: 0,
        backgroundColor: "#010114",
        borderRight: "1px solid rgba(255, 255, 255, 0.08)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* Top Navigation Sections */}
      <div
        className="p-4 sm:p-5 flex flex-col gap-5 overflow-y-auto flex-1 scrollbar-thin"
        style={{
          padding: "1.25rem 1rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
          overflowY: "auto",
          flex: 1,
        }}
      >
        {/* Mobile Header with Official Logo & Close Button */}
        <div className="flex lg:hidden items-center justify-between pb-3.5 border-b border-white/[0.08] -mt-1">
          <div className="flex items-center gap-2 font-sans">
            <Image
              src="/jaxislogo.png"
              alt="JAXIS Logo"
              width={22}
              height={22}
              className="h-5.5 w-auto"
            />
            <div className="flex items-baseline gap-1 font-sans">
              <span className="font-bold text-sm tracking-wider text-white">JAXIS</span>
              <span className="font-bold text-sm tracking-wider text-[#CC6600]">STATLAB</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
            aria-label="Close navigation"
          >
            <IconX size={18} stroke={1.5} />
          </button>
        </div>

        {/* Mobile User Identity & Session Card */}
        <div className="flex lg:hidden flex-col gap-2.5 p-3 rounded-[2px] bg-white/[0.03] border border-white/10 -mt-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-[2px] bg-[#011B38] border border-white/15 flex items-center justify-center font-sans text-xs text-white font-semibold shrink-0">
                {userFullName ? userFullName.charAt(0) : "U"}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-white truncate font-sans">
                  {userFullName}
                </span>
                <span className="text-[10px] text-white/40 truncate font-sans">
                  {userEmail}
                </span>
              </div>
            </div>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-[2px] text-[9px] font-mono uppercase bg-white/[0.08] text-white/70 border border-white/10 shrink-0">
              {getRoleDisplayLabel(effectiveRole)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 pt-2 border-t border-white/[0.08]">
            <Link
              href={getProfileHref(effectiveRole)}
              onClick={onClose}
              className="flex-1 py-1.5 px-2 rounded-[2px] bg-white/[0.04] hover:bg-white/[0.08] text-center text-[11px] font-sans font-medium text-white/80 transition-colors"
            >
              My Profile
            </Link>
            {effectiveRole !== "CLIENT" && (
              <Link
                href="/dashboard/staff/hr"
                onClick={onClose}
                className="flex-1 py-1.5 px-2 rounded-[2px] bg-white/[0.04] hover:bg-white/[0.08] text-center text-[11px] font-sans font-medium text-white/80 transition-colors"
              >
                HR &amp; Time
              </Link>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="py-1.5 px-2.5 rounded-[2px] bg-red-500/10 hover:bg-red-500/20 text-red-400 text-center text-[11px] font-sans font-semibold transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Navigation Groups */}
        <nav aria-label="Sidebar navigation" className="flex flex-col gap-4" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} className="flex flex-col gap-0.5" style={{ display: "flex", flexDirection: "column", gap: "0.125rem" }}>
              <span
                className="text-[10px] font-sans font-semibold tracking-wider text-white/40 px-3 uppercase mb-1 mt-1.5 select-none"
                style={{ paddingLeft: "0.75rem", paddingRight: "0.75rem", fontSize: "0.625rem" }}
              >
                {group.groupTitle}
              </span>
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
                  return (
                    <div
                      key={item.href + item.label}
                      className="flex items-center justify-between px-3 py-1.5 text-xs rounded-md select-none opacity-40 cursor-not-allowed border-l-2 border-transparent"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0.45rem 0.75rem",
                        borderRadius: "2px",
                        boxSizing: "border-box",
                        fontSize: "0.8125rem",
                      }}
                      title={`${item.label} (Under Active Development)`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                        <span className="text-white/30 flex-shrink-0">
                          {item.icon}
                        </span>
                        <span className="font-sans font-normal text-white/40 text-[0.8125rem] truncate" title={item.label}>
                          {item.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0 ml-auto">
                        <span
                          className="text-[10px] font-sans px-1.5 py-0.5 rounded-[2px] border font-medium flex-shrink-0 bg-white/[0.04] text-white/30 border-white/[0.08]"
                        >
                          {item.badge || "SOON"}
                        </span>
                      </div>
                    </div>
                  );
                }

                return (
                  <Link
                    key={`${item.href}-${item.label}`}
                    href={item.href}
                    prefetch={true}
                    onMouseEnter={() => {
                      router.prefetch(item.href);
                    }}
                    onClick={(e) => handleNavClick(e, item.href)}
                    className={`flex items-center justify-between px-3 py-1.5 text-xs font-medium rounded-r-[3px] rounded-l-[1px] transition-all duration-150 ease-out group border-l-2 ${
                      effectivelyActive
                        ? "bg-[#CC6600]/12 text-white font-semibold border-[#CC6600]"
                        : "border-transparent text-white/65 hover:text-white hover:bg-white/[0.04]"
                    }`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.45rem 0.75rem",
                      boxSizing: "border-box",
                      fontSize: "0.8125rem",
                    }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                      <span className={`${effectivelyActive ? "text-[#CC6600]" : "text-white/40 group-hover:text-white/80"} transition-colors flex-shrink-0`}>
                        {item.icon}
                      </span>
                      <span
                        className={`font-sans text-[0.8125rem] truncate ${effectivelyActive ? "font-semibold text-white" : "font-normal text-white/70 group-hover:text-white"}`}
                        title={item.label}
                      >
                        {item.label}
                      </span>
                    </div>

                    {/* Actionable Badges & Dynamic Counters */}
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-auto">
                      {isPendingActive && !isActive && (
                        <span
                          className="h-1.5 w-1.5 rounded-full bg-[#CC6600] animate-ping flex-shrink-0 mr-1"
                          title="Navigating..."
                        />
                      )}
                      {item.count !== undefined && item.count > 0 && (
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full flex-shrink-0 border leading-none ${
                            effectivelyActive
                              ? "bg-[#CC6600]/25 text-[#FFA040] border-[#CC6600]/40 font-bold"
                              : "bg-white/[0.06] text-white/60 border-white/10 group-hover:text-white"
                          }`}
                        >
                          {item.count}
                        </span>
                      )}
                      {item.badge && (
                        <span
                          className={`text-[10px] font-sans px-1.5 py-0.5 rounded-[2px] border font-semibold flex-shrink-0 tracking-wide uppercase ${
                            BADGE_STYLES[item.badgeColor || "indigo"]
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Sidebar Footer: System Status */}
      <div className="px-4 py-3 border-t border-white/[0.08] flex items-center justify-between text-white/40 flex-shrink-0 bg-white/[0.01]">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span className="font-sans text-[11px] text-white/50 tracking-tight">System Operational</span>
        </div>
        <span className="font-mono text-[10px] text-white/30 tracking-wider">v2.4.0</span>
      </div>
    </aside>
  );
};
