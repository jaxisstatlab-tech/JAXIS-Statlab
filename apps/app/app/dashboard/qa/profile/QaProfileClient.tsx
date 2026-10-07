"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader, Button, Toast, CopyButton } from "@repo/ui";
import { Plus, Warning, X } from "@phosphor-icons/react";
import { Panel, PanelBody, PanelHeader } from "@/components/dashboard/Panel";
import { updateOwnProfile } from "@/features/staff/actions";
import { SignatureCard } from "@/features/staff/components/SignatureCard";
import { ChangePasswordCard } from "@/features/auth/components/ChangePasswordCard";

// The reviewer's own profile: signature first (required for approving), what they review best, account details
// and password.

type Profile = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  status: string;
  bio: string | null;
  specializations: string[];
  signatureUrl?: string | null;
  joinedAt: Date | string;
};

const SUGGESTED_SKILLS = [
  "Re-running analyses from code",
  "Checking test assumptions",
  "Effect sizes and confidence intervals",
  "APA 7 tables and figures",
  "Survey and scale checks (reliability, validity)",
  "R and Quarto code",
  "SPSS syntax and output",
  "Python notebooks",
  "Sample size and power",
  "Outliers and missing data",
];

const STATUS_WORD: Record<string, string> = {
  ACTIVE: "Active",
  LEAVE_PENDING: "Leave requested",
  ON_LEAVE: "On leave",
  SUSPENDED: "Suspended",
};

const FIELD =
  "w-full rounded-[2px] border border-white/10 bg-[#050513] font-sans text-[13px] text-white outline-none placeholder:text-white/30 focus:border-[#CC6600]/60";

