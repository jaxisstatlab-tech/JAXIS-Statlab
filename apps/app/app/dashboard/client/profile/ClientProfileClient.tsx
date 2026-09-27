"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader, FormInput, Button, FormSelect, Toast, Tabs, TabsList, TabsTrigger, TabsContent, CopyButton } from "@repo/ui";
import { GraduationCap, Phone } from "@phosphor-icons/react";
import { ChangePasswordCard } from "@/features/auth/components/ChangePasswordCard";
import { upsertClientProfile } from "@/features/client-profile/actions";
import { ClientProfileFormData } from "@/features/client-profile/schemas";
import { formatPhilippinePhoneNumber } from "@/lib/formatters";
import { Panel } from "@/components/dashboard/Panel";

const REGION_OPTIONS = [
  { value: "NCR", label: "National Capital Region (NCR / Metro Manila)" },
  { value: "CAR", label: "Cordillera Administrative Region (CAR)" },
  { value: "REGION_1", label: "Region I – Ilocos Region" },
  { value: "REGION_2", label: "Region II – Cagayan Valley" },
  { value: "REGION_3", label: "Region III – Central Luzon" },
  { value: "REGION_4A", label: "Region IV-A – CALABARZON" },
  { value: "MIMAROPA", label: "MIMAROPA Region (Region IV-B)" },
  { value: "REGION_5", label: "Region V – Bicol Region" },
  { value: "REGION_6", label: "Region VI – Western Visayas" },
  { value: "REGION_7", label: "Region VII – Central Visayas" },
  { value: "REGION_8", label: "Region VIII – Eastern Visayas" },
  { value: "REGION_9", label: "Region IX – Zamboanga Peninsula" },
  { value: "REGION_10", label: "Region X – Northern Mindanao" },
  { value: "REGION_11", label: "Region XI – Davao Region" },
  { value: "REGION_12", label: "Region XII – SOCCSKSARGEN" },
  { value: "REGION_13", label: "Region XIII – Caraga" },
  { value: "BARMM", label: "BARMM – Bangsamoro Autonomous Region in Muslim Mindanao" },
];

export interface ClientProfileClientProps {
  initialProfile: {
    institutionSchool?: string | null;
    academicProgram?: string | null;
    contactNumber?: string | null;
    region?: string | null;
  } | null;
  sessionUser?: {
    id: string;
    fullName: string;
    email: string;
  };
}

