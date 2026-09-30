"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowUp,
  ChatCircleText,
  CheckCircle,
  Database,
  DownloadSimple,
  FileText,
  FolderSimple,
  SealCheck,
  Table,
} from "@phosphor-icons/react";
import { artLabel, panel, solidPanel } from "./ServiceArt";

// Large scenes for the How it works showcase: one per step, in the same layered-panel style as the Services cards
// but composed for a wide stage. Every scene is drawn on a fixed 640 x 360 canvas and scaled to fit its container,
// so it looks identical at any width. `on` flips from the step's "before" state to its "done" state.

const W = 640;
const H = 360;
const ease = "ease-[cubic-bezier(0.23,1,0.32,1)]";

function Peso() {
  return <span className="mr-0.5 inline-block select-none font-sans font-normal opacity-85">₱</span>;
}

function Status({ on, before, after }: { on: boolean; before: string; after: string }) {
  return (
    <span className={`font-mono text-[11px] uppercase tracking-wider transition-colors duration-300 ${on ? "text-[#FFA040]" : "text-white/45"}`}>
      {on ? after : before}
    </span>
  );
}

function Bar({ on, delay = 0, width = 100 }: { on: boolean; delay?: number; width?: number }) {
  return (
    <span className="block h-1 overflow-hidden rounded-full bg-white/[0.08]">
      <span
        className={`block h-full bg-[#CC6600] transition-[width] duration-700 ${ease}`}
        style={{ width: on ? `${width}%` : "0%", transitionDelay: on ? `${delay}ms` : "0ms" }}
      />
    </span>
  );
}

