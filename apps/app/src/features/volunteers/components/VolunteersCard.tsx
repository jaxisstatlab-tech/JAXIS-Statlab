"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Toast } from "@repo/ui";
import { Star } from "@phosphor-icons/react";
import { pickVolunteer } from "../actions";
import { ordinal } from "../rules";
import type { StudyVolunteerItem } from "../schemas";

// Admin and CEO: the analysts who offered to take a study, first offer first, each with the three things that
// decide it (when they offered, how busy they are, whether their field fits). Pick one, or leave it and the
// Suggested one (first to offer) is assigned when the deposit clears. On a paid study, picking assigns right away.

const dateTime = (d: string) =>
  new Date(d).toLocaleString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export function VolunteersCard({
  projectId,
  volunteers,
  paid,
  onChanged,
}: {
  projectId: string;
  volunteers: StudyVolunteerItem[];
  paid: boolean;
  onChanged?: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; description?: string; variant: "success" | "danger" } | null>(null);
  const [, start] = useTransition();
  const picked = volunteers.find((v) => v.picked);
  const list = [...volunteers].sort((a, b) => a.order - b.order);

  const choose = (v: StudyVolunteerItem | null) => {
    setBusy(v?.statisticianId ?? "clear");
    start(async () => {
      const res = await pickVolunteer({ projectId, statisticianId: v?.statisticianId ?? null });
      setBusy(null);
      if (!res.success) return setToast({ message: "Not saved", description: res.error.message, variant: "danger" });
      setToast(
        !v
          ? { message: "Pick cleared", description: "The first to offer is assigned when the deposit clears.", variant: "success" }
          : res.data.assigned
            ? { message: "Team assigned", description: `${v.fullName} and the least busy reviewer are on it now.`, variant: "success" }
            : { message: `${v.fullName} picked`, description: "They're assigned automatically when the deposit clears.", variant: "success" }
      );
      router.refresh();
      onChanged?.();
    });
  };

  return (
    <div className="flex flex-col gap-4 font-sans">
      <p className="text-[13px] leading-relaxed text-white/60">
        {volunteers.length === 0
          ? "No offers yet. Analysts offer from Open Studies."
          : picked
            ? `${picked.fullName} is your pick${paid ? "" : " and is assigned when the deposit clears"}.`
            : paid
              ? "Pick one to assign them now."
              : "Pick one, or the Suggested analyst (first to offer) is assigned when the deposit clears."}
      </p>

      {list.length ? (
        <ul className="divide-y divide-white/[0.06] rounded-[2px] border border-white/[0.08]">
          {list.map((v) => {
            const free = v.openStudies === 0;
            return (
              <li key={v.statisticianId} className={`flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-start sm:gap-4 ${v.picked ? "bg-white/[0.03]" : ""}`}>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[2px] border border-white/10 bg-white/[0.04] font-mono text-[12px] text-white/70">
                  {v.order}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-white">{v.fullName}</span>
                    {v.picked ? (
                      <span className="inline-flex items-center gap-1 rounded-[2px] border border-[#CC6600]/50 px-1.5 py-0.5 text-[11px] text-white">
                        <Star size={11} weight="fill" className="text-[#CC6600]" />
                        Your pick
                      </span>
                    ) : v.suggested && !picked ? (
                      <span className="rounded-[2px] border border-white/15 bg-white/[0.06] px-1.5 py-0.5 text-[11px] text-white/80">Suggested</span>
                    ) : null}
                    {v.status !== "ACTIVE" ? <span className="text-[11px] text-red-300">{v.status === "ON_LEAVE" ? "On leave" : "Not active"}</span> : null}
                  </div>

                  <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1.5 text-[12px] sm:grid-cols-3">
                    <div>
                      <dt className="text-white/40">Offered</dt>
                      <dd className="text-white/85">
                        {ordinal(v.order)} · {dateTime(v.volunteeredAt)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-white/40">Working on</dt>
                      <dd className={free ? "text-white/85" : "text-white/60"}>{free ? "Nothing right now" : `${v.openStudies} ${v.openStudies === 1 ? "study" : "studies"}`}</dd>
                    </div>
                    <div>
                      <dt className="text-white/40">Fits this study</dt>
                      <dd className={v.matches.length ? "text-white/85" : "text-white/50"}>{v.matches.length ? v.matches.join(", ") : "No matching field"}</dd>
                    </div>
                  </dl>

                  {v.note ? <p className="mt-2 text-[13px] leading-relaxed text-white/75">&ldquo;{v.note}&rdquo;</p> : null}
                </div>
                <div className="shrink-0">
                  {v.picked ? (
                    <Button variant="ghost" size="sm" onClick={() => choose(null)} loading={busy === "clear"}>
                      Unpick
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => choose(v)} loading={busy === v.statisticianId} disabled={v.status !== "ACTIVE" || !!busy}>
                      {paid ? "Assign" : "Pick"}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
      {toast ? <Toast message={toast.message} description={toast.description} variant={toast.variant} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
