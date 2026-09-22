"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  PageHeader,
  Card,
  FormInput,
  Button,
  FormSelect,
  Toast,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  CopyButton,
} from "@repo/ui";
import {
  UserCircle,
  Key,
  IdentificationCard,
  GraduationCap,
  Phone,
  CheckCircle,
  ShieldCheck,
} from "@phosphor-icons/react";
import { ChangePasswordCard } from "@/features/auth/components/ChangePasswordCard";
import { upsertClientProfile } from "@/features/client-profile/actions";
import { ClientProfileFormData } from "@/features/client-profile/schemas";
import { formatPhilippinePhoneNumber } from "@/lib/formatters";

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    startTransition(async () => {
      const res = await upsertClientProfile(formData);
      if (!res.success) {
        const errorText = res.error.message || "Failed to update profile.";
        if (res.error.fieldErrors) {
          setFieldErrors(res.error.fieldErrors);
        }
        setToastMessage({
          message: "Profile Update Failed",
          description: errorText,
          variant: "danger",
        });
        return;
      }

      setToastMessage({
        message: "Profile Saved Successfully",
        description: "Your school and contact details have been updated.",
        variant: "success",
      });

      setTimeout(() => {
        router.push("/dashboard/client");
      }, 1200);
    });
  };

  const initials = sessionUser?.fullName
    ? sessionUser.fullName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "CL";

  return (
    <div
      data-portal="client"
      className="flex flex-col gap-6 max-w-7xl mx-auto pb-24 w-full animate-content-fade font-sans"
    >
      {toastMessage && (
        <Toast
          message={toastMessage.message}
          description={toastMessage.description}
          variant={toastMessage.variant}
          onClose={() => setToastMessage(null)}
        />
      )}

      <PageHeader
        title="Lead Researcher Profile & Academic Details"
        description="Configure your university affiliation, degree program, and verified research contact details."
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "Client Portal", href: "/dashboard/client" },
          { label: "Profile Settings" },
        ]}
        actions={
          <Link href="/dashboard/client">
            <Button variant="outline" size="sm" className="rounded-[2px] font-sans">
              Back to Portal
            </Button>
          </Link>
        }
      />

      <Tabs defaultValue="profile" className="flex flex-col gap-6 w-full">
        <TabsList className="self-start">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <UserCircle size={15} weight="fill" />
            <span>Academic Profile</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Key size={15} weight="fill" />
            <span>Account Security</span>
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: ACADEMIC PROFILE ── */}
        <TabsContent value="profile" className="flex flex-col gap-6 outline-none">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* Researcher Identity Card */}
            <Card className="p-6 sm:p-8 bg-[#01142B] border border-white/10 rounded-[2px] shadow-xl flex flex-col gap-6">
              {/* Canonical Card Header (Rule 21) */}
              <div className="border-b border-white/10 pb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white font-sans flex items-center gap-2.5">
                    <IdentificationCard size={18} weight="fill" className="text-[#CC6600]" />
                    <span>Lead Researcher Identity</span>
                  </h3>
                  <p className="text-xs text-white/60 font-sans mt-0.5">
                    Credentials &amp; portal membership
                  </p>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 uppercase font-semibold px-2 py-0.5 rounded-[2px] bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Verified Client
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
                      {sessionUser?.fullName || "Lead Researcher"}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-[2px] text-[10px] font-mono font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                        CLIENT
                      </span>
                      <span className="text-xs font-mono text-white/40">
                        Principal Investigator
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
                      {sessionUser?.email || "client@jaxis.dev"}
                    </span>
                    <CopyButton
                      value={sessionUser?.email || "client@jaxis.dev"}
                      variant="ghost"
                      className="p-0.5 text-white/40 hover:text-white shrink-0"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1 p-3 rounded-[2px] bg-[#010D1F]/50 border border-white/[0.06]">
                  <span className="text-[11px] font-mono text-white/50 uppercase tracking-wider">
                    Institution / University
                  </span>
                  <span className="text-xs font-sans text-white/90 truncate">
                    {formData.institutionSchool || "Academic Institution"}
                  </span>
                </div>

                <div className="flex flex-col gap-1 p-3 rounded-[2px] bg-[#010D1F]/50 border border-white/[0.06]">
                  <span className="text-[11px] font-mono text-white/50 uppercase tracking-wider">
                    Academic Degree
                  </span>
                  <span className="text-xs font-sans text-sky-400 font-medium truncate">
                    {formData.academicProgram || "Empirical Research"}
                  </span>
                </div>

                <div className="flex flex-col gap-1 p-3 rounded-[2px] bg-[#010D1F]/50 border border-white/[0.06]">
                  <span className="text-[11px] font-mono text-white/50 uppercase tracking-wider">
                    Client ID
                  </span>
                  <span className="text-xs font-mono text-white/70">
                    {sessionUser?.id ? `CLI-${sessionUser.id.slice(-6).toUpperCase()}` : "CLI-001"}
                  </span>
                </div>
              </div>
            </Card>

            {/* School & University Affiliation Card */}
            <Card className="p-6 sm:p-8 bg-[#01142B] border border-white/10 rounded-[2px] shadow-xl flex flex-col gap-6">
              {/* Canonical Card Header (Rule 21) */}
              <div className="border-b border-white/10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-white font-sans flex items-center gap-2.5">
                    <GraduationCap size={18} weight="fill" className="text-[#CC6600]" />
                    <span>Academic &amp; University Affiliation</span>
                  </h3>
                  <p className="text-xs text-white/60 font-sans mt-1">
                    Used for official statistical certificates and research consultation records.
                  </p>
                </div>
                <span className="text-xs font-mono text-white/70 uppercase font-semibold px-2.5 py-1 rounded-[2px] bg-white/[0.06] border border-white/10 flex-shrink-0 self-start sm:self-auto">
                  Primary Institution
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                <FormInput
                  label="School / University"
                  required
                  placeholder="e.g. University of the Philippines Diliman"
                  value={formData.institutionSchool}
                  onChange={(e) => setFormData({ ...formData, institutionSchool: e.target.value })}
                  error={fieldErrors.institutionSchool?.[0]}
                  disabled={isPending}
                />

                <FormInput
                  label="Academic Program"
                  required
                  placeholder="e.g. MS in Data Science / Ph.D. in Education"
                  value={formData.academicProgram}
                  onChange={(e) => setFormData({ ...formData, academicProgram: e.target.value })}
                  error={fieldErrors.academicProgram?.[0]}
                  disabled={isPending}
                />
              </div>
            </Card>

            {/* Contact Details & Geographic Region Card */}
            <Card className="p-6 sm:p-8 bg-[#01142B] border border-white/10 rounded-[2px] shadow-xl flex flex-col gap-6">
              {/* Canonical Card Header (Rule 21) */}
              <div className="border-b border-white/10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-white font-sans flex items-center gap-2.5">
                    <Phone size={18} weight="fill" className="text-[#CC6600]" />
                    <span>Contact &amp; Regional Verification</span>
                  </h3>
                  <p className="text-xs text-white/60 font-sans mt-1">
                    Used for urgent study milestones, SMS reminders, and coordinator consultations.
                  </p>
                </div>
                <span className="text-xs font-mono text-[#FFA040] uppercase font-semibold px-2.5 py-1 rounded-[2px] bg-[#CC6600]/10 border border-[#CC6600]/30 flex-shrink-0 self-start sm:self-auto">
                  Philippine Registry
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                <FormInput
                  label="Contact Number"
                  type="tel"
                  required
                  placeholder="09XX XXX XXXX"
                  value={formData.contactNumber}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      contactNumber: formatPhilippinePhoneNumber(e.target.value),
                    })
                  }
                  error={fieldErrors.contactNumber?.[0]}
                  disabled={isPending}
                />

                <FormSelect
                  label="Region (Philippines)"
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  options={REGION_OPTIONS}
                  disabled={isPending}
                />
              </div>
            </Card>

            {/* Save Action Bar */}
            <Card className="p-4 sm:p-5 bg-[#01142B] border border-white/10 rounded-[2px] shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-white/50 font-sans">
                <CheckCircle size={15} weight="fill" className="text-emerald-400 shrink-0" />
                <span>Your academic profile is attached to all study proposals and official certificates.</span>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <Link href="/dashboard/client">
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
                  Save Academic Profile
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
              Manage your client portal password to ensure security across your confidential research proposals and dataset uploads.
            </p>
          </Card>

          <ChangePasswordCard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
