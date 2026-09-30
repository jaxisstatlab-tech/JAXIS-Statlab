"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { CheckCircle, Database, FileText, Scales, SealCheck, SquaresFour, TrendUp, UsersThree } from "@phosphor-icons/react";

// Plays a short sequence once when the art scrolls into view, then rests on its last frame.
// Hovering the card replays it. Reduced motion shows the last frame straight away.
function usePlayOnce<T extends HTMLElement>(steps: number, ms: number) {
  const ref = useRef<T>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const id = requestAnimationFrame(() => setStep(steps - 1));
      return () => cancelAnimationFrame(id);
    }

    let timer = 0;
    let running = false;
    const play = () => {
      if (running) return;
      running = true;
      let s = 0;
      setStep(0);
      timer = window.setInterval(() => {
        s += 1;
        setStep(s);
        if (s >= steps - 1) {
          window.clearInterval(timer);
          running = false;
        }
      }, ms);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          io.disconnect();
          play();
        }
      },
      { threshold: 0.45 },
    );
    io.observe(el);

    const card = el.closest("article, [data-art-card]");
    const hover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (card && hover) card.addEventListener("pointerenter", play);

    return () => {
      io.disconnect();
      window.clearInterval(timer);
      card?.removeEventListener("pointerenter", play);
    };
  }, [steps, ms]);

  return [ref, step] as const;
}

const ease = "ease-[cubic-bezier(0.23,1,0.32,1)]";

/* Service pictures share one look: layered translucent panels, one orange accent, and pictures that sit at the bottom
   of the card and run off its edge. Short status labels in the corners say what is happening. */

export const panel =
  "rounded-[4px] border border-white/[0.09] bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.02))] shadow-[0_24px_48px_-24px_rgba(0,0,0,0.9)]";
export const solidPanel = "rounded-[4px] border border-white/[0.11] bg-[#11112A] shadow-[0_28px_56px_-20px_rgba(0,0,0,0.95)]";
export const artLabel = "font-mono text-[10px] uppercase tracking-wider text-white/45";

function Status({ left, right, hot }: { left: string; right: string; hot?: boolean }) {
  return (
    <div className="absolute inset-x-7 top-0 z-10 flex justify-between gap-4 sm:inset-x-8">
      <span className={artLabel}>{left}</span>
      <span className={`font-mono text-[10px] uppercase tracking-wider transition-colors duration-300 ${hot ? "text-[#FFA040]" : "text-white/45"}`}>
        {right}
      </span>
    </div>
  );
}

/* Data cleaning: a sheet of survey answers, stacked on earlier drafts, scanned once; two answers get flagged. */

const SHEET_COLS = 12;
const SHEET_ROWS = 8;
const FLAGGED = [
  [8, 2],
  [3, 5],
];
const cellShade = (c: number, r: number) => 0.07 + ((c * 7 + r * 13) % 5) * 0.03;

