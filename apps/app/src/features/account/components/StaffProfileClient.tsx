"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, CopyButton, PageHeader, Toast } from "@repo/ui";
import { Plus, Warning, X } from "@phosphor-icons/react";
import { Panel, PanelBody, PanelHeader } from "@/components/dashboard/Panel";
import { PersonPhoto } from "@/components/dashboard/PersonPhoto";
import { updateOwnProfile } from "@/features/staff/actions";
import { SignatureCard } from "@/features/staff/components/SignatureCard";
import { ChangePasswordCard } from "@/features/auth/components/ChangePasswordCard";
import { MyIdentityCard } from "./MyIdentityCard";
import type { MyAccount } from "../actions";

// My Profile for every staff role (analyst, reviewer, finance, admin, CEO): name and photo, the reviewer's
// signature, what they're good at, account details and password. One page, set up per role below.

export type StaffProfile = {
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

type RoleKey = "STATISTICIAN" | "SENIOR_QA_LEAD" | "FINANCE_OFFICER" | "ADMIN" | "CEO";

const ROLES: Record<RoleKey, { word: string; home: { label: string; href: string }; skillsTitle: string; skillsHint: string; skillsRequired: boolean; suggestions: string[] }> = {
  STATISTICIAN: {
    word: "Analyst",
    home: { label: "My Studies", href: "/dashboard/statistician" },
    skillsTitle: "What you analyze best",
    skillsHint: "Admins see this when choosing who gets a study, and it decides the field match when you offer to take one.",
    skillsRequired: true,
    suggestions: [
      "Descriptive statistics",
      "t-test",
      "ANOVA",
      "Chi-square",
      "Correlation",
      "Regression",
      "Logistic regression",
      "Factor analysis",
      "Cronbach's alpha",
      "SEM",
      "Mann-Whitney U",
      "Kruskal-Wallis",
    ],
  },
  SENIOR_QA_LEAD: {
    word: "Reviewer",
    home: { label: "Review Desk", href: "/dashboard/qa" },
    skillsTitle: "What you review best",
    skillsHint: "Admins see this when they choose a reviewer for a study.",
    skillsRequired: true,
    suggestions: [
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
    ],
  },
  FINANCE_OFFICER: {
    word: "Finance",
    home: { label: "Finance", href: "/dashboard/finance" },
    skillsTitle: "What you handle",
    skillsHint: "Optional. Helps the team know who to ask.",
    skillsRequired: false,
    suggestions: ["Checking deposits", "Payslips", "Study pay", "Refunds", "Timesheets and leave", "Reports"],
  },
  ADMIN: {
    word: "Admin",
    home: { label: "Admin Overview", href: "/dashboard/admin" },
    skillsTitle: "What you handle",
    skillsHint: "Optional. Helps the team know who to ask.",
    skillsRequired: false,
    suggestions: ["New study requests", "Quotes and agreements", "Assigning teams", "Client change requests", "Staff accounts", "Messages and claims"],
  },
  CEO: {
    word: "CEO",
    home: { label: "CEO Overview", href: "/dashboard/ceo" },
    skillsTitle: "What you handle",
    skillsHint: "Optional.",
    skillsRequired: false,
    suggestions: ["Pricing and pay rates", "Payroll", "Claims and reports to the CEO", "Staff and roles", "Quality of analyses"],
  },
};

const STATUS_WORD: Record<string, string> = { ACTIVE: "Active", LEAVE_PENDING: "Leave requested", ON_LEAVE: "On leave", SUSPENDED: "Suspended" };
const FIELD =
  "w-full rounded-[2px] border border-white/10 bg-[#050513] font-sans text-[13px] text-white outline-none placeholder:text-white/30 focus:border-[#CC6600]/60";

export function StaffProfileClient({ role, profile, account }: { role: RoleKey; profile: StaffProfile | null; account: MyAccount | null }) {
  const router = useRouter();
  const cfg = ROLES[role];
  const isReviewer = role === "SENIOR_QA_LEAD";
  const [hasSignature, setHasSignature] = useState(Boolean(profile?.signatureUrl));
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [skills, setSkills] = useState<string[]>(profile?.specializations ?? []);
  const [custom, setCustom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; description?: string; variant: "success" | "danger" } | null>(null);
  const [busy, start] = useTransition();

  const crumbs = [{ label: "WORKSPACE", href: "/dashboard" }, cfg.home, { label: "My Profile" }];

  if (!profile || !account) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-24 font-sans animate-content-fade">
        <PageHeader title="My Profile" breadcrumbs={crumbs} />
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
    if (cfg.skillsRequired && skills.length === 0) return setError("Add at least one.");
    setError(null);
    start(async () => {
      const res = await updateOwnProfile({ bio: bio.trim() || undefined, specializations: skills });
      if (res.success) setToast({ message: "Saved", variant: "success" });
      else setError(res.error.message || "Couldn't save. Please try again.");
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-24 font-sans animate-content-fade">
      <PageHeader
        title="My Profile"
        description={
          isReviewer && !hasSignature
            ? "Add your signature first. It goes on the certificate of every study you approve."
            : "Your name, photo, what you're good at, and your password."
        }
        breadcrumbs={crumbs}
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href={cfg.home.href}>Back to {cfg.home.label}</Link>
          </Button>
        }
      />

      {isReviewer && !hasSignature ? (
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
          <MyIdentityCard account={account} onToast={setToast} />

          {isReviewer ? (
            <SignatureCard
              initial={profile.signatureUrl ?? null}
              required
              onSaved={(value, message) => {
                setHasSignature(Boolean(value));
                setToast({ message, description: value ? "It will be printed on the certificates of studies you approve." : undefined, variant: "success" });
              }}
            />
          ) : null}

          <Panel>
            <PanelHeader title={cfg.skillsTitle} subtitle={cfg.skillsHint} />
            <PanelBody className="flex flex-col gap-5">
              <label className="flex flex-col gap-1.5 text-[13px] text-white/70">
                About you (optional)
                <textarea
                  rows={3}
                  maxLength={1000}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className={`${FIELD} resize-none p-3 leading-relaxed`}
                />
                <span className="self-end font-mono text-[11px] text-white/35">{bio.length} / 1000</span>
              </label>

              <div className="flex flex-col gap-2">
                <p className="text-[13px] text-white/70">Skills{cfg.skillsRequired ? "" : " (optional)"}</p>
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
                    placeholder="Add your own"
                    aria-label="Add a skill"
                    className={`${FIELD} h-9 flex-1 px-3`}
                  />
                  <Button variant="outline" size="sm" onClick={() => addSkill(custom)} disabled={!custom.trim()} className="gap-1.5">
                    <Plus size={13} weight="bold" />
                    Add
                  </Button>
                </div>
                {cfg.suggestions.some((s) => !skills.includes(s)) ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {cfg.suggestions
                      .filter((s) => !skills.includes(s))
                      .map((s) => (
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
                <Button variant="outline" size="sm" onClick={saveAbout} loading={busy} className="active:scale-[0.97]">
                  Save
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
                <PersonPhoto src={account.avatarUrl} name={account.fullName} className="h-11 w-11 text-sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{account.fullName}</p>
                  <p className="text-[12px] text-white/50">
                    {cfg.word} · {STATUS_WORD[profile.status] ?? profile.status}
                  </p>
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
