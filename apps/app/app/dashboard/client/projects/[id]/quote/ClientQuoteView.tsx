"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useTransition,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  PageHeader,
  Button,
  Modal,
  ModalFooter,
  Toast,
  LoadingState,
  Peso,
  CopyButton,
} from "@repo/ui";
import {
  ArrowRight,
  ChatCenteredText,
  Check,
  CheckCircle,
  Clock,
  GraduationCap,
  PencilSimple,
  Warning,
} from "@phosphor-icons/react";
import { getProjectById } from "@/features/projects/actions";
import {
  getQuotationByProject,
  respondQuotation,
} from "@/features/quotations/actions";
import {
  PACKAGES_CATALOG,
  ADDONS_CATALOG,
  calculateQuotationTotals,
} from "@/lib/pricing-rules";
import type { ProjectDetailItem } from "@/features/projects/schemas";
import type { QuotationDetailItem } from "@/features/quotations/schemas";
import type { AddOnName } from "@prisma/client";
import { clientPackage, clientPackageName, clientStandardTime } from "@/features/projects/client-packages";
import { Panel, PanelBody, PanelHeader } from "@/components/dashboard/Panel";
import { StudySection } from "@/features/projects/components/StudySection";

// Client "Your price" page, laid out like a checkout: choices on the left, the price summary and
// the accept button on the right. Pricing is recalculated with the same rules the server uses.

export interface ClientQuoteViewProps {
  projectId: string;
  /** Loaded on the server so the page shows at once; refreshed here after accept/decline. */
  initialProject: ProjectDetailItem | null;
  initialQuotation: QuotationDetailItem | null;
  initialError?: string | null;
}

const SPEED_CODES = ["RUSH", "EXPRESS", "EMERGENCY"];

// Plain names shown to clients (the catalog names are for staff screens).
const CLIENT_ADDON_COPY: Record<string, { name: string; detail: string }> = {
  DEFENSELAB: {
    name: "DefenseLab practice session",
    detail:
      "A 1-hour mock defense with a senior statistical analyst. You get the recording.",
  },
  RUSH: {
    name: "Rush",
    detail: "Ready in 3 days after your deposit is confirmed.",
  },
  EXPRESS: {
    name: "Express",
    detail: "Ready in 48 hours after your deposit is confirmed.",
  },
  EMERGENCY: {
    name: "Emergency",
    detail: "Ready in 24 hours, with a senior reviewer on your study.",
  },
};

const money = (n: number) => Math.round(n).toLocaleString("en-PH");
const subscribeNever = () => () => {};
/** True only in the browser (after hydration), so portals never render on the server. */
const useIsClient = () =>
  useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
