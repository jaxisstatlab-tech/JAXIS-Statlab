"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import {
  PageHeader,
  Card,
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  LoadingState,
  Toast,
  CopyButton,
} from "@repo/ui";
import {
  UserCircle,
  Key,
  IdentificationCard,
  Article,
  Briefcase,
  Plus,
  X,
  CheckCircle,
  ShieldCheck,
} from "@phosphor-icons/react";
import { getOwnProfile, updateOwnProfile } from "@/features/staff/actions";
import { ChangePasswordCard } from "@/features/auth/components/ChangePasswordCard";

const POPULAR_FINANCE_SPECIALIZATIONS = [
  "Payroll & Remittances",
  "Disbursement & Escrow Approvals",
  "Tax Invoicing & Compliance",
  "Staff Onboarding & Records",
  "Leave & Timeclock Approvals",
  "GCash & Bank Settlement Verification",
  "Expense & Reimbursement Auditing",
  "Quotation & Fee Schedule Auditing",
  "Financial Reporting & Cash Flow",
  "Treasury Management",
];

export default function FinanceProfilePage() {
  const [profile, setProfile] = useState<{
    id: string;
    fullName: string;
    email: string;
    role: string;
    status: string;
    bio: string | null;
    specializations: string[];
    joinedAt: Date | string;
    updatedAt: Date | string;
  } | null>(null);

  const [bio, setBio] = useState<string>("");
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<{
    message: string;
    description?: string;
    variant: "info" | "success" | "warning" | "danger";
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const res = await getOwnProfile();
        if (res.success && res.data) {
          setProfile(res.data);
          setBio(res.data.bio || "");
          setSpecializations(res.data.specializations || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleAddTag = (tagToAdd: string) => {
    const trimmed = tagToAdd.trim();
    if (!trimmed) return;
    if (specializations.includes(trimmed)) return;
    setSpecializations((prev) => [...prev, trimmed]);
    setCustomTag("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setSpecializations((prev) => prev.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      try {
        const res = await updateOwnProfile({
          bio: bio.trim() || undefined,
          specializations,
        });

        if (res.success) {
          setToastMessage({
            message: "Profile Updated Successfully",
            description: "Finance & HR Officer profile and operational competencies updated.",
            variant: "success",
          });
        } else {
          setToastMessage({
            message: "Profile Update Failed",
            description: res.error.message || "Failed to update profile.",
            variant: "danger",
          });
        }
      } catch (err) {
        console.error(err);
        setToastMessage({
          message: "Profile Update Failed",
          description: "An unexpected error occurred while saving.",
          variant: "danger",
        });
      }
    });
  };

  const initials = profile?.fullName
    ? profile.fullName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "FN";

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-24 w-full animate-content-fade font-sans">
      {toastMessage && (
        <Toast
          message={toastMessage.message}
          description={toastMessage.description}
          variant={toastMessage.variant}
          onClose={() => setToastMessage(null)}
        />
      )}

      <PageHeader
        title="Finance & HR Officer Profile"
        description="Manage your officer identity, treasury signing credentials, and operational competencies."
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "Finance & HR", href: "/dashboard/finance" },
          { label: "Profile Settings" },
        ]}
        actions={
          <Link href="/dashboard/finance">
            <Button variant="outline" size="sm" className="rounded-[2px] font-sans">
              Back to Finance Desk
            </Button>
          </Link>
        }
      />

      {isLoading ? (
        <Card className="p-12 bg-[#01142B] border border-white/10 rounded-[2px] shadow-xl">
          <LoadingState variant="card" label="Loading profile..." />
        </Card>
      ) : (
        <Tabs defaultValue="profile" className="flex flex-col gap-6 w-full">
          <TabsList className="self-start">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <UserCircle size={15} weight="fill" />
              <span>Officer Profile &amp; Scope</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Key size={15} weight="fill" />
              <span>Account Security</span>
            </TabsTrigger>
          </TabsList>

          {/* ── TAB 1: OFFICER PROFILE ── */}
          <TabsContent value="profile" className="flex flex-col gap-6 outline-none">
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              {/* Officer Identity Card */}
              <Card className="p-6 sm:p-8 bg-[#01142B] border border-white/10 rounded-[2px] shadow-xl flex flex-col gap-6">
                {/* Canonical Card Header (Rule 21) */}
                <div className="border-b border-white/10 pb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white font-sans flex items-center gap-2.5">
                      <IdentificationCard size={18} weight="fill" className="text-[#CC6600]" />
                      <span>Officer Identity</span>
                    </h3>
                    <p className="text-xs text-white/60 font-sans mt-0.5">
                      Corporate credentials &amp; signing authority
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 uppercase font-semibold px-2 py-0.5 rounded-[2px] bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Active Duty
                  </span>
                </div>

                {/* Profile Identity Banner Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-[2px] bg-[#010D1F] border border-white/10">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-[2px] bg-[#011B38] border border-white/15 flex items-center justify-center font-sans font-bold text-base text-white shadow-inner shrink-0">
                      {initials}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-base font-bold text-white font-sans truncate">
                        {profile?.fullName || "Finance & HR Officer"}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-[2px] text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          FINANCE &amp; HR OFFICER
                        </span>
                        <span className="text-xs font-mono text-white/40">
                          Corporate Finance &amp; HR Operations
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Key-Value Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
                  <div className="flex flex-col gap-1 p-3 rounded-[2px] bg-[#010D1F]/50 border border-white/[0.06]">
                    <span className="text-[11px] font-mono text-white/50 uppercase tracking-wider">
                      Company Email
                    </span>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-mono text-white/90 truncate">
                        {profile?.email || "finance@jaxis.dev"}
                      </span>
                      <CopyButton
                        value={profile?.email || "finance@jaxis.dev"}
                        variant="ghost"
                        className="p-0.5 text-white/40 hover:text-white shrink-0"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 p-3 rounded-[2px] bg-[#010D1F]/50 border border-white/[0.06]">
                    <span className="text-[11px] font-mono text-white/50 uppercase tracking-wider">
                      Operational Desk
                    </span>
                    <span className="text-xs font-sans text-white/90 truncate">
                      Finance &amp; Treasury Desk
                    </span>
                  </div>

                  <div className="flex flex-col gap-1 p-3 rounded-[2px] bg-[#010D1F]/50 border border-white/[0.06]">
                    <span className="text-[11px] font-mono text-white/50 uppercase tracking-wider">
                      Signing Authority
                    </span>
                    <span className="text-xs font-sans text-emerald-400 font-medium truncate">
                      Disbursement &amp; Payroll Approver
                    </span>
                  </div>

                  <div className="flex flex-col gap-1 p-3 rounded-[2px] bg-[#010D1F]/50 border border-white/[0.06]">
                    <span className="text-[11px] font-mono text-white/50 uppercase tracking-wider">
                      Officer ID
                    </span>
                    <span className="text-xs font-mono text-white/70">
                      {profile?.id ? `FIN-${profile.id.slice(-6).toUpperCase()}` : "FIN-001"}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Professional Summary & Scope Card */}
              <Card className="p-6 sm:p-8 bg-[#01142B] border border-white/10 rounded-[2px] shadow-xl flex flex-col gap-6">
                {/* Canonical Card Header (Rule 21) */}
                <div className="border-b border-white/10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-white font-sans flex items-center gap-2.5">
                      <Article size={18} weight="fill" className="text-[#CC6600]" />
                      <span>Professional Summary &amp; Scope</span>
                    </h3>
                    <p className="text-xs text-white/60 font-sans mt-1">
                      Describe your financial oversight background, payroll experience, and human resources administration scope.
                    </p>
                  </div>
                  <span className="text-xs font-mono text-white/70 uppercase font-semibold px-2.5 py-1 rounded-[2px] bg-white/[0.06] border border-white/10 flex-shrink-0 self-start sm:self-auto">
                    Officer Bio
                  </span>
                </div>

                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono text-white/70 uppercase tracking-wider font-semibold">
                      Professional Summary / Officer Profile
                    </label>
                    <span className="text-[11px] font-mono text-white/40">
                      {bio.length} characters
                    </span>
                  </div>
                  <textarea
                    placeholder="e.g., Finance & HR Officer managing corporate payroll disbursement, milestone verification, leave authorizations, and staff compensation compliance."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={4}
                    className="w-full bg-[#010D1F] border border-white/10 rounded-[2px] p-3.5 text-sm font-sans text-white placeholder:text-white/30 focus:outline-none focus:border-[#CC6600] transition-colors leading-relaxed resize-y"
                  />
                  <p className="text-[11px] font-sans text-white/40">
                    This profile is recorded on corporate payroll audit ledgers and official company filings.
                  </p>
                </div>
              </Card>

              {/* Operational Competencies Card */}
              <Card className="p-6 sm:p-8 bg-[#01142B] border border-white/10 rounded-[2px] shadow-xl flex flex-col gap-6">
                {/* Canonical Card Header (Rule 21) */}
                <div className="border-b border-white/10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-white font-sans flex items-center gap-2.5">
                      <Briefcase size={18} weight="fill" className="text-[#CC6600]" />
                      <span>Operational Competencies &amp; Domains</span>
                    </h3>
                    <p className="text-xs text-white/60 font-sans mt-1">
                      Tag your primary operational duties across treasury, banking, compensation, and personnel administration.
                    </p>
                  </div>
                  <span className="text-xs font-mono text-[#FFA040] uppercase font-semibold px-2.5 py-1 rounded-[2px] bg-[#CC6600]/10 border border-[#CC6600]/30 flex-shrink-0 self-start sm:self-auto">
                    {specializations.length} Domains
                  </span>
                </div>

                {/* Active Competencies Tag Pool */}
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-white/70 uppercase tracking-wider font-semibold">
                      Active Operational Competencies ({specializations.length})
                    </span>
                    {specializations.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSpecializations([])}
                        className="text-[11px] font-sans text-white/40 hover:text-red-400 transition-colors cursor-pointer"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  {specializations.length === 0 ? (
                    <div className="p-4 rounded-[2px] bg-[#010D1F] border border-dashed border-white/10 text-center">
                      <span className="text-xs text-white/40 font-sans">
                        No competencies selected yet. Add tags below or click from popular domains.
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 p-3 rounded-[2px] bg-[#010D1F] border border-white/10 min-h-[52px]">
                      {specializations.map((spec) => (
                        <span
                          key={spec}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] text-xs font-mono bg-[#CC6600]/15 text-[#FFA040] border border-[#CC6600]/30 hover:border-[#CC6600]/50 transition-colors"
                        >
                          {spec}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(spec)}
                            className="text-[#FFA040]/70 hover:text-white transition-colors cursor-pointer"
                            title={`Remove ${spec}`}
                          >
                            <X size={12} weight="bold" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Custom Tag Input */}
                <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                  <input
                    type="text"
                    placeholder="Add custom duty (e.g., SSS & PhilHealth Compliance, Petty Cash Auditing)..."
                    value={customTag}
                    onChange={(e) => setCustomTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTag(customTag);
                      }
                    }}
                    className="flex-1 bg-[#010D1F] border border-white/10 rounded-[2px] px-3.5 py-2 text-xs font-sans text-white placeholder:text-white/30 focus:outline-none focus:border-[#CC6600] transition-colors"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddTag(customTag)}
                    disabled={!customTag.trim()}
                    className="rounded-[2px] font-sans text-xs gap-1.5 shrink-0"
                  >
                    <Plus size={14} weight="bold" />
                    <span>Add Competency</span>
                  </Button>
                </div>

                {/* Recommended Quick-Add Pool */}
                <div className="flex flex-col gap-2 pt-2 border-t border-white/[0.06]">
                  <span className="text-[11px] font-mono text-white/40 uppercase tracking-wider">
                    Recommended Finance &amp; HR Operational Domains
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR_FINANCE_SPECIALIZATIONS.filter((s) => !specializations.includes(s)).map((spec) => (
                      <button
                        key={spec}
                        type="button"
                        onClick={() => handleAddTag(spec)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[2px] text-xs font-sans bg-white/[0.04] text-white/70 border border-white/10 hover:border-[#CC6600]/40 hover:text-white hover:bg-[#CC6600]/10 transition-colors cursor-pointer text-left"
                      >
                        <Plus size={11} weight="bold" className="text-[#CC6600] shrink-0" />
                        <span>{spec}</span>
                      </button>
                    ))}
                    {POPULAR_FINANCE_SPECIALIZATIONS.filter((s) => !specializations.includes(s)).length === 0 && (
                      <span className="text-xs text-white/40 font-sans italic">
                        All standard operational domains have been added.
                      </span>
                    )}
                  </div>
                </div>
              </Card>

              {/* Save Action Bar */}
              <Card className="p-4 sm:p-5 bg-[#01142B] border border-white/10 rounded-[2px] shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-white/50 font-sans">
                  <CheckCircle size={15} weight="fill" className="text-emerald-400 shrink-0" />
                  <span>Changes update your signing records across corporate payroll and treasury receipts.</span>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <Link href="/dashboard/finance">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      className="rounded-[2px] active:scale-[0.97] transition-transform font-sans"
                    >
                      Cancel
                    </Button>
                  </Link>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    loading={isPending}
                    className="rounded-[2px] active:scale-[0.97] transition-transform font-sans font-semibold px-5"
                  >
                    Save Officer Profile
                  </Button>
                </div>
              </Card>
            </form>
          </TabsContent>

          {/* ── TAB 2: ACCOUNT SECURITY ── */}
          <TabsContent value="security" className="flex flex-col gap-6 outline-none">
            <Card className="p-6 bg-[#01142B] border border-white/10 rounded-[2px] shadow-xl flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <ShieldCheck size={20} weight="fill" className="text-[#CC6600]" />
                <h3 className="text-base font-bold text-white font-sans">
                  Account Security &amp; Credentials
                </h3>
              </div>
              <p className="text-xs text-white/60 font-sans leading-relaxed max-w-2xl">
                Manage your login password to ensure security across treasury approvals and payroll disbursement desks.
              </p>
            </Card>

            <ChangePasswordCard />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
