"use client";

import { CheckCircle, FileText, FileZip, SealCheck } from "@phosphor-icons/react";
import { artLabel, panel, solidPanel } from "./ServiceArt";

// Pictures for the five How it works steps, in the same layered-panel style as the Services cards. Each shows its
// "before" state until the pipeline's orange route reaches that step (`on`), then settles into its "done" state.

const ease = "ease-[cubic-bezier(0.23,1,0.32,1)]";
const frame = "relative h-36 w-full overflow-hidden lg:h-44";

function Peso() {
  return <span className="mr-0.5 inline-block select-none font-sans font-normal opacity-85">₱</span>;
}

function Tag({ on, before, after }: { on: boolean; before: string; after: string }) {
  return (
    <span className={`font-mono text-[10px] uppercase tracking-wider transition-colors duration-300 ${on ? "text-[#FFA040]" : "text-white/45"}`}>
      {on ? after : before}
    </span>
  );
}

/* 01 Submit: three file cards drop into the study tray. */

const UPLOADS = [
  { name: "Chapters 1–3", type: "DOCX" },
  { name: "Survey", type: "PDF" },
  { name: "Data", type: "XLSX" },
];

function UploadArt({ on }: { on: boolean }) {
  return (
    <div className={frame} role="img" aria-label="Your research questions, survey, and data are uploaded to your study">
      {UPLOADS.map((f, i) => (
        <div
          key={f.name}
          className={`absolute left-1/2 w-[66%] -translate-x-1/2 bg-[#15152E] px-3 py-2 transition-transform duration-700 ${ease} ${panel}`}
          style={{
            top: 8 + i * 22,
            zIndex: i,
            transform: `translateY(${on ? 44 + i * 6 : 0}px) rotate(${(i - 1) * 3}deg)`,
            transitionDelay: `${i * 120}ms`,
          }}
        >
          <div className="flex items-center gap-2">
            <FileText size={13} weight="fill" className="shrink-0 text-white/60" aria-hidden="true" />
            <span className="truncate font-sans text-[12px] text-white/85">{f.name}</span>
            <span className="ml-auto font-mono text-[9.5px] text-white/45">{f.type}</span>
          </div>
        </div>
      ))}
      <div className={`absolute inset-x-5 -bottom-6 z-10 h-24 px-4 pt-3 ${solidPanel}`}>
        <div className="flex justify-between gap-3">
          <span className={artLabel}>Your study</span>
          <Tag on={on} before="Uploading" after="3 files received" />
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.08]">
          <div className="h-full bg-[#CC6600] transition-[width] duration-1000" style={{ width: on ? "100%" : "22%" }} />
        </div>
      </div>
    </div>
  );
}

/* 02 Price: the written quote gets its fixed total and an "In writing" stamp. */

const QUOTE_LINES: [string, number][] = [
  ["Tests", 72],
  ["Files", 56],
  ["Timeline", 44],
];

function QuoteArt({ on }: { on: boolean }) {
  return (
    <div className={frame} role="img" aria-label="A written quote listing the tests, files, and a fixed price">
      <div className={`absolute left-1/2 top-2 w-[80%] -translate-x-1/2 px-4 pb-10 pt-3 ${solidPanel}`}>
        <div className="flex justify-between gap-3">
          <span className={artLabel}>Written quote</span>
          <span className={artLabel}>Example</span>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {QUOTE_LINES.map(([label, w]) => (
            <div key={label} className="flex items-center gap-3">
              <span className="w-14 shrink-0 font-mono text-[10px] text-white/45">{label}</span>
              <span className="block h-[5px] rounded-[1px] bg-white/[0.08]" style={{ width: `${w}%` }} />
            </div>
          ))}
        </div>
        <div
          className={`mt-3 flex items-baseline justify-between border-t pt-2 transition-colors duration-500 ${
            on ? "border-[#CC6600]/60" : "border-white/10"
          }`}
        >
          <span className="font-sans text-[12px] text-white/70">Fixed price</span>
          <span className={`font-mono text-sm font-bold transition-colors duration-500 ${on ? "text-white" : "text-white/35"}`}>
            <Peso />
            2,500
          </span>
        </div>
      </div>
      <span
        aria-hidden="true"
        className={`absolute right-[14%] top-[3.4rem] -rotate-[10deg] bg-[#11112A] rounded-[3px] border-2 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider transition-[opacity,scale] duration-500 ${ease} ${
          on ? "scale-100 border-[#FF8A1F] text-[#FFA040] opacity-100" : "scale-125 border-transparent opacity-0"
        }`}
      >
        In writing
      </span>
    </div>
  );
}

/* 03 Deposit: a phone with GCash picked; the button turns into a confirmation. */

