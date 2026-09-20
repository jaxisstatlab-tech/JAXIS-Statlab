"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import {
  PageHeader,
  Card,
  Button,
  LoadingState,
  CopyButton,
  Toast,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@repo/ui";
import {
  Article,
  Brain,
  IdentificationCard,
  Tag,
  Plus,
  X,
  CheckCircle,
  UserCircle,
  Key,
  ShieldCheck,
} from "@phosphor-icons/react";
import { getOwnProfile, updateOwnProfile } from "@/features/staff/actions";
import { ChangePasswordCard } from "@/features/auth/components/ChangePasswordCard";

const POPULAR_SPECIALIZATIONS = [
  "Regression Analysis",
  "ANOVA / MANOVA",
  "Structural Equation Modeling (SEM)",
  "Time Series Forecasting",
  "Survival Analysis",
  "Multivariate Modeling",
  "Bayesian Estimation",
  "Non-Parametric Tests",
  "Hierarchical Linear Modeling (HLM)",
  "Monte Carlo Simulation",
  "SPSS Syntax Scripting",
  "R / tidyverse Pipeline",
  "Python (pandas/statsmodels)",
];

export default function StatisticianProfilePage() {
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

  const [bio, setBio] = useState("");
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [isLoading, setIsLoading] = useState(true);
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

  const handleRemoveTag = (tag: string) => {
    setSpecializations(specializations.filter((s) => s !== tag));
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
            message: "Profile Updated",
            description: "Your bio and certified specializations have been saved.",
            variant: "success",
          });
        } else {
          setToastMessage({
            message: "Unable to Save Profile",
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

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-24 w-full animate-content-fade font-sans">
      {toastMessage && (
        <Toast
          message={toastMessage.message}
          description={toastMessage.description}
          variant={toastMessage.variant}
          onClose={() => setToastMessage(null)}
        />
      )}

      <PageHeader
        title="Statistician Profile & Specializations"
        description="Configure your research bio, certified statistical methodologies, and analytical tools."
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "Statistician Lab", href: "/dashboard/statistician" },
          { label: "Profile Settings" },
        ]}
        actions={
          <Link href="/dashboard/statistician">
            <Button variant="outline" size="sm" className="rounded-[2px] font-sans">
              Back to Workbench
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
              <span>Profile &amp; Specializations</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Key size={15} weight="fill" />
              <span>Account Security</span>
            </TabsTrigger>
          </TabsList>

          {/* ── TAB 1: PROFILE & SPECIALIZATIONS ── */}
          <TabsContent value="profile" className="flex flex-col gap-6 outline-none">
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              {/* Specialist Identity & Roster Details */}
              <Card className="p-6 sm:p-8 bg-[#01142B] border border-white/10 rounded-[2px] shadow-xl flex flex-col gap-6">
                {/* Canonical Card Header (Rule 21) */}
                <div className="border-b border-white/10 pb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white font-sans flex items-center gap-2.5">
                      <IdentificationCard size={18} weight="fill" className="text-[#CC6600]" />
                      <span>Specialist Identity</span>
                    </h3>
                    <p className="text-xs text-white/60 font-sans mt-0.5">
                      Credentials &amp; roster status
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 uppercase font-semibold px-2 py-0.5 rounded-[2px] bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Active Duty
                  </span>
                </div>

                {/* Specialist Profile Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-[2px] bg-[#010D1F] border border-white/10">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-[2px] bg-[#011B38] border border-white/15 flex items-center justify-center font-sans font-bold text-base text-white shadow-inner shrink-0">
                      {profile?.fullName
                        ? profile.fullName
                            .split(" ")
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                        : "ST"}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-base font-bold text-white font-sans truncate">
                        {profile?.fullName || "Dr. Juan Reyes"}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-[2px] text-[10px] font-mono font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                          STATISTICIAN
                        </span>
                        <span className="text-xs font-mono text-white/40">
                          Lead Quantitative Expert
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Key-Value Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
                  <div className="flex flex-col gap-1 p-3 rounded-[2px] bg-[#010D1F]/50 border border-white/[0.06]">
                    <span className="text-[11px] font-mono text-white/50 uppercase tracking-wider">
                      Email Address
                    </span>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-mono text-white/90 truncate">
                        {profile?.email || "stat@jaxis.dev"}
                      </span>
                      <CopyButton
                        value={profile?.email || "stat@jaxis.dev"}
                        variant="ghost"
                        className="p-0.5 text-white/40 hover:text-white shrink-0"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 p-3 rounded-[2px] bg-[#010D1F]/50 border border-white/[0.06]">
                    <span className="text-[11px] font-mono text-white/50 uppercase tracking-wider">
                      Laboratory Desk
                    </span>
                    <span className="text-xs font-sans text-white/90 truncate">
                      Quantitative Modeling
                    </span>
                  </div>

                  <div className="flex flex-col gap-1 p-3 rounded-[2px] bg-[#010D1F]/50 border border-white/[0.06]">
                    <span className="text-[11px] font-mono text-white/50 uppercase tracking-wider">
                      Clearance Level
                    </span>
                    <span className="text-xs font-sans text-emerald-400 font-medium truncate">
                      Full Compute Access
                    </span>
                  </div>

                  <div className="flex flex-col gap-1 p-3 rounded-[2px] bg-[#010D1F]/50 border border-white/[0.06]">
                    <span className="text-[11px] font-mono text-white/50 uppercase tracking-wider">
                      Specialist ID
                    </span>
                    <span className="text-xs font-mono text-white/70">
                      {profile?.id ? `STAT-${profile.id.slice(-6).toUpperCase()}` : "STAT-001"}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Card: Methodological Focus & Bio */}
              <Card className="p-6 sm:p-8 bg-[#01142B] border border-white/10 rounded-[2px] shadow-xl flex flex-col gap-6">
                {/* Canonical Card Header (Rule 21) */}
                <div className="border-b border-white/10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-white font-sans flex items-center gap-2.5">
                      <Article size={18} weight="fill" className="text-[#CC6600]" />
                      <span>Methodological Focus &amp; Bio</span>
                    </h3>
                    <p className="text-xs text-white/60 font-sans mt-1">
                      Describe your statistical expertise, modeling philosophy, and primary software toolstacks.
                    </p>
                  </div>
                  <span className="text-xs font-mono text-white/70 uppercase font-semibold px-2.5 py-1 rounded-[2px] bg-white/[0.06] border border-white/10 flex-shrink-0 self-start sm:self-auto">
                    Specialist Bio
                  </span>
                </div>

                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono text-white/70 uppercase tracking-wider font-semibold">
                      Professional Bio &amp; Analytical Profile
                    </label>
                    <span className="text-[11px] font-mono text-white/40">
                      {bio.length} characters
                    </span>
                  </div>
                  <textarea
                    placeholder="e.g., Senior PhD statistician specializing in multivariate quantitative models, structural equation modeling (SEM), and APA-compliant statistical reporting. 8+ years executing computational workflows in R, Python, and SPSS."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={4}
                    className="w-full bg-[#010D1F] border border-white/10 rounded-[2px] p-3.5 text-sm font-sans text-white placeholder:text-white/30 focus:outline-none focus:border-[#CC6600] transition-colors leading-relaxed resize-y"
                  />
                  <p className="text-[11px] font-sans text-white/40">
                    This summary helps research coordinators and QA leads match you with appropriate study proposals.
                  </p>
                </div>
              </Card>

              {/* Card: Certified Specializations Multi-Tag Manager */}
              <Card className="p-6 sm:p-8 bg-[#01142B] border border-white/10 rounded-[2px] shadow-xl flex flex-col gap-6">
                {/* Canonical Card Header (Rule 21) */}
                <div className="border-b border-white/10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-white font-sans flex items-center gap-2.5">
                      <Brain size={18} weight="fill" className="text-[#CC6600]" />
                      <span>Certified Methodologies &amp; Tools</span>
                    </h3>
                    <p className="text-xs text-white/60 font-sans mt-1">
                      Select the computational techniques and statistical models you are certified to execute.
                    </p>
                  </div>
                  <span className="text-xs font-mono text-[#FFA040] uppercase font-semibold px-2.5 py-1 rounded-[2px] bg-[#CC6600]/10 border border-[#CC6600]/30 flex-shrink-0 self-start sm:self-auto">
                    {specializations.length} Certified
                  </span>
                </div>

                {/* Active Specializations Tag Pool */}
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-white/70 uppercase tracking-wider font-semibold">
                      Active Specializations ({specializations.length})
                    </span>
                    {specializations.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSpecializations([])}
                        className="text-[11px] font-sans text-white/40 hover:text-red-400 transition-colors cursor-pointer"
                      >
                        Clear all
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 min-h-[52px] p-3.5 rounded-[2px] bg-[#010D1F] border border-white/10 items-center">
                    {specializations.length === 0 ? (
                      <span className="text-xs text-white/40 italic font-sans">
                        No specializations added yet. Select from the standard methodologies below or add a custom tag.
                      </span>
                    ) : (
                      specializations.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[2px] text-xs font-sans font-medium bg-sky-500/10 text-sky-200 border border-sky-400/30 transition-all hover:border-sky-400/50"
                        >
                          <span>{tag}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="text-sky-400 hover:text-white transition-colors cursor-pointer p-0.5 rounded-sm hover:bg-sky-500/20"
                            title={`Remove ${tag}`}
                          >
                            <X size={12} weight="bold" />
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Custom Tag Input */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-mono text-white/70 uppercase tracking-wider font-semibold">
                    Add Custom Methodology or Software
                  </label>
                  <div className="flex items-stretch gap-2">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/40">
                        <Tag size={15} weight="fill" />
                      </div>
                      <input
                        type="text"
                        placeholder="Type custom methodology (e.g., Hierarchical Bayesian, Mplus, G*Power)..."
                        value={customTag}
                        onChange={(e) => setCustomTag(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddTag(customTag);
                          }
                        }}
                        className="w-full h-10 pl-10 pr-3.5 bg-[#010D1F] border border-white/10 rounded-[2px] text-xs font-sans text-white placeholder-white/30 focus:outline-none focus:border-[#CC6600] transition-colors"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleAddTag(customTag)}
                      disabled={!customTag.trim()}
                      className="h-10 px-4 text-xs font-sans font-semibold rounded-[2px] whitespace-nowrap active:scale-[0.97] transition-transform"
                    >
                      + Add Tag
                    </Button>
                  </div>
                </div>

                {/* Quick-Add Suggestions */}
                <div className="flex flex-col gap-2.5 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-white/60 uppercase tracking-wider font-semibold">
                      Quick-Add Standard Methodologies
                    </span>
                    <span className="text-[11px] font-sans text-white/40">
                      Click to add
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR_SPECIALIZATIONS.filter((s) => !specializations.includes(s)).map((spec) => (
                      <button
                        key={spec}
                        type="button"
                        onClick={() => handleAddTag(spec)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[2px] text-xs font-sans bg-white/[0.04] hover:bg-[#CC6600]/15 text-white/80 hover:text-white border border-white/10 hover:border-[#CC6600]/40 transition-all active:scale-[0.97] cursor-pointer"
                      >
                        <Plus size={11} weight="bold" className="text-[#CC6600]" />
                        <span>{spec}</span>
                      </button>
                    ))}
                    {POPULAR_SPECIALIZATIONS.filter((s) => !specializations.includes(s)).length === 0 && (
                      <span className="text-xs text-white/40 font-sans italic">
                        All standard methodologies have been added.
                      </span>
                    )}
                  </div>
                </div>
              </Card>

              {/* Save Action Bar */}
              <Card className="p-4 sm:p-5 bg-[#01142B] border border-white/10 rounded-[2px] shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-white/50 font-sans">
                  <CheckCircle size={15} weight="fill" className="text-emerald-400 shrink-0" />
                  <span>Changes take effect immediately across project matching and triage.</span>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <Link href="/dashboard/statistician">
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
                    Save Profile Changes
                  </Button>
                </div>
              </Card>
            </form>
          </TabsContent>

          {/* ── TAB 2: ACCOUNT SECURITY ── */}
          <TabsContent value="security" className="flex flex-col gap-6 outline-none">
            {/* Security Overview Card */}
            <Card className="p-6 bg-[#01142B] border border-white/10 rounded-[2px] shadow-xl flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <ShieldCheck size={20} weight="fill" className="text-[#CC6600]" />
                <h3 className="text-base font-bold text-white font-sans">
                  Account Security &amp; Credentials
                </h3>
              </div>
              <p className="text-xs text-white/60 font-sans leading-relaxed max-w-2xl">
                Manage your login password to ensure security across your research sessions. We recommend choosing a strong password with at least 8 characters, an uppercase letter, and a number.
              </p>
            </Card>

            {/* Change Password Card */}
            <ChangePasswordCard />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

