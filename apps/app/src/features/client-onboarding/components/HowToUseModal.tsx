"use client";

import React, { useState } from "react";
import {
  Modal,
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  AnimateHeight,
  cn,
} from "@repo/ui";
import {
  IconSchool,
  IconFileUpload,
  IconShieldLock,
  IconFileText,
  IconShieldCheck,
  IconSparkles,
  IconListCheck,
  IconHelpCircle,
  IconChevronDown,
  IconArrowRight,
} from "@tabler/icons-react";

export interface HowToUseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartRequest?: () => void;
  onSetupProfile?: () => void;
  isProfileComplete?: boolean;
}

interface StepItem {
  number: string;
  badge: string;
  title: string;
  icon: React.ReactNode;
  summary: string;
  highlight: string;
}

const STEPS: StepItem[] = [
  {
    number: "01",
    badge: "STEP 01",
    title: "Save Your University & Degree",
    icon: <IconSchool size={20} stroke={2} className="text-white/85" />,
    summary:
      "Save your school name and degree program. Your assigned statistician formats all tables and statistical writeups to match your university's exact thesis guidelines (UST, UP, Ateneo, DLSU, etc.).",
    highlight: "Takes only 30 seconds to complete",
  },
  {
    number: "02",
    badge: "STEP 02",
    title: "Upload Your Survey & Raw Data",
    icon: <IconFileUpload size={20} stroke={2} className="text-white/85" />,
    summary:
      "Upload your survey questionnaire and raw survey responses in Excel, Google Sheets, CSV, or SPSS. Even if your spreadsheet is messy or has missing scores, our team cleans, recodes, and screens it for you.",
    highlight: "Full data screening and cleaning included",
  },
  {
    number: "03",
    badge: "STEP 03",
    title: "Review Quote & Safe Escrow Deposit",
    icon: <IconShieldLock size={20} stroke={2} className="text-white/85" />,
    summary:
      "Receive a clear, transparent price quote. Pay an initial 50% deposit via GCash, Maya, or bank transfer. Your money remains locked safely in escrow until our Senior QA Lead audits and verifies your math.",
    highlight: "100% money-back escrow protection",
  },
  {
    number: "04",
    badge: "STEP 04",
    title: "Chat with Your Expert & Download Results",
    icon: <IconFileText size={20} stroke={2} className="text-white/85" />,
    summary:
      "Chat directly with your assigned statistician for questions and defense tips. Once Senior QA approves the math, download your defense-ready Chapter 4 Word report with APA 7th tables and full interpretation.",
    highlight: "Includes 3 days of free warranty revisions",
  },
];