export function CleaningArt() {
  const [ref, step] = usePlayOnce<HTMLDivElement>(3, 1100);
  const flagged = step >= 2;

  return (
    <div
      ref={ref}
      role="img"
      aria-label="A sheet of survey answers is scanned and two answers that don't fit are flagged"
      className="relative mt-6 h-56 w-full overflow-hidden [perspective:1000px]"
    >
      <Status left={flagged ? "Scan complete" : "Scanning answers"} right={flagged ? "2 flagged" : "220 responses"} hot={flagged} />
      <div
        className="absolute left-1/2 top-[4.5rem] w-[250px] [transform-style:preserve-3d]"
        style={{ transform: "translateX(-46%) rotateX(55deg) rotateZ(-30deg)" }}
      >
        <div className={`absolute inset-0 ${panel}`} style={{ transform: "translate(-28px, 28px)" }} />
        <div className={`absolute inset-0 ${panel}`} style={{ transform: "translate(-14px, 14px)" }} />
        <div className={`relative overflow-hidden p-3 ${solidPanel}`}>
          <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${SHEET_COLS}, minmax(0, 1fr))` }}>
            {Array.from({ length: SHEET_ROWS * SHEET_COLS }, (_, i) => {
              const c = i % SHEET_COLS;
              const r = Math.floor(i / SHEET_COLS);
              const hot = flagged && FLAGGED.some(([fc, fr]) => fc === c && fr === r);
              return (
                <span
                  key={i}
                  className={`aspect-square rounded-[1px] transition-[background-color,box-shadow] duration-300 ${
                    hot ? "shadow-[0_0_10px_rgba(255,138,31,0.8)]" : ""
                  }`}
                  style={{ background: hot ? "#FF8A1F" : `rgba(255,255,255,${cellShade(c, r)})` }}
                />
              );
            })}
          </div>
          <span
            aria-hidden="true"
            className={`absolute inset-y-0 left-0 w-px bg-[#FFB066] shadow-[0_0_12px_rgba(255,176,102,0.9)] transition-[transform,opacity] duration-1000 ease-linear ${
              step === 1 ? "opacity-100" : "opacity-0"
            }`}
            style={{ transform: `translateX(${step >= 1 ? 250 : 0}px)` }}
          />
        </div>
      </div>
    </div>
  );
}

/* Hypothesis testing: a half radar sweeps across the tests and comes to rest on the one that fits. */

const TESTS = [
  { label: "t-test", icon: Scales, angle: -66, k: 0.74 },
  { label: "ANOVA", icon: SquaresFour, angle: -24, k: 0.8 },
  { label: "Regression", icon: TrendUp, angle: 24, k: 0.8 },
  { label: "Correlation", icon: UsersThree, angle: 66, k: 0.74 },
];
const PICK = 2;
const RINGS = [100, 78, 56, 34];
// The bright edge of the sweep sits 34deg into the wedge; rotate so that edge points at each target in turn.
const SWEEP_EDGE = 34;
const SWEEP_TARGETS = [-90, -24, 24];

export function TestingArt() {
  const [ref, step] = usePlayOnce<HTMLDivElement>(3, 1100);
  const picked = step >= 2;
  const rotation = (SWEEP_TARGETS[step] ?? 24) - SWEEP_EDGE;

  return (
    <div
      ref={ref}
      role="img"
      aria-label="Your data is checked first, then a radar sweeps across t-test, ANOVA, regression, and correlation and picks regression"
      className="relative mt-6 h-60 w-full overflow-hidden"
    >
      <Status
        left={picked ? "Assumptions met" : step === 1 ? "Picking a test" : "Checking your data"}
        right={picked ? "Regression" : "Scanning"}
        hot={picked}
      />
      <div className="absolute bottom-0 left-1/2 aspect-square w-[min(92%,440px)] -translate-x-1/2 translate-y-1/2">
        <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.06),rgba(255,255,255,0.015)_60%,transparent_72%)]" />
        {RINGS.map((p) => (
          <span
            key={p}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.07]"
            style={{ width: `${p}%`, height: `${p}%` }}
          />
        ))}
        <span
          aria-hidden="true"
          className={`absolute inset-0 rounded-full transition-transform duration-1000 ${ease}`}
          style={{
            background: `conic-gradient(from 0deg, transparent 0deg, rgba(255,255,255,0.02) 4deg, rgba(255,255,255,0.14) ${SWEEP_EDGE}deg, transparent ${SWEEP_EDGE + 0.5}deg)`,
            transform: `rotate(${rotation}deg)`,
          }}
        />
        <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 justify-center rounded-full border border-white/20 bg-[#0C0C1E] pt-2.5">
          <Database size={18} weight="fill" className="text-white/80" />
        </span>
        {TESTS.map(({ label, icon: Icon, angle, k }, i) => {
          const on = picked && i === PICK;
          const rad = (angle * Math.PI) / 180;
          return (
            <span
              key={label}
              className={`absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 whitespace-nowrap rounded-[3px] border px-2.5 py-1.5 font-sans text-[12px] font-medium transition-[border-color,background-color,color,box-shadow] duration-300 ${
                on
                  ? "border-[#FF8A1F] bg-[#21150F] text-white shadow-[0_0_24px_-4px_rgba(255,138,31,0.6)]"
                  : "border-white/[0.1] bg-[#0E0E21] text-white/70"
              }`}
              style={{ left: `${50 + 50 * k * Math.sin(rad)}%`, top: `${50 - 50 * k * Math.cos(rad)}%` }}
            >
              <Icon size={13} weight="fill" aria-hidden="true" />
              {label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* APA tables and findings: a table page on top of two fanned pages; the note underlines the row it explains. */

const TABLE_ROWS = [
  ["Study habits", ".42", ".06", "< .001"],
  ["Sleep", ".18", ".07", ".012"],
  ["Support", ".27", ".06", "< .001"],
];

export function FindingsArt() {
  const [ref, step] = usePlayOnce<HTMLDivElement>(TABLE_ROWS.length + 2, 320);
  const noted = step > TABLE_ROWS.length;

  return (
    <div ref={ref} className="relative mt-6 h-60 w-full overflow-hidden">
      <div aria-hidden="true" className={`absolute left-1/2 top-9 h-72 w-[58%] -translate-x-1/2 -rotate-[8deg] ${panel}`} />
      <div aria-hidden="true" className={`absolute left-1/2 top-9 h-72 w-[58%] -translate-x-1/2 rotate-[7deg] ${panel}`} />
      <div className={`absolute left-1/2 top-3 h-72 w-[82%] -translate-x-1/2 p-4 ${solidPanel}`}>
        <div className="font-apa text-[12.5px] leading-snug text-white/85">
          <div className="font-bold">Table 2</div>
          <div className="italic">Predictors of Grades</div>
        </div>
        <table className="mt-2 w-full border-y border-white/25 font-apa text-[12px] text-white/80">
          <thead>
            <tr className="border-b border-white/25">
              <th className="py-1 text-left font-normal">Predictor</th>
              <th className="py-1 text-right font-normal italic">β</th>
              <th className="py-1 text-right font-normal italic">SE</th>
              <th className="py-1 text-right font-normal italic">p</th>
            </tr>
          </thead>
          <tbody>
            {TABLE_ROWS.map((row, i) => (
              <tr key={row[0]} className={`transition-opacity duration-300 ${step > i ? "opacity-100" : "opacity-50"}`}>
                {row.map((cell, c) => (
                  <td key={c} className={`py-0.5 ${c === 0 ? "text-left" : "text-right"}`}>
                    {i === 0 && (c === 0 || c === 1) ? (
                      <span
                        className={`underline decoration-2 underline-offset-[4px] transition-[text-decoration-color,color] duration-500 ${
                          noted ? "text-white decoration-[#CC6600]/70" : "decoration-transparent"
                        }`}
                      >
                        {cell}
                      </span>
                    ) : (
                      cell
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p
          className={`mt-3 border-l-2 border-l-[#CC6600] pl-3 font-sans text-[12px] leading-relaxed text-white/70 transition-opacity duration-500 ${
            noted ? "opacity-100" : "opacity-40"
          }`}
        >
          Students with better <span className="text-white">study habits</span> tended to have higher grades.
        </p>
      </div>
    </div>
  );
}

/* Respondent profiles: a frequency chart of who answered, bars rising once, the largest group hatched in orange. */

const STRANDS = [
  ["STEM", 62],
  ["ABM", 48],
  ["HUMSS", 44],
  ["GAS", 38],
  ["TVL", 28],
] as const;
const Y_MAX = 70;
const Y_TICKS = [60, 40, 20, 0];

export function ProfilesArt() {
  const [ref, step] = usePlayOnce<HTMLDivElement>(2, 150);

  return (
    <div
      ref={ref}
      role="img"
      aria-label="Respondents by strand: STEM 62, ABM 48, HUMSS 44, GAS 38, TVL 28, out of 220"
      className="mt-6 w-full px-7 pb-7 sm:px-8 sm:pb-8"
    >
      <div className="flex justify-between">
        <span className={artLabel}>Respondents by strand</span>
        <span className={artLabel}>n = 220</span>
      </div>
      <div className="relative mt-5 h-40">
        {Y_TICKS.map((v) => (
          <div key={v} className="absolute inset-x-0 border-t border-white/[0.06]" style={{ bottom: `${(v / Y_MAX) * 100}%` }}>
            <span className="absolute left-0 -translate-y-1/2 font-mono text-[10px] text-white/40">{v}</span>
          </div>
        ))}
        <div className="absolute inset-y-0 left-8 right-0 flex items-end justify-around gap-3">
          {STRANDS.map(([label, v], i) => (
            <span
              key={label}
              className={`block w-full max-w-10 origin-bottom rounded-t-[2px] border border-b-0 transition-transform duration-700 ${ease} ${
                i === 0 ? "border-[#FF8A1F]/70" : "border-white/[0.1]"
              }`}
              style={{
                height: `${(v / Y_MAX) * 100}%`,
                transform: `scaleY(${step > 0 ? 1 : 0.3})`,
                transitionDelay: `${i * 80}ms`,
                background:
                  i === 0
                    ? "repeating-linear-gradient(135deg, rgba(255,138,31,0.55) 0 2px, rgba(255,138,31,0.12) 2px 6px)"
                    : "linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.03))",
              }}
            />
          ))}
        </div>
      </div>
      <div className="ml-8 mt-2 flex justify-around gap-3">
        {STRANDS.map(([label]) => (
          <span key={label} className="w-full max-w-10 text-center font-mono text-[10px] text-white/55">
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* Advanced models: a path model built from tiles; arrows draw in, then the strongest path lights up. */

const MODEL_NODES = [
  { y: 30, label: "Motivation" },
  { y: 102, label: "Sleep" },
  { y: 174, label: "Stress" },
];
const MODEL_PATHS = [
  { d: "M112 48 L196 114", len: 107, label: ".51", x: 150, y: 74, strongest: true },
  { d: "M112 120 L196 120", len: 84, label: ".22", x: 154, y: 113, strongest: false },
  { d: "M112 192 L196 126", len: 107, label: "−.19", x: 150, y: 172, strongest: false },
];

export function ModelsArt() {
  const [ref, step] = usePlayOnce<HTMLDivElement>(3, 500);
  const drawn = step >= 1;
  const estimated = step >= 2;

  return (
    <div ref={ref} className="relative mt-6 w-full px-7 pb-7 sm:px-8 sm:pb-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:12px_12px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)]"
      />
      <div className="relative flex justify-between">
        <span className={artLabel}>Path model</span>
        <span className={`font-mono text-[10px] uppercase tracking-wider transition-colors duration-300 ${estimated ? "text-[#FFA040]" : "text-white/45"}`}>
          {estimated ? "Explains 44%" : "Estimating"}
        </span>
      </div>
      <svg
        viewBox="0 0 300 216"
        role="img"
        aria-label="Path model: motivation, sleep, and stress each affect engagement; motivation has the strongest effect"
        className="relative mx-auto mt-4 block h-auto w-full max-w-[20rem]"
      >
        <defs>
          <linearGradient id="svc-tile" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.09" />
            <stop offset="1" stopColor="#fff" stopOpacity="0.02" />
          </linearGradient>
          <marker id="svc-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0 0 L8 4 L0 8 Z" fill="rgba(255,255,255,0.6)" />
          </marker>
          <marker id="svc-arrow-hot" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0 0 L8 4 L0 8 Z" fill="#FF8A1F" />
          </marker>
        </defs>

        {MODEL_NODES.map(({ y, label }, i) => {
          const hot = estimated && i === 0;
          return (
            <g key={label}>
              <rect
                x="16"
                y={y}
                width="96"
                height="36"
                rx="4"
                fill={hot ? "rgba(204,102,0,0.14)" : "url(#svc-tile)"}
                stroke={hot ? "#FF8A1F" : "rgba(255,255,255,0.12)"}
                className="transition-[fill,stroke] duration-300"
              />
              <text x="64" y={y + 22} textAnchor="middle" className="fill-white/85 font-sans text-[12px]">
                {label}
              </text>
            </g>
          );
        })}

        {MODEL_PATHS.map((p) => {
          const hot = estimated && p.strongest;
          return (
            <path
              key={p.d}
              d={p.d}
              fill="none"
              stroke={hot ? "#FF8A1F" : "rgba(255,255,255,0.35)"}
              strokeWidth={hot ? 1.5 : 1}
              markerEnd={drawn ? (hot ? "url(#svc-arrow-hot)" : "url(#svc-arrow)") : undefined}
              strokeDasharray={p.len}
              strokeDashoffset={drawn ? 0 : p.len}
              className={`transition-[stroke-dashoffset,stroke] duration-500 ${ease}`}
            />
          );
        })}
        {MODEL_PATHS.map((p) => (
          <text
            key={p.label}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            stroke="#0A0A18"
            strokeWidth="4"
            paintOrder="stroke"
            className={`font-mono text-[10.5px] transition-opacity duration-300 ${estimated ? "opacity-100" : "opacity-0"} ${
              p.strongest ? "fill-[#FFA040]" : "fill-white/75"
            }`}
          >
            {p.label}
          </text>
        ))}

        <rect x="196" y="102" width="92" height="36" rx="4" fill="url(#svc-tile)" stroke="rgba(255,255,255,0.28)" />
        <text x="242" y="124" textAnchor="middle" className="fill-white font-sans text-[12px] font-medium">
          Engagement
        </text>
      </svg>
    </div>
  );
}

/* Two-analyst check: two run windows, one behind the other; the second run lands on the same number and they match. */

function RunWindow({ title, shown, className }: { title: string; shown: boolean; className: string }) {
  return (
    <div className={`absolute ${solidPanel} ${className}`}>
      <div className="flex items-center gap-1.5 border-b border-white/[0.07] px-3 py-2">
        {[0, 1, 2].map((d) => (
          <span key={d} className="h-1.5 w-1.5 rounded-full bg-white/20" />
        ))}
        <span className={`${artLabel} ml-2`}>{title}</span>
      </div>
      <div className="px-4 pb-6 pt-3">
        <div className="font-mono text-[11px] text-white/50">
          <i>F</i>(2, 217)
        </div>
        <div className="mt-1 grid font-mono text-2xl font-bold text-white">
          <span className={`col-start-1 row-start-1 transition-opacity duration-300 ${shown ? "opacity-100" : "opacity-0"}`}>8.14</span>
          <span className={`col-start-1 row-start-1 text-white/25 transition-opacity duration-300 ${shown ? "opacity-0" : "opacity-100"}`}>···</span>
        </div>
        <div className="mt-3 flex flex-col gap-1.5">
          {[88, 64, 76].map((w) => (
            <span key={w} className="block h-[5px] rounded-[1px] bg-white/[0.07]" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function CheckArt() {
  const [ref, step] = usePlayOnce<HTMLDivElement>(3, 700);
  const matched = step >= 2;

  return (
    <div
      ref={ref}
      role="img"
      aria-label="Two analysts run the same study separately and both get F(2, 217) = 8.14, so the results match"
      className="relative mt-6 h-[17rem] w-full overflow-hidden"
    >
      <Status left="Two separate runs" right={matched ? "Results match" : "Rerunning"} hot={matched} />
      <RunWindow title="Run 1 · Analyst 1" shown className="left-7 top-7 w-[62%] sm:left-8" />
      <RunWindow title="Run 2 · Analyst 2" shown={step >= 1} className="left-[30%] top-[8.5rem] w-[80%]" />
      <span
        aria-hidden="true"
        className={`absolute right-5 top-[7.4rem] z-10 flex h-9 w-9 items-center justify-center rounded-full border transition-[border-color,background-color,transform] duration-300 ${ease} ${
          matched ? "scale-100 border-[#FF8A1F] bg-[#21150F]" : "scale-75 border-white/15 bg-[#0E0E21]"
        }`}
      >
        <SealCheck size={18} weight="fill" className={matched ? "text-[#FF8A1F]" : "text-white/30"} />
      </span>
    </div>
  );
}

/* Defense prep: the defense guide sticks out of a folder; one panel question opens to its plain-English answer. */

const PANEL_QS = ["Why did you use this test?", "What does p < .05 mean?", "What are the limitations?"];
const OPEN_Q = 1;

export function DefenseArt() {
  const [ref, step] = usePlayOnce<HTMLDivElement>(3, 700);
  const picked = step >= 1;
  const open = step >= 2;

  return (
    <div ref={ref} className="relative mt-6 h-60 w-full overflow-hidden">
      <div className={`absolute inset-x-9 top-0 p-3 sm:inset-x-10 ${solidPanel}`}>
        <div className="flex justify-between px-1">
          <span className={artLabel}>Defense guide</span>
          <FileText size={12} weight="fill" className="text-white/35" aria-hidden="true" />
        </div>
        <ul className="mt-2 divide-y divide-white/[0.06]">
          {PANEL_QS.map((q, i) => {
            const on = picked && i === OPEN_Q;
            return (
              <li key={q} className={`border-l-2 py-2 pl-2 transition-colors duration-300 ${on ? "border-l-[#CC6600]" : "border-l-transparent"}`}>
                <span className={`block font-sans text-[12.5px] transition-colors duration-300 ${on ? "text-white" : "text-white/60"}`}>{q}</span>
                {i === OPEN_Q ? (
                  <span className={`grid transition-[grid-template-rows,opacity] duration-500 ${ease} ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                    <span className="overflow-hidden">
                      <span className="block pt-1 font-sans text-[12px] leading-relaxed text-white/70">
                        If there were truly no effect, a result this strong would happen less than 5% of the time.
                      </span>
                    </span>
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
      <div className="absolute inset-x-5 -bottom-6 h-20 rounded-[6px] border border-white/[0.1] bg-[linear-gradient(180deg,#1A1A36,#0E0E21)] shadow-[0_-18px_40px_-12px_rgba(0,0,0,0.95)]">
        <span aria-hidden="true" className="absolute -top-3 left-5 h-3 w-24 rounded-t-[4px] border border-b-0 border-white/[0.1] bg-[#1A1A36]" />
        <div className="flex items-center justify-between gap-3 px-5 pt-4 font-mono text-[11px]">
          <span className="text-white/60">DefenseLab practice</span>
          <span className="whitespace-nowrap font-bold text-white">
            <span className="mr-0.5 inline-block select-none font-sans font-normal opacity-85">₱</span>250
            <span className="font-normal text-white/50"> / hour</span>
          </span>
        </div>
      </div>
    </div>
  );
}