const longDate = (value: string | Date) =>
  new Date(value).toLocaleDateString("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

interface AddOnOption {
  code: string;
  name: string;
  detail: string;
  amount: number;
  isSpeed: boolean;
}

export function ClientQuoteView({ projectId, initialProject, initialQuotation, initialError = null }: ClientQuoteViewProps) {
  const [project, setProject] = useState<ProjectDetailItem | null>(initialProject);
  const [quotation, setQuotation] = useState<QuotationDetailItem | null>(initialQuotation);
  const [selectedAddOnCodes, setSelectedAddOnCodes] = useState<string[]>(() =>
    (initialQuotation?.lineItems ?? []).filter((li) => li.itemType === "ADDON").map((li) => li.itemName),
  );
  const [isLoading, setIsLoading] = useState(!initialProject && !initialError);
  const [error, setError] = useState<string | null>(initialError);
  // The server already loaded the first data; only fetch here when it didn't.
  const skipFirstLoad = useRef(Boolean(initialProject));

  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const isClient = useIsClient();

  const [toastMessage, setToastMessage] = useState<{
    message: string;
    description?: string;
    variant: "info" | "success" | "warning" | "danger";
  } | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [projRes, quoteRes] = await Promise.all([
        getProjectById(projectId),
        getQuotationByProject(projectId),
      ]);

      if (projRes.success && projRes.data) {
        setProject(projRes.data);
      } else {
        setError(
          !projRes.success
            ? projRes.error.message
            : "We couldn't load this study.",
        );
      }

      setQuotation(quoteRes);
      if (quoteRes) {
        setSelectedAddOnCodes(
          quoteRes.lineItems
            .filter((li) => li.itemType === "ADDON")
            .map((li) => li.itemName),
        );
      }
    } catch {
      setError("We couldn't load your price. Please try again in a moment.");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (skipFirstLoad.current) {
      skipFirstLoad.current = false;
      return;
    }
    loadData();
  }, [loadData]);

  const isOpen = quotation?.status === "QUOTE_SENT" && !quotation.isExpired;

  const handleAcceptProposal = () => {
    if (!quotation) return;
    startTransition(async () => {
      try {
        const res = await respondQuotation({
          quotationId: quotation.id,
          decision: "ACCEPT",
          selectedAddOnCodes,
        });
        if (res.success) {
          setToastMessage({
            message: "Price accepted",
            description:
              "Thank you! We're preparing your agreement and will let you know when it's ready to sign.",
            variant: "success",
          });
          setIsAcceptModalOpen(false);
          window.dispatchEvent(new Event("jaxis:study-updated"));
          loadData();
        } else {
          setToastMessage({
            message: "Couldn't accept the price",
            description: res.error?.message || "Please try again in a moment.",
            variant: "danger",
          });
        }
      } catch (err: unknown) {
        setToastMessage({
          message: "Something went wrong",
          description:
            (err as Error).message || "Please try again in a moment.",
          variant: "danger",
        });
      }
    });
  };

  const handleDeclineProposal = () => {
    if (!quotation) return;
    startTransition(async () => {
      try {
        const res = await respondQuotation({
          quotationId: quotation.id,
          decision: "DECLINE",
          declineReason,
        });
        if (res.success) {
          setToastMessage({
            message: "Changes requested",
            description:
              "We've sent your note to our team. We'll send you an updated price.",
            variant: "info",
          });
          setIsDeclineModalOpen(false);
          window.dispatchEvent(new Event("jaxis:study-updated"));
          await loadData();
        } else {
          setToastMessage({
            message: "Couldn't send your request",
            description: res.error?.message || "Please try again in a moment.",
            variant: "danger",
          });
        }
      } catch (err: unknown) {
        setToastMessage({
          message: "Something went wrong",
          description:
            (err as Error).message || "Please try again in a moment.",
          variant: "danger",
        });
      }
    });
  };

  // Options the client can see: once accepted, only what they agreed to; while open, the full catalog
  // with any prices the quote set for specific add-ons.
  const availableAddOns = useMemo<AddOnOption[]>(() => {
    if (!quotation) return [];
    const toOption = (
      code: string,
      amount: number,
      fallbackName: string,
    ): AddOnOption => ({
      code,
      name: CLIENT_ADDON_COPY[code]?.name ?? fallbackName,
      detail:
        CLIENT_ADDON_COPY[code]?.detail ??
        ADDONS_CATALOG[code as AddOnName]?.tagline ??
        "",
      amount,
      isSpeed: SPEED_CODES.includes(code),
    });

    const quoted = quotation.lineItems.filter((li) => li.itemType === "ADDON");
    if (quotation.status === "CLIENT_APPROVED") {
      return quoted.map((li) =>
        toOption(li.itemName, Number(li.amount), li.description || li.itemName),
      );
    }

    const map = new Map<string, AddOnOption>();
    (Object.keys(ADDONS_CATALOG) as AddOnName[]).forEach((key) => {
      const def = ADDONS_CATALOG[key];
      map.set(key, toOption(key, def.defaultPrice, def.name));
    });
    quoted.forEach((li) =>
      map.set(
        li.itemName,
        toOption(li.itemName, Number(li.amount), li.description || li.itemName),
      ),
    );
    return Array.from(map.values());
  }, [quotation]);

  const extras = useMemo(
    () => availableAddOns.filter((a) => !a.isSpeed),
    [availableAddOns],
  );
  const speeds = useMemo(
    () => availableAddOns.filter((a) => a.isSpeed),
    [availableAddOns],
  );
  const selectedSpeed =
    speeds.find((s) => selectedAddOnCodes.includes(s.code))?.code ?? null;

  const toggleExtra = (code: string) => {
    if (!isOpen) return;
    setSelectedAddOnCodes((prev) =>
      prev.includes(code) ? prev.filter((k) => k !== code) : [...prev, code],
    );
  };

  // A study can only have one delivery speed; null means Standard.
  const chooseSpeed = (code: string | null) => {
    if (!isOpen) return;
    setSelectedAddOnCodes((prev) => [
      ...prev.filter((k) => !SPEED_CODES.includes(k)),
      ...(code ? [code] : []),
    ]);
  };

  const currentPricing = useMemo(() => {
    if (!quotation)
      return {
        totalAmount: 0,
        downpaymentRequired: 0,
        releaseBalance: 0,
        downpaymentPercentage: 50,
      };
    const fromQuote = {
      totalAmount: quotation.totalAmount,
      downpaymentRequired: quotation.downpaymentRequired,
      releaseBalance: quotation.releaseBalance,
      downpaymentPercentage: quotation.downpaymentPercentage,
    };
    if (!isOpen) return fromQuote;
    try {
      const breakdown = calculateQuotationTotals({
        packageName: quotation.packageName,
        basePrice: quotation.basePrice,
        addOns: availableAddOns
          .filter((a) => selectedAddOnCodes.includes(a.code))
          .map((a) => ({
            name: a.code as AddOnName,
            amount: a.amount,
            description: a.name,
          })),
      });
      return {
        totalAmount: breakdown.totalAmount,
        downpaymentRequired: breakdown.downpaymentRequired,
        releaseBalance: breakdown.releaseBalance,
        downpaymentPercentage: breakdown.downpaymentPercentage,
      };
    } catch {
      return fromQuote;
    }
  }, [quotation, isOpen, availableAddOns, selectedAddOnCodes]);

  const copyId = (id: string) =>
    setToastMessage({
      message: "Study ID copied",
      description: `${id} is on your clipboard.`,
      variant: "info",
    });

  const breadcrumbs = (intakeId?: string) => [
    { label: "WORKSPACE", href: "/dashboard" },
    { label: "My Studies", href: "/dashboard/client" },
    ...(intakeId
      ? [{ label: intakeId, href: `/dashboard/client/projects/${projectId}` }]
      : []),
    { label: "Your Price" },
  ];

  if (isLoading) {
    return (
      <div className="flex-1 w-full min-h-full flex items-center justify-center animate-content-fade my-auto">
        <LoadingState variant="page" label="Loading your price..." />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-24 w-full animate-content-fade">
        <PageHeader title="Your Price" breadcrumbs={breadcrumbs()} />
        <Panel>
          <PanelBody className="flex flex-col items-center gap-4 py-12 text-center">
            <Warning size={28} weight="fill" className="text-white/40" />
            <div>
              <p className="text-base font-semibold text-white">
                We couldn&apos;t load this price
              </p>
              <p className="mt-1 text-sm text-white/55">
                {error || "We couldn't find this study."}
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/client/projects">Back to My Studies</Link>
            </Button>
          </PanelBody>
        </Panel>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-24 w-full animate-content-fade">
        <StudySection
          title="Your price"
        />
        <Panel>
          <PanelBody className="flex flex-col items-center gap-4 py-12 text-center">
            <Clock size={28} weight="fill" className="text-white/40" />
            <div className="max-w-md">
              <p className="text-base font-semibold text-white">
                We&apos;re preparing your price
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-white/55">
                Our team is reading your research questions and files.
                You&apos;ll get a fixed written price within 24 hours, and
                we&apos;ll let you know as soon as it&apos;s ready.
              </p>
            </div>
          </PanelBody>
        </Panel>
      </div>
    );
  }

  // Client-facing package copy matches the website; the staff catalog is only a fallback.
  const staffPkg = PACKAGES_CATALOG[quotation.packageName];
  const sitePkg = clientPackage(quotation.packageName);
  const pkgName = clientPackageName(quotation.packageName) ?? "Your package";
  const pkgFeatures = sitePkg?.features ?? staffPkg?.deliverables ?? [];
  const pkgBestFor = sitePkg?.bestFor ?? staffPkg?.recommendedFor ?? null;
  const standardDetail = `Our usual timeline: ${clientStandardTime(quotation.packageName)} after your deposit is confirmed.`;
  const chosenExtras = extras.filter((a) =>
    selectedAddOnCodes.includes(a.code),
  );
  const chosenSpeed = speeds.find((s) => s.code === selectedSpeed) ?? null;
  const upfront = quotation.isUpfrontEnforced;

  return (
    <div
      data-portal="client"
      className="flex flex-col gap-6 max-w-7xl mx-auto pb-24 w-full animate-content-fade"
    >
      <StudySection
          title="Your price"
          description="Check what's included, pick extras, then accept or ask for changes."
        />

      <StatusBanner
        quotation={quotation}
        project={project}
        projectId={projectId}
      />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* ── Left: what you get + choices ── */}
        <div className="flex flex-col gap-6 lg:col-span-7">
          <Panel aria-label="What you get">
            <PanelHeader
              title="What you get"
              subtitle={pkgName}
              aside={
                <CopyButton
                  variant="ghost"
                  value={project.intakeId}
                  label={project.intakeId}
                  onCopy={() => copyId(project.intakeId)}
                  className="text-[11px]"
                />
              }
            />
            <PanelBody className="flex flex-col gap-5">
              {pkgFeatures.length ? (
                <ul className="flex flex-col gap-3">
                  {pkgFeatures.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-3 text-sm text-white/85"
                    >
                      <Check
                        size={16}
                        weight="bold"
                        className="mt-0.5 shrink-0 text-white/50"
                      />
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="grid grid-cols-1 gap-2 border-t border-white/[0.07] pt-4 text-[13px] text-white/60 sm:grid-cols-2">
                {[
                  "Checked by a second statistical analyst",
                  "Explained in plain English",
                  "Free fixes within your scope",
                  "Files your adviser can open",
                ].map((t) => (
                  <span key={t} className="flex items-center gap-2">
                    <CheckCircle
                      size={15}
                      weight="fill"
                      className="shrink-0 text-white/35"
                    />
                    {t}
                  </span>
                ))}
              </div>
              {pkgBestFor ? (
                <p className="text-xs text-white/45">Best for: {pkgBestFor}</p>
              ) : null}
            </PanelBody>
          </Panel>

          {speeds.length > 0 && (isOpen || chosenSpeed) ? (
            <Panel aria-label="Delivery speed">
              <PanelHeader
                title="Delivery speed"
                subtitle={
                  isOpen ? "Need it sooner? Pick one." : "The speed you chose."
                }
              />
              <PanelBody>
                <div
                  role="radiogroup"
                  aria-label="Delivery speed"
                  className="flex flex-col gap-2"
                >
                  {isOpen ? (
                    <OptionRow
                      kind="radio"
                      selected={selectedSpeed === null}
                      onSelect={() => chooseSpeed(null)}
                      title="Standard"
                      detail={standardDetail}
                      price={null}
                    />
                  ) : null}
                  {speeds
                    .filter((s) => isOpen || s.code === selectedSpeed)
                    .map((s) => (
                      <OptionRow
                        key={s.code}
                        kind="radio"
                        selected={selectedSpeed === s.code}
                        onSelect={() => chooseSpeed(s.code)}
                        title={s.name}
                        detail={s.detail}
                        price={s.amount}
                        disabled={!isOpen}
                      />
                    ))}
                </div>
              </PanelBody>
            </Panel>
          ) : null}

          {extras.length > 0 && (isOpen || chosenExtras.length > 0) ? (
            <Panel aria-label="Extras">
              <PanelHeader
                title="Extras"
                subtitle={
                  isOpen
                    ? "Optional. Add them now or later."
                    : "Extras you chose."
                }
              />
              <PanelBody>
                <div className="flex flex-col gap-2">
                  {extras
                    .filter(
                      (a) => isOpen || selectedAddOnCodes.includes(a.code),
                    )
                    .map((a) => (
                      <OptionRow
                        key={a.code}
                        kind="checkbox"
                        selected={selectedAddOnCodes.includes(a.code)}
                        onSelect={() => toggleExtra(a.code)}
                        title={a.name}
                        detail={a.detail}
                        price={a.amount}
                        icon={
                          a.code === "DEFENSELAB" ? (
                            <GraduationCap size={16} weight="fill" />
                          ) : undefined
                        }
                        disabled={!isOpen}
                      />
                    ))}
                </div>
              </PanelBody>
            </Panel>
          ) : null}

          {quotation.notes ? (
            <Panel aria-label="A note from our team">
              <PanelHeader title="A note from our team" />
              <PanelBody>
                <p className="whitespace-pre-line text-sm leading-relaxed text-white/75">
                  {quotation.notes}
                </p>
              </PanelBody>
            </Panel>
          ) : null}
        </div>

        {/* ── Right: price summary (sticks while scrolling on desktop) ── */}
        <div className="flex flex-col gap-6 lg:sticky lg:top-6 lg:col-span-5">
          <Panel aria-label="Price summary">
            <PanelHeader title="Price summary" />
            <PanelBody className="flex flex-col gap-5">
              <dl className="flex flex-col gap-2.5 text-sm">
                <SummaryLine
                  label={pkgName}
                  amount={quotation.basePrice}
                />
                {chosenSpeed ? (
                  <SummaryLine
                    label={`${chosenSpeed.name} delivery`}
                    amount={chosenSpeed.amount}
                    plus
                  />
                ) : null}
                {chosenExtras.map((a) => (
                  <SummaryLine
                    key={a.code}
                    label={a.name}
                    amount={a.amount}
                    plus
                  />
                ))}
              </dl>

              <div className="flex items-end justify-between gap-3 border-t border-white/[0.07] pt-4">
                <span className="text-sm text-white/60">Total</span>
                <span className="font-mono text-3xl font-bold tracking-tight text-white">
                  <Peso />
                  {money(currentPricing.totalAmount)}
                </span>
              </div>

              <div className="rounded-[2px] border border-white/[0.07] bg-white/[0.02] p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-white/45">
                  How you pay
                </p>
                {upfront ? (
                  <PayStep
                    n={1}
                    title="Pay in full"
                    when="After you sign your agreement, before we start."
                    amount={currentPricing.downpaymentRequired}
                  />
                ) : (
                  <>
                    <PayStep
                      n={1}
                      title={`Deposit (${currentPricing.downpaymentPercentage}%)`}
                      when="After you sign your agreement. We start once it's confirmed."
                      amount={currentPricing.downpaymentRequired}
                    />
                    {currentPricing.releaseBalance > 0 ? (
                      <PayStep
                        n={2}
                        title="The rest"
                        when="When your files are ready, before you download them."
                        amount={currentPricing.releaseBalance}
                      />
                    ) : null}
                  </>
                )}
                <p className="mt-3 text-xs text-white/45">
                  GCash or bank transfer. You upload the receipt here.
                </p>
              </div>

              {isOpen ? (
                <div className="flex flex-col gap-2.5">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => setIsAcceptModalOpen(true)}
                    disabled={isPending}
                    className="w-full gap-2"
                  >
                    <Check size={16} weight="bold" />
                    Accept Price
                  </Button>
                  <Button
                    variant="outline"
                    size="md"
                    onClick={() => setIsDeclineModalOpen(true)}
                    disabled={isPending}
                    className="w-full gap-2"
                  >
                    <PencilSimple size={15} weight="fill" />
                    Ask for Changes
                  </Button>
                  <p className="text-center text-xs text-white/45">
                    This price is good until {longDate(quotation.expiresAt)}.
                  </p>
                </div>
              ) : null}
            </PanelBody>
          </Panel>

          <Link
            href={`/dashboard/client/messages?projectId=${projectId}`}
            className="flex items-center gap-3 rounded-[2px] border border-white/[0.07] bg-[#0A0A18] px-5 py-4 text-[13px] text-white/65 transition-colors hover:border-white/[0.14] hover:text-white"
          >
            <ChatCenteredText
              size={18}
              weight="fill"
              className="shrink-0 text-white/40"
            />
            <span>Questions about this price? Message our team.</span>
            <ArrowRight size={13} weight="bold" className="ml-auto shrink-0" />
          </Link>
        </div>
      </div>

      {/* ── Phones: checkout bar pinned to the bottom so the total and Accept are always in reach ── */}
      {isOpen && isClient
        ? createPortal(
            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.08] bg-[#0A0A18]/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pt-3 backdrop-blur-md lg:hidden">
              <div className="mx-auto flex max-w-xl items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] text-white/50">Total</p>
                  <p className="font-mono text-lg font-bold leading-tight text-white">
                    <Peso />
                    {money(currentPricing.totalAmount)}
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setIsAcceptModalOpen(true)}
                  disabled={isPending}
                  className="gap-2"
                >
                  <Check size={16} weight="bold" />
                  Accept Price
                </Button>
              </div>
            </div>,
            document.body,
          )
        : null}

      {/* ── Accept confirmation ── */}
      <Modal
        isOpen={isAcceptModalOpen}
        onClose={() => setIsAcceptModalOpen(false)}
        title="Accept this price?"
        size="md"
      >
        <div className="flex flex-col gap-5 p-1 font-sans text-sm text-white/75">
          <p className="leading-relaxed">
            You&apos;re accepting{" "}
            <span className="font-medium text-white">
              {pkgName}
            </span>{" "}
            for study{" "}
            <span className="font-mono text-white">{project.intakeId}</span>.
          </p>
          <div className="rounded-[2px] border border-white/[0.07] bg-white/[0.02] p-4">
            <dl className="flex flex-col gap-2 text-[13px]">
              <SummaryLine
                label={pkgName}
                amount={quotation.basePrice}
              />
              {chosenSpeed ? (
                <SummaryLine
                  label={`${chosenSpeed.name} delivery`}
                  amount={chosenSpeed.amount}
                  plus
                />
              ) : null}
              {chosenExtras.map((a) => (
                <SummaryLine
                  key={a.code}
                  label={a.name}
                  amount={a.amount}
                  plus
                />
              ))}
            </dl>
            <div className="mt-3 flex flex-col gap-1.5 border-t border-white/[0.07] pt-3 text-[13px]">
              <div className="flex justify-between font-medium text-white">
                <span>Total</span>
                <span className="font-mono">
                  <Peso />
                  {money(currentPricing.totalAmount)}
                </span>
              </div>
              <div className="flex justify-between text-white/60">
                <span>
                  {upfront
                    ? "Pay in full"
                    : `Deposit (${currentPricing.downpaymentPercentage}%)`}
                </span>
                <span className="font-mono">
                  <Peso />
                  {money(currentPricing.downpaymentRequired)}
                </span>
              </div>
              {!upfront && currentPricing.releaseBalance > 0 ? (
                <div className="flex justify-between text-white/60">
                  <span>The rest, when files are ready</span>
                  <span className="font-mono">
                    <Peso />
                    {money(currentPricing.releaseBalance)}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
          <p className="text-[13px] leading-relaxed text-white/55">
            Next, we&apos;ll prepare your agreement. You&apos;ll review and sign
            it before paying anything.
          </p>
          <ModalFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAcceptModalOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleAcceptProposal}
              loading={isPending}
              disabled={isPending}
              className="gap-1.5"
            >
              {isPending ? "Accepting..." : "Yes, Accept Price"}
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* ── Ask for changes ── */}
      <Modal
        isOpen={isDeclineModalOpen}
        onClose={() => setIsDeclineModalOpen(false)}
        title="Ask for changes"
        size="md"
      >
        <div className="flex flex-col gap-5 p-1 font-sans text-sm text-white/75">
          <p className="leading-relaxed">
            Tell us what doesn&apos;t work for you and we&apos;ll send an
            updated price. This closes the current price.
          </p>
          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium text-white/70">
              What should we change? (optional)
            </span>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="For example: I only need the descriptive tables, or my deadline is a week later."
              rows={4}
              className="w-full resize-none rounded-[2px] border border-white/15 bg-[#050513] p-4 text-sm leading-relaxed text-white placeholder:text-white/30 transition-colors focus:border-[#CC6600] focus:outline-none"
            />
          </label>
          <ModalFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeclineModalOpen(false)}
              disabled={isPending}
            >
              Back
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleDeclineProposal}
              loading={isPending}
              disabled={isPending}
            >
              {isPending ? "Sending..." : "Send Request"}
            </Button>
          </ModalFooter>
        </div>
      </Modal>

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

