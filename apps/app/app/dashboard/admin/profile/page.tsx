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
  Gear,
  Plus,
  X,
  CheckCircle,
  ShieldCheck,
} from "@phosphor-icons/react";
import { getOwnProfile, updateOwnProfile } from "@/features/staff/actions";
import { ChangePasswordCard } from "@/features/auth/components/ChangePasswordCard";

const POPULAR_ADMIN_SPECIALIZATIONS = [
  "Study Intake Triage & Quoting",
  "Expert Assignment & Workload Balancing",
  "Client Escalations & Revisions",
  "Staff Access & Role Permissions",
  "System Audit & Activity Logging",
  "Dispute Mediation & Resolutions",
  "Communication Firewall Oversight",
  "Platform Operations & Security",
];

export default function AdminProfilePage() {
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
            description: "Administrator profile and operational domains updated.",
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
    : "AD";

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
        title="Administrator Profile & Scope"
        description="Configure your administrative credentials, intake triage specialties, and system operational domains."
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "Platform Admin", href: "/dashboard/admin" },
          { label: "Profile Settings" },
        ]}
        actions={
          <Link href="/dashboard/admin">
            <Button variant="outline" size="sm" className="rounded-[2px] font-sans">
              Back to Admin Desk
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
              <span>Admin Profile &amp; Scope</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Key size={15} weight="fill" />
              <span>Account Security</span>
            </TabsTrigger>
          </TabsList>

          {/* ── TAB 1: ADMIN PROFILE ── */}
          <TabsContent value="profile" className="flex flex-col gap-6 outline-none">
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              {/* Administrator Identity Card */}
              <Card className="p-6 sm:p-8 bg-[#01142B] border border-white/10 rounded-[2px] shadow-xl flex flex-col gap-6">
                {/* Canonical Card Header (Rule 21) */}
                <div className="border-b border-white/10 pb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white font-sans flex items-center gap-2.5">
                      <IdentificationCard size={18} weight="fill" className="text-[#CC6600]" />
                      <span>Administrator Identity</span>
                    </h3>
                    <p className="text-xs text-white/60 font-sans mt-0.5">
                      Platform credentials &amp; operations authority
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
                        {profile?.fullName || "System Administrator"}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-[2px] text-[10px] font-mono font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                          ADMINISTRATOR
                        </span>
                        <span className="text-xs font-mono text-white/40">
                          Platform Operations &amp; Research Triage
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
                        {profile?.email || "admin@jaxis.dev"}
                      </span>
                      <CopyButton
                        value={profile?.email || "admin@jaxis.dev"}
                        variant="ghost"
                        className="p-0.5 text-white/40 hover:text-white shrink-0"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 p-3 rounded-[2px] bg-[#010D1F]/50 border border-white/[0.06]">
                    <span className="text-[11px] font-mono text-white/50 uppercase tracking-wider">
                      Administrative Desk
                    </span>
                    <span className="text-xs font-sans text-white/90 truncate">
                      Intake &amp; Specialist Coordination
                    </span>
                  </div>

                  <div className="flex flex-col gap-1 p-3 rounded-[2px] bg-[#010D1F]/50 border border-white/[0.06]">
                    <span className="text-[11px] font-mono text-white/50 uppercase tracking-wider">
                      Access Privileges
                    </span>
                    <span className="text-xs font-sans text-emerald-400 font-medium truncate">
                      Full System Administration
                    </span>
                  </div>

                  <div className="flex flex-col gap-1 p-3 rounded-[2px] bg-[#010D1F]/50 border border-white/[0.06]">
                    <span className="text-[11px] font-mono text-white/50 uppercase tracking-wider">
                      Administrator ID
                    </span>
                    <span className="text-xs font-mono text-white/70">
                      {profile?.id ? `ADM-${profile.id.slice(-6).toUpperCase()}` : "ADM-001"}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Administrative Scope & Bio Card */}
              <Card className="p-6 sm:p-8 bg-[#01142B] border border-white/10 rounded-[2px] shadow-xl flex flex-col gap-6">
                {/* Canonical Card Header (Rule 21) */}
                <div className="border-b border-white/10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-white font-sans flex items-center gap-2.5">
                      <Article size={18} weight="fill" className="text-[#CC6600]" />
                      <span>Administrative Scope &amp; Responsibilities</span>
                    </h3>
                    <p className="text-xs text-white/60 font-sans mt-1">
                      Describe your platform management focus, intake triage role, and escalation handling duties.
                    </p>
                  </div>
                  <span className="text-xs font-mono text-white/70 uppercase font-semibold px-2.5 py-1 rounded-[2px] bg-white/[0.06] border border-white/10 flex-shrink-0 self-start sm:self-auto">
                    Admin Bio
                  </span>
                </div>

                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono text-white/70 uppercase tracking-wider font-semibold">
                      Professional Summary / Administrative Profile
                    </label>
                    <span className="text-[11px] font-mono text-white/40">
                      {bio.length} characters
                    </span>
                  </div>
                  <textarea
                    placeholder="e.g., Platform Administrator responsible for study intake evaluation, specialist matching, SLA enforcement, and communication policy compliance across all active workspaces."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={4}
                    className="w-full bg-[#010D1F] border border-white/10 rounded-[2px] p-3.5 text-sm font-sans text-white placeholder:text-white/30 focus:outline-none focus:border-[#CC6600] transition-colors leading-relaxed resize-y"
                  />
                  <p className="text-[11px] font-sans text-white/40">
                    This summary is visible across operational triage reports and administrative audit logs.
                  </p>
                </div>
              </Card>

              {/* Triage & Operational Domains Card */}
              <Card className="p-6 sm:p-8 bg-[#01142B] border border-white/10 rounded-[2px] shadow-xl flex flex-col gap-6">
                {/* Canonical Card Header (Rule 21) */}
                <div className="border-b border-white/10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-white font-sans flex items-center gap-2.5">
                      <Gear size={18} weight="fill" className="text-[#CC6600]" />
                      <span>Intake Triage &amp; Operational Domains</span>
                    </h3>
                    <p className="text-xs text-white/60 font-sans mt-1">
                      Specify the operational workflows, triage gates, and administrative tasks under your direct purview.
                    </p>
                  </div>
                  <span className="text-xs font-mono text-[#FFA040] uppercase font-semibold px-2.5 py-1 rounded-[2px] bg-[#CC6600]/10 border border-[#CC6600]/30 flex-shrink-0 self-start sm:self-auto">
                    {specializations.length} Domains
                  </span>
                </div>

                {/* Active Domains Tag Pool */}
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-white/70 uppercase tracking-wider font-semibold">
                      Active Operational Domains ({specializations.length})
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
                        No operational domains selected yet. Add tags below or click from popular domains.
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
                    placeholder="Add custom domain (e.g., SLA Exceptions, Cloudflare R2 Storage Management)..."
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
                    <span>Add Domain</span>
                  </Button>
                </div>

                {/* Recommended Quick-Add Pool */}
                <div className="flex flex-col gap-2 pt-2 border-t border-white/[0.06]">
                  <span className="text-[11px] font-mono text-white/40 uppercase tracking-wider">
                    Recommended Platform Administration Domains
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR_ADMIN_SPECIALIZATIONS.filter((s) => !specializations.includes(s)).map((spec) => (
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
                    {POPULAR_ADMIN_SPECIALIZATIONS.filter((s) => !specializations.includes(s)).length === 0 && (
                      <span className="text-xs text-white/40 font-sans italic">
                        All standard admin domains have been added.
                      </span>
                    )}
                  </div>
                </div>
              </Card>

              {/* Save Action Bar */}
              <Card className="p-4 sm:p-5 bg-[#01142B] border border-white/10 rounded-[2px] shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-white/50 font-sans">
                  <CheckCircle size={15} weight="fill" className="text-emerald-400 shrink-0" />
                  <span>Changes take effect immediately across platform triage and coordination queues.</span>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <Link href="/dashboard/admin">
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
                    Save Admin Profile
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
                Manage your administrative login credentials to maintain strict system-wide operational integrity.
              </p>
            </Card>

            <ChangePasswordCard />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