function PayArt({ on }: { on: boolean }) {
  return (
    <div className={frame} role="img" aria-label="Paying the deposit by GCash or bank transfer">
      <div className="absolute left-1/2 top-2 h-56 w-[54%] min-w-[9.5rem] -translate-x-1/2 rounded-[16px] border border-white/[0.12] bg-[linear-gradient(180deg,#16162F,#0D0D20)] p-3 shadow-[0_28px_56px_-20px_rgba(0,0,0,0.95)]">
        <span className="mx-auto block h-1 w-10 rounded-full bg-white/15" />
        <div className={`${artLabel} mt-3 text-center`}>Deposit</div>
        <div className="mt-2 grid grid-cols-2 gap-1.5 font-sans text-[11px]">
          <span className="rounded-[3px] border border-[#FF8A1F]/60 bg-[#21150F] py-1 text-center text-white">GCash</span>
          <span className="rounded-[3px] border border-white/10 py-1 text-center text-white/55">Bank</span>
        </div>
        <div
          className={`mt-3 flex items-center justify-center gap-1.5 rounded-[3px] py-1.5 font-sans text-[11.5px] font-medium transition-colors duration-500 ${
            on ? "bg-[#CC6600] text-white" : "bg-white/[0.06] text-white/55"
          }`}
        >
          {on ? <CheckCircle size={13} weight="fill" aria-hidden="true" /> : null}
          {on ? "Confirmed" : "Pay deposit"}
        </div>
        <div className="mt-3 text-center">
          <Tag on={on} before="Waiting" after="Work can start" />
        </div>
      </div>
    </div>
  );
}

/* 04 Analysis: first run, rerun, and senior review fill in one after another. */

const REVIEW = ["First run", "Rerun", "Senior review"];

function ReviewArt({ on }: { on: boolean }) {
  return (
    <div className={frame} role="img" aria-label="Your analysis is run, rerun by a second analyst, and signed off by a senior reviewer">
      <div className={`absolute inset-x-5 top-2 px-4 pb-10 pt-3 ${solidPanel}`}>
        <div className="flex justify-between gap-3">
          <span className={artLabel}>Your analysis</span>
          <Tag on={on} before="Queued" after="Signed off" />
        </div>
        <ul className="mt-4 flex flex-col gap-3">
          {REVIEW.map((r, i) => (
            <li key={r} className="flex items-center gap-3">
              <CheckCircle
                size={14}
                weight="fill"
                aria-hidden="true"
                className={`shrink-0 transition-colors duration-300 ${on ? "text-[#FF8A1F]" : "text-white/20"}`}
                style={{ transitionDelay: on ? `${300 + i * 300}ms` : "0ms" }}
              />
              <span className="w-24 shrink-0 font-sans text-[12px] text-white/75">{r}</span>
              <span className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
                <span
                  className="block h-full bg-white/60 transition-[width] duration-500"
                  style={{ width: on ? "100%" : "0%", transitionDelay: on ? `${i * 300}ms` : "0ms" }}
                />
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* 05 Delivery: the study files finish downloading, with the audit certificate included. */

function DeliveryArt({ on }: { on: boolean }) {
  return (
    <div className={frame} role="img" aria-label="Your study files download, with a signed audit certificate included">
      <div aria-hidden="true" className={`absolute left-[16%] right-[8%] top-6 h-40 rotate-[4deg] ${panel}`} />
      <div className={`absolute inset-x-5 top-2 p-4 pb-10 ${solidPanel}`}>
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[3px] border border-white/15 bg-white/[0.04]">
            <FileZip size={18} weight="fill" className="text-white/80" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate font-sans text-[12.5px] text-white">study-files.zip</div>
            <div className="font-mono text-[10px] text-white/45">5 files</div>
          </div>
          <Tag on={on} before="Preparing" after="Ready" />
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.08]">
          <div className="h-full bg-[#CC6600] transition-[width] duration-1000" style={{ width: on ? "100%" : "30%" }} />
        </div>
        <span
          className={`mt-3 inline-flex items-center gap-1.5 rounded-[3px] border px-2 py-1 font-mono text-[10px] transition-colors duration-500 ${
            on ? "border-[#FF8A1F]/60 bg-[#21150F] text-white" : "border-white/10 text-white/45"
          }`}
        >
          <SealCheck size={12} weight="fill" className={on ? "text-[#FF8A1F]" : "text-white/30"} aria-hidden="true" />
          Certificate included
        </span>
      </div>
    </div>
  );
}

const ARTS = [UploadArt, QuoteArt, PayArt, ReviewArt, DeliveryArt];

export default function StepArt({ index, on }: { index: number; on: boolean }) {
  const Art = ARTS[index];
  return Art ? <Art on={on} /> : null;
}
