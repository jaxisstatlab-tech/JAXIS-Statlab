"use client";

import React, { useState, useTransition } from "react";
import { Modal, ModalFooter, FormInput, FormSelect, Button } from "@repo/ui";
import { ShieldCheck } from "@phosphor-icons/react";
import { upsertClientProfile } from "@/features/client-profile/actions";
import { formatPhilippinePhoneNumber } from "@/lib/formatters";
import type { ClientProfileFormData } from "@/features/client-profile/schemas";

export interface QuickProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Partial<ClientProfileFormData>;
}

const PHILIPPINE_REGIONS = [
  { value: "NCR", label: "NCR - National Capital Region" },
  { value: "Region I", label: "Region I - Ilocos Region" },
  { value: "Region II", label: "Region II - Cagayan Valley" },
  { value: "Region III", label: "Region III - Central Luzon" },
  { value: "Region IV-A", label: "Region IV-A - CALABARZON" },
  { value: "Region IV-B", label: "MIMAROPA Region" },
  { value: "Region V", label: "Region V - Bicol Region" },
  { value: "Region VI", label: "Region VI - Western Visayas" },
  { value: "Region VII", label: "Region VII - Central Visayas" },
  { value: "Region VIII", label: "Region VIII - Eastern Visayas" },
  { value: "Region IX", label: "Region IX - Zamboanga Peninsula" },
  { value: "Region X", label: "Region X - Northern Mindanao" },
  { value: "Region XI", label: "Region XI - Davao Region" },
  { value: "Region XII", label: "Region XII - SOCCSKSARGEN" },
  { value: "Region XIII", label: "Region XIII - Caraga" },
  { value: "BARMM", label: "BARMM - Bangsamoro Autonomous Region" },
  { value: "CAR", label: "CAR - Cordillera Administrative Region" },
  { value: "International", label: "International / Foreign Institution" },
];

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
  const [region, setRegion] = useState(initialData?.region || "NCR");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!institutionSchool.trim() || institutionSchool.trim().length < 2) {
      setErrorMsg("Institution name must be at least 2 characters.");
      return;
    }
    if (!academicProgram.trim() || academicProgram.trim().length < 2) {
      setErrorMsg("Academic program or field of study is required.");
      return;
    }
    if (!contactNumber.trim() || contactNumber.trim().length < 5) {
      setErrorMsg("Please provide a valid contact number.");
      return;
    }

    startTransition(async () => {
      const res = await upsertClientProfile({
        institutionSchool: institutionSchool.trim(),
        academicProgram: academicProgram.trim(),
        contactNumber: contactNumber.trim(),
        region,
      });

      if (!res.success) {
        setErrorMsg(res.error?.message || "Failed to update profile. Please check your entries.");
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
      title="Tell Us About Your University"
      description="Tell us your school and degree program so your assigned statistician can format your tables to match your university's exact thesis guidelines."
      size="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-6 pt-2">
        {/* Information Callout */}
        <div className="p-3.5 bg-[#01142B] border border-sky-500/25 rounded-[2px] flex items-start gap-3 shadow-sm">
          <ShieldCheck size={18} weight="fill" className="text-[#38BDF8] flex-shrink-0 mt-0.5" />
          <div className="text-xs text-white/80 font-sans leading-relaxed">
            Your university details ensure your assigned statistician follows your school&apos;s specific Chapter 4 table formatting and defense criteria.
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-sans rounded-[2px]">
            {errorMsg}
          </div>
        )}

        <div className="flex flex-col gap-5">
          <FormInput
            label="University / Institution / College"
            placeholder="e.g. University of Santo Tomas, UP Diliman"
            value={institutionSchool}
            onChange={(e) => setInstitutionSchool(e.target.value)}
            required
          />

          <FormInput
            label="Degree Program / Field of Study"
            placeholder="e.g. Master of Science in Nursing, PhD in Education"
            value={academicProgram}
            onChange={(e) => setAcademicProgram(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <FormInput
              label="Primary Contact Number"
              type="tel"
              placeholder="e.g. 0917 123 4567"
              value={contactNumber}
              onChange={(e) => setContactNumber(formatPhilippinePhoneNumber(e.target.value))}
              maxLength={17}
              required
            />

            <FormSelect
              label="Region / Location"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              options={PHILIPPINE_REGIONS}
              required
            />
          </div>
        </div>

        {/* Modal Actions */}
        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isPending}
            className="rounded-[2px] active:scale-[0.97] transition-transform text-xs font-sans"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isPending}
            className="bg-[#CC6600] text-white hover:bg-[#E67300] font-sans text-xs font-semibold rounded-[2px] active:scale-[0.97] transition-transform shadow-md"
          >
            {isPending ? "Saving..." : "Save & Continue →"}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
