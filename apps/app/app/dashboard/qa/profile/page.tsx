"use client";

import React, { useState, useEffect, useTransition, useRef } from "react";
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
  Brain,
  Article,
  Plus,
  X,
  CheckCircle,
  ShieldCheck,
  PenNib,
  UploadSimple,
  Trash,
} from "@phosphor-icons/react";
import { getOwnProfile, updateOwnProfile } from "@/features/staff/actions";
import { ChangePasswordCard } from "@/features/auth/components/ChangePasswordCard";

const POPULAR_QA_SPECIALIZATIONS = [
  "Instrument Validation",
  "Descriptive Statistics Audit",
  "Dual-Blind Verification",
  "Syntax & Script Audit (R / Python / SPSS)",
  "APA 7th Table & Figure Formatting",
  "Statistical Assumptions Verification",
  "Power & Sample Size Re-estimation",
  "Outlier & Normality Diagnostics",
  "Effect Size & Confidence Interval Audit",
  "Code Reproducibility Validation",
];

export default function QAProfilePage() {
  const [profile, setProfile] = useState<{
    id: string;
    fullName: string;
    email: string;
    role: string;
    status: string;
    bio: string | null;
    specializations: string[];
    signatureUrl?: string | null;
    joinedAt: Date | string;
    updatedAt: Date | string;
  } | null>(null);

  const [bio, setBio] = useState<string>("");
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [customTag, setCustomTag] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<{
    message: string;
    description?: string;
    variant: "info" | "success" | "warning" | "danger";
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const res = await getOwnProfile();
        if (res.success && res.data) {
          setProfile(res.data);
          setBio(res.data.bio || "");
          setSpecializations(res.data.specializations || []);
          setSignatureUrl(res.data.signatureUrl || null);
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

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setToastMessage({
        message: "File Too Large",
        description: "Signature image must be under 2MB.",
        variant: "danger",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setSignatureUrl(reader.result);
        setToastMessage({
          message: "Signature Preview Ready",
          description: "Click 'Save QA Profile Changes' below to permanently save this signature for all future study certificates.",
          variant: "info",
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveSignature = () => {
    setSignatureUrl(null);
    setToastMessage({
      message: "Signature Removed",
      description: "Click 'Save QA Profile Changes' below to apply.",
      variant: "info",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      try {
        const res = await updateOwnProfile({
          bio: bio.trim() || undefined,
          specializations,
          signatureUrl,
        });

        if (res.success) {
          setToastMessage({
            message: "Profile Updated Successfully",
            description: "QA Review Lead profile, audit domains, and official audit signature saved.",
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

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-24 w-full animate-content-fade">
      {toastMessage && (
        <Toast
          message={toastMessage.message}
          description={toastMessage.description}
          variant={toastMessage.variant}
          onClose={() => setToastMessage(null)}
        />
      )}

      <PageHeader
        title="Senior QA Review Lead Profile"
        description="Configure your methodology audit domains, peer review credentials, and dual-blind verification standards."
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "QA Studio", href: "/dashboard/qa" },
          { label: "Profile Settings" },
        ]}
        actions={
          <Link href="/dashboard/qa">
            <Button variant="outline" size="sm" className="rounded-[2px] font-sans">
              Back to QA Desk
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
              <span>Profile &amp; Credentials</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Key size={15} weight="fill" />
              <span>Account Security</span>
            </TabsTrigger>
          </TabsList>

          {/* ── TAB 1: PROFILE & CREDENTIALS ── */}
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
                        : "QA"}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-base font-bold text-white font-sans truncate">
                        {profile?.fullName || "Senior QA Review Lead"}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-[2px] text-[10px] font-mono font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          SENIOR QA LEAD
                        </span>
                        <span className="text-xs font-mono text-white/40">
                          Dual-Blind Verification Authority
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
                        {profile?.email || "qa@jaxis.dev"}
                      </span>
                      <CopyButton
                        value={profile?.email || "qa@jaxis.dev"}
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
                      Quality Assurance &amp; Audit
                    </span>
                  </div>

                  <div className="flex flex-col gap-1 p-3 rounded-[2px] bg-[#010D1F]/50 border border-white/[0.06]">
                    <span className="text-[11px] font-mono text-white/50 uppercase tracking-wider">
                      Clearance Level
                    </span>
                    <span className="text-xs font-sans text-emerald-400 font-medium truncate">
                      Verification &amp; Release Gate
                    </span>
                  </div>

                  <div className="flex flex-col gap-1 p-3 rounded-[2px] bg-[#010D1F]/50 border border-white/[0.06]">
                    <span className="text-[11px] font-mono text-white/50 uppercase tracking-wider">
                      Specialist ID
                    </span>
                    <span className="text-xs font-mono text-white/70">
                      {profile?.id ? `QA-${profile.id.slice(-6).toUpperCase()}` : "QA-001"}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Card: QA Audit Philosophy & Bio */}
              <Card className="p-6 sm:p-8 bg-[#01142B] border border-white/10 rounded-[2px] shadow-xl flex flex-col gap-6">
                {/* Canonical Card Header (Rule 21) */}
                <div className="border-b border-white/10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-white font-sans flex items-center gap-2.5">
                      <Article size={18} weight="fill" className="text-[#CC6600]" />
                      <span>QA Audit Philosophy &amp; Experience</span>
                    </h3>
                    <p className="text-xs text-white/60 font-sans mt-1">
                      Describe your peer-review methodology, audit rigor standards, and domain specializations.
                    </p>
                  </div>
                  <span className="text-xs font-mono text-white/70 uppercase font-semibold px-2.5 py-1 rounded-[2px] bg-white/[0.06] border border-white/10 flex-shrink-0 self-start sm:self-auto">
                    Audit Bio
                  </span>
                </div>

                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono text-white/70 uppercase tracking-wider font-semibold">
                      Professional Bio &amp; Quality Assurance Profile
                    </label>
                    <span className="text-[11px] font-mono text-white/40">
                      {bio.length} characters
                    </span>
                  </div>
                  <textarea
                    placeholder="e.g., Senior QA Reviewer specializing in dual-blind methodology audits and APA 7th compliance. Certified in instrument validation, model diagnostics, and multi-tier reproducibility verification."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={4}
                    className="w-full bg-[#010D1F] border border-white/10 rounded-[2px] p-3.5 text-sm font-sans text-white placeholder:text-white/30 focus:outline-none focus:border-[#CC6600] transition-colors leading-relaxed resize-y"
                  />
                  <p className="text-[11px] font-sans text-white/40">
                    This profile is presented on official study verification summaries and peer inspection certificates.
                  </p>
                </div>
              </Card>

              {/* Card: Verification Domains Multi-Tag Manager */}
              <Card className="p-6 sm:p-8 bg-[#01142B] border border-white/10 rounded-[2px] shadow-xl flex flex-col gap-6">
                {/* Canonical Card Header (Rule 21) */}
                <div className="border-b border-white/10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-white font-sans flex items-center gap-2.5">
                      <Brain size={18} weight="fill" className="text-[#CC6600]" />
                      <span>Verification Domains &amp; Audit Specializations</span>
                    </h3>
                    <p className="text-xs text-white/60 font-sans mt-1">
                      Specify analytical methods and compliance domains you are certified to review.
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
                      Active Audit Domains ({specializations.length})
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
                        No audit domains selected yet. Add tags below or click from popular domains.
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
                    placeholder="Add custom audit domain (e.g., Mediated Moderation, Mplus Syntax)..."
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
                    Recommended QA Standards &amp; Audit Frameworks
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR_QA_SPECIALIZATIONS.filter((s) => !specializations.includes(s)).map((spec) => (
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
                    {POPULAR_QA_SPECIALIZATIONS.filter((s) => !specializations.includes(s)).length === 0 && (
                      <span className="text-xs text-white/40 font-sans italic">
                        All standard QA domains have been added.
                      </span>
                    )}
                  </div>
                </div>
              </Card>

              {/* Card: Official Verification Signature */}
              <Card className="p-6 sm:p-8 bg-[#01142B] border border-white/10 rounded-[2px] shadow-xl flex flex-col gap-6">
                {/* Canonical Card Header (Rule 21) */}
                <div className="border-b border-white/10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-white font-sans flex items-center gap-2.5">
                      <PenNib size={18} weight="fill" className="text-[#CC6600]" />
                      <span>Official Verification Signature</span>
                    </h3>
                    <p className="text-xs text-white/60 font-sans mt-1">
                      Applied automatically to Dual-Blind Quality Certification documents.
                    </p>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 uppercase font-semibold px-2.5 py-1 rounded-[2px] bg-emerald-500/10 border border-emerald-500/20 flex-shrink-0 self-start sm:self-auto">
                    Verification Gate
                  </span>
                </div>

                <div className="flex flex-col gap-4">
                  <p className="text-xs text-white/60 font-sans leading-relaxed">
                    Upload a clean, high-contrast PNG or JPEG image of your official signature on a transparent or pure white background. This signature is embedded onto the final Certificate of Statistical Rigor upon QA approval.
                  </p>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-4 rounded-[2px] bg-[#010D1F] border border-white/10">
                    <div className="w-56 h-24 rounded-[2px] bg-white/[0.04] border border-dashed border-white/20 flex items-center justify-center relative overflow-hidden shrink-0">
                      {signatureUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={signatureUrl}
                          alt="Official QA Signature Preview"
                          className="max-h-20 max-w-full object-contain filter invert brightness-200"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1.5 text-white/30 text-center px-4">
                          <PenNib size={22} weight="fill" />
                          <span className="text-[11px] font-mono">No Signature Stored</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2.5">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={handleSignatureUpload}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          className="rounded-[2px] font-sans text-xs gap-1.5"
                        >
                          <UploadSimple size={14} weight="bold" />
                          <span>{signatureUrl ? "Replace Signature" : "Upload Signature Image"}</span>
                        </Button>
                        {signatureUrl && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleRemoveSignature}
                            className="rounded-[2px] font-sans text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-1.5"
                          >
                            <Trash size={14} weight="bold" />
                            <span>Remove</span>
                          </Button>
                        )}
                      </div>
                      <span className="text-[11px] font-sans text-white/40">
                        Recommended: PNG with transparent background, max 2MB.
                      </span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Save Action Bar */}
              <Card className="p-4 sm:p-5 bg-[#01142B] border border-white/10 rounded-[2px] shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-white/50 font-sans">
                  <CheckCircle size={15} weight="fill" className="text-emerald-400 shrink-0" />
                  <span>Changes take effect immediately across review assignment and study certification.</span>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <Link href="/dashboard/qa">
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
                    Save QA Profile Changes
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
                Manage your login password to ensure security across your quality assurance sessions. We recommend choosing a strong password with at least 8 characters, an uppercase letter, and a number.
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