// ─── Pieces ──────────────────────────────────────────────────────────────────

/** One plain sentence about where this price stands, with the next step when there is one. */
function StatusBanner({
  quotation,
  project,
  projectId,
}: {
  quotation: QuotationDetailItem;
  project: ProjectDetailItem;
  projectId: string;
}) {
  let tone: "action" | "calm" = "calm";
  let title: string;
  let body: string;
  let action: { label: string; href: string } | null = null;

  if (quotation.status === "QUOTE_SENT" && !quotation.isExpired) {
    tone = "action";
    title = "Your price is ready";
    body = `Choose any extras, then accept by ${longDate(quotation.expiresAt)}. You won't pay anything until you've signed your agreement.`;
  } else if (quotation.status === "CLIENT_APPROVED") {
    const agreementReady = project.masterStatus !== "CLIENT_APPROVED";
    title = "You accepted this price";
    body = agreementReady
      ? "Your agreement is ready. Review and sign it to continue."
      : "We're preparing your agreement. We'll let you know when it's ready to sign.";
    if (agreementReady) {
      tone = project.masterStatus === "SOW_PENDING" ? "action" : "calm";
      action = {
        label: "Review Agreement",
        href: `/dashboard/client/projects/${projectId}/sow`,
      };
    }
  } else if (quotation.status === "QUOTE_DECLINED") {
    title = "You asked for changes";
    body =
      "Our team is updating your price. We'll let you know when the new one is ready.";
  } else {
    title = "This price has expired";
    body = `It was good until ${longDate(quotation.expiresAt)}. Message our team and we'll send you a new one.`;
    action = {
      label: "Message Our Team",
      href: `/dashboard/client/messages?projectId=${projectId}`,
    };
  }

  return (
    <div
      className={`flex flex-col gap-3 rounded-[2px] border bg-[#0A0A18] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 ${
        tone === "action" ? "border-[#CC6600]/35" : "border-white/[0.07]"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${tone === "action" ? "bg-[#CC6600]" : "bg-white/35"}`}
          aria-hidden="true"
        />
        <div>
          <p className="text-sm font-medium text-white">{title}</p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-white/60">
            {body}
          </p>
        </div>
      </div>
      {action ? (
        <Button
          asChild
          variant={tone === "action" ? "primary" : "outline"}
          size="sm"
          className="shrink-0 gap-1.5 self-start sm:self-center"
        >
          <Link href={action.href}>
            {action.label}
            <ArrowRight size={14} weight="bold" />
          </Link>
        </Button>
      ) : null}
    </div>
  );
}

