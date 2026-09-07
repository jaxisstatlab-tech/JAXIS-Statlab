"use client";

import React, {
  useState,
  useEffect,
  useTransition,
  useMemo,
  useCallback,
} from "react";
import {
  PageHeader,
  Card,
  Button,
  Modal,
  FormInput,
  FormSelect,
  FormTextarea,
  Alert,
  FilterToolbar,
  KpiCard,
  FormFooter,
  TagsOverflow,
  DropdownMenu,
  Toast,
  Pagination,
  LoadingState,
} from "@repo/ui";
import {
  IconEye,
  IconPlayerPause,
  IconPlayerPlay,
  IconUserX,
  IconKey,
  IconCheck,
  IconCopy,
  IconCalendar,
  IconChevronDown,
  IconX,
} from "@tabler/icons-react";
import {
  getStaffRoster,
  getStaffDetail,
  getStaffSelfProfile,
  provisionStaff,
  suspendStaff,
  liftSuspension,
  terminateStaff,
  requestLeave,
  returnFromLeave,
  approveLeave,
  rejectLeave,
} from "@/features/staff/actions";
import { PendingLeaveQueue } from "@/features/staff/components/PendingLeaveQueue";
import {
  STANDARD_SPECIALIZATIONS,
  type StaffRole,
  type StaffListItem,
  type StaffDetailItem,
} from "@/features/staff/schemas";
import { ViolationType } from "@prisma/client";

const VIOLATION_OPTIONS = [
  { value: "ETHICAL_BREACH", label: "Ethical Breach (Code of Conduct)" },
  {
    value: "DIRECT_PAYMENT_BYPASS",
    label: "Direct Payment Bypass / Off-Platform Solicitation",
  },
  { value: "DATA_FALSIFICATION", label: "Data Falsification / Fabrication" },
  { value: "GHOSTWRITING", label: "Ghostwriting Policy Violation" },
  { value: "POLICY_VIOLATION", label: "General Operational Policy Violation" },
];



const LEAVE_REASON_TEMPLATES = [
  {
    label: "Approved Medical / Sick Leave",
    text: "Staff member approved for medical/sick recovery leave following verified health notice.",
  },
  {
    label: "Annual Vacation / Sabbatical",
    text: "Approved scheduled annual vacation or academic sabbatical leave.",
  },
  {
    label: "Academic Conference Attendance",
    text: "Official authorization for off-site academic conference attendance and scholarly presentations.",
  },
  {
    label: "Family Emergency / Urgent Matters",
    text: "Special compassionate leave granted for urgent family matters.",
  },
  {
    label: "Administrative Temporary Hold",
    text: "Placed on administrative leave and temporarily removed from the active study assignment pool.",
  },
];

interface StaffRosterClientProps {
  initialStaff?: StaffListItem[];
  initialCurrentUserRole?: string;
}

