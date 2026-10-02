"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { CheckCircle, DownloadSimple, SealCheck } from "@phosphor-icons/react";
import { DELIVERABLES } from "../../content/site";

// Scenes for the How it works showcase, one per step. They share one system so the five read as a set: a single
// straight card (the thing the client actually sees at that step) resting on two sheets behind it, one orange
// accent per scene, and motion that tells the step's story when `on` flips from "before" to "done". Every scene is
// drawn on a fixed 640 x 360 canvas and scaled to fit, so it looks identical at any width, and the card stays inside
// the middle 490px so phones (which zoom in and crop the sides) still show all of it.

const W = 640;
const H = 360;
const ease = "ease-[cubic-bezier(0.23,1,0.32,1)]";
const curve = "cubic-bezier(0.23,1,0.32,1)";

function Peso() {
  return <span className="mr-0.5 inline-block select-none font-sans font-normal opacity-85">₱</span>;
}

// Rows rise into place one after another.
const rise = (on: boolean) => `transition-[opacity,translate] duration-500 ${ease} ${on ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`;
const after = (on: boolean, ms: number): CSSProperties => ({ transitionDelay: on ? `${ms}ms` : "0ms" });

function Meta({ children }: { children: ReactNode }) {
  return <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">{children}</span>;
}

function Signal({ on, before, done, delay = 0 }: { on: boolean; before: string; done: string; delay?: number }) {
  const [lit, setLit] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setLit(on), on ? delay : 0);
    return () => window.clearTimeout(t);
  }, [on, delay]);
  return (
    <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider">
      <span
        className={`h-1.5 w-1.5 rounded-full transition-[background-color,box-shadow] duration-300 ${
          lit ? "bg-[#FF8A1F] shadow-[0_0_8px_rgba(255,138,31,0.9)]" : "bg-white/25"
        }`}
      />
      <span className={`transition-colors duration-300 ${lit ? "text-[#FFA040]" : "text-white/45"}`}>{lit ? done : before}</span>
    </span>
  );
}

function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex w-11 shrink-0 justify-center rounded-[2px] border border-white/[0.09] bg-white/[0.03] py-[3px] font-mono text-[9px] font-semibold tracking-wider text-white/60">
      {children}
    </span>
  );
}

function Tick({ on, delay }: { on: boolean; delay: number }) {
  return (
    <CheckCircle
      size={15}
      weight="fill"
      className={`shrink-0 transition-[color,scale] duration-300 ${ease} ${on ? "scale-100 text-[#FF8A1F]" : "scale-75 text-white/10"}`}
      style={after(on, delay)}
    />
  );
}

// The card every scene is built on, centred, with two sheets stacked behind it for depth.
function Sheet({ title, meta, footer, children }: { title: string; meta: ReactNode; footer: ReactNode; children: ReactNode }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pt-5">
      <div className="relative w-[400px]">
        <div aria-hidden="true" className="absolute inset-x-10 -top-5 h-full rounded-[4px] border border-white/[0.05] bg-[#0B0B1D]" />
        <div aria-hidden="true" className="absolute inset-x-5 -top-2.5 h-full rounded-[4px] border border-white/[0.07] bg-[#0F0F24]" />
        <div className="relative overflow-hidden rounded-[4px] border border-white/[0.1] bg-[linear-gradient(180deg,#17172F,#0E0E22)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_40px_80px_-30px_rgba(0,0,0,0.95)]">
          <span
            aria-hidden="true"
            className="absolute inset-x-12 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,160,64,0.6),transparent)]"
          />
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
            <span className="font-sans text-[13px] font-medium text-white">{title}</span>
            {meta}
          </div>
          {children}
          <div className="flex items-center justify-between border-t border-white/[0.06] bg-white/[0.015] px-5 py-3">{footer}</div>
        </div>
      </div>
    </div>
  );
}