/** Selectable row used for delivery speeds (radio) and extras (checkbox). */
function OptionRow({
  kind,
  selected,
  onSelect,
  title,
  detail,
  price,
  icon,
  disabled = false,
}: {
  kind: "radio" | "checkbox";
  selected: boolean;
  onSelect: () => void;
  title: string;
  detail: string;
  price: number | null;
  icon?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role={kind}
      aria-checked={selected}
      onClick={onSelect}
      disabled={disabled}
      className={`flex w-full items-start gap-3.5 rounded-[2px] border px-4 py-3.5 text-left transition-colors ${
        selected
          ? "border-white/25 bg-white/[0.05]"
          : "border-white/[0.07] hover:border-white/[0.16] hover:bg-white/[0.02]"
      } ${disabled ? "cursor-default" : "cursor-pointer"}`}
    >
      <span
        aria-hidden="true"
        className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center border transition-colors ${
          kind === "radio" ? "rounded-full" : "rounded-[2px]"
        } ${selected ? "border-[#CC6600] bg-[#CC6600] text-white" : "border-white/30"}`}
      >
        {selected ? (
          kind === "radio" ? (
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
          ) : (
            <Check size={11} weight="bold" />
          )
        ) : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-sm font-medium text-white">
          {icon ? <span className="text-white/45">{icon}</span> : null}
          {title}
        </span>
        <span className="mt-0.5 block text-[13px] leading-relaxed text-white/55">
          {detail}
        </span>
      </span>
      <span
        className={`shrink-0 font-mono text-sm ${selected ? "text-white" : "text-white/55"}`}
      >
        {price === null ? (
          "Included"
        ) : (
          <>
            +<Peso />
            {money(price)}
          </>
        )}
      </span>
    </button>
  );
}

function SummaryLine({
  label,
  amount,
  plus = false,
}: {
  label: string;
  amount: number;
  plus?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-white/70">{label}</dt>
      <dd className="shrink-0 font-mono text-white/85">
        {plus ? "+" : ""}
        <Peso />
        {money(amount)}
      </dd>
    </div>
  );
}

function PayStep({
  n,
  title,
  when,
  amount,
}: {
  n: number;
  title: string;
  when: string;
  amount: number;
}) {
  return (
    <div className="mt-3 flex items-start gap-3">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[2px] border border-white/15 font-mono text-[11px] text-white/60">
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[13px] font-medium text-white">{title}</span>
          <span className="shrink-0 font-mono text-[13px] text-white">
            <Peso />
            {money(amount)}
          </span>
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-white/50">{when}</p>
      </div>
    </div>
  );
}