export function StaffRosterClient({
  initialStaff = [],
  initialCurrentUserRole = "ADMIN",
}: StaffRosterClientProps) {
  const [staffList, setStaffList] = useState<StaffListItem[]>(initialStaff);
  const [selectedRole, setSelectedRole] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(initialStaff.length === 0);
  const [isPending, startTransition] = useTransition();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals state
  const [selectedStaff, setSelectedStaff] = useState<StaffListItem | null>(
    null,
  );
  const [detailData, setDetailData] = useState<StaffDetailItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [isSuspendOpen, setIsSuspendOpen] = useState<boolean>(false);
  const [isTerminateOpen, setIsTerminateOpen] = useState<boolean>(false);
  const [isAdminLeaveOpen, setIsAdminLeaveOpen] = useState<boolean>(false);
  const [adminLeaveReason, setAdminLeaveReason] = useState<string>("");
  const [adminLeaveFrom, setAdminLeaveFrom] = useState<string>("");
  const [adminLeaveUntil, setAdminLeaveUntil] = useState<string>("");

  const [currentUserRole, setCurrentUserRole] = useState<string>(initialCurrentUserRole);

  // Provision modal states
  const [isProvisionOpen, setIsProvisionOpen] = useState<boolean>(false);
  const [provFirstName, setProvFirstName] = useState<string>("");
  const [provLastName, setProvLastName] = useState<string>("");
  const [provEmail, setProvEmail] = useState<string>("");
  const [provRole, setProvRole] = useState<StaffRole>("STATISTICIAN");
  const [provSpecs, setProvSpecs] = useState<string[]>(["Regression", "ANOVA"]);
  const [provCustomTag, setProvCustomTag] = useState<string>("");
  const [provBio, setProvBio] = useState<string>("");
  const [provFormError, setProvFormError] = useState<string | null>(null);
  const [provFieldErrors, setProvFieldErrors] = useState<
    Record<string, string[]>
  >({});

  // Credentials Generated Modal
  const [provisionedData, setProvisionedData] = useState<{
    id: string;
    email: string;
    fullName: string;
    role: string;
    temporaryPassword: string;
  } | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{
    message: string;
    description?: string;
    variant: "info" | "success" | "warning" | "danger";
  } | null>(null);

  // Action form states inside modals
  const [suspendReason, setSuspendReason] = useState<string>("");
  const [suspendViolation, setSuspendViolation] = useState<string>("");
  const [terminateReason, setTerminateReason] = useState<string>("");
  const [terminateViolation, setTerminateViolation] =
    useState<string>("POLICY_VIOLATION");
  const [forfeitPayouts, setForfeitPayouts] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Load current user profile if not provided from server
  useEffect(() => {
    if (!initialCurrentUserRole) {
      const fetchProfile = async () => {
        try {
          const res = await getStaffSelfProfile();
          if (res.success && res.data) {
            setCurrentUserRole(res.data.role);
            setProvRole("STATISTICIAN");
          }
        } catch {
          // Fallback default is ADMIN
        }
      };
      fetchProfile();
    }
  }, [initialCurrentUserRole]);

  // Provision role options: Manager can only create Statistician & QA; CEO can create all
  const provisionRoleOptions = useMemo(() => {
    if (currentUserRole === "CEO") {
      return [
        {
          value: "ADMIN",
          label: "Manager (Operations & Assignments)",
        },
        {
          value: "FINANCE_OFFICER",
          label: "Finance Officer (Payments & Accounting)",
        },
        {
          value: "SENIOR_QA_LEAD",
          label: "Senior QA Lead (Quality Reviews)",
        },
        {
          value: "STATISTICIAN",
          label: "Statistician (Data Analysis & Modeling)",
        },
      ];
    }

    // Manager (ADMIN) can only create Statistician and QA
    return [
      {
        value: "STATISTICIAN",
        label: "Statistician (Data Analysis & Modeling)",
      },
      {
        value: "SENIOR_QA_LEAD",
        label: "Senior QA Lead (Quality Reviews)",
      },
    ];
  }, [currentUserRole]);

  const isMountedRef = React.useRef(true);

  // Load roster
  const loadRoster = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getStaffRoster({
        role: selectedRole,
        status: selectedStatus,
        search: searchQuery,
      });
      if (!isMountedRef.current) return;
      if (res.success) {
        setStaffList(res.data);
      }
    } catch (e) {
      if (isMountedRef.current) {
        console.error("Failed to load staff roster", e);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [selectedRole, selectedStatus, searchQuery]);

  useEffect(() => {
    isMountedRef.current = true;
    loadRoster();
    return () => {
      isMountedRef.current = false;
    };
  }, [loadRoster]);

  // KPI Calculations
  const kpis = useMemo(() => {
    const total = staffList.length;
    const stats = staffList.filter((s) => s.role === "STATISTICIAN").length;
    const qa = staffList.filter((s) => s.role === "SENIOR_QA_LEAD").length;
    const finance = staffList.filter(
      (s) => s.role === "FINANCE_OFFICER",
    ).length;
    const managers = staffList.filter((s) => s.role === "ADMIN").length;
    const active = staffList.filter((s) => s.status === "ACTIVE").length;
    const onLeave = staffList.filter((s) => s.status === "ON_LEAVE").length;
    const suspended = staffList.filter((s) => s.status === "SUSPENDED").length;
    const terminated = staffList.filter(
      (s) => s.status === "TERMINATED",
    ).length;
    return { total, stats, qa, finance, managers, active, onLeave, suspended, terminated };
  }, [staffList]);

  // View details
  const handleOpenDetail = async (staff: StaffListItem) => {
    setSelectedStaff(staff);
    setIsDetailOpen(true);
    try {
      const res = await getStaffDetail(staff.id);
      if (res.success) {
        setDetailData(res.data);
      }
    } catch (e) {
      console.error("Failed to fetch staff detail", e);
    }
  };

  // Provision staff handlers
  const toggleProvSpec = (spec: string) => {
    if (provSpecs.includes(spec)) {
      setProvSpecs(provSpecs.filter((s) => s !== spec));
    } else {
      setProvSpecs([...provSpecs, spec]);
    }
  };

  const handleAddProvCustomTag = (e: React.FormEvent) => {
    e.preventDefault();
    const tag = provCustomTag.trim();
    if (tag && !provSpecs.includes(tag)) {
      setProvSpecs([...provSpecs, tag]);
      setProvCustomTag("");
    }
  };

  const handleProvisionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProvFormError(null);
    setProvFieldErrors({});

    startTransition(async () => {
      const res = await provisionStaff({
        firstName: provFirstName,
        lastName: provLastName,
        email: provEmail,
        role: provRole,
        specializations: provSpecs,
        bio: provBio,
      });

      if (!res.success) {
        setProvFormError(res.error.message);
        if (res.error.fieldErrors) {
          setProvFieldErrors(res.error.fieldErrors);
        }
        setToastMessage({
          message: "Provisioning Failed",
          description: res.error.message,
          variant: "danger",
        });
        return;
      }

      setIsProvisionOpen(false);
      setProvFirstName("");
      setProvLastName("");
      setProvEmail("");
      setProvRole("STATISTICIAN");
      setProvSpecs(["Regression", "ANOVA"]);
      setProvBio("");
      setProvisionedData(res.data);
      setIsSuccessModalOpen(true);
      setToastMessage({
        message: "Staff Member Created",
        description: `Account created for ${res.data.fullName}. Temporary password is ready to copy.`,
        variant: "success",
      });
      loadRoster();
    });
  };

  const copyCredentials = () => {
    if (!provisionedData) return;
    const text = `JAXIS StatLab Internal Account Credentials\nName: ${provisionedData.fullName}\nRole: ${provisionedData.role}\nEmail: ${provisionedData.email}\nTemporary Password: ${provisionedData.temporaryPassword}\nLogin URL: http://localhost:3001/login`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setToastMessage({
      message: "Credentials Copied",
      description: `Account credentials for ${provisionedData.fullName} copied to clipboard.`,
      variant: "info",
    });
    setTimeout(() => setCopied(false), 2500);
  };

  // Suspend action
  const handleSuspendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;
    setActionError(null);

    startTransition(async () => {
      const res = await suspendStaff(selectedStaff.id, {
        reason: suspendReason,
        violationType: suspendViolation
          ? (suspendViolation as ViolationType)
          : undefined,
      });

      if (!res.success) {
        setActionError(res.error.message);
        setToastMessage({
          message: "Suspension Failed",
          description: res.error.message,
          variant: "danger",
        });
        return;
      }

      setIsSuspendOpen(false);
      setSuspendReason("");
      setSuspendViolation("");
      setToastMessage({
        message: "Staff Account Suspended",
        description: `Account for ${selectedStaff.fullName} has been placed in suspended status.`,
        variant: "warning",
      });
      loadRoster();
    });
  };

  // Lift suspension action
  const handleLiftSuspension = async (staff: StaffListItem) => {
    if (
      !confirm(
        `Are you sure you want to restore active status for ${staff.fullName}?`,
      )
    )
      return;
    setActionError(null);

    startTransition(async () => {
      const res = await liftSuspension(staff.id);
      if (!res.success) {
        alert(res.error.message);
        setToastMessage({
          message: "Failed to Lift Suspension",
          description: res.error.message,
          variant: "danger",
        });
        return;
      }
      setToastMessage({
        message: "Suspension Lifted",
        description: `Active system access restored for ${staff.fullName}.`,
        variant: "success",
      });
      loadRoster();
    });
  };

  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const isAdminReturnBeforeStart = useMemo(() => {
    if (!adminLeaveFrom || !adminLeaveUntil) return false;
    return adminLeaveUntil < adminLeaveFrom;
  }, [adminLeaveFrom, adminLeaveUntil]);

  const isAdminStartInPast = useMemo(() => {
    if (!adminLeaveFrom) return false;
    return adminLeaveFrom < todayStr;
  }, [adminLeaveFrom, todayStr]);

  const adminCalculatedDays = useMemo(() => {
    if (!adminLeaveFrom || !adminLeaveUntil || isAdminReturnBeforeStart) return null;
    const start = new Date(adminLeaveFrom);
    const end = new Date(adminLeaveUntil);
    const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, diff);
  }, [adminLeaveFrom, adminLeaveUntil, isAdminReturnBeforeStart]);

  const handleAdminLeaveFromChange = (val: string) => {
    setAdminLeaveFrom(val);
    setActionError(null);
    if (adminLeaveUntil && adminLeaveUntil < val) {
      const nextDay = new Date(val);
      nextDay.setDate(nextDay.getDate() + 1);
      setAdminLeaveUntil(nextDay.toISOString().split("T")[0]!);
    }
  };

  const handleAdminLeaveUntilChange = (val: string) => {
    setAdminLeaveUntil(val);
    setActionError(null);
  };

  const openAdminLeaveModal = (staff: StaffListItem) => {
    setSelectedStaff(staff);
    setAdminLeaveReason("");
    setAdminLeaveFrom(todayStr);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setAdminLeaveUntil(tomorrow.toISOString().split("T")[0]!);
    setActionError(null);
    setIsAdminLeaveOpen(true);
  };

  // Admin Place on Leave
  const handleAdminPlaceOnLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;
    if (!adminLeaveReason || adminLeaveReason.trim().length < 3) {
      setActionError("Please provide a reason for the leave (at least 3 characters).");
      return;
    }
    if (isAdminStartInPast) {
      setActionError("Leave start date cannot be in the past.");
      return;
    }
    if (isAdminReturnBeforeStart) {
      setActionError("Expected return date cannot be earlier than leave start date.");
      return;
    }
    setActionError(null);

    startTransition(async () => {
      const res = await requestLeave({
        userId: selectedStaff.id,
        reason: adminLeaveReason.trim(),
        leaveFrom: adminLeaveFrom ? new Date(adminLeaveFrom).toISOString() : undefined,
        leaveUntil: adminLeaveUntil ? new Date(adminLeaveUntil).toISOString() : undefined,
      });

      if (!res.success) {
        setActionError(res.error.message);
        setToastMessage({
          message: "Leave Action Failed",
          description: res.error.message,
          variant: "danger",
        });
        return;
      }

      setIsAdminLeaveOpen(false);
      setAdminLeaveReason("");
      setAdminLeaveUntil("");
      setToastMessage({
        message: "Staff Placed On Leave",
        description: `${selectedStaff.fullName} is now On Leave and paused from study assignments.`,
        variant: "warning",
      });
      loadRoster();
    });
  };

  // Admin End Leave
  const handleAdminEndLeave = async (staff: StaffListItem) => {
    startTransition(async () => {
      const res = await returnFromLeave(staff.id);
      if (!res.success) {
        setToastMessage({
          message: "Failed to End Leave",
          description: res.error.message,
          variant: "danger",
        });
        return;
      }
      window.dispatchEvent(new CustomEvent("leave-status-updated"));
      window.dispatchEvent(new CustomEvent("shift-status-updated"));
      setToastMessage({
        message: "Leave Concluded",
        description: `${staff.fullName} has returned to Active status and is available for assignments.`,
        variant: "success",
      });
      loadRoster();
    });
  };

  // Admin Approve Leave Request
  const handleAdminApproveLeave = async (staff: StaffListItem) => {
    startTransition(async () => {
      const res = await approveLeave(staff.id);
      if (!res.success) {
        setToastMessage({
          message: "Approval Failed",
          description: res.error.message,
          variant: "danger",
        });
        return;
      }
      window.dispatchEvent(new CustomEvent("leave-status-updated"));
      window.dispatchEvent(new CustomEvent("shift-status-updated"));
      setToastMessage({
        message: "Leave Request Approved",
        description: `${staff.fullName} is now marked On Leave and hidden from Module 08 assignments.`,
        variant: "success",
      });
      loadRoster();
    });
  };

  // Admin Decline Leave Request
  const handleAdminDeclineLeave = async (staff: StaffListItem) => {
    startTransition(async () => {
      const res = await rejectLeave(staff.id);
      if (!res.success) {
        setToastMessage({
          message: "Action Failed",
          description: res.error.message,
          variant: "danger",
        });
        return;
      }
      window.dispatchEvent(new CustomEvent("leave-status-updated"));
      window.dispatchEvent(new CustomEvent("shift-status-updated"));
      setToastMessage({
        message: "Leave Request Declined",
        description: `${staff.fullName} has been restored to Active duty.`,
        variant: "warning",
      });
      loadRoster();
    });
  };

  // Terminate action (CEO Authority)
  const handleTerminateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;
    setActionError(null);

    startTransition(async () => {
      const res = await terminateStaff(selectedStaff.id, {
        reason: terminateReason,
        violationType: terminateViolation as ViolationType,
        forfeitPayouts,
      });

      if (!res.success) {
        setActionError(res.error.message);
        setToastMessage({
          message: "Termination Failed",
          description: res.error.message,
          variant: "danger",
        });
        return;
      }

      setIsTerminateOpen(false);
      setTerminateReason("");
      setForfeitPayouts(false);
      setToastMessage({
        message: "Account Terminated",
        description: `Account for ${selectedStaff.fullName} has been permanently terminated.`,
        variant: "danger",
      });
      loadRoster();
    });
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "STATISTICIAN":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-[2px] text-xs font-mono font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20 whitespace-nowrap">
            STATISTICIAN
          </span>
        );
      case "SENIOR_QA_LEAD":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-[2px] text-xs font-mono font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 whitespace-nowrap">
            SENIOR QA LEAD
          </span>
        );
      case "FINANCE_OFFICER":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-[2px] text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
            FINANCE OFFICER
          </span>
        );
      case "CEO":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-[2px] text-xs font-mono font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 whitespace-nowrap">
            CEO / OWNER
          </span>
        );
      case "ADMIN":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-[2px] text-xs font-mono font-semibold bg-white/10 text-white border border-white/20 whitespace-nowrap">
            ADMIN
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-[2px] text-xs font-mono font-semibold text-slate-300 border border-white/10 whitespace-nowrap">
            {role}
          </span>
        );
    }
  };

  const getStatusIndicator = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return (
          <span className="inline-flex items-center gap-2 text-xs font-mono font-semibold text-emerald-400 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
            Active
          </span>
        );
      case "LEAVE_PENDING":
        return (
          <span className="inline-flex items-center gap-2 text-xs font-mono font-semibold text-amber-400 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0 animate-pulse" />
            Leave Pending
          </span>
        );
      case "ON_LEAVE":
        return (
          <span className="inline-flex items-center gap-2 text-xs font-mono font-semibold text-purple-400 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-purple-400 flex-shrink-0" />
            On Leave
          </span>
        );
      case "SUSPENDED":
        return (
          <span className="inline-flex items-center gap-2 text-xs font-mono font-semibold text-amber-400 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
            Suspended
          </span>
        );
      case "TERMINATED":
        return (
          <span className="inline-flex items-center gap-2 text-xs font-mono font-semibold text-red-400 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
            Terminated
          </span>
        );
      default:
        return (
          <span className="text-xs font-mono text-white/50">{status}</span>
        );
    }
  };

  if (isLoading && staffList.length === 0) {
    return (
      <div className="flex-1 w-full min-h-full flex items-center justify-center animate-content-fade my-auto font-sans">
        <LoadingState
          variant="page"
          label="Loading Staff Directory..."
          description="Getting team accounts, roles, and status."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-9 max-w-7xl mx-auto pb-16 w-full">
      {/* ── Page Header ── */}
      <PageHeader
        title="Staff Directory"
        description="Create and manage team accounts, roles, and status."
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "Admin Operations", href: "/dashboard/admin" },
          { label: "Staff Directory" },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={loadRoster}
              loading={isLoading}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setProvFormError(null);
                setProvFieldErrors({});
                setProvRole("STATISTICIAN");
                setIsProvisionOpen(true);
              }}
            >
              + Add New Staff
            </Button>
          </div>
        }
      />

      {/* ── KPI Grid (Consistent with Admin Dashboard Standard) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
        <KpiCard
          label="Total Staff"
          value={kpis.total}
          variant="default"
          description={`${kpis.active} active • ${kpis.onLeave} on leave`}
        />

        <KpiCard
          label="Statisticians"
          value={kpis.stats}
          variant="sky"
          description="Data analysis & modeling"
        />

        <KpiCard
          label="QA Leads"
          value={kpis.qa}
          variant="orange"
          description="Quality check & review"
        />

        <KpiCard
          label="Suspended / Inactive"
          value={kpis.suspended + kpis.terminated}
          variant="amber"
          description={`${kpis.suspended} Suspended / ${kpis.terminated} Terminated`}
        />
      </div>

      {/* ── Pending Specialist Leave Requests (HR / Admin Review Queue) ── */}
      <PendingLeaveQueue
        onStatusChange={loadRoster}
        title="Pending Leave Requests"
        subtitle="Review and approve staff leave requests."
      />

      {/* ── Staff Directory Card ── */}
      <Card
        className="p-0 overflow-hidden border border-white/[0.08] bg-[#010D1F]"
        style={{ padding: 0 }}
      >
        {/* ─ Header ─ */}
        <div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          style={{ padding: '1.75rem 1.75rem 1.25rem 1.75rem' }}
        >
          <div>
            <h2 className="text-base font-bold text-white tracking-wide font-sans">
              Staff Directory
            </h2>
            <p className="text-xs text-white/50 mt-1.5 font-sans leading-relaxed">
              All active staff members, roles, and status
            </p>
          </div>
          <span className="text-xs font-mono text-white/60 bg-white/[0.04] px-3.5 py-1.5 rounded-[2px] border border-white/10 self-start sm:self-auto whitespace-nowrap">
            {staffList.length}{" "}
            {staffList.length === 1
              ? "registered member"
              : "registered members"}
          </span>
        </div>

        {/* ─ Filter Toolbar ─ */}
        <FilterToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search by name, email, or specialization..."
          onSearchSubmit={loadRoster}
          filters={[
            {
              key: "role",
              label: "Role",
              value: selectedRole,
              defaultValue: "ALL",
              options: [
                { value: "ALL", label: "All Roles" },
                { value: "ADMIN", label: "Manager" },
                { value: "STATISTICIAN", label: "Statistician" },
                { value: "SENIOR_QA_LEAD", label: "QA Lead" },
                { value: "FINANCE_OFFICER", label: "Finance" },
              ],
            },
            {
              key: "status",
              label: "Status",
              value: selectedStatus,
              defaultValue: "ALL",
              options: [
                { value: "ALL", label: "All" },
                { value: "ACTIVE", label: "Active" },
                { value: "LEAVE_PENDING", label: "Leave Pending" },
                { value: "ON_LEAVE", label: "On Leave" },
                { value: "SUSPENDED", label: "Suspended" },
                { value: "TERMINATED", label: "Terminated" },
              ],
            },
          ]}
          onFilterChange={(key, value) => {
            if (key === "role") setSelectedRole(value);
            if (key === "status") setSelectedStatus(value);
            setCurrentPage(1);
          }}
          onClear={() => {
            setSelectedRole("ALL");
            setSelectedStatus("ALL");
            setSearchQuery("");
            setCurrentPage(1);
          }}
        />

        {/* ─ Table ─ */}
        <div style={{ padding: '1.25rem 1.75rem 1.75rem 1.75rem' }}>
          <div className="w-full overflow-x-auto rounded-[3px] border border-white/[0.08]">
            <table className="data-table">
              <thead>
                <tr>
                  <th>
                    Staff Member
                  </th>
                  <th className="w-[160px] whitespace-nowrap">
                    Role
                  </th>
                  <th className="w-[240px] whitespace-nowrap">
                    Specializations
                  </th>
                  <th className="w-[120px] whitespace-nowrap">
                    Status
                  </th>
                  <th className="w-[110px] text-right whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-20 text-center text-white/30 font-mono text-xs"
                    >
                      Loading staff directory records...
                    </td>
                  </tr>
                ) : staffList.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-20 text-center text-white/30 font-mono text-xs"
                    >
                      No staff members match the selected filters.
                    </td>
                  </tr>
                ) : (
                staffList.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((staff) => (
                  <tr
                    key={staff.id}
                    className="group"
                  >
                    {/* Staff Member */}
                    <td>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="font-semibold text-white group-hover:text-[#CC6600] transition-colors whitespace-nowrap truncate text-[0.8125rem]">
                          {staff.fullName}
                        </span>
                        <span className="text-[0.6875rem] text-white/40 font-mono whitespace-nowrap truncate">
                          {staff.email}
                        </span>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="whitespace-nowrap">
                      {getRoleBadge(staff.role)}
                    </td>

                    {/* Specializations */}
                    <td>
                      <TagsOverflow
                        tags={staff.specializations}
                        limit={2}
                        title="Other Specializations"
                      />
                    </td>

                    {/* Status */}
                    <td className="whitespace-nowrap">
                      {getStatusIndicator(staff.status)}
                    </td>

                    {/* Actions */}
                    <td className="text-right whitespace-nowrap">
                      <div className="relative inline-flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDetail(staff)}
                          className="py-1.5 px-3.5 h-auto whitespace-nowrap font-mono text-xs tracking-wider"
                        >
                          DETAILS
                        </Button>

                        <DropdownMenu
                          items={[
                            {
                              label: "View Profile & Logs",
                              subtitle: "Inspect activity records",
                              icon: <IconEye size={16} stroke={1.5} />,
                              onClick: () => handleOpenDetail(staff),
                            },
                            ...(staff.status === "ACTIVE"
                              ? [
                                  {
                                    dividerBefore: true,
                                    label: "Place on Leave",
                                    subtitle: "Pause study assignments",
                                    icon: <IconCalendar size={16} stroke={1.5} />,
                                    onClick: () => openAdminLeaveModal(staff),
                                  },
                                  {
                                    dividerBefore: false,
                                    label: "Suspend Account",
                                    subtitle: "Temporarily halt access",
                                    variant: "warning" as const,
                                    icon: <IconPlayerPause size={16} stroke={1.5} />,
                                    onClick: () => {
                                      setSelectedStaff(staff);
                                      setIsSuspendOpen(true);
                                    },
                                  },
                                ]
                              : []),
                            ...(staff.status === "LEAVE_PENDING"
                              ? [
                                  {
                                    dividerBefore: true,
                                    label: "Acknowledge & Approve",
                                    subtitle: "Authorize leave & pause assignments",
                                    variant: "success" as const,
                                    icon: <IconCheck size={16} stroke={1.5} />,
                                    onClick: () => handleAdminApproveLeave(staff),
                                  },
                                  {
                                    dividerBefore: false,
                                    label: "Decline Request",
                                    subtitle: "Restore to active duty",
                                    variant: "warning" as const,
                                    icon: <IconX size={16} stroke={1.5} />,
                                    onClick: () => handleAdminDeclineLeave(staff),
                                  },
                                ]
                              : []),
                            ...(staff.status === "ON_LEAVE"
                              ? [
                                  {
                                    dividerBefore: true,
                                    label: "End Leave",
                                    subtitle: "Return to active duty",
                                    variant: "success" as const,
                                    icon: <IconPlayerPlay size={16} stroke={1.5} />,
                                    onClick: () => handleAdminEndLeave(staff),
                                  },
                                ]
                              : []),
                            ...(staff.status === "SUSPENDED"
                              ? [
                                  {
                                    dividerBefore: true,
                                    label: "Lift Suspension",
                                    subtitle: "Restore active access",
                                    variant: "success" as const,
                                    icon: <IconPlayerPlay size={16} stroke={1.5} />,
                                    onClick: () => handleLiftSuspension(staff),
                                  },
                                ]
                              : []),
                            ...(staff.status !== "TERMINATED"
                              ? [
                                  {
                                    dividerBefore: true,
                                    label: "Terminate Staff",
                                    subtitle: "Revoke role & credentials",
                                    badge: "CEO",
                                    variant: "danger" as const,
                                    icon: <IconUserX size={16} stroke={1.5} />,
                                    onClick: () => {
                                      setSelectedStaff(staff);
                                      setIsTerminateOpen(true);
                                    },
                                  },
                                ]
                              : []),
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        </div>

        {staffList.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={staffList.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            itemLabel="staff"
          />
        )}
      </Card>

      {/* ── 1. Staff Detail Modal ── */}
      {selectedStaff && (
        <Modal
          open={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title={`Staff Profile: ${selectedStaff.fullName}`}
          size="lg"
        >
          <div className="flex flex-col gap-6 font-sans">
            {/* Staff Identity Card */}
            <div
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-[4px] bg-[#01142B] border border-white/10"
              style={{ padding: "1.5rem", boxSizing: "border-box" }}
            >
              <div className="flex flex-col gap-1">
                <span className="text-xs font-sans font-semibold text-white/50 uppercase tracking-wider">
                  Email Address
                </span>
                <span className="text-base font-semibold text-white font-sans">
                  {selectedStaff.email}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {getRoleBadge(selectedStaff.role)}
                {getStatusIndicator(selectedStaff.status)}
              </div>
            </div>

            {/* Bio Section */}
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-sans font-semibold text-white/50 uppercase tracking-wider">
                Professional Bio &amp; Focus
              </span>
              <p
                className="text-sm text-slate-200 bg-[#01142B] rounded-[4px] border border-white/10 leading-relaxed font-sans"
                style={{ padding: "1.25rem 1.5rem", boxSizing: "border-box" }}
              >
                {detailData?.bio ||
                  selectedStaff.bio ||
                  "No biographical profile entered yet."}
              </p>
            </div>

            {/* Specializations List */}
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-sans font-semibold text-white/50 uppercase tracking-wider">
                Certified Specializations
              </span>
              <div className="flex flex-wrap gap-2">
                {(
                  detailData?.specializations || selectedStaff.specializations
                ).map((spec, i) => (
                  <span
                    key={i}
                    className="text-xs font-sans font-medium rounded-[3px] bg-[#01142B] text-sky-300 border border-sky-400/30"
                    style={{ padding: "0.375rem 0.75rem", display: "inline-flex", alignItems: "center" }}
                  >
                    {spec}
                  </span>
                ))}
              </div>
            </div>

            {/* Disciplinary / Suspension Logs */}
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-sans font-semibold text-white/50 uppercase tracking-wider">
                Governance &amp; Disciplinary History
              </span>
              {detailData?.suspensionLogs &&
              detailData.suspensionLogs.length > 0 ? (
                <div className="overflow-x-auto border border-white/10 rounded-[4px]">
                  <table className="w-full text-xs text-left font-sans">
                    <thead className="bg-white/[0.03] text-white/50 border-b border-white/[0.08]">
                      <tr>
                        <th className="py-3.5 px-5 font-sans font-semibold">Action</th>
                        <th className="py-3.5 px-5 font-sans font-semibold">Reason</th>
                        <th className="py-3.5 px-5 font-sans font-semibold">Violation Type</th>
                        <th className="py-3.5 px-5 font-sans font-semibold">Date</th>
                        <th className="py-3.5 px-5 font-sans font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {detailData.suspensionLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-white/[0.02]">
                          <td className="py-3.5 px-5 font-mono font-bold text-amber-400">
                            {log.action}
                          </td>
                          <td className="py-3.5 px-5 text-slate-300 max-w-[200px]">
                            {log.reason}
                          </td>
                          <td className="py-3.5 px-5 text-slate-400">
                            {log.violationType || "N/A"}
                          </td>
                          <td className="py-3.5 px-5 text-white/50 font-mono">
                            {new Date(log.performedAt).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-5">
                            {log.liftedAt ? (
                              <span className="text-emerald-400 font-sans font-medium">
                                Lifted on{" "}
                                {new Date(log.liftedAt).toLocaleDateString()}
                              </span>
                            ) : (
                              <span className="text-amber-400 font-sans font-medium">
                                Active Record
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div
                  className="text-xs text-white/50 italic bg-[#01142B] border border-white/10 rounded-[4px] font-sans"
                  style={{ padding: "1.25rem 1.5rem", boxSizing: "border-box" }}
                >
                  Clean record — zero disciplinary actions or suspensions logged.
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ── 2. Provision Staff Modal (2-Column Zero-Scroll Layout) ── */}
      <Modal
        open={isProvisionOpen}
        onClose={() => setIsProvisionOpen(false)}
        title="Add New Staff Member"
        description={
          currentUserRole === "CEO"
            ? "Create an account for a Manager, Finance Officer, QA Lead, or Statistician."
            : "Create an account for a Finance Officer or Senior QA Lead."
        }
        size="2xl"
      >
        <form
          onSubmit={handleProvisionSubmit}
          className="flex flex-col gap-5 p-1 font-sans"
        >
          {provFormError && <Alert variant="danger">{provFormError}</Alert>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* ── Left Column: Identity, Role & Security (50%) ── */}
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormInput
                  label="First Name"
                  required
                  placeholder="Eleanor"
                  value={provFirstName}
                  onChange={(e) => setProvFirstName(e.target.value)}
                  error={provFieldErrors.firstName?.[0] || provFieldErrors.fullName?.[0]}
                  disabled={isPending}
                />
                <FormInput
                  label="Last Name"
                  required
                  placeholder="Vance"
                  value={provLastName}
                  onChange={(e) => setProvLastName(e.target.value)}
                  error={provFieldErrors.lastName?.[0]}
                  disabled={isPending}
                />
              </div>

              <FormInput
                label="Email Address"
                type="email"
                required
                placeholder="name@jaxis.dev"
                value={provEmail}
                onChange={(e) => setProvEmail(e.target.value)}
                error={provFieldErrors.email?.[0]}
                disabled={isPending}
              />

              <div className="flex flex-col gap-1">
                <FormSelect
                  label="Role"
                  required
                  options={provisionRoleOptions}
                  value={provRole}
                  onChange={(e) => setProvRole(e.target.value as StaffRole)}
                  disabled={isPending}
                />
                <span className="text-[0.688rem] text-white/50 font-sans">
                  {currentUserRole === "CEO"
                    ? "CEO access: You can create Managers, Finance, QA, and Statisticians."
                    : "Manager access: You can create Statistician and QA staff."}
                </span>
              </div>

              {/* Automated Credentials Notice Badge */}
              <div className="p-3.5 rounded-[3px] bg-sky-500/[0.06] border border-sky-500/20 text-xs text-slate-300 flex items-start gap-3 mt-1">
                <div className="p-1.5 rounded-[2px] bg-sky-500/10 border border-sky-500/20 text-sky-400 mt-0.5 flex-shrink-0">
                  <IconKey size={14} stroke={1.5} />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="font-sans uppercase font-bold text-sky-400 text-xs tracking-wider">
                    Temporary Password
                  </span>
                  <p className="text-xs text-slate-300/80 leading-relaxed font-sans mt-0.5">
                    A secure password (<code className="text-sky-300 font-mono">JAXIS-XXXXXXXX</code>) will be generated automatically for you to copy and share.
                  </p>
                </div>
              </div>
            </div>

            {/* ── Right Column: Certified Specializations & Bio (50%) ── */}
            <div className="flex flex-col gap-4">
              {/* Specialization Tags Picker */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-200 whitespace-nowrap">
                    Certified Specializations <span className="text-[#CC6600]">*</span>
                  </span>
                  <div className="flex items-center gap-2 text-xs font-sans text-white/40 flex-shrink-0">
                    {provSpecs.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setProvSpecs([])}
                        className="text-white/40 hover:text-[#CC6600] transition-colors underline cursor-pointer"
                      >
                        Clear ({provSpecs.length})
                      </button>
                    )}
                    <span>{provSpecs.length} selected</span>
                  </div>
                </div>
                <p className="text-xs text-white/50 font-sans">
                  Select methodologies, modeling frameworks, or domain competencies
                </p>

                <div className="flex flex-wrap gap-2 pt-1">
                  {[
                    ...STANDARD_SPECIALIZATIONS,
                    ...provSpecs.filter(
                      (s) => !(STANDARD_SPECIALIZATIONS as readonly string[]).includes(s)
                    ),
                  ].map((spec) => {
                    const isSelected = provSpecs.includes(spec);
                    const isCustom = !(STANDARD_SPECIALIZATIONS as readonly string[]).includes(spec);
                    return (
                      <button
                        key={spec}
                        type="button"
                        onClick={() => toggleProvSpec(spec)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] text-xs font-sans transition-all duration-150 cursor-pointer select-none border ${
                          isSelected
                            ? "bg-[#CC6600]/15 text-[#FF9433] border-[#CC6600] font-medium shadow-sm shadow-[#CC6600]/10"
                            : "bg-[#01142B] text-slate-300 border-white/10 hover:border-white/25 hover:text-white hover:bg-white/[0.04]"
                        }`}
                      >
                        {isSelected ? (
                          <IconCheck size={13} stroke={2.5} className="text-[#CC6600] flex-shrink-0" />
                        ) : (
                          <span className="text-white/30 font-bold text-xs leading-none">+</span>
                        )}
                        <span className="max-w-[180px] truncate">{spec}</span>
                        {isCustom && isSelected && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setProvSpecs(provSpecs.filter((s) => s !== spec));
                            }}
                            className="ml-1 text-[#FF9433]/70 hover:text-red-400 font-bold text-xs px-1 hover:bg-red-500/20 rounded-[2px] transition-colors"
                            title="Remove custom tag"
                          >
                            ×
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-stretch gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Add custom specialization..."
                    value={provCustomTag}
                    onChange={(e) => setProvCustomTag(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" &&
                      (e.preventDefault(), handleAddProvCustomTag(e))
                    }
                    className="flex-1 bg-[#011227] border border-white/10 rounded-[2px] text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#CC6600] transition-colors font-sans"
                    style={{
                      height: "2.25rem",
                      paddingLeft: "1rem",
                      paddingRight: "1rem",
                      boxSizing: "border-box",
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddProvCustomTag}
                    disabled={!provCustomTag.trim()}
                    className="text-xs px-3.5 font-mono whitespace-nowrap flex items-center justify-center rounded-[2px]"
                    style={{
                      height: "2.25rem",
                      boxSizing: "border-box",
                    }}
                  >
                    + ADD TAG
                  </Button>
                </div>
              </div>

              <FormTextarea
                label="Professional Biography / Domain Scope"
                placeholder="Brief overview of research background, publications, or statistical focus areas..."
                value={provBio}
                onChange={(e) => setProvBio(e.target.value)}
                rows={3}
                disabled={isPending}
              />
            </div>
          </div>

          {/* ── Modal Footer: Action Buttons (Full width) ── */}
          <FormFooter className="mt-5">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsProvisionOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={isPending}>
              PROVISION ACCOUNT →
            </Button>
          </FormFooter>
        </form>
      </Modal>

      {/* ── 3. Credentials Generated Success Modal ── */}
      {provisionedData && (
        <Modal
          open={isSuccessModalOpen}
          onClose={() => setIsSuccessModalOpen(false)}
          title="Staff Account Successfully Provisioned"
          size="md"
        >
          <div className="flex flex-col gap-5 font-sans animate-content-fade">
            <Alert variant="success">
              Staff record created in institutional directory. Credentials ready
              for secure distribution.
            </Alert>

            <div className="p-5 sm:px-7 rounded-[3px] bg-[#011B38] border border-white/10 flex flex-col gap-3.5 font-mono text-xs">
              <div className="flex justify-between border-b border-white/5 pb-2.5">
                <span className="text-white/50 uppercase tracking-wider">Full Name</span>
                <span className="font-bold text-white">
                  {provisionedData.fullName}
                </span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2.5">
                <span className="text-white/50 uppercase tracking-wider">Internal Role</span>
                <span className="text-[#CC6600] font-bold">
                  {provisionedData.role}
                </span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2.5">
                <span className="text-white/50 uppercase tracking-wider">
                  Institutional Email
                </span>
                <span className="text-white">{provisionedData.email}</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-white/50 uppercase tracking-wider">
                  Temporary Password
                </span>
                <span className="font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-[2px] border border-emerald-500/20 text-sm">
                  {provisionedData.temporaryPassword}
                </span>
              </div>
            </div>

            <div className="p-4 sm:px-6 rounded-[3px] bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
              <strong>Notice:</strong> Temporary passwords will not be displayed
              again. Transmit these credentials via secure institutional
              channels.
            </div>

            <FormFooter align="between" className="mt-4">
              <Button
                variant="outline"
                onClick={copyCredentials}
                className="font-mono text-xs flex items-center gap-2"
              >
                <IconCopy size={14} stroke={1.5} className="text-white/60" />
                {copied ? "COPIED TO CLIPBOARD!" : "COPY CREDENTIALS"}
              </Button>

              <Button
                variant="primary"
                onClick={() => setIsSuccessModalOpen(false)}
              >
                DONE
              </Button>
            </FormFooter>
          </div>
        </Modal>
      )}

      {/* ── 4. Suspend Staff Modal ── */}
      {selectedStaff && (
        <Modal
          open={isSuspendOpen}
          onClose={() => setIsSuspendOpen(false)}
          title={`Temporary Suspension: ${selectedStaff.fullName}`}
          size="md"
        >
          <form
            onSubmit={handleSuspendSubmit}
            className="flex flex-col gap-4 font-sans"
          >
            <Alert variant="warning">
              Suspending this staff member will immediately block login access
              and flag their active study assignments for administrator review.
            </Alert>

            {actionError && <Alert variant="danger">{actionError}</Alert>}

            <FormSelect
              label="Violation Classification (Optional)"
              options={[
                { value: "", label: "Standard Operational Hold / Review" },
                ...VIOLATION_OPTIONS,
              ]}
              value={suspendViolation}
              onChange={(e) => setSuspendViolation(e.target.value)}
              monoLabel
            />

            <FormTextarea
              label="Mandatory Reason for Suspension"
              required
              placeholder="Detail the operational reason or policy grounds for this temporary suspension (minimum 10 characters)..."
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              rows={4}
              monoLabel
            />

            <FormFooter className="mt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsSuspendOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="danger"
                loading={isPending}
                disabled={suspendReason.trim().length < 10}
              >
                CONFIRM SUSPENSION
              </Button>
            </FormFooter>
          </form>
        </Modal>
      )}

      {/* ── 5. Terminate Staff Modal (CEO Authority) ── */}
      {selectedStaff && (
        <Modal
          open={isTerminateOpen}
          onClose={() => setIsTerminateOpen(false)}
          title={`Permanent Termination: ${selectedStaff.fullName}`}
          size="md"
        >
          <form
            onSubmit={handleTerminateSubmit}
            className="flex flex-col gap-4 font-sans"
          >
            <Alert variant="danger">
              <strong>EXECUTIVE ACTION (RULE_ROL_01):</strong> Permanent account
              termination revokes all access indefinitely. Active projects will
              be flagged for emergency reassignment.
            </Alert>

            {actionError && <Alert variant="danger">{actionError}</Alert>}

            <FormSelect
              label="Required Violation Grounds"
              required
              options={VIOLATION_OPTIONS}
              value={terminateViolation}
              onChange={(e) => setTerminateViolation(e.target.value)}
              monoLabel
            />

            <FormTextarea
              label="Mandatory Termination Rationale"
              required
              placeholder="Provide exhaustive justification for permanent termination and audit record (minimum 10 characters)..."
              value={terminateReason}
              onChange={(e) => setTerminateReason(e.target.value)}
              rows={4}
              monoLabel
            />

            <div className="p-3 rounded-[2px] bg-red-500/10 border border-red-500/20 flex items-center gap-3">
              <input
                type="checkbox"
                id="forfeitPayouts"
                checked={forfeitPayouts}
                onChange={(e) => setForfeitPayouts(e.target.checked)}
                className="h-4 w-4 rounded-[2px] accent-[#CC6600] cursor-pointer"
              />
              <label
                htmlFor="forfeitPayouts"
                className="text-xs text-red-200 cursor-pointer select-none"
              >
                <strong>Enforce Payout Forfeiture:</strong> Void pending
                milestone payouts due to severe ethical breach or off-platform
                direct payment solicitation.
              </label>
            </div>

            <FormFooter className="mt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsTerminateOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="danger"
                loading={isPending}
                disabled={terminateReason.trim().length < 10}
              >
                EXECUTE PERMANENT TERMINATION
              </Button>
            </FormFooter>
          </form>
        </Modal>
      )}

      {/* ── 6. Admin Place On Leave Modal ── */}
      {selectedStaff && (
        <Modal
          open={isAdminLeaveOpen}
          onClose={() => setIsAdminLeaveOpen(false)}
          title={`Place on Leave: ${selectedStaff.fullName}`}
          size="md"
        >
          <form
            onSubmit={handleAdminPlaceOnLeaveSubmit}
            className="flex flex-col gap-4 font-sans"
          >
            <Alert variant="info">
              Placing this staff member on leave will immediately hide them from the Module 08 specialist assignment pool. They will retain login access to their workbench.
            </Alert>

            {actionError && <Alert variant="danger">{actionError}</Alert>}

            {/* Reason for Leave with Dropdown Selector */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white/90">
                  Reason for Leave (Mandatory)
                </label>
                <span className="text-[0.625rem] text-white/50 font-mono">
                  Select template or enter custom note
                </span>
              </div>

              {/* Template Dropdown */}
              <div className="relative">
                <select
                  value={LEAVE_REASON_TEMPLATES.find((t) => t.text === adminLeaveReason)?.text || ""}
                  onChange={(e) => {
                    if (e.target.value) {
                      setAdminLeaveReason(e.target.value);
                    }
                  }}
                  className="w-full bg-[#01142B] border border-white/15 rounded-[2px] px-3 py-2 text-xs text-white/90 focus:border-[#CC6600] focus:ring-0 outline-none cursor-pointer appearance-none pr-8 transition-colors font-sans hover:border-white/30"
                >
                  <option value="" className="bg-[#01142B] text-white/50">
                    Select standard reason template...
                  </option>
                  {LEAVE_REASON_TEMPLATES.map((tmpl) => (
                    <option
                      key={tmpl.label}
                      value={tmpl.text}
                      className="bg-[#01142B] text-white py-1"
                    >
                      {tmpl.label}
                    </option>
                  ))}
                </select>
                <IconChevronDown
                  size={14}
                  stroke={2}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none"
                />
              </div>

              <textarea
                value={adminLeaveReason}
                onChange={(e) => setAdminLeaveReason(e.target.value)}
                placeholder="e.g. Approved medical leave, sabbatical, conference attendance..."
                className="w-full bg-[#01142B] border border-white/10 rounded-[2px] p-2.5 text-xs text-white placeholder-white/40 focus:border-[#CC6600] outline-none resize-none h-16 font-sans leading-relaxed"
              />
            </div>

            {/* Leave Duration & Date Range (Day or Days) */}
            <div className="flex flex-col gap-2 p-3 bg-black/40 border border-white/10 rounded-[2px]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white/90">
                  Leave Duration (Day or Days)
                </label>
                {isAdminReturnBeforeStart ? (
                  <span className="text-xs font-mono font-semibold text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded-[2px] border border-rose-500/30">
                    Invalid: Return Before Start
                  </span>
                ) : isAdminStartInPast ? (
                  <span className="text-xs font-mono font-semibold text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded-[2px] border border-rose-500/30">
                    Invalid: Past Start Date
                  </span>
                ) : adminCalculatedDays !== null ? (
                  <span className="text-xs font-mono font-semibold text-[#FF9433] bg-[#CC6600]/15 px-2 py-0.5 rounded-[2px] border border-[#CC6600]/30">
                    {adminCalculatedDays} {adminCalculatedDays === 1 ? "Day" : "Days"} Scheduled
                  </span>
                ) : null}
              </div>

              {/* Start Date & Return Date inputs side-by-side */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="flex flex-col gap-1">
                  <span className="text-[0.688rem] uppercase font-mono text-white/50">
                    Leave Start Date
                  </span>
                  <input
                    type="date"
                    min={todayStr}
                    value={adminLeaveFrom}
                    onChange={(e) => handleAdminLeaveFromChange(e.target.value)}
                    className={`w-full bg-[#01142B] border rounded-[2px] p-2 text-xs text-white focus:border-[#CC6600] outline-none font-mono cursor-pointer transition-colors ${
                      isAdminStartInPast ? "border-rose-500/60 bg-rose-950/10" : "border-white/10 hover:border-white/20"
                    }`}
                  />
                  {isAdminStartInPast && (
                    <span className="text-[0.688rem] text-rose-400 font-sans">
                      Start date cannot be in the past.
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[0.688rem] uppercase font-mono text-white/50">
                    Expected Return Date
                  </span>
                  <input
                    type="date"
                    min={adminLeaveFrom || todayStr}
                    value={adminLeaveUntil}
                    onChange={(e) => handleAdminLeaveUntilChange(e.target.value)}
                    className={`w-full bg-[#01142B] border rounded-[2px] p-2 text-xs text-white focus:border-[#CC6600] outline-none font-mono cursor-pointer transition-colors ${
                      isAdminReturnBeforeStart ? "border-rose-500/60 bg-rose-950/10" : "border-white/10 hover:border-white/20"
                    }`}
                  />
                  {isAdminReturnBeforeStart && (
                    <span className="text-[0.688rem] text-rose-400 font-sans">
                      Return date cannot be earlier than start date.
                    </span>
                  )}
                </div>
              </div>
            </div>

            <FormFooter className="mt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsAdminLeaveOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={isPending}
                disabled={adminLeaveReason.trim().length < 3}
              >
                CONFIRM LEAVE STATUS
              </Button>
            </FormFooter>
          </form>
        </Modal>
      )}

      {toastMessage && (
        <Toast
          message={toastMessage.message}
          description={toastMessage.description}
          variant={toastMessage.variant}
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}
