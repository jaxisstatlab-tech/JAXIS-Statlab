"use client";

import React, { useState } from "react";
import { Modal, Button, Tabs, TabsList, TabsTrigger, TabsContent, AnimateHeight, cn } from "@repo/ui";
import { ArrowRight, CaretDown, GraduationCap } from "@phosphor-icons/react";
import { CLIENT_STEPS } from "@/features/projects/client-stage";

export interface HowToUseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartRequest?: () => void;
  onSetupProfile?: () => void;
  isProfileComplete?: boolean;
}

// Plain steps that match what clients see: "Send your study", then the same 5 steps as the
// tracker on every study page (Price, Agreement, Deposit, Analysis, Files).
const STEPS: Array<{ title: string; body: string; note?: string; tracker?: (typeof CLIENT_STEPS)[number] }> = [
  {
    title: "Send your study",
    body: "Share your research questions, your Chapters 1–3 and your data file (Excel, CSV or SPSS). Add your questionnaire if you have one.",
    note: "Messy data is fine. Cleaning it is included.",
  },
  {
    title: "Get your price",
    body: "We read your study and send a fixed written price, usually within 24 hours. Review what's included, pick any extras, then accept it.",
    tracker: "Price",
  },
  {
    title: "Sign your agreement",
    body: "Your agreement lists your scope, your files, the price and the delivery date. Sign it by typing your full name.",
    tracker: "Agreement",
  },
  {
    title: "Pay your deposit",
    body: "Pay by GCash or bank transfer and upload your receipt. DataCheck and Start are paid in full; larger plans pay a deposit first and the rest on delivery.",
    note: "Your deposit is held until your study passes our quality review.",
    tracker: "Deposit",
  },
  {
    title: "We analyze your data",
    body: "Your statistical analyst runs the tests and writes up the results. Chat with them anytime in Messages.",
    tracker: "Analysis",
  },
  {
    title: "Get your files",
    body: "Two statistical analysts check your tables, write-up and code before you get them. Download everything from your study's Files tab.",
    note: "Free changes within your scope for 3 working days after delivery.",
    tracker: "Files",
  },
];

const FAQS = [
  {
    q: "What do I need to send?",
    a: "Your research questions, your Chapters 1–3 (PDF or Word) and your data file (Excel, CSV or SPSS). Using Google Sheets? Download it as Excel or CSV first. Your questionnaire is optional but helps.",
  },
  {
    q: "My data is messy or has missing answers. Is that okay?",
    a: "Yes. Cleaning your data, checking for problems and reliability tests are included. Send what you have.",
  },
  {
    q: "How does paying work?",
    a: "You pay by GCash or bank transfer after you accept your price and sign your agreement. DataCheck and Start are paid in full. Larger plans pay a deposit first and the rest on delivery. Your deposit is held until your study passes our quality review.",
  },
  {
    q: "What if my adviser or panel asks for changes?",
    a: "Changes within your agreed scope are free for 3 working days after delivery. Open your study's Files tab and choose Request Changes.",
  },
  {
    q: "What if something is wrong with my results?",
    a: "File a claim within 7 days of delivery from Revisions & help. You get a full refund if we didn't follow the method in your agreement or made a math error you can check. If a Rush, Express or Emergency order is late, we refund the faster delivery fee.",
  },
  {
    q: "Can I talk to the statistical analyst working on my study?",
    a: "Yes. Once your statistical analyst is assigned, you can chat with them and your reviewer in Messages.",
  },
];

export const HowToUseModal: React.FC<HowToUseModalProps> = ({
  isOpen,
  onClose,
  onStartRequest,
  onSetupProfile,
  isProfileComplete = false,
}) => {
  const [activeTab, setActiveTab] = useState<"steps" | "faqs">("steps");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);
  const needsProfile = !isProfileComplete && Boolean(onSetupProfile);

  const footer = (
    <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
      <Button variant="outline" size="sm" onClick={onClose} className="w-full sm:w-auto">
        Close
      </Button>
      {needsProfile ? (
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            onClose();
            onSetupProfile?.();
          }}
          className="w-full gap-1.5 sm:w-auto"
        >
          <GraduationCap size={15} weight="fill" />
          Add Your School First
        </Button>
      ) : onStartRequest ? (
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            onClose();
            onStartRequest();
          }}
          className="w-full gap-1.5 sm:w-auto"
        >
          Send a Study
          <ArrowRight size={14} weight="fill" />
        </Button>
      ) : null}
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="How it works"
      description="From sending your study to getting your files."
      size="lg"
      footer={footer}
    >
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "steps" | "faqs")} className="w-full font-sans">
        <TabsList className="w-full rounded-[2px] border border-white/10 bg-[#050513] p-1 sm:w-auto">
          <TabsTrigger value="steps">Steps</TabsTrigger>
          <TabsTrigger value="faqs">Common questions</TabsTrigger>
        </TabsList>

        <TabsContent value="steps" className="mt-5 focus-visible:outline-none">
          {needsProfile ? (
            <p className="mb-5 flex gap-2.5 rounded-[2px] border border-[#CC6600]/30 bg-[#CC6600]/[0.06] p-3 text-[13px] leading-relaxed text-white/80">
              <GraduationCap size={16} weight="fill" className="mt-0.5 shrink-0 text-[#CC6600]" />
              <span>
                <span className="font-semibold text-white">Before you start:</span> add your school and program so we
                format your tables the way your school asks. It takes about 30 seconds.
              </span>
            </p>
          ) : null}

          <ol className="relative">
            {STEPS.map((s, i) => {
              const last = i === STEPS.length - 1;
              return (
                <li key={s.title} className="relative flex gap-4 pb-6 last:pb-0">
                  {!last ? <span aria-hidden className="absolute left-[13px] top-8 bottom-1 w-px bg-white/10" /> : null}
                  <span
                    aria-hidden
                    className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/15 bg-[#0A0A18] font-mono text-xs font-semibold text-white/80"
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-white">{s.title}</span>
                      {s.tracker ? (
                        <span
                          title="The name of this step on your study's tracker"
                          className="rounded-[2px] border border-white/10 px-1.5 py-px text-[10px] font-medium text-white/45"
                        >
                          {s.tracker}
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-[13px] leading-relaxed text-white/65">{s.body}</p>
                    {s.note ? <p className="mt-1.5 text-xs text-white/45">{s.note}</p> : null}
                  </div>
                </li>
              );
            })}
          </ol>

          <p className="mt-6 border-t border-white/[0.07] pt-4 text-xs leading-relaxed text-white/45">
            Every study page shows a tracker with these steps (Price, Agreement, Deposit, Analysis, Files), so you
            always know where your study is.
          </p>
        </TabsContent>

        <TabsContent value="faqs" className="mt-5 focus-visible:outline-none">
          <div className="divide-y divide-white/[0.07] rounded-[2px] border border-white/10">
            {FAQS.map((f, i) => {
              const open = expandedFaq === i;
              return (
                <div key={f.q}>
                  <button
                    type="button"
                    onClick={() => setExpandedFaq(open ? null : i)}
                    aria-expanded={open}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.02]"
                  >
                    <span className="text-sm font-medium text-white">{f.q}</span>
                    <CaretDown
                      size={15}
                      weight="fill"
                      className={cn("shrink-0 text-white/40 transition-transform duration-200", open && "rotate-180")}
                    />
                  </button>
                  <AnimateHeight duration={200}>
                    {open ? <p className="px-4 pb-4 text-[13px] leading-relaxed text-white/65">{f.a}</p> : null}
                  </AnimateHeight>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </Modal>
  );
};
