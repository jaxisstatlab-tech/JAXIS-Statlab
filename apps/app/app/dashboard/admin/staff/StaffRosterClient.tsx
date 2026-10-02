"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  PageHeader,
  Button,
  Modal,
  FormInput,
  FormSelect,
  FormTextarea,
  KpiCard,
  TagsOverflow,
  DropdownMenu,
  Toast,
  Pagination,
  CopyButton,
} from "@repo/ui";
import {
  CalendarBlank,
  ChartBar,
  Check,
  Copy,
  Eye,
  MagnifyingGlass,
  PauseCircle,
  PlayCircle,
  Plus,
  ShieldCheck,
  Trash,
  UserMinus,
  UsersThree,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import {
  getStaffRoster,
  getStaffDetail,
  provisionStaff,
  suspendStaff,
  liftSuspension,
  terminateStaff,
  requestLeave,
  returnFromLeave,
  approveLeave,
  rejectLeave,
} from "@/features/staff/actions";
import { findAccountByEmail, deleteAccount, type AccountSummary } from "@/features/accounts/actions";
import { PendingLeaveQueue } from "@/features/staff/components/PendingLeaveQueue";
import { Panel, PanelHeader } from "@/components/dashboard/Panel";
import { STANDARD_SPECIALIZATIONS, type StaffRole, type StaffListItem, type StaffDetailItem } from "@/features/staff/schemas";
import { ViolationType } from "@prisma/client";

// Staff Directory (admins and the CEO): everyone on the team, their role and status, and what can be done
// with each account. The whole list loads once and the filters work on it, so the numbers on top never shift.

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  FINANCE_OFFICER: "Finance",
  STATISTICIAN: "Analyst",
  SENIOR_QA_LEAD: "Reviewer",
  CEO: "CEO",
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Active",
  LEAVE_PENDING: "Asked for leave",
  ON_LEAVE: "On leave",
  SUSPENDED: "Suspended",
  TERMINATED: "Access removed",
};

const VIOLATION_OPTIONS = [
  { value: "POLICY_VIOLATION", label: "Broke a work rule" },
  { value: "ETHICAL_BREACH", label: "Ethics problem" },
  { value: "DIRECT_PAYMENT_BYPASS", label: "Took payment outside JAXIS" },
  { value: "DATA_FALSIFICATION", label: "Made up or changed data" },
  { value: "GHOSTWRITING", label: "Wrote a client's paper for them" },
];

const LEAVE_REASONS = [
  { label: "Sick leave", text: "Sick leave." },
  { label: "Vacation", text: "Vacation." },
  { label: "Conference or training", text: "Away for a conference or training." },
  { label: "Family emergency", text: "Family emergency." },
  { label: "Paused by admin", text: "Paused from new studies by an admin." },
];

type StatusTab = "ALL" | "ACTIVE" | "AWAY" | "LEAVE_PENDING" | "SUSPENDED" | "TERMINATED";

const TABS: Array<{ value: StatusTab; label: string; match: (s: StaffListItem) => boolean }> = [
  { value: "ALL", label: "Everyone", match: (s) => s.status !== "TERMINATED" },
  { value: "ACTIVE", label: "Active", match: (s) => s.status === "ACTIVE" },
  { value: "LEAVE_PENDING", label: "Asked for leave", match: (s) => s.status === "LEAVE_PENDING" },
  { value: "AWAY", label: "On leave", match: (s) => s.status === "ON_LEAVE" },
  { value: "SUSPENDED", label: "Suspended", match: (s) => s.status === "SUSPENDED" },
  { value: "TERMINATED", label: "Access removed", match: (s) => s.status === "TERMINATED" },
];

type ToastState = { message: string; description?: string; variant: "info" | "success" | "warning" | "danger" } | null;

function shortDate(value?: Date | string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric" });
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

function todayInput() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(input: string, days: number) {
  const d = new Date(input);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0]!;
}

interface StaffRosterClientProps {
  initialStaff?: StaffListItem[];
  initialCurrentUserRole?: string;
}