const FAQS = [
  {
    question: "What files do I need to prepare before submitting a request?",
    answer:
      "You only need 2 simple files: (1) Your raw survey responses in Excel (.xlsx or .csv), and (2) Your survey questionnaire or Chapter 1–3 draft so your assigned analyst knows what specific questions and hypotheses need testing.",
  },
  {
    question: "What if my Excel data is messy, incomplete, or unorganized?",
    answer:
      "That is completely fine. Professional data cleaning, outlier screening, reverse-coding, and reliability testing (e.g. Cronbach's alpha) are included in our standard consultation. Upload what you have, and we clean it up.",
  },
  {
    question: "How does the safe escrow deposit protect my payment?",
    answer:
      "Your initial 50% deposit stays safely locked in the JAXIS Escrow Vault while your statistician works. Funds are never released to the analyst until our Senior QA Lead verifies every calculation and you receive your verified results.",
  },
  {
    question: "What if my thesis panel or adviser asks for adjustments?",
    answer:
      "Every study includes a 3-Day Free Warranty Revision Window. If your thesis panel requests formatting tweaks, additional descriptive sub-groups, or interpretation adjustments within your original scope, we revise them free of charge.",
  },
  {
    question: "Can I talk directly with the statistician working on my paper?",
    answer:
      "Yes. Every research study includes a private consultation chat desk where you can message your assigned statistician directly for quick questions, methodology explanations, and defense preparation tips.",
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

  const modalFooter = (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
      {/* Reassurance Badge */}
      <div className="flex items-center gap-2 text-xs text-white/55 font-sans">
        <IconShieldCheck size={16} stroke={2} className="text-emerald-400 shrink-0" />
        <span>Protected by JAXIS Escrow & Senior QA Review</span>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        <Button
          variant="secondary"
          size="sm"
          onClick={onClose}
          className="w-full sm:w-auto font-sans text-xs px-4 py-2 rounded-[2px] active:scale-[0.97] transition-transform"
        >
          Close Guide
        </Button>

        {!isProfileComplete && onSetupProfile ? (
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              onClose();
              onSetupProfile();
            }}
            className="w-full sm:w-auto font-sans text-xs font-semibold px-4 py-2 bg-[#CC6600] hover:bg-[#E67300] text-white rounded-[2px] active:scale-[0.97] transition-transform shadow-sm flex items-center justify-center gap-1.5"
          >
            <IconSchool size={15} stroke={2} />
            <span>Save School Profile First</span>
            <IconArrowRight size={14} stroke={2} />
          </Button>
        ) : onStartRequest ? (
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              onClose();
              onStartRequest();
            }}
            className="w-full sm:w-auto font-sans text-xs font-semibold px-4 py-2 bg-[#CC6600] hover:bg-[#E67300] text-white rounded-[2px] active:scale-[0.97] transition-transform shadow-sm flex items-center justify-center gap-1.5"
          >
            <span>Start New Study Request</span>
            <IconArrowRight size={14} stroke={2} />
          </Button>
        ) : null}
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-[#CC6600] shrink-0" />
          <span className="text-base sm:text-lg font-bold text-white font-sans tracking-tight">
            How JAXIS StatLab Works
          </span>
        </div>
      }
      description="A quick, simple guide to getting defense-ready statistical analysis for your thesis or research paper."
      size="xl"
      footer={modalFooter}
    >
      <div className="flex flex-col gap-5 font-sans">
        {/* Navigation Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as "steps" | "faqs")}
          className="w-full"
        >
          <TabsList className="bg-[#01142B] border border-white/10 p-1 rounded-[2px] w-full sm:w-auto">
            <TabsTrigger value="steps" className="flex items-center gap-2">
              <IconListCheck size={14} stroke={2} />
              <span>4 Simple Steps</span>
            </TabsTrigger>
            <TabsTrigger value="faqs" className="flex items-center gap-2">
              <IconHelpCircle size={14} stroke={2} />
              <span>Common Questions</span>
            </TabsTrigger>
          </TabsList>

          {/* ── Tab 1: 4 Simple Steps (Connected Vertical Timeline) ── */}
          <TabsContent value="steps" className="mt-4 focus-visible:outline-none">
            {/* 4-Stage Horizontal Pipeline Header */}
            <div className="hidden sm:grid grid-cols-4 gap-2 mb-5 p-3 rounded-[2px] bg-[#01142B]/60 border border-white/[0.08]">
              {STEPS.map((s, idx) => (
                <div key={s.number} className="flex items-center gap-2 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-white/[0.06] border border-white/15 text-[10px] font-mono font-bold text-white/70 flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-xs font-sans text-white/70 truncate font-medium">
                    {s.title.split("&")[0]?.trim()}
                  </span>
                </div>
              ))}
            </div>

            {/* Connected Vertical Timeline */}
            <div className="relative pl-6 sm:pl-8 before:absolute before:left-[11px] sm:before:left-[15px] before:top-4 before:bottom-6 before:w-[2px] before:bg-gradient-to-b before:from-[#CC6600]/80 before:via-white/15 before:to-white/5 space-y-4">
              {STEPS.map((step, idx) => (
                <div
                  key={step.number}
                  className={`relative group animate-card-reveal stagger-${idx + 1}`}
                >
                  {/* Timeline Node Marker */}
                  <div className="absolute -left-[24px] sm:-left-[32px] top-3.5 w-6 h-6 sm:w-7 sm:h-7 rounded-[2px] bg-[#011B38] border border-white/20 group-hover:border-[#CC6600] flex items-center justify-center shadow-md transition-colors z-10">
                    <span className="font-mono text-[10px] sm:text-[11px] font-bold text-[#FFA040]">
                      {step.number}
                    </span>
                  </div>

                  {/* Step Card */}
                  <div className="p-4 sm:p-5 rounded-[2px] bg-[#01142B]/90 border border-white/10 hover:border-white/20 transition-all flex flex-col sm:flex-row items-start gap-4 shadow-sm">
                    <div className="w-10 h-10 rounded-[2px] bg-white/[0.04] border border-white/10 flex items-center justify-center shrink-0 group-hover:bg-white/[0.06] transition-colors">
                      {step.icon}
                    </div>

                    <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[10px] font-bold text-[#FFA040] bg-[#CC6600]/15 border border-[#CC6600]/30 px-1.5 py-0.5 rounded-[2px]">
                          {step.badge}
                        </span>
                        <h3 className="text-sm sm:text-base font-bold text-white font-sans tracking-tight">
                          {step.title}
                        </h3>
                      </div>

                      <p className="text-xs sm:text-sm text-white/70 font-sans leading-relaxed">
                        {step.summary}
                      </p>

                      <div className="inline-flex items-center gap-1.5 self-start px-2 py-0.5 rounded-[2px] bg-white/[0.03] border border-white/[0.08] text-white/65 text-[11px] font-sans mt-0.5">
                        <IconSparkles size={12} stroke={2} className="text-[#FFA040] shrink-0" />
                        <span>{step.highlight}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ── Tab 2: Common Questions (Smooth AnimateHeight Accordion) ── */}
          <TabsContent value="faqs" className="mt-4 focus-visible:outline-none">
            <div className="flex flex-col gap-2.5">
              {FAQS.map((faq, idx) => {
                const isExpanded = expandedFaq === idx;
                return (
                  <div
                    key={faq.question}
                    className={`rounded-[2px] border transition-colors shadow-sm overflow-hidden animate-card-reveal stagger-${idx + 1} ${
                      isExpanded
                        ? "bg-[#011B38]/90 border-white/20"
                        : "bg-[#01142B]/85 border-white/10 hover:border-white/15"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedFaq(isExpanded ? null : idx)}
                      className="w-full p-3.5 sm:p-4 text-left flex items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors cursor-pointer select-none"
                    >
                      <span className="text-xs sm:text-sm font-semibold text-white font-sans leading-snug">
                        {faq.question}
                      </span>
                      <IconChevronDown
                        size={16}
                        stroke={2}
                        className={cn(
                          "text-white/40 shrink-0 transition-transform duration-200",
                          isExpanded && "rotate-180 text-[#FFA040]"
                        )}
                      />
                    </button>

                    <AnimateHeight duration={220}>
                      {isExpanded && (
                        <div className="px-3.5 pb-3.5 sm:px-4 sm:pb-4 pt-1 text-xs sm:text-sm text-white/70 font-sans leading-relaxed border-t border-white/[0.06]">
                          {faq.answer}
                        </div>
                      )}
                    </AnimateHeight>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Modal>
  );
};