/* Findings summary (What you get): each statistic lights up as its plain-English meaning is written below. */

type StatState = "idle" | "active" | "done";
const statState = (group: number, step: number): StatState => (step === group ? "active" : step > group ? "done" : "idle");
const STAT_CLASS: Record<StatState, string> = {
  idle: "text-white/70 decoration-transparent",
  active: "bg-[#CC6600]/25 text-white decoration-[#FF8A1F]",
  done: "text-white decoration-[#CC6600]/55",
};

function Stat({ group, step, children }: { group: number; step: number; children: ReactNode }) {
  return (
    <span
      className={`-mx-0.5 rounded-[2px] px-0.5 underline decoration-2 underline-offset-[5px] transition-[background-color,color,text-decoration-color] duration-300 ${STAT_CLASS[statState(group, step)]}`}
    >
      {children}
    </span>
  );
}

const PLAIN = [
  "STEM students scored a little higher on average,",
  " and a gap this size is unlikely to be chance.",
  " The effect is medium, not huge.",
];

export function FindingsPreview() {
  const [ref, step] = usePlayOnce<HTMLDivElement>(PLAIN.length + 2, 1000);

  return (
    <div ref={ref}>
      <div className="flex items-baseline justify-between gap-4">
        <div className="font-mono text-[10px] uppercase tracking-wider text-white/45">Research question 2</div>
        <div className="font-mono text-[10px] text-white/35">p. 4</div>
      </div>
      <p className="mt-3 font-apa text-[14px] leading-[1.75] text-white/70">
        An independent-samples <i>t</i>-test compared the GWA of STEM and non-STEM students. STEM students (
        <Stat group={1} step={step}>
          <i>M</i> = 88.4
        </Stat>
        , <i>SD</i> = 4.1) scored higher than non-STEM students (
        <Stat group={1} step={step}>
          <i>M</i> = 86.1
        </Stat>
        , <i>SD</i> = 4.6),{" "}
        <Stat group={2} step={step}>
          <i>t</i>(218) = 3.87, <i>p</i> &lt; .001
        </Stat>
        ,{" "}
        <Stat group={3} step={step}>
          <i>d</i> = 0.52
        </Stat>
        .
      </p>
      <div className="mt-4 border-l-2 border-l-[#CC6600] py-0.5 pl-3.5">
        <div className="font-mono text-[9.5px] uppercase tracking-wider text-white/45">In plain words</div>
        <p className="mt-1 font-sans text-[13.5px] leading-relaxed">
          {PLAIN.map((text, i) => {
            const state = statState(i + 1, step);
            return (
              <span
                key={text}
                className={`transition-[opacity,filter,color] duration-500 ${
                  state === "idle" ? "opacity-0 blur-[3px]" : "opacity-100 blur-0"
                } ${state === "active" ? "text-white" : "text-white/80"}`}
              >
                {text}
              </span>
            );
          })}
        </p>
      </div>
    </div>
  );
}