export function StaffRosterClient({ initialStaff = [], initialCurrentUserRole = "ADMIN" }: StaffRosterClientProps) {
  const isCeo = initialCurrentUserRole === "CEO";
  const [staff, setStaff] = useState<StaffListItem[]>(initialStaff);
  const [tab, setTab] = useState<StatusTab>("ALL");
  const [role, setRole] = useState<string>("ALL");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<ToastState>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Which window is open, and for whom.
  const [target, setTarget] = useState<StaffListItem | null>(null);
  const [dialog, setDialog] = useState<null | "details" | "suspend" | "terminate" | "leave" | "delete">(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [created, setCreated] = useState<{ id: string; email: string; fullName: string; role: string; temporaryPassword: string } | null>(null);

  const reload = useCallback(async () => {
    try {
      const res = await getStaffRoster({ role: "ALL", status: "ALL", search: "" });
      if (res.success) setStaff(res.data);
    } catch {
      setToast({ message: "Couldn't refresh the list", description: "Check your connection and try again.", variant: "danger" });
    }
  }, []);

  useEffect(() => {
    if (initialStaff.length === 0) reload();
  }, [initialStaff.length, reload]);

  // "/" jumps to search; Esc clears it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const counts = useMemo(() => {
    const by = (r: string) => staff.filter((s) => s.role === r && s.status !== "TERMINATED").length;
    return {
      team: staff.filter((s) => s.status !== "TERMINATED").length,
      active: staff.filter((s) => s.status === "ACTIVE").length,
      analysts: by("STATISTICIAN"),
      reviewers: by("SENIOR_QA_LEAD"),
      away: staff.filter((s) => s.status === "ON_LEAVE" || s.status === "LEAVE_PENDING").length,
      suspended: staff.filter((s) => s.status === "SUSPENDED").length,
      tabs: Object.fromEntries(TABS.map((t) => [t.value, staff.filter(t.match).length])) as Record<StatusTab, number>,
    };
  }, [staff]);

  const rows = useMemo(() => {
    const match = TABS.find((t) => t.value === tab)!.match;
    const q = query.trim().toLowerCase();
    return staff
      .filter(match)
      .filter((s) => role === "ALL" || s.role === role)
      .filter(
        (s) =>
          !q ||
          s.fullName.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          s.specializations.some((sp) => sp.toLowerCase().includes(q))
      )
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [staff, tab, role, query]);

  const shown = rows.slice((page - 1) * pageSize, page * pageSize);

  const open = (s: StaffListItem, which: NonNullable<typeof dialog>) => {
    setTarget(s);
    setDialog(which);
  };
  const close = () => setDialog(null);

  const quickAction = (s: StaffListItem, run: () => Promise<{ success: boolean; error?: { message: string } }>, done: ToastState) => {
    startTransition(async () => {
      const res = await run();
      if (!res.success) {
        setToast({ message: "That didn't work", description: res.error?.message, variant: "danger" });
        return;
      }
      window.dispatchEvent(new CustomEvent("leave-status-updated"));
      window.dispatchEvent(new CustomEvent("shift-status-updated"));
      setToast(done);
      reload();
    });
  };

  const menuFor = (s: StaffListItem) => [
    { label: "View details", icon: <Eye size={16} weight="fill" />, onClick: () => open(s, "details") },
    ...(s.status === "ACTIVE"
      ? [
          {
            dividerBefore: true,
            label: "Put on leave",
            subtitle: "No new studies while away",
            icon: <CalendarBlank size={16} weight="fill" />,
            onClick: () => open(s, "leave"),
          },
          {
            label: "Suspend",
            subtitle: "Can't sign in until you lift it",
            variant: "warning" as const,
            icon: <PauseCircle size={16} weight="fill" />,
            onClick: () => open(s, "suspend"),
          },
        ]
      : []),
    ...(s.status === "LEAVE_PENDING"
      ? [
          {
            dividerBefore: true,
            label: "Approve leave",
            variant: "success" as const,
            icon: <Check size={16} weight="bold" />,
            onClick: () =>
              quickAction(s, () => approveLeave(s.id), {
                message: "Leave approved",
                description: `${s.fullName} won't get new studies while away.`,
                variant: "success",
              }),
          },
          {
            label: "Decline leave",
            icon: <X size={16} weight="bold" />,
            onClick: () =>
              quickAction(s, () => rejectLeave(s.id), {
                message: "Leave declined",
                description: `${s.fullName} stays active.`,
                variant: "info",
              }),
          },
        ]
      : []),
    ...(s.status === "ON_LEAVE"
      ? [
          {
            dividerBefore: true,
            label: "End leave",
            subtitle: "Back to active",
            icon: <PlayCircle size={16} weight="fill" />,
            onClick: () =>
              quickAction(s, () => returnFromLeave(s.id), {
                message: "Leave ended",
                description: `${s.fullName} is active again and can get new studies.`,
                variant: "success",
              }),
          },
        ]
      : []),
    ...(s.status === "SUSPENDED"
      ? [
          {
            dividerBefore: true,
            label: "Lift suspension",
            subtitle: "Can sign in again",
            icon: <PlayCircle size={16} weight="fill" />,
            onClick: () =>
              quickAction(s, () => liftSuspension(s.id), {
                message: "Suspension lifted",
                description: `${s.fullName} can sign in again.`,
                variant: "success",
              }),
          },
        ]
      : []),
    ...(isCeo && s.status !== "TERMINATED"
      ? [
          {
            dividerBefore: true,
            label: "Remove access",
            subtitle: "Keeps the account on record",
            variant: "danger" as const,
            icon: <UserMinus size={16} weight="fill" />,
            onClick: () => open(s, "terminate"),
          },
        ]
      : []),
    ...(isCeo
      ? [
          {
            dividerBefore: s.status === "TERMINATED",
            label: "Delete account",
            subtitle: "Frees the email to add again",
            variant: "danger" as const,
            icon: <Trash size={16} weight="fill" />,
            onClick: () => open(s, "delete"),
          },
        ]
      : []),
  ];

  const clearFilters = () => {
    setTab("ALL");
    setRole("ALL");
    setQuery("");
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-24 w-full animate-content-fade">
      <PageHeader
        title="Staff Directory"
        description={
          counts.away + counts.suspended > 0
            ? `${counts.active} of ${counts.team} people are active. ${counts.away} on leave or asking, ${counts.suspended} suspended.`
            : `Everyone on the team, their role, and what they do. ${counts.active} of ${counts.team} are active.`
        }
        breadcrumbs={[{ label: "WORKSPACE", href: "/dashboard" }, { label: "Staff Directory" }]}
        actions={
          <Button variant="primary" size="sm" onClick={() => setIsAddOpen(true)} className="gap-1.5 active:scale-[0.97]">
            <Plus size={15} weight="bold" />
            Add Staff
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Team"
          description="Everyone with access"
          icon={<UsersThree size={18} weight="fill" />}
          value={counts.team}
          badge={`${counts.active} active`}
        />
        <KpiCard label="Analysts" description="Run the analysis" icon={<ChartBar size={18} weight="fill" />} value={counts.analysts} />
        <KpiCard label="Reviewers" description="Check the work before delivery" icon={<ShieldCheck size={18} weight="fill" />} value={counts.reviewers} />
        <KpiCard
          label="Away or suspended"
          description={`${counts.away} on leave or asking · ${counts.suspended} suspended`}
          icon={<PauseCircle size={18} weight="fill" />}
          value={counts.away + counts.suspended}
        />
      </div>

      <PendingLeaveQueue onStatusChange={reload} title="Leave requests" subtitle="Staff waiting for an answer about time off." />

      <Panel>
        <PanelHeader title="Team" count={counts.team} subtitle="Open someone to see their details, or use the menu to change their status." />

        <div className="mt-4 flex flex-col gap-3 px-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="-mx-1 flex items-center gap-1 overflow-x-auto px-1 [scrollbar-width:none]" role="tablist" aria-label="Show staff">
            {TABS.filter((t) => t.value === "ALL" || counts.tabs[t.value] > 0 || t.value === tab).map((t) => {
              const active = tab === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setTab(t.value);
                    setPage(1);
                  }}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-[2px] px-3 py-1.5 font-sans text-[13px] transition-colors ${
                    active ? "bg-white/[0.08] font-medium text-white" : "text-white/55 hover:text-white"
                  }`}
                >
                  {t.label}
                  <span className={`font-mono text-[11px] ${active ? "text-white/60" : "text-white/35"}`}>{counts.tabs[t.value]}</span>
                </button>
              );
            })}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setPage(1);
              }}
              aria-label="Role"
              className="h-9 rounded-[2px] border border-white/10 bg-[#050513] px-3 font-sans text-[13px] text-white outline-none focus:border-[#CC6600]/60"
            >
              <option value="ALL">All roles</option>
              <option value="STATISTICIAN">Analysts</option>
              <option value="SENIOR_QA_LEAD">Reviewers</option>
              <option value="FINANCE_OFFICER">Finance</option>
              <option value="ADMIN">Admins</option>
            </select>
            <label className="relative flex w-full items-center sm:w-64">
              <MagnifyingGlass size={14} weight="bold" className="pointer-events-none absolute left-3 text-white/35" />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setQuery("");
                    e.currentTarget.blur();
                  }
                }}
                placeholder="Search name, email, or skill"
                aria-label="Search staff"
                className="h-9 w-full rounded-[2px] border border-white/10 bg-[#050513] pl-8 pr-9 font-sans text-[13px] text-white outline-none placeholder:text-white/35 focus:border-[#CC6600]/60"
              />
              <kbd className="pointer-events-none absolute right-2.5 rounded-[2px] border border-white/15 px-1.5 font-mono text-[10px] text-white/40">/</kbd>
            </label>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <p className="text-sm text-white/60">{staff.length === 0 ? "No staff yet. Add your first team member." : "Nobody matches."}</p>
            {staff.length > 0 ? (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            <ul className="mt-4 divide-y divide-white/[0.05] border-t border-white/[0.06] md:hidden">
              {shown.map((s) => (
                <li key={s.id} className="flex items-start gap-3 px-5 py-4">
                  <Avatar name={s.fullName} />
                  <div className="min-w-0 flex-1">
                    <button type="button" onClick={() => open(s, "details")} className="text-left text-sm font-medium text-white">
                      {s.fullName}
                    </button>
                    <p className="truncate text-[12px] text-white/45">{s.email}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <RoleTag role={s.role} />
                      <StatusText status={s.status} />
                    </div>
                  </div>
                  <DropdownMenu items={menuFor(s)} align="end" />
                </li>
              ))}
            </ul>
            <div className="mt-4 hidden overflow-x-auto border-t border-white/[0.06] md:block">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-white/40">
                    <th className="px-6 py-2.5 font-medium">Name</th>
                    <th className="px-3 py-2.5 font-medium">Role</th>
                    <th className="px-3 py-2.5 font-medium">Skills</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                    <th className="px-3 py-2.5 font-medium">Joined</th>
                    <th className="px-6 py-2.5" aria-label="Actions" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {shown.map((s) => (
                    <tr key={s.id} className="group transition-colors hover:bg-white/[0.02]">
                      <td className="max-w-[300px] px-6 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={s.fullName} />
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => open(s, "details")}
                              className="block truncate text-left text-sm font-medium text-white hover:underline hover:decoration-white/30 hover:underline-offset-4"
                            >
                              {s.fullName}
                            </button>
                            <p className="truncate text-[12px] text-white/45">{s.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        <RoleTag role={s.role} />
                      </td>
                      <td className="px-3 py-3">
                        <TagsOverflow tags={s.specializations} limit={2} title="Other skills" emptyText="—" />
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        <StatusText status={s.status} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-[13px] text-white/55">{shortDate(s.joinedAt)}</td>
                      <td className="whitespace-nowrap px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => open(s, "details")} className="active:scale-[0.97]">
                            View
                          </Button>
                          <DropdownMenu items={menuFor(s)} align="end" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={page}
              totalItems={rows.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(n) => {
                setPageSize(n);
                setPage(1);
              }}
              itemLabel="people"
            />
          </>
        )}
      </Panel>

      {target && dialog === "details" ? <DetailsDialog staff={target} onClose={close} /> : null}

      {target && dialog === "suspend" ? (
        <ReasonDialog
          title={`Suspend ${target.fullName}?`}
          description="They can't sign in until you lift the suspension. Their open studies are flagged so an admin can check them."
          confirmLabel="Suspend Account"
          withViolation="optional"
          busy={isPending}
          onClose={close}
          onConfirm={(reason, violation) =>
            startTransition(async () => {
              const res = await suspendStaff(target.id, { reason, violationType: violation ? (violation as ViolationType) : undefined });
              if (!res.success) return setToast({ message: "Couldn't suspend", description: res.error.message, variant: "danger" });
              close();
              setToast({ message: "Account suspended", description: `${target.fullName} can't sign in until you lift it.`, variant: "warning" });
              reload();
            })
          }
        />
      ) : null}

      {target && dialog === "terminate" ? (
        <ReasonDialog
          title={`Remove ${target.fullName}'s access?`}
          description="They can't sign in again. The account stays on record with its email, so the same email can't be added as someone new. To free the email, use Delete account instead. Their open studies need a new analyst or reviewer."
          confirmLabel="Remove Access"
          withViolation="required"
          withForfeit
          busy={isPending}
          onClose={close}
          onConfirm={(reason, violation, forfeit) =>
            startTransition(async () => {
              const res = await terminateStaff(target.id, {
                reason,
                violationType: (violation || "POLICY_VIOLATION") as ViolationType,
                forfeitPayouts: Boolean(forfeit),
              });
              if (!res.success) return setToast({ message: "Couldn't remove access", description: res.error.message, variant: "danger" });
              close();
              setToast({ message: "Access removed", description: `${target.fullName} can't sign in anymore.`, variant: "warning" });
              reload();
            })
          }
        />
      ) : null}

      {target && dialog === "leave" ? (
        <LeaveDialog
          staff={target}
          busy={isPending}
          onClose={close}
          onConfirm={(reason, from, until) =>
            startTransition(async () => {
              const res = await requestLeave({
                userId: target.id,
                reason,
                leaveFrom: new Date(from).toISOString(),
                leaveUntil: new Date(until).toISOString(),
              });
              if (!res.success) return setToast({ message: "Couldn't put on leave", description: res.error.message, variant: "danger" });
              close();
              window.dispatchEvent(new CustomEvent("leave-status-updated"));
              setToast({ message: "On leave", description: `${target.fullName} won't get new studies until ${shortDate(until)}.`, variant: "success" });
              reload();
            })
          }
        />
      ) : null}

      {target && dialog === "delete" ? (
        <DeleteDialog
          staff={target}
          onClose={close}
          onDeleted={(name, email) => {
            close();
            setStaff((prev) => prev.filter((p) => p.id !== target.id));
            setToast({ message: "Account deleted", description: `${name} can't sign in anymore. ${email} is free to add again.`, variant: "success" });
            reload();
          }}
        />
      ) : null}

      {isAddOpen ? (
        <AddStaffDialog
          isCeo={isCeo}
          onClose={() => setIsAddOpen(false)}
          onCreated={(data) => {
            setIsAddOpen(false);
            setCreated(data);
            setToast({ message: "Account created", description: `Copy ${data.fullName}'s temporary password before you close it.`, variant: "success" });
            reload();
          }}
        />
      ) : null}

      {created ? <CreatedDialog data={created} onClose={() => setCreated(null)} onCopied={() => setToast({ message: "Sign-in details copied", variant: "info" })} /> : null}

      {toast ? <Toast message={toast.message} description={toast.description} variant={toast.variant} onClose={() => setToast(null)} /> : null}
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[2px] border border-white/10 bg-white/[0.04] font-sans text-[12px] font-semibold text-white/75">
      {initials(name) || "?"}
    </span>
  );
}

