"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Toast } from "@repo/ui";
import { Star } from "@phosphor-icons/react";
import { pickVolunteer } from "../actions";
import { ordinal } from "../rules";
import type { StudyVolunteerItem, VolunteerKind } from "../schemas";

// Admin and CEO: the analysts and the reviewers who offered to take a study, first offer first, each with the
// things that decide it (when they offered, how busy they are, whether their field fits). Pick one of each, or leave
// it and the Suggested one (first to offer) is assigned when the deposit clears. On a paid study, picking an analyst
// assigns the team right away (with the picked or first-offering reviewer).

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
  const choose = (v: StudyVolunteerItem | null, kind: VolunteerKind) => {
    setBusy(v?.statisticianId ?? `clear-${kind}`);
    start(async () => {
      const res = await pickVolunteer({ projectId, statisticianId: v?.statisticianId ?? null, kind });
      setBusy(null);
      if (!res.success) return setToast({ message: "Not saved", description: res.error.message, variant: "danger" });
      setToast(
        !v
          ? { message: "Pick cleared", description: "The first to offer is assigned when the deposit clears.", variant: "success" }
          : res.data.assigned
            ? { message: "Team assigned", description: "The analyst and the reviewer are on it now.", variant: "success" }
            : { message: `${v.fullName} picked`, description: "They're assigned automatically when the deposit clears.", variant: "success" }
      );
      router.refresh();
      onChanged?.();
    });
  };

  const analysts = volunteers.filter((v) => v.kind !== "REVIEWER");
  const reviewers = volunteers.filter((v) => v.kind === "REVIEWER");

  return (
    <div className="flex flex-col gap-6 font-sans">
      <OfferList
        kind="ANALYST"
        title="Analysts"
        empty="No analyst offers yet. Analysts offer from Open Studies."
        list={analysts}
        paid={paid}
        busy={busy}
        onChoose={choose}
      />
      <OfferList
        kind="REVIEWER"
        title="Reviewers"
        empty="No reviewer offers yet. Without one, the reviewer with the fewest studies is assigned."
        list={reviewers}
        paid={paid}
        busy={busy}
        onChoose={choose}
      />
      {toast ? <Toast message={toast.message} description={toast.description} variant={toast.variant} onClose={() => setToast(null)} /> : null}
    </div>
  );
}

function OfferList({
  kind,
  title,
  empty,
  list: rows,
  paid,
  busy,
  onChoose,
}: {
  kind: VolunteerKind;
  title: string;
  empty: string;
  list: StudyVolunteerItem[];
  paid: boolean;
  busy: string | null;
  onChoose: (v: StudyVolunteerItem | null, kind: VolunteerKind) => void;
}) {
  const picked = rows.find((v) => v.picked);
  const list = [...rows].sort((a, b) => a.order - b.order);
  const word = kind === "REVIEWER" ? "reviewer" : "analyst";
  return (
    <section className="flex flex-col gap-3">
      <div>
        <p className="text-sm font-medium text-white">
          {title} <span className="font-mono text-[12px] text-white/40">{rows.length}</span>
        </p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-white/60">
          {rows.length === 0
            ? empty
            : picked
              ? `${picked.fullName} is your pick${paid ? "" : " and is assigned when the deposit clears"}.`
              : paid
                ? kind === "REVIEWER"
                  ? "Pick one to review it. Otherwise the Suggested reviewer is used."
                  : "Pick one to assign them now."
                : `Pick one, or the Suggested ${word} (first to offer) is assigned when the deposit clears.`}
        </p>
      </div>

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

                  <dl className={`mt-2 grid grid-cols-1 gap-x-4 gap-y-1.5 text-[12px] ${kind === "REVIEWER" ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
                    <div>
                      <dt className="text-white/40">Offered</dt>
                      <dd className="text-white/85">
                        {ordinal(v.order)} · {dateTime(v.volunteeredAt)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-white/40">{kind === "REVIEWER" ? "Reviewing" : "Working on"}</dt>
                      <dd className={free ? "text-white/85" : "text-white/60"}>{free ? "Nothing right now" : `${v.openStudies} ${v.openStudies === 1 ? "study" : "studies"}`}</dd>
                    </div>
                    {kind === "ANALYST" ? (
                      <div>
                        <dt className="text-white/40">Fits this study</dt>
                        <dd className={v.matches.length ? "text-white/85" : "text-white/50"}>{v.matches.length ? v.matches.join(", ") : "No matching field"}</dd>
                      </div>
                    ) : null}
                  </dl>

                  {v.note ? <p className="mt-2 text-[13px] leading-relaxed text-white/75">&ldquo;{v.note}&rdquo;</p> : null}
                </div>
                <div className="shrink-0">
                  {v.picked ? (
                    <Button variant="ghost" size="sm" onClick={() => onChoose(null, kind)} loading={busy === `clear-${kind}`}>
                      Unpick
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => onChoose(v, kind)} loading={busy === v.statisticianId} disabled={v.status !== "ACTIVE" || !!busy}>
                      {paid && kind === "ANALYST" ? "Assign" : "Pick"}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