/* 01 Submit: files slide into the upload window one by one, each bar filling. */
const FILES = [
  { name: "Chapters 1–3.docx", size: "1.2 MB" },
  { name: "Survey questionnaire.pdf", size: "340 KB" },
  { name: "Responses.xlsx", size: "86 KB" },
];
function UploadScene({ on }: { on: boolean }) {
  return (
    <>
      <div aria-hidden="true" className={`absolute left-[92px] top-[70px] h-[300px] w-[460px] -rotate-[5deg] ${panel}`} />
      <div aria-hidden="true" className={`absolute left-[104px] top-[58px] h-[300px] w-[460px] -rotate-[2deg] ${panel}`} />
      <div className={`absolute left-[110px] top-[44px] h-[340px] w-[440px] ${solidPanel}`}>
        <div className="flex items-center gap-1.5 border-b border-white/[0.07] px-4 py-2.5">
          {[0, 1, 2].map((d) => (
            <span key={d} className="h-2 w-2 rounded-full bg-white/15" />
          ))}
          <span className={`${artLabel} ml-3`}>Send your study</span>
        </div>
        <div className="p-5">
          <div className="flex items-center justify-between">
            <span className={artLabel}>Your files</span>
            <Status on={on} before="Uploading" after="3 files received" />
          </div>
          <ul className="mt-4 flex flex-col gap-3">
            {FILES.map((f, i) => (
              <li
                key={f.name}
                className={`rounded-[3px] border border-white/[0.08] bg-white/[0.03] px-3.5 py-3 transition-[opacity,translate] duration-500 ${ease} ${
                  on ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
                }`}
                style={{ transitionDelay: on ? `${i * 180}ms` : "0ms" }}
              >
                <div className="flex items-center gap-3">
                  <FileText size={16} weight="fill" className="shrink-0 text-white/60" />
                  <span className="flex-1 truncate font-sans text-[13px] text-white/90">{f.name}</span>
                  <span className="font-mono text-[10.5px] text-white/45">{f.size}</span>
                  <CheckCircle
                    size={15}
                    weight="fill"
                    className={`shrink-0 transition-colors duration-300 ${on ? "text-[#FF8A1F]" : "text-white/15"}`}
                    style={{ transitionDelay: on ? `${400 + i * 180}ms` : "0ms" }}
                  />
                </div>
                <div className="mt-2.5">
                  <Bar on={on} delay={150 + i * 180} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <span
        className={`absolute left-[566px] top-[20px] flex h-11 w-11 items-center justify-center rounded-full border transition-[border-color,background-color,translate] duration-500 ${ease} ${
          on ? "-translate-y-2 border-[#FF8A1F] bg-[#21150F]" : "border-white/15 bg-[#11112A]"
        }`}
      >
        <ArrowUp size={18} weight="bold" className={on ? "text-[#FF8A1F]" : "text-white/50"} />
      </span>
    </>
  );
}

/* 02 Price: the written quote fills its total and gets stamped; a notification says it's ready. */
const QUOTE = [
  ["Tests", "t-test, ANOVA, regression"],
  ["Files", "APA tables, write-up, data"],
  ["Timeline", "3–7 working days"],
  ["Package", "Core Thesis"],
];
function QuoteScene({ on }: { on: boolean }) {
  return (
    <>
      <div aria-hidden="true" className={`absolute left-[150px] top-[60px] h-[320px] w-[360px] rotate-[4deg] ${panel}`} />
      <div className={`absolute left-[130px] top-[38px] h-[340px] w-[380px] -rotate-[1.5deg] p-6 ${solidPanel}`}>
        <div className="flex items-center justify-between">
          <span className={artLabel}>Written quote</span>
          <span className="font-mono text-[10.5px] text-white/40">Example</span>
        </div>
        <ul className="mt-5 divide-y divide-white/[0.06] border-y border-white/[0.06]">
          {QUOTE.map(([k, v]) => (
            <li key={k} className="flex items-baseline justify-between gap-4 py-2.5">
              <span className="font-mono text-[10.5px] uppercase tracking-wider text-white/45">{k}</span>
              <span className="text-right font-sans text-[13px] text-white/85">{v}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-baseline justify-between">
          <span className="font-sans text-[14px] text-white/70">Fixed price</span>
          <span className={`font-mono text-2xl font-bold transition-colors duration-500 ${on ? "text-white" : "text-white/25"}`}>
            <Peso />
            2,500
          </span>
        </div>
        <span
          className={`absolute right-5 top-[104px] -rotate-[9deg] bg-[#11112A] rounded-[3px] border-2 px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider transition-[opacity,scale] duration-500 ${ease} ${
            on ? "scale-100 border-[#FF8A1F] text-[#FFA040] opacity-100" : "scale-125 border-transparent opacity-0"
          }`}
          style={{ transitionDelay: on ? "350ms" : "0ms" }}
        >
          Fixed · In writing
        </span>
      </div>
      <div
        className={`absolute left-[404px] top-[6px] flex w-[220px] items-center gap-3 rounded-[4px] border border-white/[0.12] bg-[#16162F] px-3.5 py-3 shadow-[0_20px_40px_-16px_rgba(0,0,0,0.9)] transition-[opacity,translate] duration-500 ${ease} ${
          on ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0"
        }`}
        style={{ transitionDelay: on ? "550ms" : "0ms" }}
      >
        <ChatCircleText size={18} weight="fill" className="shrink-0 text-[#FF8A1F]" />
        <div>
          <div className="font-sans text-[12.5px] font-medium text-white">Your price is ready</div>
          <div className="font-mono text-[10px] text-white/45">Within 24 hours</div>
        </div>
      </div>
    </>
  );
}

/* 03 Deposit: the phone confirms the GCash deposit and a receipt slides out beside it. */
function DepositScene({ on }: { on: boolean }) {
  return (
    <>
      <div
        className={`absolute left-[392px] top-[110px] w-[210px] rounded-[4px] border border-white/[0.1] bg-[#15152C] p-4 shadow-[0_24px_48px_-20px_rgba(0,0,0,0.95)] transition-[opacity,translate,rotate] duration-700 ${ease} ${
          on ? "translate-x-0 rotate-[5deg] opacity-100" : "-translate-x-24 rotate-0 opacity-0"
        }`}
        style={{ transitionDelay: on ? "400ms" : "0ms" }}
      >
        <div className="flex items-center justify-between">
          <span className={artLabel}>Receipt</span>
          <CheckCircle size={15} weight="fill" className="text-[#FF8A1F]" />
        </div>
        {[
          ["Amount", "₱1,250"],
          ["Method", "GCash"],
          ["Ref no.", "7021 4418"],
        ].map(([k, v]) => (
          <div key={k} className="mt-2.5 flex justify-between border-t border-white/[0.06] pt-2.5 font-mono text-[11px]">
            <span className="text-white/45">{k}</span>
            <span className="text-white/85">{v}</span>
          </div>
        ))}
      </div>
      <div className="absolute left-[150px] top-[30px] h-[380px] w-[210px] rounded-[26px] border border-white/[0.14] bg-[linear-gradient(180deg,#17172F,#0C0C1F)] p-4 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.95)]">
        <span className="mx-auto block h-1.5 w-14 rounded-full bg-white/15" />
        <div className={`${artLabel} mt-5 text-center`}>Deposit</div>
        <div className="mt-2 text-center font-mono text-[28px] font-bold text-white">
          <Peso />
          1,250
        </div>
        <div className="mt-1 text-center font-mono text-[10px] text-white/45">50% of your fixed price</div>
        <div className="mt-5 grid grid-cols-2 gap-2 font-sans text-[12px]">
          <span className="rounded-[4px] border border-[#FF8A1F]/60 bg-[#21150F] py-2 text-center text-white">GCash</span>
          <span className="rounded-[4px] border border-white/10 py-2 text-center text-white/50">Bank</span>
        </div>
        <div
          className={`mt-4 flex items-center justify-center gap-1.5 rounded-[4px] py-2.5 font-sans text-[13px] font-medium transition-colors duration-500 ${
            on ? "bg-[#CC6600] text-white" : "bg-white/[0.07] text-white/55"
          }`}
        >
          {on ? <CheckCircle size={15} weight="fill" /> : null}
          {on ? "Confirmed" : "Pay deposit"}
        </div>
        <div className="mt-4 text-center">
          <Status on={on} before="Waiting" after="Work starts today" />
        </div>
      </div>
    </>
  );
}

/* 04 Analysis: the quality checklist ticks to 6 of 6 in front of a results chart. */
const CHECKS = ["Data cleaned", "Assumptions checked", "Tests run", "Rerun by a second analyst", "Tables formatted", "Senior sign-off"];
const BARS = [38, 62, 84, 70, 52, 30];
function AnalysisScene({ on }: { on: boolean }) {
  const done = on ? CHECKS.length : 0;
  return (
    <>
      <div className={`absolute left-[330px] top-[40px] h-[230px] w-[270px] rotate-[3deg] p-4 ${panel}`}>
        <span className={artLabel}>Results</span>
        <div className="mt-4 flex h-[150px] items-end gap-2.5 border-b border-white/15 px-1">
          {BARS.map((b, i) => (
            <span
              key={i}
              className={`flex-1 origin-bottom rounded-t-[2px] transition-transform duration-700 ${ease} ${i === 2 ? "bg-[#CC6600]/70" : "bg-white/15"}`}
              style={{ height: `${b}%`, transform: `scaleY(${on ? 1 : 0.25})`, transitionDelay: on ? `${i * 60}ms` : "0ms" }}
            />
          ))}
        </div>
      </div>
      <div className={`absolute left-[70px] top-[58px] h-[320px] w-[330px] p-5 ${solidPanel}`}>
        <div className="flex items-center justify-between">
          <span className={artLabel}>Quality checks</span>
          <span className={`font-mono text-[12px] font-bold transition-colors duration-300 ${on ? "text-[#FFA040]" : "text-white/40"}`}>
            {done} / {CHECKS.length}
          </span>
        </div>
        <ul className="mt-4 flex flex-col gap-3">
          {CHECKS.map((c, i) => (
            <li key={c} className="flex items-center gap-3">
              <CheckCircle
                size={16}
                weight="fill"
                className={`shrink-0 transition-colors duration-300 ${on ? "text-[#FF8A1F]" : "text-white/15"}`}
                style={{ transitionDelay: on ? `${i * 160}ms` : "0ms" }}
              />
              <span className={`font-sans text-[13px] transition-colors duration-300 ${on ? "text-white/90" : "text-white/45"}`} style={{ transitionDelay: on ? `${i * 160}ms` : "0ms" }}>
                {c}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

/* 05 Delivery: the files fan out of the study folder, the certificate glowing; everything is ready to download. */
const DELIVERED = [
  { name: "APA tables", icon: Table, x: -236, r: -10 },
  { name: "Findings", icon: FileText, x: -118, r: -5 },
  { name: "Certificate", icon: SealCheck, x: 0, r: 0, hot: true },
  { name: "Cleaned data", icon: Database, x: 118, r: 5 },
  { name: "Defense guide", icon: ChatCircleText, x: 236, r: 10 },
];
function DeliveryScene({ on }: { on: boolean }) {
  return (
    <>
      {DELIVERED.map(({ name, icon: Icon, x, r, hot }, i) => (
        <div
          key={name}
          className={`absolute left-[264px] top-[70px] flex h-[150px] w-[112px] flex-col items-center justify-center gap-3 rounded-[4px] border transition-[translate,rotate,opacity] duration-700 ${ease} ${
            hot ? "border-[#FF8A1F]/70 bg-[#21150F] shadow-[0_0_32px_-6px_rgba(255,138,31,0.6)]" : "border-white/[0.12] bg-[#16162F]"
          }`}
          style={{
            translate: on ? `${x}px ${Math.abs(x) * 0.12}px` : "0px 110px",
            rotate: on ? `${r}deg` : "0deg",
            opacity: on ? 1 : 0,
            transitionDelay: on ? `${Math.abs(i - 2) * 90}ms` : "0ms",
            zIndex: hot ? 5 : 5 - Math.abs(i - 2),
          }}
        >
          <Icon size={26} weight="fill" className={hot ? "text-[#FF8A1F]" : "text-white/70"} />
          <span className="font-sans text-[12px] font-medium text-white/90">{name}</span>
        </div>
      ))}
      <div className="absolute left-[150px] top-[210px] z-10 h-[200px] w-[340px] rounded-[8px] border border-white/[0.12] bg-[linear-gradient(180deg,#1C1C3A,#101024)] shadow-[0_-20px_40px_-12px_rgba(0,0,0,0.9)]">
        <span aria-hidden="true" className="absolute -top-4 left-6 h-4 w-28 rounded-t-[6px] border border-b-0 border-white/[0.12] bg-[#1C1C3A]" />
        <div className="flex items-center justify-between px-6 pt-5">
          <span className="flex items-center gap-2">
            <FolderSimple size={18} weight="fill" className="text-white/70" />
            <span className="font-sans text-[13px] font-medium text-white">Your study</span>
          </span>
          <Status on={on} before="Preparing" after="Ready" />
        </div>
        <div className="mx-6 mt-4">
          <Bar on={on} />
        </div>
        <span
          className={`mx-6 mt-4 inline-flex items-center gap-2 rounded-[4px] px-3 py-2 font-sans text-[12.5px] font-medium transition-colors duration-500 ${
            on ? "bg-[#CC6600] text-white" : "bg-white/[0.07] text-white/50"
          }`}
        >
          <DownloadSimple size={14} weight="bold" />
          Download all · 5 files
        </span>
      </div>
    </>
  );
}

const SCENES = [UploadScene, QuoteScene, DepositScene, AnalysisScene, DeliveryScene];

// Scales the fixed 640 x 360 canvas to the container's width. `zoom` above 1 enlarges it and crops the sides evenly.
function Fit({ children, zoom = 1 }: { children: ReactNode; zoom?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(W);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry?.contentRect.width ?? W));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const scale = (width / W) * zoom;
  const left = (width - W * scale) / 2;
  return (
    // Height comes from the aspect ratio, not the measured width, so it is right from the very first layout
    // (ScrollFx measures pinned blocks before the width is known).
    <div ref={ref} className="relative w-full overflow-hidden" style={{ aspectRatio: `${W} / ${H * zoom}` }}>
      <div
        className="absolute top-0 origin-top-left"
        style={{ left, width: W, height: H, transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}

export default function StageArt({ index, on, label, zoom }: { index: number; on: boolean; label: string; zoom?: number }) {
  const Scene = SCENES[index];
  if (!Scene) return null;
  return (
    <div role="img" aria-label={label}>
      <Fit zoom={zoom}>
        <Scene on={on} />
      </Fit>
    </div>
  );
}