/* Your account, chat: the analyst types, a message lands, and the student replies. */

export function ChatArt() {
  const [ref, step] = usePlayOnce<HTMLDivElement>(4, 700);
  const bubble = `max-w-[85%] rounded-[2px] px-3.5 py-2.5 font-sans text-[13px] leading-relaxed transition-[opacity,transform] duration-500 ${ease}`;

  return (
    <div ref={ref} className="flex w-full flex-col gap-2.5 px-7 pb-7 sm:px-8 sm:pb-8">
      <div className="font-mono text-[10px] uppercase tracking-wider text-white/45">Your statistical analyst</div>
      <div className="grid">
        <div
          className={`col-start-1 row-start-1 flex h-9 w-14 items-center justify-center gap-1 rounded-[2px] bg-white/[0.05] transition-opacity duration-300 ${
            step === 1 ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden="true"
        >
          {[0, 1, 2].map((d) => (
            <span key={d} className="h-1 w-1 animate-pulse rounded-full bg-white/60" style={{ animationDelay: `${d * 150}ms` }} />
          ))}
        </div>
        <p className={`col-start-1 row-start-1 bg-white/[0.05] text-white/85 ${bubble} ${step >= 2 ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"}`}>
          Your assumption checks passed. The regression is ready for your review.
        </p>
      </div>
      <p
        className={`self-end border-r-2 border-r-[#CC6600] bg-white/[0.03] text-right text-white/80 ${bubble} ${
          step >= 3 ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
        }`}
      >
        Thank you po! We&apos;ll read it tonight.
      </p>
    </div>
  );
}

/* Your account, payments: the written price, the deposit, and the balance fill in as a small ledger. */

const LEDGER = [
  { label: "Fixed price sent", value: "₱2,500", done: true },
  { label: "Deposit via GCash", value: "Paid", done: true },
  { label: "Balance", value: "On delivery", done: false },
];

export function LedgerArt() {
  const [ref, step] = usePlayOnce<HTMLDivElement>(LEDGER.length + 1, 500);

  return (
    <div ref={ref} className="w-full px-7 pb-7 sm:px-8 sm:pb-8">
      <ul className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
        {LEDGER.map((row, i) => {
          const shown = step > i;
          return (
            <li key={row.label} className={`flex h-11 items-center gap-3 transition-opacity duration-500 ${shown ? "opacity-100" : "opacity-25"}`}>
              <CheckCircle
                size={16}
                weight="fill"
                aria-hidden="true"
                className={`shrink-0 transition-colors duration-300 ${shown && row.done ? "text-[#FF8A1F]" : "text-white/20"}`}
              />
              <span className="flex-1 font-sans text-[13px] text-white/75">{row.label}</span>
              <span className="font-mono text-xs font-bold text-white">
                {row.value.startsWith("₱") ? (
                  <>
                    <span className="mr-0.5 inline-block select-none font-sans font-normal opacity-85">₱</span>
                    {row.value.slice(1)}
                  </>
                ) : (
                  row.value
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
