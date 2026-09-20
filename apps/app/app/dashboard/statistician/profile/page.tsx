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
            message: "Profile Updated Successfully",
            description: "Your quantitative specializations and bio have been saved.",
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
        title="Statistician Profile & Specializations"
        description="Configure your quantitative research specialties, computational methodology domains, and institutional background."
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "Statistician Lab", href: "/dashboard/statistician" },
          { label: "Profile Settings" },
        ]}
        actions={
          <Link href="/dashboard/statistician">
            <Button variant="outline" size="sm" className="rounded-[2px]">
              Back to Workbench
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
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-[2px] text-xs font-mono font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    STATISTICIAN
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-mono text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Active
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Bio / Professional Summary */}
          <Card className="p-6 bg-[#010D1F] border border-white/[0.08]">
            <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider mb-1">
              Methodological Focus &amp; Summary
            </h2>
            <p className="text-xs text-white/50 mb-4">
              Describe your statistical expertise, modeling philosophy, and primary toolstacks (R, Python, SPSS, Stata, JASP).
            </p>

            <FormTextarea
              label="Professional Bio / Analytical Profile"
              placeholder="e.g., Senior quantitative researcher specializing in structural equation modeling (SEM) and multivariate regression. 8+ years executing computational workflows in R and Python."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              monoLabel
            />
          </Card>

          {/* Certified Specializations Multi-Tag Manager */}
          <Card className="p-6 bg-[#010D1F] border border-white/[0.08] flex flex-col gap-5">
            <div>
              <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider mb-1">
                Analytical Specializations &amp; Methodologies
              </h2>
              <p className="text-xs text-white/50">
                Tag the computational techniques you are certified to process. These tags determine automated project routing and QA matching.
              </p>
            </div>

            {/* Active Tags */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-mono text-white/50 uppercase tracking-wider">
                Active Specializations ({specializations.length})
              </span>
              <div className="flex flex-wrap gap-2 min-h-[42px] p-3 rounded-[2px] bg-[#011B38] border border-white/[0.12] items-center">
                {specializations.length === 0 ? (
                  <span className="text-xs text-white/30 italic font-mono">
                    No specializations added yet. Select from suggestions below or type a custom tag.
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
                placeholder="Type custom methodology (e.g., Hierarchical Bayesian)..."
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
                Quick-Add Standard Methodologies
              </span>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_SPECIALIZATIONS.filter((s) => !specializations.includes(s)).map(
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
            <Link href="/dashboard/statistician">
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
