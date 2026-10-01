"use client";

import React, { useState, useTransition } from "react";
import { Modal, ModalFooter, FormInput, FormSelect, Button } from "@repo/ui";
import { upsertClientProfile } from "@/features/client-profile/actions";
import { formatPhilippinePhoneNumber } from "@/lib/formatters";
import type { ClientProfileFormData } from "@/features/client-profile/schemas";
import { REGION_OPTIONS, regionValue } from "@/features/client-profile/regions";

export interface QuickProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Partial<ClientProfileFormData>;
}

type Field = "institutionSchool" | "academicProgram" | "contactNumber";

export function QuickProfileModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: QuickProfileModalProps) {
  const [isPending, startTransition] = useTransition();
  const [institutionSchool, setInstitutionSchool] = useState(initialData?.institutionSchool || "");
  const [academicProgram, setAcademicProgram] = useState(initialData?.academicProgram || "");
  const [contactNumber, setContactNumber] = useState(
    formatPhilippinePhoneNumber(initialData?.contactNumber || "")
  );
  const [region, setRegion] = useState(regionValue(initialData?.region));
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<Field, string>>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const clearError = (field: Field) => {
    if (fieldErrors[field]) setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Our own messages for empty fields (instead of the browser's pop-up).
    const errors: Partial<Record<Field, string>> = {};
    if (institutionSchool.trim().length < 2) errors.institutionSchool = "Enter your school or university.";
    if (academicProgram.trim().length < 2) errors.academicProgram = "Enter your program.";
    if (contactNumber.replace(/\D/g, "").length < 5) errors.contactNumber = "Enter your mobile number.";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    startTransition(async () => {
      const res = await upsertClientProfile({
        institutionSchool: institutionSchool.trim(),
        academicProgram: academicProgram.trim(),
        contactNumber: contactNumber.trim(),
        region,
      });

      if (!res.success) {
        const fe = res.error?.fieldErrors;
        if (fe) {
          setFieldErrors({
            institutionSchool: fe.institutionSchool?.[0],
            academicProgram: fe.academicProgram?.[0],
            contactNumber: fe.contactNumber?.[0],
          });
        }
        setErrorMsg(res.error?.message || "We couldn't save your details. Please try again.");
        return;
      }

      onSuccess();
      onClose();
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add your school"
      description="We format your tables the way your school asks, and your school appears on your certificate. You only do this once."
      size="md"
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6 pt-2">
        {errorMsg ? (
          <p role="alert" className="rounded-[2px] border border-red-500/30 bg-red-500/[0.06] p-3 font-sans text-[13px] text-red-200">
            {errorMsg}
          </p>
        ) : null}

        <div className="flex flex-col gap-5">
          <FormInput
            label="School or university"
            placeholder="e.g. University of the Philippines Diliman"
            value={institutionSchool}
            onChange={(e) => {
              setInstitutionSchool(e.target.value);
              clearError("institutionSchool");
            }}
            error={fieldErrors.institutionSchool}
            disabled={isPending}
            required
          />

          <FormInput
            label="Program"
            placeholder="e.g. BS Psychology or MA in Education"
            value={academicProgram}
            onChange={(e) => {
              setAcademicProgram(e.target.value);
              clearError("academicProgram");
            }}
            error={fieldErrors.academicProgram}
            disabled={isPending}
            required
          />

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <FormInput
              label="Mobile number"
              type="tel"
              placeholder="09XX XXX XXXX"
              value={contactNumber}
              onChange={(e) => {
                setContactNumber(formatPhilippinePhoneNumber(e.target.value));
                clearError("contactNumber");
              }}
              error={fieldErrors.contactNumber}
              maxLength={17}
              disabled={isPending}
              required
            />

            <FormSelect
              label="Region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              options={REGION_OPTIONS}
              disabled={isPending}
            />
          </div>
        </div>

        <ModalFooter>
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" loading={isPending} disabled={isPending}>
            {isPending ? "Saving..." : "Save and Continue"}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