export function QaProfileClient({ profile }: { profile: Profile | null }) {
  const router = useRouter();
  const [hasSignature, setHasSignature] = useState(Boolean(profile?.signatureUrl));
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [skills, setSkills] = useState<string[]>(profile?.specializations ?? []);
  const [custom, setCustom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; description?: string; variant: "success" | "danger" } | null>(null);
  const [busy, start] = useTransition();

  if (!profile) {
    return (
      <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-24 w-full animate-content-fade font-sans">
        <PageHeader title="My Profile" breadcrumbs={[{ label: "WORKSPACE", href: "/dashboard" }, { label: "My Profile" }]} />
        <Panel as="div">
          <PanelBody className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-white/70">Your profile didn&apos;t load. Nothing is lost.</p>
            <Button variant="outline" size="sm" onClick={() => router.refresh()}>
              Try Again
            </Button>
          </PanelBody>
        </Panel>
      </div>
    );
  }

  const addSkill = (value: string) => {
    const v = value.trim();
    if (!v || skills.includes(v)) return;
    setSkills((all) => [...all, v]);
    setCustom("");
    setError(null);
  };

  const saveAbout = () => {
    if (skills.length === 0) return setError("Pick at least one thing you review well.");
    setError(null);
    start(async () => {
      const res = await updateOwnProfile({ bio: bio.trim() || undefined, specializations: skills });
      if (res.success) setToast({ message: "Profile saved", variant: "success" });
      else setError(res.error.message || "Couldn't save. Please try again.");
    });
  };

  const initials = profile.fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-24 w-full animate-content-fade font-sans">
      <PageHeader
        title="My Profile"
        description={
          hasSignature
            ? "Your signature, what you review best, and your password."
            : "Add your signature first. It goes on the certificate of every study you approve."
        }
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "Review Desk", href: "/dashboard/qa" },
          { label: "My Profile" },
        ]}
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/qa">Back to Review Desk</Link>
          </Button>
        }
      />

      {!hasSignature ? (
        <Panel as="div" className="border-[#CC6600]/40">
          <PanelBody className="flex items-start gap-3">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#CC6600]" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-white">Add your signature before you approve studies</p>
              <p className="mt-0.5 text-[13px] text-white/55">
                Clients get a certificate with your signature when you approve their study. Until you add one, Approve is switched off.
              </p>
            </div>
          </PanelBody>
        </Panel>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-8">
          <SignatureCard
            initial={profile.signatureUrl ?? null}
            required
            onSaved={(value, message) => {
              setHasSignature(Boolean(value));
              setToast({ message, description: value ? "It will be printed on the certificates of studies you approve." : undefined, variant: "success" });
            }}
          />

          <Panel>
            <PanelHeader title="What you review best" subtitle="Admins see this when they choose a reviewer for a study." />
            <PanelBody className="flex flex-col gap-5">
              <label className="flex flex-col gap-1.5 text-[13px] text-white/70">
                About you (optional)
                <textarea
                  rows={4}
                  maxLength={1000}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="For example: I check thesis analyses in psychology and education, mostly regression and scale validation."
                  className={`${FIELD} resize-none p-3 leading-relaxed`}
                />
                <span className="self-end font-mono text-[11px] text-white/35">{bio.length} / 1000</span>
              </label>

              <div className="flex flex-col gap-2">
                <p className="text-[13px] text-white/70">Skills</p>
                {skills.length > 0 ? (
                  <ul className="flex flex-wrap gap-1.5">
                    {skills.map((s) => (
                      <li key={s} className="inline-flex items-center gap-1 rounded-[2px] border border-white/15 bg-white/[0.05] py-1 pl-2.5 pr-1 text-[13px] text-white">
                        {s}
                        <button
                          type="button"
                          onClick={() => setSkills((all) => all.filter((x) => x !== s))}
                          aria-label={`Remove ${s}`}
                          className="rounded-[2px] p-0.5 text-white/45 hover:bg-white/[0.08] hover:text-white"
                        >
                          <X size={12} weight="bold" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[13px] text-white/40">None yet. Pick from the list or add your own.</p>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={custom}
                    onChange={(e) => setCustom(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSkill(custom);
                      }
                    }}
                    maxLength={60}
                    placeholder="Add a skill, e.g. Mediation and moderation"
                    aria-label="Add a skill"
                    className={`${FIELD} h-9 flex-1 px-3`}
                  />
                  <Button variant="outline" size="sm" onClick={() => addSkill(custom)} disabled={!custom.trim()} className="gap-1.5">
                    <Plus size={13} weight="bold" />
                    Add
                  </Button>
                </div>
                {SUGGESTED_SKILLS.some((s) => !skills.includes(s)) ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {SUGGESTED_SKILLS.filter((s) => !skills.includes(s)).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => addSkill(s)}
                        className="rounded-[2px] border border-dashed border-white/15 px-2.5 py-1 text-[12px] text-white/60 transition-colors hover:border-white/30 hover:text-white"
                      >
                        + {s}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              {error ? (
                <p role="alert" className="flex items-start gap-2 text-[13px] text-red-300">
                  <Warning size={15} weight="fill" className="mt-0.5 shrink-0" />
                  {error}
                </p>
              ) : null}
              <div className="flex justify-end border-t border-white/[0.07] pt-4">
                <Button variant={hasSignature ? "primary" : "outline"} size="sm" onClick={saveAbout} loading={busy} className="active:scale-[0.97]">
                  Save Profile
                </Button>
              </div>
            </PanelBody>
          </Panel>

          <ChangePasswordCard />
        </div>

        <div className="flex flex-col gap-6 lg:col-span-4">
          <Panel>
            <PanelHeader title="Account" />
            <PanelBody className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[2px] border border-white/15 bg-white/[0.04] text-sm font-semibold text-white">
                  {initials || "R"}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{profile.fullName}</p>
                  <p className="text-[12px] text-white/50">Reviewer · {STATUS_WORD[profile.status] ?? profile.status}</p>
                </div>
              </div>
              <dl className="flex flex-col gap-3 text-[13px]">
                <div>
                  <dt className="text-[12px] text-white/45">Email</dt>
                  <dd className="mt-0.5 flex items-center gap-1.5 text-white">
                    <span className="truncate">{profile.email}</span>
                    <CopyButton value={profile.email} variant="ghost" className="shrink-0 p-0.5 text-white/40 hover:text-white" />
                  </dd>
                </div>
                <div>
                  <dt className="text-[12px] text-white/45">Joined</dt>
                  <dd className="mt-0.5 text-white">
                    {new Date(profile.joinedAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                  </dd>
                </div>
              </dl>
            </PanelBody>
          </Panel>
        </div>
      </div>

      {toast ? <Toast message={toast.message} description={toast.description} variant={toast.variant} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