function RoleTag({ role }: { role: string }) {
  return (
    <span className="inline-flex items-center rounded-[2px] border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[12px] text-white/80">
      {ROLE_LABEL[role] ?? role}
    </span>
  );
}

/** Neutral by default; orange only when someone needs an answer (a leave request). */
function StatusText({ status }: { status: string }) {
  const needsAnswer = status === "LEAVE_PENDING";
  const quiet = status === "TERMINATED" || status === "SUSPENDED" || status === "ON_LEAVE";
  return (
    <span className={`inline-flex items-center gap-1.5 text-[13px] ${needsAnswer ? "font-medium text-white" : quiet ? "text-white/50" : "text-white/80"}`}>
      <span
        className={`h-1.5 w-1.5 rounded-full ${needsAnswer ? "bg-[#CC6600]" : status === "ACTIVE" ? "bg-white/70" : "bg-white/25"}`}
        aria-hidden="true"
      />
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

function DetailsDialog({ staff, onClose }: { staff: StaffListItem; onClose: () => void }) {
  const [detail, setDetail] = useState<StaffDetailItem | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    getStaffDetail(staff.id)
      .then((res) => !cancelled && (res.success ? setDetail(res.data) : setFailed(true)))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [staff.id]);
  const specs = detail?.specializations ?? staff.specializations;
  const logs = detail?.suspensionLogs ?? [];
  const actionWord: Record<string, string> = { SUSPENDED: "Suspended", TERMINATED: "Access removed", LIFTED: "Suspension lifted" };

  return (
    <Modal open onClose={onClose} title={staff.fullName} description={`${ROLE_LABEL[staff.role] ?? staff.role} · ${STATUS_LABEL[staff.status] ?? staff.status}`} size="lg">
      <div className="flex flex-col gap-5 font-sans text-[13px]">
        <dl className="grid grid-cols-1 gap-4 rounded-[2px] border border-white/[0.08] bg-white/[0.02] p-4 sm:grid-cols-3">
          <div className="min-w-0">
            <dt className="text-white/45">Email</dt>
            <dd className="mt-1 flex items-center gap-1.5 text-white">
              <span className="truncate">{staff.email}</span>
              <CopyButton value={staff.email} variant="ghost" label="" copiedLabel="" className="shrink-0" />
            </dd>
          </div>
          <div>
            <dt className="text-white/45">Phone</dt>
            <dd className="mt-1 text-white">{detail?.phone || "—"}</dd>
          </div>
          <div>
            <dt className="text-white/45">Joined</dt>
            <dd className="mt-1 text-white">{shortDate(staff.joinedAt)}</dd>
          </div>
          {staff.status === "ON_LEAVE" || staff.status === "LEAVE_PENDING" ? (
            <div className="sm:col-span-3">
              <dt className="text-white/45">Leave</dt>
              <dd className="mt-1 text-white">
                {shortDate(staff.leaveFrom)} to {shortDate(staff.leaveUntil)}
                {staff.leaveReason ? <span className="text-white/60">{` · ${staff.leaveReason}`}</span> : null}
              </dd>
            </div>
          ) : null}
        </dl>

        <section>
          <h3 className="text-sm font-semibold text-white">About</h3>
          <p className="mt-1.5 leading-relaxed text-white/70">{detail?.bio || staff.bio || "No bio yet."}</p>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-white">Skills</h3>
          {specs.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {specs.map((s) => (
                <span key={s} className="rounded-[2px] border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[12px] text-white/80">
                  {s}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-1.5 text-white/50">None listed.</p>
          )}
        </section>

        <section>
          <h3 className="text-sm font-semibold text-white">Suspensions and removals</h3>
          {failed ? (
            <p className="mt-1.5 text-white/50">The history didn&apos;t load. Close this and try again.</p>
          ) : !detail ? (
            <p className="mt-1.5 text-white/40">Loading...</p>
          ) : logs.length === 0 ? (
            <p className="mt-1.5 text-white/50">None. Clean record.</p>
          ) : (
            <ul className="mt-2 divide-y divide-white/[0.06] rounded-[2px] border border-white/[0.08]">
              {logs.map((log) => (
                <li key={log.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                  <div className="min-w-0">
                    <p className="font-medium text-white">{actionWord[log.action] ?? log.action}</p>
                    <p className="mt-0.5 text-white/65">{log.reason}</p>
                  </div>
                  <p className="shrink-0 text-white/45">
                    {shortDate(log.performedAt)}
                    {log.liftedAt ? ` · lifted ${shortDate(log.liftedAt)}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Modal>
  );
}

function ReasonDialog({
  title,
  description,
  confirmLabel,
  withViolation,
  withForfeit = false,
  busy,
  onClose,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  withViolation: "optional" | "required";
  withForfeit?: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: (reason: string, violation: string, forfeit?: boolean) => void;
}) {
  const [reason, setReason] = useState("");
  const [violation, setViolation] = useState(withViolation === "required" ? "POLICY_VIOLATION" : "");
  const [forfeit, setForfeit] = useState(false);
  const short = reason.trim().length < 10;
  return (
    <Modal
      open
      onClose={() => (busy ? undefined : onClose())}
      title={title}
      description={description}
      size="md"
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" loading={busy} disabled={short} onClick={() => onConfirm(reason.trim(), violation, forfeit)}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 font-sans">
        <FormSelect
          label={withViolation === "required" ? "What happened" : "What happened (optional)"}
          options={[...(withViolation === "optional" ? [{ value: "", label: "No rule broken, just a pause" }] : []), ...VIOLATION_OPTIONS]}
          value={violation}
          onChange={(e) => setViolation(e.target.value)}
        />
        <FormTextarea
          label="Reason"
          helper="At least 10 characters. Kept in their history."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Say what happened in a sentence or two"
        />
        {withForfeit ? (
          <label className="flex cursor-pointer items-start gap-3 rounded-[2px] border border-white/10 px-3.5 py-3 text-[13px] text-white/75">
            <input type="checkbox" checked={forfeit} onChange={(e) => setForfeit(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#CC6600]" />
            <span>
              <span className="font-medium text-white">Cancel their unpaid study pay.</span> Only for serious cases, like taking payment
              outside JAXIS.
            </span>
          </label>
        ) : null}
      </div>
    </Modal>
  );
}

function LeaveDialog({
  staff,
  busy,
  onClose,
  onConfirm,
}: {
  staff: StaffListItem;
  busy: boolean;
  onClose: () => void;
  onConfirm: (reason: string, from: string, until: string) => void;
}) {
  const today = todayInput();
  const [reason, setReason] = useState("");
  const [from, setFrom] = useState(today);
  const [until, setUntil] = useState(addDays(today, 1));
  const pastStart = from < today;
  const backwards = until < from;
  const days = !backwards ? Math.max(1, Math.round((new Date(until).getTime() - new Date(from).getTime()) / 86_400_000)) : null;
  const problem = pastStart ? "The start date can't be in the past." : backwards ? "The return date can't be before the start date." : null;

  return (
    <Modal
      open
      onClose={() => (busy ? undefined : onClose())}
      title={`Put ${staff.fullName} on leave?`}
      description="They can still sign in, but won't get new studies until they're back."
      size="md"
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" loading={busy} disabled={reason.trim().length < 3 || Boolean(problem)} onClick={() => onConfirm(reason.trim(), from, until)}>
            Put on Leave
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 font-sans text-[13px]">
        <div className="flex flex-wrap gap-1.5">
          {LEAVE_REASONS.map((r) => (
            <button
              key={r.label}
              type="button"
              onClick={() => setReason(r.text)}
              className={`rounded-[2px] border px-2.5 py-1 text-[12px] transition-colors ${
                reason === r.text ? "border-[#CC6600]/70 bg-[#CC6600]/[0.08] text-white" : "border-white/10 text-white/65 hover:border-white/25 hover:text-white"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <FormTextarea label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Pick one above or write your own" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-white/70">From</span>
            <input
              type="date"
              min={today}
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                if (until < e.target.value) setUntil(addDays(e.target.value, 1));
              }}
              className="h-10 rounded-[2px] border border-white/10 bg-[#050513] px-3 text-sm text-white outline-none focus:border-[#CC6600]/60"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-white/70">Back on</span>
            <input
              type="date"
              min={from || today}
              value={until}
              onChange={(e) => setUntil(e.target.value)}
              className="h-10 rounded-[2px] border border-white/10 bg-[#050513] px-3 text-sm text-white outline-none focus:border-[#CC6600]/60"
            />
          </label>
        </div>
        <p className={problem ? "text-red-300" : "text-white/50"}>{problem ?? (days ? `${days} ${days === 1 ? "day" : "days"} away.` : "")}</p>
      </div>
    </Modal>
  );
}

function DeleteDialog({ staff, onClose, onDeleted }: { staff: StaffListItem; onClose: () => void; onDeleted: (name: string, email: string) => void }) {
  const [account, setAccount] = useState<AccountSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Checked on the server first: you, CEO accounts, and anyone still on an unfinished study can't be deleted.
  useEffect(() => {
    let cancelled = false;
    findAccountByEmail(staff.email)
      .then((res) => {
        if (cancelled) return;
        if (!res.success) setLoadError(res.error);
        else if (!res.data) setLoadError("This account no longer exists.");
        else setAccount(res.data);
      })
      .catch(() => !cancelled && setLoadError("Couldn't check this account. Try again."));
    return () => {
      cancelled = true;
    };
  }, [staff.email]);

  const matches = confirmText.trim().toLowerCase() === staff.email.toLowerCase();
  const confirm = async () => {
    if (!account || busy) return;
    setBusy(true);
    setError(null);
    const res = await deleteAccount({ userId: account.id, confirmEmail: confirmText, reason: reason || undefined });
    setBusy(false);
    if (!res.success) return setError(res.error);
    onDeleted(res.data.fullName, res.data.email);
  };

  return (
    <Modal
      open
      onClose={() => (busy ? undefined : onClose())}
      title={`Delete ${staff.fullName}'s account?`}
      description="This can't be undone."
      size="sm"
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" loading={busy} disabled={!account || Boolean(account.blockedReason) || !matches} onClick={confirm}>
            Delete Account
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 font-sans text-[13px] text-white/70">
        {loadError ? (
          <p className="text-white/80">{loadError}</p>
        ) : !account ? (
          <p className="text-white/45">Checking the account...</p>
        ) : account.blockedReason ? (
          <p className="flex items-start gap-2 text-white/85">
            <WarningCircle size={16} weight="fill" className="mt-0.5 shrink-0 text-[#CC6600]" />
            {account.blockedReason}
          </p>
        ) : (
          <>
            <ul className="flex list-disc flex-col gap-1 pl-4">
              <li>They&apos;re signed out and can&apos;t sign in with this account again.</li>
              <li>{staff.email} becomes free, so you can add it again.</li>
              <li>Saved payout details (GCash or bank) are removed.</li>
              <li>Past studies, payslips, and messages stay on record under their name.</li>
            </ul>
            <label className="flex flex-col gap-1.5">
              <span>
                Type <span className="font-mono text-white">{staff.email}</span> to confirm
              </span>
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                autoComplete="off"
                className="h-9 rounded-[2px] border border-white/10 bg-[#050513] px-3 text-[13px] text-white outline-none focus:border-[#CC6600]/60"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span>Reason (optional, kept in the activity log)</span>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={300}
                placeholder="For example: adding them again with a new role"
                className="h-9 rounded-[2px] border border-white/10 bg-[#050513] px-3 text-[13px] text-white outline-none placeholder:text-white/30 focus:border-[#CC6600]/60"
              />
            </label>
          </>
        )}
        {error ? <p className="text-red-300">{error}</p> : null}
      </div>
    </Modal>
  );
}

function AddStaffDialog({
  isCeo,
  onClose,
  onCreated,
}: {
  isCeo: boolean;
  onClose: () => void;
  onCreated: (data: { id: string; email: string; fullName: string; role: string; temporaryPassword: string }) => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffRole>("STATISTICIAN");
  const [specs, setSpecs] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [bio, setBio] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);

  const roleOptions = isCeo
    ? [
        { value: "STATISTICIAN", label: "Analyst (runs the analysis)" },
        { value: "SENIOR_QA_LEAD", label: "Reviewer (checks work before delivery)" },
        { value: "FINANCE_OFFICER", label: "Finance (checks payments, pays staff)" },
        { value: "ADMIN", label: "Admin (prices studies, assigns work)" },
      ]
    : [
        { value: "STATISTICIAN", label: "Analyst (runs the analysis)" },
        { value: "SENIOR_QA_LEAD", label: "Reviewer (checks work before delivery)" },
      ];

  const allSpecs = [...STANDARD_SPECIALIZATIONS, ...specs.filter((s) => !(STANDARD_SPECIALIZATIONS as readonly string[]).includes(s))];
  const toggle = (s: string) => setSpecs((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  const addCustom = () => {
    const tag = customTag.trim();
    if (tag && !specs.includes(tag)) setSpecs([...specs, tag]);
    setCustomTag("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setFormError(null);
    setFieldErrors({});
    setBusy(true);
    const res = await provisionStaff({ firstName, lastName, email, role, specializations: specs, bio });
    setBusy(false);
    if (!res.success) {
      setFormError(res.error.code === "EMAIL_TAKEN" ? "Someone already uses this email. Delete that account first to reuse it." : res.error.message);
      if (res.error.fieldErrors) setFieldErrors(res.error.fieldErrors);
      return;
    }
    onCreated(res.data);
  };

  return (
    <Modal
      open
      onClose={() => (busy ? undefined : onClose())}
      title="Add staff"
      description="We create the account and give you a temporary password to send them."
      size="2xl"
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form="add-staff-form" variant="primary" size="sm" loading={busy}>
            Create Account
          </Button>
        </div>
      }
    >
      <form id="add-staff-form" onSubmit={submit} noValidate className="grid grid-cols-1 gap-6 font-sans md:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormInput label="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} error={fieldErrors.firstName?.[0]} />
            <FormInput label="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} error={fieldErrors.lastName?.[0]} />
          </div>
          <FormInput label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={fieldErrors.email?.[0]} placeholder="name@gmail.com" />
          <FormSelect label="Role" options={roleOptions} value={role} onChange={(e) => setRole(e.target.value as StaffRole)} />
          <FormTextarea label="About (optional)" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="Background, degree, or the kind of studies they handle" />
          {formError ? (
            <p role="alert" className="flex items-start gap-2 text-[13px] text-red-300">
              <WarningCircle size={15} weight="fill" className="mt-0.5 shrink-0" />
              {formError}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] text-white/80">Skills</span>
            <span className="text-[12px] text-white/45">{specs.length} picked</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {allSpecs.map((s) => {
              const on = specs.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggle(s)}
                  aria-pressed={on}
                  className={`inline-flex items-center gap-1 rounded-[2px] border px-2.5 py-1 text-[12px] transition-colors ${
                    on ? "border-[#CC6600]/70 bg-[#CC6600]/[0.08] text-white" : "border-white/10 text-white/65 hover:border-white/25 hover:text-white"
                  }`}
                >
                  {on ? <Check size={12} weight="bold" /> : <Plus size={12} weight="bold" className="text-white/35" />}
                  {s}
                </button>
              );
            })}
          </div>
          <div className="mt-1 flex gap-2">
            <input
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustom();
                }
              }}
              placeholder="Add another skill"
              className="h-9 min-w-0 flex-1 rounded-[2px] border border-white/10 bg-[#050513] px-3 text-[13px] text-white outline-none placeholder:text-white/30 focus:border-[#CC6600]/60"
            />
            <Button type="button" variant="outline" size="sm" onClick={addCustom} disabled={!customTag.trim()}>
              Add
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function CreatedDialog({
  data,
  onClose,
  onCopied,
}: {
  data: { email: string; fullName: string; role: string; temporaryPassword: string };
  onClose: () => void;
  onCopied: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const loginUrl =
    typeof window !== "undefined" && !["localhost", "127.0.0.1"].includes(window.location.hostname)
      ? `${window.location.origin}/login`
      : "https://app.jaxis-statlab.com/login";
  const copy = () => {
    const text = `Your JAXIS StatLab account\nName: ${data.fullName}\nEmail: ${data.email}\nTemporary password: ${data.temporaryPassword}\nSign in: ${loginUrl}\nPlease change your password after you sign in.`;
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(true);
    onCopied();
    setTimeout(() => setCopied(false), 2500);
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={`${data.fullName}'s account is ready`}
      description="Send them these sign-in details. The password won't be shown again."
      size="md"
      footer={
        <div className="flex w-full justify-between gap-2">
          <Button variant="outline" size="sm" onClick={copy} className="gap-1.5">
            {copied ? <Check size={14} weight="bold" /> : <Copy size={14} weight="bold" />}
            {copied ? "Copied" : "Copy Sign-in Details"}
          </Button>
          <Button variant="primary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      }
    >
      <dl className="flex flex-col divide-y divide-white/[0.06] rounded-[2px] border border-white/[0.08] font-sans text-[13px]">
        {[
          ["Name", data.fullName],
          ["Role", ROLE_LABEL[data.role] ?? data.role],
          ["Email", data.email],
          ["Sign in at", loginUrl],
        ].map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-4 px-4 py-2.5">
            <dt className="text-white/45">{k}</dt>
            <dd className="truncate text-right text-white">{v}</dd>
          </div>
        ))}
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <dt className="text-white/45">Temporary password</dt>
          <dd className="font-mono text-base font-semibold text-white">{data.temporaryPassword}</dd>
        </div>
      </dl>
    </Modal>
  );
}
