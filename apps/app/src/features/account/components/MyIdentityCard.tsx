"use client";

import React, { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@repo/ui";
import { Camera, Trash, Warning } from "@phosphor-icons/react";
import { Panel, PanelBody, PanelHeader } from "@/components/dashboard/Panel";
import { PersonPhoto } from "@/components/dashboard/PersonPhoto";
import { uploadFileToR2 } from "@/lib/storage-client";
import { AVATAR_MAX_BYTES, AVATAR_TYPES, composeFullName } from "@/lib/person-rules";
import { removeMyAvatar, updateMyAvatar, updateMyName, type MyAccount } from "../actions";

// Every role's My Profile: the photo (shown in the sidebar, messages and lists) and the name in parts
// (first and last name, as at sign-up), which builds the full name shown everywhere.

const FIELD =
  "h-10 w-full rounded-[2px] border border-white/10 bg-[#050513] px-3 font-sans text-[13px] text-white outline-none placeholder:text-white/30 focus:border-[#CC6600]/60";

export function MyIdentityCard({
  account,
  onToast,
}: {
  account: MyAccount;
  onToast: (t: { message: string; description?: string; variant: "success" | "danger" }) => void;
}) {
  const router = useRouter();
  const [first, setFirst] = useState(account.firstName);
  const [last, setLast] = useState(account.lastName);
  const [savedName, setSavedName] = useState(account.fullName);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [photo, setPhoto] = useState<string | null>(account.avatarUrl);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  const preview = first.trim() || last.trim() ? composeFullName(first, last) : "";
  const changed = preview && preview !== savedName;

  const saveName = () => {
    const e: Record<string, string[]> = {};
    if (!first.trim()) e.firstName = ["Enter your first name."];
    if (!last.trim()) e.lastName = ["Enter your last name."];
    setErrors(e);
    if (Object.keys(e).length) return;
    start(async () => {
      const res = await updateMyName({ firstName: first, lastName: last });
      if (res.success) {
        setSavedName(res.data.fullName);
        setErrors({});
        onToast({ message: "Name saved", description: `You're now shown as ${res.data.fullName}.`, variant: "success" });
        router.refresh();
      } else {
        setErrors(res.error.fieldErrors ?? {});
        onToast({ message: "Name not saved", description: res.error.message, variant: "danger" });
      }
    });
  };

  const pick = async (file: File | null) => {
    if (input.current) input.current.value = "";
    if (!file) return;
    setPhotoError(null);
    if (!AVATAR_TYPES.includes(file.type)) return setPhotoError("Use a JPG, PNG or WebP picture.");
    if (file.size > AVATAR_MAX_BYTES) return setPhotoError(`That picture is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 2 MB.`);
    setPhotoBusy(true);
    try {
      const stored = await uploadFileToR2(file, "AVATAR", account.id);
      if (!stored.success || !stored.data) throw new Error(stored.error?.message || "The picture didn't upload. Please try again.");
      const res = await updateMyAvatar({ storageKey: stored.data.storageKey });
      if (!res.success) throw new Error(res.error.message);
      setPhoto(res.data.avatarUrl);
      onToast({ message: "Photo updated", description: "It shows in the sidebar and messages.", variant: "success" });
      router.refresh();
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "The picture didn't upload. Please try again.");
    } finally {
      setPhotoBusy(false);
    }
  };

  const removePhoto = async () => {
    setPhotoBusy(true);
    const res = await removeMyAvatar();
    setPhotoBusy(false);
    if (res.success) {
      setPhoto(null);
      onToast({ message: "Photo removed", description: "Your initials show instead.", variant: "success" });
      router.refresh();
    } else setPhotoError(res.error.message);
  };

  return (
    <Panel>
      <PanelHeader title="Name and photo" subtitle="How you appear to others in JAXIS: the sidebar, messages and study pages." />
      <PanelBody className="flex flex-col gap-6 font-sans">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <PersonPhoto src={photo} name={savedName} className="h-20 w-20 text-xl" />
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <input
                ref={input}
                type="file"
                accept={AVATAR_TYPES.join(",")}
                className="hidden"
                onChange={(e) => void pick(e.target.files?.[0] ?? null)}
              />
              <Button variant="outline" size="sm" onClick={() => input.current?.click()} loading={photoBusy} className="gap-1.5 active:scale-[0.97]">
                {photoBusy ? null : <Camera size={14} weight="fill" />}
                {photo ? "Change Photo" : "Upload Photo"}
              </Button>
              {photo ? (
                <Button variant="ghost" size="sm" onClick={() => void removePhoto()} disabled={photoBusy} className="gap-1.5">
                  <Trash size={14} weight="fill" />
                  Remove
                </Button>
              ) : null}
            </div>
            <p className="text-[12px] text-white/45">JPG, PNG or WebP, up to 2 MB. A clear face photo works best.</p>
            {photoError ? (
              <p role="alert" className="flex items-start gap-1.5 text-[12px] text-red-300">
                <Warning size={13} weight="fill" className="mt-0.5 shrink-0" />
                {photoError}
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 border-t border-white/[0.07] pt-5 sm:grid-cols-2">
          <Field label="First name" error={errors.firstName?.[0]}>
            <input value={first} onChange={(e) => setFirst(e.target.value)} maxLength={50} autoComplete="given-name" className={FIELD} />
          </Field>
          <Field label="Last name" error={errors.lastName?.[0]}>
            <input value={last} onChange={(e) => setLast(e.target.value)} maxLength={50} autoComplete="family-name" className={FIELD} />
          </Field>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/[0.07] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-white/55">
            Shown as <span className="font-medium text-white">{preview || savedName}</span>
          </p>
          <Button variant="primary" size="sm" onClick={saveName} loading={busy} disabled={!changed} className="active:scale-[0.97]">
            Save Name
          </Button>
        </div>
      </PanelBody>
    </Panel>
  );
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-[13px] text-white/70">
      <span>
        {label}
        {hint ? <span className="ml-1.5 text-[11px] text-white/35">{hint}</span> : null}
      </span>
      {children}
      {error ? <span className="text-[12px] text-red-300">{error}</span> : null}
    </label>
  );
}
