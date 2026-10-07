"use client";

import React, { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, CopyButton, KpiCard, Modal, PageHeader, Toast } from "@repo/ui";
import { CheckCircle, DownloadSimple, Eye, Files, HandWaving, MagnifyingGlass, Star, Warning } from "@phosphor-icons/react";
import dynamic from "next/dynamic";
import { triggerFileDownload } from "@/lib/file-utils";
import { Panel, PanelBody } from "@/components/dashboard/Panel";
import { analysisGoalsFor } from "@/features/projects/analysis-goals";
import { volunteerForStudy, withdrawVolunteer } from "@/features/volunteers/actions";
import { ordinal } from "@/features/volunteers/rules";
import type { OpenStudyItem } from "@/features/volunteers/schemas";
import type { ProjectFileItem } from "@/features/projects/schemas";

// Open Studies: every study without an analyst yet. Analysts read the request and the client's files and offer to
// take the ones they want ("I'll Take This Study"). Admins choose; without a pick the first to offer gets it when
// the deposit clears.

const DocumentViewerLightbox = dynamic(
  () => import("@/features/projects/components/DocumentViewerLightbox").then((m) => m.DocumentViewerLightbox),
  { ssr: false }
);

const FILE_KIND: Record<string, string> = { RESEARCH_DOCUMENT: "Paper or manuscript", DATASET: "Data", QUESTIONNAIRE: "Questionnaire" };
const DAY = 86_400_000;
const FIELD =
  "w-full rounded-[2px] border border-white/10 bg-[#050513] font-sans text-[13px] text-white outline-none placeholder:text-white/30 focus:border-[#CC6600]/60";
const date = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric" }) : "—";

type Show = "ALL" | "NOT_OFFERED" | "OFFERED";