export function ClientProfileClient({ initialProfile, sessionUser }: ClientProfileClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [toastMessage, setToastMessage] = useState<{
    message: string;
    description?: string;
    variant: "info" | "success" | "warning" | "danger";
  } | null>(null);

  const [formData, setFormData] = useState<ClientProfileFormData>({
    institutionSchool: initialProfile?.institutionSchool || "",
    academicProgram: initialProfile?.academicProgram || "",
    contactNumber: formatPhilippinePhoneNumber(initialProfile?.contactNumber || ""),
    region: initialProfile?.region || "NCR",
  });
  const isComplete = Boolean(initialProfile?.institutionSchool && initialProfile?.contactNumber);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    startTransition(async () => {
      const res = await upsertClientProfile(formData);
      if (!res.success) {
        if (res.error.fieldErrors) setFieldErrors(res.error.fieldErrors);
        setToastMessage({
          message: "Your changes weren't saved",
          description: res.error.message || "Please check the fields and try again.",
          variant: "danger",
        });
        return;
      }
      setToastMessage({ message: "Profile saved", description: "Your school and contact details are updated.", variant: "success" });
      setTimeout(() => router.push("/dashboard/client"), 1200);
    });
  };

  const name = sessionUser?.fullName || "Your account";
  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "?";

  return (
    <div data-portal="client" className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-24 font-sans animate-content-fade">
      {toastMessage ? (
        <Toast
          message={toastMessage.message}
          description={toastMessage.description}
          variant={toastMessage.variant}
          onClose={() => setToastMessage(null)}
        />
      ) : null}

      <PageHeader
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "My Studies", href: "/dashboard/client" },
          { label: "Profile" },
        ]}
        title="Your profile"
        description="Your school, how we reach you, and your password."
      />

      {/* Who's logged in */}
      <Panel as="div">
        <div className="flex flex-wrap items-center gap-4 px-5 py-5 sm:px-6">
          <span
            aria-hidden
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[2px] bg-white/[0.08] text-base font-semibold text-white/85"
          >
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-white">{name}</p>
            {sessionUser?.email ? (
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-white/55">
                <span className="truncate">{sessionUser.email}</span>
                <CopyButton
                  value={sessionUser.email}
                  variant="ghost"
                  className="shrink-0 p-0.5 text-white/40 hover:text-white"
                  onCopy={() => setToastMessage({ message: "Email copied", description: `${sessionUser.email} is on your clipboard.`, variant: "info" })}
                />
              </p>
            ) : null}
          </div>
          {!isComplete ? (
            <span className="rounded-[2px] border border-[#CC6600]/40 bg-[#CC6600]/10 px-2 py-0.5 text-xs font-medium text-[#F08A2E]">
              Add your school to send a study
            </span>
          ) : null}
        </div>
      </Panel>

      <Tabs defaultValue="profile" className="flex w-full flex-col gap-6">
        <TabsList className="self-start">
          <TabsTrigger value="profile">School &amp; contact</TabsTrigger>
          <TabsTrigger value="security">Password</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="outline-none">
          <form onSubmit={handleSubmit}>
            <Panel as="div">
              <div className="flex flex-col gap-8 px-5 py-6 sm:px-6">
                <div className="grid grid-cols-1 gap-8 2xl:grid-cols-2 2xl:gap-12">
                  <fieldset className="flex flex-col gap-4">
                    <legend className="mb-4 flex items-start gap-2.5">
                      <GraduationCap size={18} weight="fill" className="mt-0.5 shrink-0 text-[#CC6600]" />
                      <span>
                        <span className="block text-base font-semibold text-white">Your school</span>
                        <span className="mt-0.5 block text-[13px] text-white/55">
                          We format your tables the way your school asks, and it appears on your certificate.
                        </span>
                      </span>
                    </legend>
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <FormInput
                        label="School or university"
                        required
                        placeholder="e.g. University of the Philippines Diliman"
                        value={formData.institutionSchool}
                        onChange={(e) => setFormData({ ...formData, institutionSchool: e.target.value })}
                        error={fieldErrors.institutionSchool?.[0]}
                        disabled={isPending}
                      />
                      <FormInput
                        label="Program"
                        required
                        placeholder="e.g. BS Psychology or MA in Education"
                        value={formData.academicProgram}
                        onChange={(e) => setFormData({ ...formData, academicProgram: e.target.value })}
                        error={fieldErrors.academicProgram?.[0]}
                        disabled={isPending}
                      />
                    </div>
                  </fieldset>

                  <div aria-hidden className="-my-1 border-t border-white/[0.07] 2xl:hidden" />
                  <fieldset className="flex flex-col gap-4">
                    <legend className="mb-4 flex items-start gap-2.5">
                      <Phone size={18} weight="fill" className="mt-0.5 shrink-0 text-[#CC6600]" />
                      <span>
                        <span className="block text-base font-semibold text-white">How we reach you</span>
                        <span className="mt-0.5 block text-[13px] text-white/55">
                          For updates about your study, like reminders and quick questions from our team.
                        </span>
                      </span>
                    </legend>
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <FormInput
                        label="Mobile number"
                        type="tel"
                        required
                        placeholder="09XX XXX XXXX"
                        value={formData.contactNumber}
                        onChange={(e) => setFormData({ ...formData, contactNumber: formatPhilippinePhoneNumber(e.target.value) })}
                        error={fieldErrors.contactNumber?.[0]}
                        disabled={isPending}
                      />
                      <FormSelect
                        label="Region"
                        value={formData.region}
                        onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                        options={REGION_OPTIONS}
                        disabled={isPending}
                      />
                    </div>
                  </fieldset>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-white/[0.07] pt-5 sm:flex-row sm:justify-end">
                  <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                    <Link href="/dashboard/client">Cancel</Link>
                  </Button>
                  <Button type="submit" variant="primary" size="sm" loading={isPending} className="w-full sm:w-auto">
                    {isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </Panel>
          </form>
        </TabsContent>

        <TabsContent value="security" className="flex max-w-3xl flex-col gap-4 outline-none">
          <p className="text-[13px] leading-relaxed text-white/60">
            Use a password you don&apos;t use anywhere else. After you change it, you&apos;ll be logged out on your other devices.
          </p>
          <ChangePasswordCard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
