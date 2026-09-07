"use client";

import React, { useState } from "react";
import { Modal, Button } from "@repo/ui";
import {
  IconSchool,
  IconFileUpload,
  IconShieldLock,
  IconFileText,
  IconCheck,
  IconHelp,
  IconBulb,
} from "@tabler/icons-react";

export interface HowToUseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartRequest?: () => void;
  onSetupProfile?: () => void;
  isProfileComplete?: boolean;
}

const STEPS = [
  {
    number: "01",
    title: "Tell Us Your University",
    icon: <IconSchool size={22} className="text-[#CC6600]" />,
    summary:
      "Save your school name and degree program so your assigned statistician formats tables to match your university's exact thesis guidelines (UST, UP, Ateneo, etc.).",
    highlight: "Takes only 30 seconds to complete.",
  },
  {
    number: "02",
    title: "Submit Your Questions & Data",
    icon: <IconFileUpload size={22} className="text-sky-400" />,
    summary:
      "Upload your survey questionnaire and raw survey responses (Excel, Google Sheets, or SPSS). Even if your Excel sheet is messy or has missing numbers, our team cleans it for you!",
    highlight: "Zero formatting required on your end.",
  },
  {
    number: "03",
    title: "Review Quote & Safe Escrow Deposit",
    icon: <IconShieldLock size={22} className="text-amber-400" />,
    summary:
      "Receive a transparent price quote. Pay an initial 50% deposit via GCash or Bank. Your money is locked safely in the JAXIS Escrow Vault until our Senior QA Lead verifies your math.",
    highlight: "100% money-back escrow protection.",
  },
  {
    number: "04",
    title: "Chat with Your Expert & Download Tables",
    icon: <IconFileText size={22} className="text-emerald-400" />,
    summary:
      "Chat directly with your assigned PhD statistician. Once our Senior QA Lead approves the math, download your defense-ready Chapter 4 Word report with APA 7th tables.",
    highlight: "Includes 3 days of free warranty revisions.",
  },
];

const FAQS = [
  {
    question: "What files do I need to prepare before starting?",
    answer:
      "You only need 2 simple files: (1) Your raw survey responses in Excel (.xlsx or .csv), and (2) Your survey questionnaire or Chapter 1–3 draft so our analyst knows what questions to answer.",
  },
  {
    question: "What if my Excel data is messy or has missing numbers?",
    answer:
      "That is completely fine! Professional data cleaning, outlier detection, and reverse-coding are included in our consultation. Upload whatever you have, and we will clean it.",
  },
  {
    question: "How does the safe escrow deposit protect me?",
    answer:
      "Your deposit stays locked safely in the JAXIS Escrow Vault while your analyst works. It is never paid out until our Senior QA Lead verifies the math and you receive your results.",
  },
  {
    question: "What if my thesis panel or adviser asks for adjustments?",
    answer:
      "Every study comes with a 3-Day Free Guarantee Revision Window. If your thesis panel requests formatting tweaks or additional descriptive sub-groups within your original scope, we adjust them free of charge.",
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
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
      <Button
        variant="secondary"
        size="sm"
        onClick={onClose}
        className="w-full sm:w-auto font-sans text-xs px-4 py-2 rounded-[2px] active:scale-[0.97] transition-transform"
      >
        Close Guide
      </Button>

      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        {!isProfileComplete && onSetupProfile ? (
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              onClose();
              onSetupProfile();
            }}
            className="w-full sm:w-auto font-sans text-xs font-semibold px-4 py-2 bg-[#CC6600] hover:bg-[#E67300] text-white rounded-[2px] active:scale-[0.97] transition-transform shadow-md"
          >
            1. Save Your School First →
          </Button>
        ) : onStartRequest ? (
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              onClose();
              onStartRequest();
            }}
            className="w-full sm:w-auto font-sans text-xs font-semibold px-4 py-2 bg-[#CC6600] hover:bg-[#E67300] text-white rounded-[2px] active:scale-[0.97] transition-transform shadow-md"
          >
            2. Start New Study Request →
          </Button>
        ) : null}
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="How to Use JAXIS StatLab"
      description="A quick, simple guide to getting defense-ready statistical analysis for your thesis or paper."
      size="lg"
      footer={modalFooter}
    >
      <div className="flex flex-col gap-5 font-sans">
        {/* Navigation Tabs */}
        <div className="sticky top-0 z-10 bg-[#01142B] -mt-1 pt-1 pb-3 border-b border-white/10 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("steps")}
            className={`px-4 py-2 rounded-[2px] text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 active:scale-[0.97] ${
              activeTab === "steps"
                ? "bg-[#CC6600] text-white shadow-sm"
                : "text-white/60 hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            <IconCheck size={15} stroke={2} />
            <span>4 Simple Steps</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("faqs")}
            className={`px-4 py-2 rounded-[2px] text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 active:scale-[0.97] ${
              activeTab === "faqs"
                ? "bg-[#CC6600] text-white shadow-sm"
                : "text-white/60 hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            <IconHelp size={15} stroke={2} />
            <span>Common Questions</span>
          </button>
        </div>

        {/* Tab 1: 4 Simple Steps (Single Natural Scroll) */}
        {activeTab === "steps" && (
          <div className="flex flex-col gap-3.5">
            {STEPS.map((step) => (
              <div
                key={step.number}
                className="p-4 sm:p-5 rounded-[2px] bg-[#01142B] border border-white/10 hover:border-white/20 transition-all flex flex-col sm:flex-row items-start gap-4 shadow-sm"
              >
                <div className="w-10 h-10 rounded-[2px] bg-white/[0.04] border border-white/10 flex items-center justify-center shrink-0">
                  {step.icon}
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#FF9433] bg-[#CC6600]/15 border border-[#CC6600]/30 px-2 py-0.5 rounded-[2px]">
                      STEP {step.number}
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-white font-sans">
                      {step.title}
                    </h3>
                  </div>
                  <p className="text-xs text-white/75 font-sans leading-relaxed">
                    {step.summary}
                  </p>
                  <span className="text-[0.688rem] font-mono text-amber-300/90 flex items-center gap-1.5 mt-0.5">
                    <IconBulb size={13} className="text-amber-400 shrink-0" stroke={2} />
                    <span>{step.highlight}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Common Questions (Single Natural Scroll) */}
        {activeTab === "faqs" && (
          <div className="flex flex-col gap-3">
            {FAQS.map((faq, idx) => {
              const isExpanded = expandedFaq === idx;
              return (
                <div
                  key={faq.question}
                  className="rounded-[2px] border border-white/10 bg-[#01142B] overflow-hidden transition-colors shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedFaq(isExpanded ? null : idx)}
                    className="w-full p-4 text-left flex items-center justify-between gap-3 hover:bg-white/[0.04] transition-colors cursor-pointer"
                  >
                    <span className="text-xs sm:text-sm font-semibold text-white font-sans">
                      {faq.question}
                    </span>
                    <span className="text-xs font-mono text-white/50 shrink-0 font-bold">
                      {isExpanded ? "−" : "+"}
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 text-xs text-white/75 font-sans leading-relaxed border-t border-white/[0.06] pt-3">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
};