/* 01 Submit: the three files land one by one; each upload line runs across, then clears to a tick. */
const FILES = [
  { type: "DOCX", name: "Chapters 1–3", size: "1.2 MB" },
  { type: "PDF", name: "Survey questionnaire", size: "340 KB" },
  { type: "XLSX", name: "Responses", size: "86 KB" },
];
function UploadScene({ on }: { on: boolean }) {
  return (
    <Sheet
      title="Send your study"
      meta={<Meta>3 files</Meta>}
      footer={
        <>
          <span className="font-mono text-[10px] text-white/40">1.6 MB total</span>
          <Signal on={on} before="Uploading" done="Received" delay={1300} />
        </>
      }
    >
      <ul className="px-5 py-1.5">
        {FILES.map((f, i) => {
          const d = i * 220;
          return (
            <li
              key={f.name}
              className={`relative flex items-center gap-3 border-t border-white/[0.05] py-3 first:border-t-0 ${rise(on)}`}
              style={after(on, d)}
            >
              <Tag>{f.type}</Tag>
              <div className="min-w-0 flex-1">
                <div className="truncate font-sans text-[13px] text-white/90">{f.name}</div>
                <div className="mt-0.5 font-mono text-[10px] text-white/40">{f.size}</div>
              </div>
              <Tick on={on} delay={d + 850} />
              <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px">
                <span
                  className="block h-full bg-[#FF8A1F]"
                  style={{
                    width: on ? "100%" : "0%",
                    opacity: on ? 0 : 1,
                    transition: on ? `width 700ms ${curve} ${d + 100}ms, opacity 400ms ease ${d + 850}ms` : "none",
                  }}
                />
              </span>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}

/* 02 Price: the quote's lines settle in, the total counts up, and it's marked fixed. */
const QUOTE = [
  ["Tests", "t-test, ANOVA, regression"],
  ["Files", "APA tables, write-up, data"],
  ["Ready in", "3 to 7 working days"],
];
function useCountUp(target: number, on: boolean, ms: number, delay: number) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    let start = 0;
    const frame = (t: number) => {
      if (!start) start = t;
      const p = Math.min(1, Math.max(0, (t - start - delay) / ms));
      setValue(on ? Math.round((target * (1 - (1 - p) ** 3)) / 10) * 10 : 0);
      if (on && p < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [target, on, ms, delay]);
  return value;
}
function QuoteScene({ on }: { on: boolean }) {
  const total = useCountUp(2500, on, 900, 550);
  return (
    <Sheet
      title="Your written quote"
      meta={<Meta>Example</Meta>}
      footer={
        <>
          <span className="font-mono text-[10px] text-white/40">Sent within 24 hours</span>
          <span
            className={`rounded-[2px] border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider transition-[opacity,scale,border-color] duration-500 ${ease} ${
              on ? "scale-100 border-[#FF8A1F]/60 text-[#FFA040] opacity-100" : "scale-110 border-transparent opacity-0"
            }`}
            style={after(on, 1450)}
          >
            Fixed price
          </span>
        </>
      }
    >
      <dl className="px-5 pt-1.5">
        {QUOTE.map(([k, v], i) => (
          <div
            key={k}
            className={`flex items-baseline justify-between gap-4 border-t border-white/[0.05] py-2.5 first:border-t-0 ${rise(on)}`}
            style={after(on, i * 90)}
          >
            <dt className="font-mono text-[10px] uppercase tracking-wider text-white/40">{k}</dt>
            <dd className="text-right font-sans text-[13px] text-white/85">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mx-5 mb-4 mt-1.5 flex items-center justify-between rounded-[3px] border border-white/[0.07] bg-white/[0.025] px-4 py-3">
        <div>
          <div className="font-sans text-[13px] text-white/80">Total</div>
          <div className="mt-0.5 font-sans text-[11px] text-white/40">Core Thesis package</div>
        </div>
        <span className="font-mono text-[26px] font-bold tabular-nums text-white">
          <Peso />
          {total.toLocaleString("en-US")}
        </span>
      </div>
    </Sheet>
  );
}

/* 03 Deposit: GCash is picked and the deposit moves along paid, cleared, work starts. */
const CLEARING = [
  ["Paid", "2:14 PM"],
  ["Cleared", "2:40 PM"],
  ["Work starts", "Today"],
];
function DepositScene({ on }: { on: boolean }) {
  return (
    <Sheet
      title="Pay your deposit"
      meta={<Meta>Half now</Meta>}
      footer={
        <>
          <span className="font-mono text-[10px] text-white/40">Ref 7021 4418</span>
          <Signal on={on} before="Waiting" done="Work starts today" delay={1500} />
        </>
      }
    >
      <div className="px-5 pt-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-white/40">Amount</div>
            <div className="mt-1 font-mono text-[28px] font-bold leading-none text-white">
              <Peso />
              1,250
            </div>
          </div>
          <div className="pb-0.5 text-right font-sans text-[11px] text-white/40">
            of a <Peso />
            2,500 fixed price
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-1 rounded-[3px] border border-white/[0.08] bg-black/20 p-1 font-sans text-[12.5px]">
          <span className="rounded-[2px] bg-white/[0.08] py-1.5 text-center text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">
            GCash
          </span>
          <span className="py-1.5 text-center text-white/45">Bank transfer</span>
        </div>
      </div>
      <ol className="relative mx-5 mb-5 mt-6 grid grid-cols-3">
        <span aria-hidden="true" className="absolute left-[16.67%] right-[16.67%] top-[5px] h-px bg-white/10">
          <span
            className={`block h-full origin-left bg-[#FF8A1F] transition-transform duration-1000 ${ease}`}
            style={{ transform: on ? "scaleX(1)" : "scaleX(0)", ...after(on, 450) }}
          />
        </span>
        {CLEARING.map(([label, time], i) => (
          <li key={label} className="relative flex flex-col items-center text-center">
            <span
              className={`h-[11px] w-[11px] rounded-full border-2 transition-[background-color,border-color,box-shadow] duration-300 ${
                on ? "border-[#FF8A1F] bg-[#FF8A1F] shadow-[0_0_10px_rgba(255,138,31,0.7)]" : "border-white/20 bg-[#121229]"
              }`}
              style={after(on, 400 + i * 500)}
            />
            <span className={`mt-2.5 font-sans text-[12px] transition-colors duration-300 ${on ? "text-white/90" : "text-white/45"}`} style={after(on, 400 + i * 500)}>
              {label}
            </span>
            <span className="mt-0.5 font-mono text-[10px] text-white/35">{time}</span>
          </li>
        ))}
      </ol>
    </Sheet>
  );
}

/* 04 Analysis: an analyst runs your tests, and a review editor conducts an audit run before sign-off. */
const RUNS = [
  ["t value", "3.42"],
  ["p value", ".001"],
  ["Effect size", "0.62"],
  ["Reliability", ".87"],
];
function AnalysisScene({ on }: { on: boolean }) {
  return (
    <Sheet
      title="Checked twice"
      meta={<Meta>Audit run must match</Meta>}
      footer={
        <>
          <span className="font-sans text-[12px] text-white/55">Senior reviewer</span>
          <Signal on={on} before="Waiting" done="Signed off" delay={1500} />
        </>
      }
    >
      <table className="w-full border-collapse">
        <thead>
          <tr className="font-mono text-[9.5px] uppercase tracking-wider text-white/35">
            <th className="py-2.5 pl-5 text-left font-normal">Result</th>
            <th className="py-2.5 text-right font-normal">First run</th>
            <th className="py-2.5 text-right font-normal">Audit run</th>
            <th className="w-12 pr-5" />
          </tr>
        </thead>
        <tbody>
          {RUNS.map(([name, value], i) => {
            const d = 200 + i * 260;
            return (
              <tr key={name} className="border-t border-white/[0.05]">
                <td className="py-2.5 pl-5 font-sans text-[13px] text-white/80">{name}</td>
                <td className="py-2.5 text-right font-mono text-[12px] tabular-nums text-white/85">{value}</td>
                <td className="py-2.5 text-right font-mono text-[12px] tabular-nums">
                  <span className={`inline-block text-white ${rise(on)}`} style={after(on, d)}>
                    {value}
                  </span>
                </td>
                <td className="py-2.5 pr-5">
                  <span className="flex justify-end">
                    <Tick on={on} delay={d + 250} />
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Sheet>
  );
}

/* 05 Delivery: the five files come in, the signed certificate among them, ready to download together. */
function DeliveryScene({ on }: { on: boolean }) {
  return (
    <Sheet
      title="Your study files"
      meta={<Signal on={on} before="Preparing" done="Ready" delay={900} />}
      footer={
        <>
          <span className="font-mono text-[10px] text-white/40">5 files</span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-[2px] px-3 py-1.5 font-sans text-[12px] font-medium transition-colors duration-500 ${
              on ? "bg-[#CC6600] text-white" : "bg-white/[0.06] text-white/50"
            }`}
            style={after(on, 1000)}
          >
            <DownloadSimple size={13} weight="bold" />
            Download all
          </span>
        </>
      }
    >
      <ul className="px-5 py-1">
        {DELIVERABLES.map((f, i) => {
          const cert = f.name.startsWith("Certificate");
          return (
            <li
              key={f.name}
              className={`flex items-center gap-3 border-t border-white/[0.05] py-2 first:border-t-0 ${rise(on)}`}
              style={after(on, i * 110)}
            >
              <Tag>{f.format.split(" · ")[0]}</Tag>
              <span className={`flex-1 truncate font-sans text-[13px] ${cert ? "text-white" : "text-white/80"}`}>{f.name}</span>
              {cert ? (
                <SealCheck
                  size={16}
                  weight="fill"
                  className={`shrink-0 transition-[color,filter] duration-500 ${
                    on ? "text-[#FF8A1F] drop-shadow-[0_0_6px_rgba(255,138,31,0.7)]" : "text-white/20"
                  }`}
                  style={after(on, 800)}
                />
              ) : (
                <DownloadSimple size={14} weight="bold" className="shrink-0 text-white/30" />
              )}
            </li>
          );
        })}
      </ul>
    </Sheet>
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
