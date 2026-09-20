"use client";

import React, { useState, useEffect, useTransition } from "react";
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
        title="Administrator Profile"
        description="Manage your system administration credentials, operational domains, and staff contact records."
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "Administration", href: "/dashboard/admin" },
          { label: "My Profile" },
        ]}
        actions={
          <Link href="/dashboard/admin">
            <Button variant="outline" size="sm" className="rounded-[2px]">
              Back to Admin Desk
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
          {/* Identity & Corporate Metadata (Read-Only) */}
          <Card className="p-6 bg-[#010D1F] border border-white/[0.08]">
            <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider mb-4 pb-3 border-b border-white/[0.08]">
              Administrator Identity
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
                  System Email
                </span>
                <span className="text-sm font-mono text-white/80">
                  {profile?.email || "—"}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs font-mono text-white/50 uppercase tracking-wider">
                  Assigned Role
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-[2px] text-xs font-mono font-semibold bg-[#CC6600]/15 text-[#FFA040] border border-[#CC6600]/30">
                    ADMINISTRATOR
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-mono text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Active
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Bio / Summary */}
          <Card className="p-6 bg-[#010D1F] border border-white/[0.08]">
            <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider mb-1">
              Operational Scope &amp; Summary
            </h2>
            <p className="text-xs text-white/50 mb-4">
              Describe your study intake oversight, triage coordination, and operational responsibilities.
            </p>

            <FormTextarea
              label="Professional Summary / Admin Profile"
              placeholder="e.g., Lead Operations Administrator coordinating research intake validation, expert statistician assignment routing, and client milestone delivery."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              monoLabel
            />
          </Card>

          {/* Competencies Multi-Tag Manager */}
          <Card className="p-6 bg-[#010D1F] border border-white/[0.08] flex flex-col gap-5">
            <div>
              <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider mb-1">
                Operational Oversight Domains
              </h2>
              <p className="text-xs text-white/50">
                Tag your primary administration workflows across intake, quoting, expert assignments, and support triage.
              </p>
            </div>

            {/* Active Tags */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-mono text-white/50 uppercase tracking-wider">
                Active Domains ({specializations.length})
              </span>
              <div className="flex flex-wrap gap-2 min-h-[42px] p-3 rounded-[2px] bg-[#011B38] border border-white/[0.12] items-center">
                {specializations.length === 0 ? (
                  <span className="text-xs text-white/30 italic font-mono">
                    No domains added yet. Select from suggestions below or type a custom tag.
                  </span>
                ) : (
                  specializations.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] text-xs font-mono bg-[#012E57] text-sky-200 border border-sky-400/30"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-sky-400 hover:text-white transition-colors cursor-pointer"
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
                placeholder="Type custom domain (e.g., Workload Balancing)..."
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
                + ADD TAG
              </Button>
            </div>

            {/* Quick-Add Suggestions */}
            <div className="flex flex-col gap-2 pt-3 border-t border-white/[0.06]">
              <span className="text-xs font-mono text-white/50 uppercase tracking-wider">
                Quick-Add Standard Domains
              </span>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_ADMIN_SPECIALIZATIONS.filter((s) => !specializations.includes(s)).map(
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

          {/* Form Actions */}
          <FormFooter className="mt-4">
            <Link href="/dashboard/admin">
              <Button type="button" variant="ghost" disabled={isPending}>
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              loading={isPending}
            >
              Save Profile Changes
            </Button>
          </FormFooter>
        </form>
      )}

      {!isLoading && <ChangePasswordCard />}
    </div>
  );
}
