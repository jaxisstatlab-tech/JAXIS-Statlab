"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader, Button, Toast, CopyButton } from "@repo/ui";
import { CheckCircle, Circle, FacebookLogo, InstagramLogo, Warning } from "@phosphor-icons/react";
import { ChangePasswordCard } from "@/features/auth/components/ChangePasswordCard";
import { upsertClientProfile } from "@/features/client-profile/actions";
import type { ClientProfileFormData } from "@/features/client-profile/schemas";
import { formatPhilippinePhoneNumber } from "@/lib/formatters";
import { Panel, PanelBody, PanelHeader } from "@/components/dashboard/Panel";
import { REGION_OPTIONS, regionValue } from "@/features/client-profile/regions";
import { PersonPhoto } from "@/components/dashboard/PersonPhoto";
import { MyIdentityCard } from "@/features/account/components/MyIdentityCard";
import type { MyAccount } from "@/features/account/actions";

// The client's My Profile: name and photo, school and how we reach them (with Facebook and Instagram, seen only by
// the JAXIS office), and password. A short checklist on the side shows what's still missing before they can send
// a study.

export interface ClientProfileClientProps {
  initialProfile: {
    institutionSchool?: string | null;
    academicProgram?: string | null;
    contactNumber?: string | null;
    region?: string | null;
    facebookUrl?: string | null;
    instagramUrl?: string | null;
  } | null;
  account?: MyAccount | null;
  sessionUser?: { id: string; fullName: string; email: string };
}

type ToastState = { message: string; description?: string; variant: "success" | "danger" | "info" } | null;

const FIELD =
  "h-10 w-full rounded-[2px] border border-white/10 bg-[#050513] px-3 font-sans text-[13px] text-white outline-none placeholder:text-white/30 focus:border-[#CC6600]/60 disabled:opacity-60";

