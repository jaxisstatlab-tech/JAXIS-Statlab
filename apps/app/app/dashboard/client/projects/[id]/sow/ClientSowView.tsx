"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Toast, LoadingState, ConfirmDialog } from "@repo/ui";
import { Peso } from "@repo/ui/MoneyDisplay";
import { ArrowRight, ChatCenteredText, Check, CheckCircle, FileText, WarningCircle } from "@phosphor-icons/react";
import { getSOWByProject, signSOW } from "@/features/sow/actions";
import { getProjectById } from "@/features/projects/actions";
import { SowDocument } from "@/features/sow/components/SowDocument";
import { StudySection } from "@/features/projects/components/StudySection";
import { getClientStage } from "@/features/projects/client-stage";
import { Panel, PanelHeader } from "@/components/dashboard/Panel";
import { SITE_TERMS_URL } from "@/lib/site";
import type { SOWDetailItem } from "@/features/sow/schemas";
import type { ProjectDetailItem } from "@/features/projects/schemas";

// The Agreement tab: the agreement as a printable sheet, with a signing panel beside it
// (like a checkout). Signing = typing the account name exactly + ticking the box.

const money = (n: number) => Math.round(n).toLocaleString("en-PH");

function dateTime(value?: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export interface ClientSowViewProps {
  projectId: string;
  /** Loaded on the server so the tab opens with its content. */
  initialProject: ProjectDetailItem | null;
  initialSow: SOWDetailItem | null;
  initialError?: string | null;
}

export function ClientSowView({ projectId, initialProject, initialSow, initialError = null }: ClientSowViewProps) {
  const router = useRouter();
  const preloaded = Boolean(initialProject) || Boolean(initialError);

  const [project, setProject] = useState<ProjectDetailItem | null>(initialProject);
  const [sow, setSow] = useState<SOWDetailItem | null>(initialSow);
  const [isLoading, setIsLoading] = useState(!preloaded);
  const [error, setError] = useState<string | null>(initialError);

  const [typedName, setTypedName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ message: string; description?: string; variant: "success" | "danger" } | null>(null);

  useEffect(() => {
    // The server already loaded it; only fetch here when it couldn't.
    if (!projectId || preloaded) return;
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [projRes, sowRes] = await Promise.all([getProjectById(projectId), getSOWByProject(projectId)]);
        if (cancelled) return;
        if (!projRes.success) {
          setError(projRes.error.message);
          return;
        }
        setProject(projRes.data);
        if (sowRes.success && sowRes.data) setSow(sowRes.data);
      } catch (err) {
        if (!cancelled) setError((err as Error).message || "Something went wrong.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, preloaded]);

  // signSOW checks the typed name against the account name on the study, so match that here.
  const registeredName = project?.client?.fullName?.trim() ?? "";
  const typed = typedName.trim();
  const nameMatches = typed.length > 0 && registeredName.length > 0 && typed.toLowerCase() === registeredName.toLowerCase();
  const canSign = Boolean(sow && !sow.isLocked && nameMatches && agreed);

  const handleConfirmSign = () => {
    if (!canSign || !sow) return;
    setSignError(null);
    startTransition(async () => {
      const res = await signSOW({ sowId: sow.id, typedFullName: typed, agreedToTerms: true });
      setIsConfirmOpen(false);
      if (res.success && res.data) {
        setSow(res.data);
        const fresh = await getProjectById(projectId);
        if (fresh.success) setProject(fresh.data);
        window.dispatchEvent(new Event("jaxis:study-updated"));
        setToast({ message: "Agreement signed", description: "Next, pay your deposit so we can assign your statistical analyst.", variant: "success" });
        router.refresh();
      } else {
        setSignError(!res.success ? res.error.message : "The signature didn't go through. Please try again.");
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <LoadingState variant="page" label="Loading your agreement..." />
      </div>
    );
  }

  if (error || !project) {
    return (
      <Panel as="div">
        <div className="flex flex-col items-center px-6 py-14 text-center">
          <WarningCircle size={28} weight="fill" className="text-white/30" />
          <p className="mt-4 text-sm font-medium text-white">We couldn&apos;t open your agreement</p>
          <p className="mt-1 max-w-md text-[13px] text-white/55">{error || "Please try again in a moment."}</p>
          <Button asChild variant="outline" size="sm" className="mt-5">
            <Link href={`/dashboard/client/projects/${projectId}`}>Back to Overview</Link>
          </Button>
        </div>
      </Panel>
    );
  }

  const base = `/dashboard/client/projects/${project.id}`;

  return (
    <div className="flex flex-col gap-6 pb-24 print:gap-0 print:pb-0">
      {toast ? (
        <Toast message={toast.message} description={toast.description} variant={toast.variant} onClose={() => setToast(null)} />
      ) : null}

      <div className="print:hidden">
        <StudySection
          title="Your agreement"
          description={
            sow?.isLocked
              ? "Your signed agreement. You can print it or save it as a PDF anytime."
              : "Your scope, price and delivery date. Read it, then sign by typing your full name."
          }
        />
      </div>

      {!sow ? (
        <Panel as="div" className="print:hidden">
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <FileText size={28} weight="fill" className="text-white/30" />
            <p className="mt-4 text-sm font-medium text-white">We&apos;re preparing your agreement</p>
            <p className="mt-1 max-w-md text-[13px] leading-relaxed text-white/55">
              We&apos;re writing it from the price you accepted: the exact scope, files, price and delivery date. We&apos;ll
              let you know as soon as it&apos;s ready to sign.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-5">
              <Link href={`${base}/quote`}>View Your Price</Link>
            </Button>
          </div>
        </Panel>
      ) : (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12 print:block">
          <div className="min-w-0 lg:col-span-8">
            <SowDocument sow={sow} />
          </div>

          <div className="flex flex-col gap-6 lg:sticky lg:top-0 lg:col-span-4 print:hidden">
            {sow.isLocked ? (
              <SignedPanel sow={sow} project={project} />
            ) : (
              <Panel aria-label="Sign your agreement" className="border-[#CC6600]/35">
                <PanelHeader title="Sign your agreement" subtitle="Signing locks your scope, price and delivery date." />
                <div className="flex flex-col gap-5 px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
                  <Summary sow={sow} />

                  <div>
                    <label htmlFor="sign-name" className="text-xs font-medium text-white/60">
                      Type your full name
                    </label>
                    <input
                      id="sign-name"
                      value={typedName}
                      onChange={(e) => setTypedName(e.target.value)}
                      autoComplete="name"
                      placeholder={registeredName}
                      className="mt-1.5 h-11 w-full rounded-[2px] border border-white/15 bg-white/[0.03] px-3 font-sans text-base text-white placeholder:text-white/25 focus:border-white/35 focus:outline-none sm:text-sm"
                    />
                    <p className="mt-1.5 text-xs text-white/45">
                      Type it exactly as on your account: <span className="text-white/80">{registeredName}</span>
                    </p>
                    {typed.length > 0 ? (
                      <div className="mt-3 rounded-[2px] border border-white/[0.08] bg-white/[0.02] px-4 py-3">
                        <p className="text-[11px] text-white/40">Your signature</p>
                        <p className="font-signature select-none truncate py-1 text-[34px] leading-none text-white">{typed}</p>
                        <p className={`mt-1 flex items-center gap-1.5 text-xs ${nameMatches ? "text-white/70" : "text-[#FFA040]"}`}>
                          {nameMatches ? (
                            <>
                              <Check size={13} weight="bold" /> Matches your account name
                            </>
                          ) : (
                            <>
                              <WarningCircle size={13} weight="fill" /> Doesn&apos;t match your account name yet
                            </>
                          )}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  <label className="flex cursor-pointer items-start gap-3 rounded-[2px] border border-white/[0.08] px-3.5 py-3">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[#CC6600]"
                    />
                    <span className="text-[13px] leading-relaxed text-white/75">
                      I&apos;ve read the whole agreement, including the price, payments and terms. I agree that once I sign,
                      the scope is locked and this agreement is binding under the{" "}
                      <a
                        href={SITE_TERMS_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="text-white underline decoration-white/30 underline-offset-4 hover:decoration-white"
                      >
                        JAXIS Terms of Service
                      </a>
                      .
                    </span>
                  </label>

                  {signError ? (
                    <p role="alert" className="flex items-start gap-1.5 text-[13px] text-[#FFA040]">
                      <WarningCircle size={15} weight="fill" className="mt-0.5 shrink-0" />
                      {signError}
                    </p>
                  ) : null}

                  <div>
                    <Button
                      variant="primary"
                      size="md"
                      className="w-full"
                      disabled={!canSign || isPending}
                      loading={isPending}
                      onClick={() => setIsConfirmOpen(true)}
                    >
                      Sign Agreement
                    </Button>
                    {!canSign ? (
                      <p className="mt-2 text-center text-xs text-white/40">
                        {!nameMatches ? "Type your full name to sign." : "Tick the box to sign."}
                      </p>
                    ) : null}
                  </div>

                  <div className="border-t border-white/[0.06] pt-4 text-[13px] text-white/55">
                    Want to change something first?{" "}
                    <Link
                      href={`${base}/messages`}
                      className="inline-flex items-center gap-1 text-white underline decoration-white/30 underline-offset-4 hover:decoration-white"
                    >
                      <ChatCenteredText size={13} weight="fill" />
                      Message your team
                    </Link>
                  </div>
                </div>
              </Panel>
            )}
          </div>
        </div>
      )}

      {isConfirmOpen ? (
        <ConfirmDialog
          open
          onCancel={() => setIsConfirmOpen(false)}
          title="Sign this agreement?"
          description={`You're signing as "${typed}". Your scope, price and delivery date will be locked, and next you'll pay your deposit.`}
          confirmLabel="Sign Agreement"
          confirmVariant="default"
          loading={isPending}
          onConfirm={handleConfirmSign}
        />
      ) : null}
    </div>
  );
}

function Summary({ sow }: { sow: SOWDetailItem }) {
  const c = sow.contentSnapshot.commercial;
  const rows = [
    { label: "Total price", value: c.totalAmount, money: true, strong: true },
    { label: "Deposit to start", value: c.downpaymentRequired, money: true },
    { label: "Delivery", value: `${sow.contentSnapshot.delivery.turnaroundDays} working days`, money: false },
  ];
  return (
    <dl className="flex flex-col divide-y divide-white/[0.06] rounded-[2px] border border-white/[0.08] px-3.5">
      {rows.map((r) => (
        <div key={r.label} className="flex items-baseline justify-between gap-3 py-2.5">
          <dt className="text-[13px] text-white/50">{r.label}</dt>
          <dd className={`text-[13px] ${r.strong ? "font-mono font-semibold text-white" : r.money ? "font-mono text-white/85" : "text-white/85"}`}>
            {r.money ? (
              <>
                <Peso />
                {money(Number(r.value))}
              </>
            ) : (
              r.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function SignedPanel({ sow, project }: { sow: SOWDetailItem; project: ProjectDetailItem }) {
  const stage = getClientStage(project.masterStatus);
  const base = `/dashboard/client/projects/${project.id}`;
  const payNext = stage.tone === "action" && stage.action?.path === "/payment";
  return (
    <Panel aria-label="Signed">
      <div className="flex flex-col gap-4 px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex items-start gap-3">
          <CheckCircle size={22} weight="fill" className="mt-0.5 shrink-0 text-white/70" />
          <div>
            <p className="text-[15px] font-semibold text-white">You signed this agreement</p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-white/55">
              Signed by <span className="text-white/85">{sow.signedByName}</span>
              {sow.signedAt ? ` on ${dateTime(sow.signedAt)}` : ""}. Your scope, price and delivery date are locked.
            </p>
          </div>
        </div>
        {payNext ? (
          <div className="border-t border-white/[0.06] pt-4">
            <p className="text-[13px] text-white/60">
              <span className="text-white/85">Next: </span>
              {stage.now}
            </p>
            <Button asChild variant="primary" size="sm" className="mt-3 w-full gap-1.5">
              <Link href={`${base}/payment`}>
                Pay Deposit
                <ArrowRight size={13} weight="bold" />
              </Link>
            </Button>
          </div>
        ) : null}
        <p className="border-t border-white/[0.06] pt-4 text-[13px] text-white/55">
          Questions about your agreement?{" "}
          <Link href={`${base}/messages`} className="text-white underline decoration-white/30 underline-offset-4 hover:decoration-white">
            Message your team
          </Link>
        </p>
      </div>
    </Panel>
  );
}