export function OpenStudiesClient({ initial, failed }: { initial: OpenStudyItem[]; failed?: string }) {
  const router = useRouter();
  const [show, setShow] = useState<Show>("ALL");
  const [sort, setSort] = useState<"newest" | "due">("newest");
  const [q, setQ] = useState("");
  const [details, setDetails] = useState<OpenStudyItem | null>(null);
  const [preview, setPreview] = useState<OpenStudyItem["files"][number] | null>(null);
  const [offering, setOffering] = useState<OpenStudyItem | null>(null);
  const [toast, setToast] = useState<{ message: string; description?: string; variant: "success" | "danger" } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, start] = useTransition();
  const search = useRef<HTMLInputElement>(null);
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), []);

  // "/" focuses the search, Esc clears it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        search.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const counts = useMemo(
    () => ({
      all: initial.length,
      offered: initial.filter((s) => s.mine).length,
      picked: initial.filter((s) => s.mine?.picked).length,
    }),
    [initial]
  );

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return initial
      .filter((s) => (show === "OFFERED" ? !!s.mine : show === "NOT_OFFERED" ? !s.mine : true))
      .filter((s) =>
        !term
          ? true
          : [s.researchTitle, s.intakeId, s.school ?? "", s.program ?? "", ...analysisGoalsFor(s.analysisGoals).map((g) => g.title)]
              .join(" ")
              .toLowerCase()
              .includes(term)
      )
      .sort((a, b) =>
        sort === "due"
          ? (a.deadlineRequested ? Date.parse(a.deadlineRequested) : Infinity) - (b.deadlineRequested ? Date.parse(b.deadlineRequested) : Infinity)
          : b.createdAt.localeCompare(a.createdAt)
      );
  }, [initial, show, sort, q]);

  const withdraw = (s: OpenStudyItem) => {
    setBusyId(s.id);
    start(async () => {
      const res = await withdrawVolunteer(s.id);
      setBusyId(null);
      if (res.success) {
        setToast({ message: "Offer taken back", description: s.intakeId, variant: "success" });
        router.refresh();
      } else setToast({ message: "That didn't go through", description: res.error.message, variant: "danger" });
    });
  };

  const filtersOn = show !== "ALL" || q.trim() !== "" || sort !== "newest";

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-24 font-sans animate-content-fade">
      <PageHeader
        title="Open Studies"
        description="Studies that don't have an analyst yet. Read the request and the client's files, then offer to take the ones you want."
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "My Studies", href: "/dashboard/statistician" },
          { label: "Open Studies" },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <KpiCard label="Looking for an analyst" description="Studies without a team" icon={<Files size={18} weight="fill" />} value={counts.all} />
        <KpiCard label="You offered" description="Waiting for the admin" icon={<HandWaving size={18} weight="fill" />} value={counts.offered} />
        <KpiCard label="Picked for you" description="Yours once the deposit clears" icon={<Star size={18} weight="fill" />} value={counts.picked} />
      </div>

      <Panel as="div">
        <PanelBody className="text-[13px] leading-relaxed text-white/60">
          <p className="text-sm font-medium text-white">How it&apos;s decided</p>
          <p className="mt-1">
            An admin chooses who gets each study. If they don&apos;t pick anyone, it goes to whoever offered first when the client pays the
            deposit. If two offers come in at the same moment, an analyst with no current study goes first, then the better fit for the study.
          </p>
        </PanelBody>
      </Panel>

      <div className="overflow-hidden rounded-[2px] border border-white/[0.07] bg-[#0A0A18]">
        <div className="flex flex-col gap-3 border-b border-white/[0.07] px-5 py-4 sm:flex-row sm:items-center sm:px-6">
          <label className="relative flex-1">
            <MagnifyingGlass size={15} weight="bold" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
            <input
              ref={search}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setQ("");
                  e.currentTarget.blur();
                }
              }}
              placeholder="Search title, school, program, goal or study ID"
              aria-label="Search open studies"
              className={`${FIELD} h-9 pl-9 pr-10`}
            />
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded-[2px] border border-white/15 px-1.5 font-mono text-[10px] text-white/45">/</kbd>
          </label>
          <div className="flex gap-3">
            <select value={show} onChange={(e) => setShow(e.target.value as Show)} aria-label="Show" className={`${FIELD} h-9 cursor-pointer px-2.5 [&>option]:bg-[#0A0A18] sm:w-[190px]`}>
              <option value="ALL">All ({counts.all})</option>
              <option value="NOT_OFFERED">Not offered yet ({counts.all - counts.offered})</option>
              <option value="OFFERED">You offered ({counts.offered})</option>
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value as "newest" | "due")} aria-label="Sort" className={`${FIELD} h-9 cursor-pointer px-2.5 [&>option]:bg-[#0A0A18] sm:w-[150px]`}>
              <option value="newest">Newest first</option>
              <option value="due">Due soonest</option>
            </select>
          </div>
        </div>

        {failed ? (
          <PanelBody className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] text-white/60">The studies didn&apos;t load. {failed}</p>
            <Button variant="outline" size="sm" onClick={() => router.refresh()}>
              Try Again
            </Button>
          </PanelBody>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <Files size={28} weight="fill" className="text-white/25" />
            <p className="mt-3 text-sm font-medium text-white">{initial.length === 0 ? "Every study has a team right now" : "No studies match"}</p>
            <p className="mt-1 text-[13px] text-white/50">
              {initial.length === 0 ? "New requests show up here as clients send them." : "Try another search or show all studies."}
            </p>
            {filtersOn ? (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setShow("ALL");
                  setSort("newest");
                  setQ("");
                }}
              >
                Clear Filters
              </Button>
            ) : null}
          </div>
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {rows.map((s) => {
              const dueIn = s.deadlineRequested && now ? Math.ceil((Date.parse(s.deadlineRequested) - now) / DAY) : null;
              const where = [s.program, s.school].filter(Boolean).join(", ");
              return (
                <li key={s.id} className="grid grid-cols-1 gap-4 px-5 py-5 transition-colors hover:bg-white/[0.015] sm:px-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-8">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-[2px] border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[11px] text-white/70">{s.stageLabel}</span>
                      <MyStatus s={s} quiet />
                    </div>
                    <button
                      type="button"
                      onClick={() => setDetails(s)}
                      className="mt-2 block text-left text-[15px] font-semibold leading-snug text-white hover:underline hover:underline-offset-2"
                    >
                      {s.researchTitle}
                    </button>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-white/50">
                      <CopyButton variant="badge" value={s.intakeId} label={s.intakeId} />
                      {where ? <span className="truncate">{where}</span> : null}
                    </div>
                    {s.analysisGoals.length ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {analysisGoalsFor(s.analysisGoals).map((g) => (
                          <span key={g.code} title={`Usual tests: ${g.typicalTests}`} className="rounded-[2px] border border-white/10 px-1.5 py-0.5 text-[11px] text-white/65">
                            {g.title}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-col justify-between gap-4">
                    <dl className="grid grid-cols-3 gap-3 text-[12px]">
                      <div>
                        <dt className="text-white/40">Due</dt>
                        <dd className="mt-0.5 whitespace-nowrap text-white">{date(s.deadlineRequested)}</dd>
                        {dueIn !== null ? <dd className="text-white/45">{dueIn >= 0 ? `in ${dueIn} days` : `${-dueIn} days ago`}</dd> : null}
                      </div>
                      <div>
                        <dt className="text-white/40">Files</dt>
                        <dd className="mt-0.5 text-white">{s.files.length}</dd>
                      </div>
                      <div>
                        <dt className="text-white/40">Offers</dt>
                        <dd className="mt-0.5 text-white">{s.volunteerCount}</dd>
                      </div>
                    </dl>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setDetails(s)} className="flex-1">
                        Details
                      </Button>
                      {s.mine ? (
                        <Button variant="ghost" size="sm" onClick={() => withdraw(s)} loading={busyId === s.id} className="flex-1">
                          Take Back
                        </Button>
                      ) : (
                        <Button variant="primary" size="sm" onClick={() => setOffering(s)} className="flex-1 active:scale-[0.97]">
                          I&apos;ll Take It
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {details ? (
        <Modal
          open
          onClose={() => setDetails(null)}
          title={details.researchTitle}
          description={`${details.intakeId} · ${details.stageLabel} · sent ${date(details.createdAt)}`}
          size="2xl"
          footer={
            <div className="flex w-full flex-wrap items-center justify-between gap-3">
              <MyStatus s={details} />
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setDetails(null)}>
                  Close
                </Button>
                {details.mine ? (
                  <Button
                    variant="outline"
                    size="sm"
                    loading={busyId === details.id}
                    onClick={() => {
                      withdraw(details);
                      setDetails(null);
                    }}
                  >
                    Take Back Offer
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setOffering(details);
                      setDetails(null);
                    }}
                  >
                    I&apos;ll Take This Study
                  </Button>
                )}
              </div>
            </div>
          }
        >
          <div className="flex flex-col gap-6 font-sans text-[13px]">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-[2px] border border-white/[0.08] bg-white/[0.02] px-4 py-3 sm:grid-cols-4">
              <Fact label="Client needs it by" value={date(details.deadlineRequested)} />
              <Fact label="Package" value={details.packageName ?? "Not priced yet"} />
              <Fact label="School" value={details.school ?? "—"} />
              <Fact label="Program" value={details.program ?? "—"} />
            </dl>

            <Block title="Research objectives" text={details.researchObjectives} />
            {details.researchQuestions?.trim() ? <Block title="Statement of the problem" text={details.researchQuestions} /> : null}
            {details.hypotheses?.trim() ? <Block title="Hypotheses" text={details.hypotheses} /> : null}

            <section>
              <p className="text-[12px] font-medium text-white/45">What the analysis should do</p>
              {details.analysisGoals.length ? (
                <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {analysisGoalsFor(details.analysisGoals).map((g) => (
                    <li key={g.code} className="rounded-[2px] border border-white/[0.08] px-3 py-2.5">
                      <p className="text-[13px] font-medium text-white">{g.title}</p>
                      <p className="mt-0.5 text-[12px] leading-relaxed text-white/50">{g.typicalTests}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-white/40">Not given</p>
              )}
            </section>

            <section>
              <p className="text-[12px] font-medium text-white/45">
                Client&apos;s files <span className="font-mono text-white/35">{details.files.length}</span>
              </p>
              {details.files.length ? (
                <ul className="mt-2 divide-y divide-white/[0.05] rounded-[2px] border border-white/[0.08]">
                  {details.files.map((f) => (
                    <li key={f.id} className="flex items-center gap-3 px-3 py-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[2px] border border-white/10 bg-white/[0.04] font-mono text-[10px] uppercase text-white/60">
                        {f.fileName.split(".").pop()?.slice(0, 4)}
                      </span>
                      <button type="button" onClick={() => setPreview(f)} className="min-w-0 flex-1 text-left">
                        <span className="block truncate text-white hover:underline hover:underline-offset-2">{f.fileName}</span>
                        <span className="block text-[12px] text-white/45">{FILE_KIND[f.fileCategory] ?? "File"}</span>
                      </button>
                      <Button variant="ghost" size="sm" onClick={() => setPreview(f)} className="gap-1.5">
                        <Eye size={14} weight="fill" />
                        Preview
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => void triggerFileDownload(f.filePath, f.fileName)} aria-label={`Download ${f.fileName}`}>
                        <DownloadSimple size={14} weight="fill" />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-white/40">The client didn&apos;t add any files.</p>
              )}
            </section>
          </div>
        </Modal>
      ) : null}

      {preview && details ? (
        <DocumentViewerLightbox
          file={preview as unknown as ProjectFileItem}
          files={details.files as unknown as ProjectFileItem[]}
          onNavigateFile={(f) => setPreview(f as unknown as OpenStudyItem["files"][number])}
          onClose={() => setPreview(null)}
        />
      ) : null}

      <OfferDialog
        study={offering}
        onClose={() => setOffering(null)}
        onDone={(s, count) => {
          setOffering(null);
          setToast({
            message: "Offer sent",
            description: count === 1 ? `You're the first to offer for ${s.intakeId}. An admin will decide.` : `You're offer ${count} for ${s.intakeId}. An admin will decide.`,
            variant: "success",
          });
          router.refresh();
        }}
      />

      {toast ? <Toast message={toast.message} description={toast.description} variant={toast.variant} onClose={() => setToast(null)} /> : null}
    </div>
  );
}

function MyStatus({ s, quiet = false }: { s: OpenStudyItem; quiet?: boolean }) {
  if (s.mine?.picked)
    return (
      <span className="inline-flex items-center gap-1 rounded-[2px] border border-[#CC6600]/50 px-1.5 py-0.5 text-[11px] text-white">
        <Star size={11} weight="fill" className="text-[#CC6600]" />
        Picked for you
      </span>
    );
  if (s.mine)
    return (
      <span className="inline-flex items-center gap-1 rounded-[2px] border border-white/15 px-1.5 py-0.5 text-[11px] text-white/80">
        <CheckCircle size={11} weight="fill" />
        You offered {ordinal(s.mine.place)}
        {s.pickedSomeoneElse ? " · someone else was picked" : ""}
      </span>
    );
  if (s.pickedSomeoneElse) return <span className="text-[11px] text-white/45">An analyst was already picked</span>;
  if (quiet) return null;
  return <span className="text-[12px] text-white/45">{s.volunteerCount === 0 ? "No offers yet" : `${s.volunteerCount} ${s.volunteerCount === 1 ? "offer" : "offers"} so far`}</span>;
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] text-white/45">{label}</dt>
      <dd className="mt-0.5 truncate text-white">{value}</dd>
    </div>
  );
}

function Block({ title, text }: { title: string; text?: string | null }) {
  return (
    <div>
      <p className="text-[12px] font-medium text-white/45">{title}</p>
      <p className={`mt-1 whitespace-pre-line leading-relaxed ${text?.trim() ? "text-white/85" : "text-white/35"}`}>{text?.trim() || "Not given"}</p>
    </div>
  );
}

function OfferDialog({ study, onClose, onDone }: { study: OpenStudyItem | null; onClose: () => void; onDone: (s: OpenStudyItem, count: number) => void }) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const [last, setLast] = useState<string | null>(null);
  if ((study?.id ?? null) !== last) {
    setLast(study?.id ?? null);
    setNote("");
    setError(null);
  }
  if (!study) return null;
  const send = () =>
    start(async () => {
      const res = await volunteerForStudy({ projectId: study.id, note: note.trim() || undefined });
      if (res.success) onDone(study, res.data.count);
      else setError(res.error.message);
    });
  return (
    <Modal
      open
      onClose={() => (busy ? undefined : onClose())}
      title="Offer to take this study"
      description={`${study.intakeId} · ${study.researchTitle}`}
      size="md"
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={send} loading={busy}>
            Send Offer
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3 font-sans text-[13px]">
        <p className="leading-relaxed text-white/65">
          Admins are told right away. If you&apos;re chosen, the study becomes yours when the client pays the deposit. You can take the offer back
          until then.
        </p>
        <label className="flex flex-col gap-1.5 text-white/70">
          Why you&apos;re a good fit (optional)
          <textarea
            rows={3}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="For example: I've done three regression studies on student performance this year."
            className={`${FIELD} resize-none p-3 leading-relaxed`}
          />
        </label>
        {error ? (
          <p role="alert" className="flex items-start gap-2 text-red-300">
            <Warning size={15} weight="fill" className="mt-0.5 shrink-0" />
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
