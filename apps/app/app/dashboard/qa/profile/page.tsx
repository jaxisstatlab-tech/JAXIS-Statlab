"use client";

import React, { useState, useEffect, useTransition, useRef } from "react";
import Link from "next/link";
import {
  PageHeader,
  Card,
  Button,
  FormTextarea,
  FormFooter,
  Toast,
} from "@repo/ui";
import { IconX } from "@tabler/icons-react";
import { FileText, CheckCircle, UploadSimple, Trash, WarningCircle } from "@phosphor-icons/react";
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
            <Button variant="outline" size="sm" className="rounded-[2px]">
              Back to QA Desk
            </Button>
          </Link>
        }
      />

      {isLoading ? (
        <Card className="p-12 text-center text-white/40 font-mono text-xs">
          Loading profile parameters...
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Identity & Institutional Metadata (Read-Only) */}
          <Card className="p-6 bg-[#010D1F] border border-white/[0.08]">
            <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider mb-4 pb-3 border-b border-white/[0.08]">
              Institutional Identity
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-mono text-white/50 uppercase tracking-wider">
                  Full Legal Name
                </span>
                <span className="text-sm font-semibold text-white">
                  {profile?.fullName || "—"}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs font-mono text-white/50 uppercase tracking-wider">
                  Institutional Email
                </span>
                <span className="text-sm font-mono text-white/80">
                  {profile?.email || "—"}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs font-mono text-white/50 uppercase tracking-wider">
                  Assigned Platform Role
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-[2px] text-xs font-mono font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    SENIOR QA LEAD
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-mono text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Active
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Bio / Audit Philosophy */}
          <Card className="p-6 bg-[#010D1F] border border-white/[0.08]">
            <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider mb-1">
              QA Audit Philosophy &amp; Experience
            </h2>
            <p className="text-xs text-white/50 mb-4">
              Describe your peer-review methodology, audit rigor standards, and domain specializations across academic and corporate research.
            </p>

            <FormTextarea
              label="Professional Bio / Quality Assurance Profile"
              placeholder="e.g., Senior QA Reviewer specializing in dual-blind methodology audits and APA 7th compliance. Certified in instrument validation and multi-tier reproducibility verification."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              monoLabel
            />
          </Card>

          {/* Verification Domains Multi-Tag Manager */}
          <Card className="p-6 bg-[#010D1F] border border-white/[0.08] flex flex-col gap-5">
            <div>
              <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider mb-1">
                Verification Domains &amp; Audit Specializations
              </h2>
              <p className="text-xs text-white/50">
                Specify analytical methods and compliance domains you are certified to review. Deliverables requiring these competencies will be routed to your desk.
              </p>
            </div>

            {/* Active Tags */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-mono text-white/50 uppercase tracking-wider">
                Active Audit Domains ({specializations.length})
              </span>
              <div className="flex flex-wrap gap-2 min-h-[42px] p-3 rounded-[2px] bg-[#011B38] border border-white/[0.12] items-center">
                {specializations.length === 0 ? (
                  <span className="text-xs text-white/30 italic font-mono">
                    No audit domains added yet. Select from suggestions below or type a custom tag.
                  </span>
                ) : (
                  specializations.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] text-xs font-mono bg-amber-500/10 text-amber-200 border border-amber-400/30"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-amber-400 hover:text-white transition-colors cursor-pointer"
                        title={`Remove ${tag}`}
                      >
                        <IconX size={12} stroke={2} />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className="flex items-stretch gap-2">
              <input
                type="text"
                placeholder="Type custom audit domain (e.g., Psychometric Invariance)..."
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag(customTag);
                  }
                }}
                className="flex-1 bg-[#011B38] border border-white/[0.12] rounded-[2px] text-xs font-mono text-white placeholder-white/40 focus:outline-none focus:border-[#CC6600] transition-colors"
                style={{
                  height: "2.5rem",
                  paddingLeft: "1rem",
                  paddingRight: "1rem",
                  boxSizing: "border-box",
                }}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleAddTag(customTag)}
                disabled={!customTag.trim()}
                className="h-10 px-4 text-xs font-mono whitespace-nowrap flex items-center justify-center rounded-[2px]"
                style={{
                  height: "2.5rem",
                  boxSizing: "border-box",
                }}
              >
                + ADD DOMAIN
              </Button>
            </div>

            {/* Quick-Add Suggestions */}
            <div className="flex flex-col gap-2 pt-3 border-t border-white/[0.06]">
              <span className="text-xs font-mono text-white/50 uppercase tracking-wider">
                Quick-Add Standard QA Audit Competencies
              </span>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_QA_SPECIALIZATIONS.filter((s) => !specializations.includes(s)).map(
                  (spec) => (
                    <button
                      key={spec}
                      type="button"
                      onClick={() => handleAddTag(spec)}
                      className="px-2.5 py-1 rounded-[2px] text-xs font-mono bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
                    >
                      + {spec}
                    </button>
                  )
                )}
              </div>
            </div>
          </Card>

          {/* Official Certificate Signature */}
          <Card className="p-6 bg-[#010D1F] border border-white/[0.08] flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-2.5">
                <FileText size={18} weight="fill" className="text-[#CC6600]" />
                <div>
                  <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                    Official Audit Signature
                  </h2>
                  <p className="text-xs text-white/50 mt-0.5">
                    Your enrolled signature is automatically placed on all Certificate of Statistical Audit documents you approve.
                  </p>
                </div>
              </div>
              {signatureUrl ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 self-start sm:self-auto">
                  <CheckCircle size={14} weight="fill" />
                  Active On Certificates
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] text-xs font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 self-start sm:self-auto">
                  <WarningCircle size={14} weight="fill" />
                  Signature Not Enrolled
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Upload Controls */}
              <div className="lg:col-span-6 flex flex-col gap-4">
                <p className="text-xs text-white/70 leading-relaxed">
                  Upload a clean scan or photo of your handwritten signature. For the highest print quality on A4 certificates, use a transparent PNG or high-contrast black signature on white background (maximum 2MB).
                </p>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleSignatureUpload}
                  className="hidden"
                />

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-[2px] gap-1.5"
                  >
                    <UploadSimple size={16} weight="fill" />
                    {signatureUrl ? "Replace Signature Image" : "Upload Signature Image"}
                  </Button>

                  {signatureUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveSignature}
                      className="rounded-[2px] text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 gap-1.5"
                    >
                      <Trash size={16} weight="fill" />
                      Remove Signature
                    </Button>
                  )}
                </div>

                <div className="p-3 bg-[#011B38] border border-white/[0.08] rounded-[2px] text-[11px] text-white/50 leading-relaxed">
                  <strong className="text-white/80 font-mono">Signatory Protocol:</strong> By uploading your signature, you authorize JAXIS StatLab to stamp this digital signature on official Certificates of Statistical Audit whenever you issue a formal QA Approval.
                </div>
              </div>

              {/* Right Column: Live Paper Preview Frame */}
              <div className="lg:col-span-6 flex flex-col gap-2">
                <span className="text-xs font-mono text-white/50 uppercase tracking-wider">
                  Live Certificate Paper Preview
                </span>

                <div className="bg-white text-slate-900 p-6 rounded-[2px] border border-slate-200 shadow-md flex flex-col justify-end min-h-[170px]">
                  <div className="text-[10px] font-serif font-bold text-slate-700 uppercase tracking-wider mb-2">
                    AUDITED &amp; APPROVED BY:
                  </div>

                  <div className="w-full max-w-[270px] flex flex-col items-center text-center">
                    <div className="h-16 w-full flex items-end justify-center pb-1">
                      {signatureUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={signatureUrl}
                          alt="QA Lead Signature"
                          className="max-h-16 max-w-[220px] object-contain"
                        />
                      ) : (
                        <div className="h-12 flex items-center justify-center text-xs text-slate-400 font-serif italic">
                          No signature enrolled yet
                        </div>
                      )}
                    </div>

                    <div className="w-full h-[1px] bg-slate-900 mb-1.5" />
                    <div className="text-xs font-serif font-bold text-slate-900 leading-tight">
                      {profile?.fullName || "Senior QA Lead"}
                    </div>
                    <div className="text-[11px] font-serif text-slate-600 leading-tight mt-0.5">
                      Statistical Review Editor, Quality Assurance
                    </div>
                    <div className="text-[11px] font-serif font-bold text-slate-800 leading-tight mt-0.5">
                      JAXIS STATLAB
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Form Actions */}
          <FormFooter className="mt-4">
            <Link href="/dashboard/qa">
              <Button type="button" variant="ghost" disabled={isPending}>
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              loading={isPending}
            >
              Save QA Profile Changes
            </Button>
          </FormFooter>
        </form>
      )}

      {!isLoading && <ChangePasswordCard />}
    </div>
  );
}