export function ClientProfileClient({ initialProfile, sessionUser, account = null }: ClientProfileClientProps) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [toast, setToast] = useState<ToastState>(null);
  const [saved, setSaved] = useState(initialProfile);
  const [form, setForm] = useState<ClientProfileFormData>({
    institutionSchool: initialProfile?.institutionSchool || "",
    academicProgram: initialProfile?.academicProgram || "",
    contactNumber: formatPhilippinePhoneNumber(initialProfile?.contactNumber || ""),
    region: regionValue(initialProfile?.region),
    facebookUrl: initialProfile?.facebookUrl || "",
    instagramUrl: initialProfile?.instagramUrl || "",
  });

  const name = account?.fullName || sessionUser?.fullName || "Your account";
  const email = account?.email || sessionUser?.email || "";
  const wasComplete = Boolean(saved?.institutionSchool && saved?.contactNumber);

  const update = (field: keyof ClientProfileFormData, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) {
      setErrors((all) => {
        const next = { ...all };
        delete next[field];
        return next;
      });
    }
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const found: Record<string, string[]> = {};
    if (form.institutionSchool.trim().length < 2) found.institutionSchool = ["Enter your school or university."];
    if (form.academicProgram.trim().length < 2) found.academicProgram = ["Enter your program."];
    if (form.contactNumber.replace(/\D/g, "").length < 5) found.contactNumber = ["Enter your mobile number."];
    setErrors(found);
    if (Object.keys(found).length) return;
    start(async () => {
      const res = await upsertClientProfile(form);
      if (!res.success) {
        setErrors(res.error.fieldErrors ?? {});
        setToast({ message: "Not saved", description: res.error.message || "Check the highlighted fields.", variant: "danger" });
        return;
      }
      setSaved({ ...form });
      setToast({ message: "Saved", description: "Your school and contact details are updated.", variant: "success" });
      // First time through: back to the dashboard, where they were heading to send a study.
      if (!wasComplete) setTimeout(() => router.push("/dashboard/client"), 1200);
      else router.refresh();
    });
  };

  const steps = [
    { label: "Your name", done: Boolean(account?.firstName && account?.lastName) },
    { label: "School and program", done: Boolean(saved?.institutionSchool && saved?.academicProgram) },
    { label: "Mobile number", done: Boolean(saved?.contactNumber) },
    { label: "Photo", done: Boolean(account?.avatarUrl), optional: true },
    { label: "Facebook or Instagram", done: Boolean(saved?.facebookUrl || saved?.instagramUrl), optional: true },
  ];

  return (
    <div data-portal="client" className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-24 font-sans animate-content-fade">
      <PageHeader
        title="My Profile"
        description="Your name and photo, your school, how we reach you, and your password."
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "My Studies", href: "/dashboard/client" },
          { label: "My Profile" },
        ]}
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/client">Back to My Studies</Link>
          </Button>
        }
      />

      {!wasComplete ? (
        <Panel as="div" className="border-[#CC6600]/40">
          <PanelBody className="flex items-start gap-3">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#CC6600]" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-white">Add your school and mobile number to send a study</p>
              <p className="mt-0.5 text-[13px] text-white/55">It takes a minute. Your school appears on your certificate.</p>
            </div>
          </PanelBody>
        </Panel>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-8">
          {account ? (
            <MyIdentityCard account={account} onToast={setToast} />
          ) : (
            <Panel as="div">
              <PanelBody className="flex items-center justify-between gap-4">
                <p className="text-[13px] text-white/60">Your name and photo didn&apos;t load.</p>
                <Button variant="outline" size="sm" onClick={() => router.refresh()}>
                  Try Again
                </Button>
              </PanelBody>
            </Panel>
          )}

          <form onSubmit={save} noValidate>
            <Panel>
              <PanelHeader title="School and contact" subtitle="We format your tables the way your school asks, and reach you about your study." />
              <PanelBody className="flex flex-col gap-6">
                <section className="flex flex-col gap-4">
                  <h3 className="text-[13px] font-medium text-white">Your school</h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field label="School or university" required error={errors.institutionSchool?.[0]}>
                      <input
                        value={form.institutionSchool}
                        onChange={(e) => update("institutionSchool", e.target.value)}
                        placeholder="e.g. University of the Philippines Diliman"
                        maxLength={100}
                        disabled={busy}
                        className={FIELD}
                      />
                    </Field>
                    <Field label="Program" required error={errors.academicProgram?.[0]}>
                      <input
                        value={form.academicProgram}
                        onChange={(e) => update("academicProgram", e.target.value)}
                        placeholder="e.g. BS Psychology or MA in Education"
                        maxLength={100}
                        disabled={busy}
                        className={FIELD}
                      />
                    </Field>
                  </div>
                </section>

                <section className="flex flex-col gap-4 border-t border-white/[0.07] pt-5">
                  <h3 className="text-[13px] font-medium text-white">How we reach you</h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field label="Mobile number" required error={errors.contactNumber?.[0]}>
                      <input
                        type="tel"
                        value={form.contactNumber}
                        onChange={(e) => update("contactNumber", formatPhilippinePhoneNumber(e.target.value))}
                        placeholder="09XX XXX XXXX"
                        disabled={busy}
                        className={FIELD}
                      />
                    </Field>
                    <Field label="Region">
                      <select
                        value={form.region}
                        onChange={(e) => update("region", e.target.value)}
                        disabled={busy}
                        className={`${FIELD} cursor-pointer [&>option]:bg-[#0A0A18]`}
                      >
                        {REGION_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Facebook" hint="Optional" icon={<FacebookLogo size={14} weight="fill" />} error={errors.facebookUrl?.[0]}>
                      <input
                        value={form.facebookUrl ?? ""}
                        onChange={(e) => update("facebookUrl", e.target.value)}
                        placeholder="facebook.com/your.name"
                        disabled={busy}
                        className={FIELD}
                      />
                    </Field>
                    <Field label="Instagram" hint="Optional" icon={<InstagramLogo size={14} weight="fill" />} error={errors.instagramUrl?.[0]}>
                      <input
                        value={form.instagramUrl ?? ""}
                        onChange={(e) => update("instagramUrl", e.target.value)}
                        placeholder="@your.name"
                        disabled={busy}
                        className={FIELD}
                      />
                    </Field>
                  </div>
                  <p className="text-[12px] leading-relaxed text-white/45">
                    Only the JAXIS office can see your Facebook and Instagram, to reach you if a message or text doesn&apos;t get through. Your
                    analyst and reviewer can&apos;t.
                  </p>
                </section>

                <div className="flex justify-end border-t border-white/[0.07] pt-4">
                  <Button type="submit" variant={wasComplete ? "outline" : "primary"} size="sm" loading={busy} className="active:scale-[0.97]">
                    Save Changes
                  </Button>
                </div>
              </PanelBody>
            </Panel>
          </form>

          <ChangePasswordCard />
        </div>

        <div className="flex flex-col gap-6 lg:col-span-4">
          <Panel>
            <PanelHeader title="Account" />
            <PanelBody className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <PersonPhoto src={account?.avatarUrl ?? null} name={name} className="h-11 w-11 text-sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{name}</p>
                  <p className="text-[12px] text-white/50">Client</p>
                </div>
              </div>
              {email ? (
                <div className="text-[13px]">
                  <p className="text-[12px] text-white/45">Email</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-white">
                    <span className="truncate">{email}</span>
                    <CopyButton
                      value={email}
                      variant="ghost"
                      className="shrink-0 p-0.5 text-white/40 hover:text-white"
                      onCopy={() => setToast({ message: "Email copied", variant: "info" })}
                    />
                  </p>
                </div>
              ) : null}
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader title="Your profile" subtitle={wasComplete ? "Ready to send studies." : "A few things before your first study."} />
            <ul className="mt-4 divide-y divide-white/[0.05] border-t border-white/[0.06]">
              {steps.map((s) => (
                <li key={s.label} className="flex items-center gap-2.5 px-5 py-2.5 text-[13px] sm:px-6">
                  {s.done ? (
                    <CheckCircle size={15} weight="fill" className="shrink-0 text-white/80" />
                  ) : (
                    <Circle size={15} weight="bold" className={`shrink-0 ${s.optional ? "text-white/25" : "text-[#CC6600]"}`} />
                  )}
                  <span className={s.done ? "text-white" : "text-white/60"}>{s.label}</span>
                  {s.optional && !s.done ? <span className="ml-auto text-[11px] text-white/35">Optional</span> : null}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      {toast ? <Toast message={toast.message} description={toast.description} variant={toast.variant} onClose={() => setToast(null)} /> : null}
    </div>
  );
}

function Field({
  label,
  hint,
  icon,
  required,
  error,
  children,
}: {
  label: string;
  hint?: string;
  icon?: React.ReactNode;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-[13px] text-white/70">
      <span className="flex items-center gap-1.5">
        {icon ? <span className="text-white/45">{icon}</span> : null}
        {label}
        {required ? <span className="text-[#CC6600]">*</span> : null}
        {hint ? <span className="text-[11px] text-white/35">{hint}</span> : null}
      </span>
      {children}
      {error ? (
        <span className="flex items-start gap-1.5 text-[12px] text-red-300">
          <Warning size={13} weight="fill" className="mt-0.5 shrink-0" />
          {error}
        </span>
      ) : null}
    </label>
  );
}
