"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader, Card, FormInput, Button, FormSelect, FormFooter, Toast } from "@repo/ui";
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
}

export function ClientProfileClient({ initialProfile }: ClientProfileClientProps) {
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

      // Redirect to main client dashboard after a short delay
      setTimeout(() => {
        router.push("/dashboard/client");
      }, 1200);
    });
  };

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto pb-20 w-full animate-content-fade font-sans">
      <PageHeader
        title="School &amp; Academic Profile"
        description="Complete your university and contact details in the Philippines to submit research study requests."
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "Client Portal", href: "/dashboard/client" },
          { label: "Profile" },
        ]}
      />

      <Card className="p-6 md:p-8 bg-[#01142B] border border-white/10 rounded-[2px] shadow-xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="border-b border-white/[0.08] pb-4">
            <h2 className="text-base font-bold text-white font-sans">School &amp; University Details</h2>
            <p className="text-xs text-white/50 mt-1 font-sans">
              Used for official statistical certificates and research consultation records.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            <FormInput
              label="School / University"
              required
              placeholder="e.g. University of the Philippines"
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 mt-2">
            <FormInput
              label="Contact Number"
              type="tel"
              required
              placeholder="0917 123 4567"
              value={formData.contactNumber}
              onChange={(e) => setFormData({ ...formData, contactNumber: formatPhilippinePhoneNumber(e.target.value) })}
              maxLength={17}
              error={fieldErrors.contactNumber?.[0]}
              disabled={isPending}
            />

            <FormSelect
              label="Region"
              required
              options={REGION_OPTIONS}
              value={formData.region}
              onChange={(e) => setFormData({ ...formData, region: e.target.value })}
              disabled={isPending}
            />
          </div>

          <FormFooter className="mt-8 pt-6">
            <Link href="/dashboard/client">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isPending}
                className="rounded-[2px] active:scale-[0.97] transition-transform"
              >
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={isPending}
              className="w-full sm:w-auto font-sans font-semibold rounded-[2px] active:scale-[0.97] transition-transform"
            >
              Save Profile →
            </Button>
          </FormFooter>
        </form>
      </Card>

      {toastMessage && (
        <Toast
          message={toastMessage.message}
          description={toastMessage.description}
          variant={toastMessage.variant}
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}
