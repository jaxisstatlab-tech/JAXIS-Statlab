"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChatCircleText, FileArrowUp, FolderSimple, Receipt, ShieldCheck, Wallet, type Icon } from "@phosphor-icons/react";

const STAGES = ["Proposal", "Contract", "Deposit", "Analysis", "Delivery"];

const Peso = () => <span className="mr-0.5 inline-block select-none font-sans font-normal opacity-85">₱</span>;

const EVENTS: { icon: Icon; title: string; meta: ReactNode; stage: number }[] = [
  { icon: FileArrowUp, title: "Study received", meta: "3 files · Chapters 1–3, survey, data", stage: 0 },
  {
    icon: Receipt,
    title: "Fixed price sent",
    meta: (
      <>
        Core Thesis · <Peso />
        2,400
      </>
    ),
    stage: 1,
  },
  { icon: Wallet, title: "Deposit confirmed", meta: "GCash · work starts today", stage: 2 },
  { icon: ChatCircleText, title: "Message from your statistician", meta: "Assumption checks passed", stage: 3 },
  { icon: ShieldCheck, title: "Rerun matched", meta: "Second statistician · 6 of 6 checks", stage: 3 },
  { icon: FolderSimple, title: "Files delivered", meta: "Tables, write-up, data, code, script", stage: 4 },
];

const VISIBLE = 4;
const ROW = 76;
const TIMES = ["Just now", "4 min ago", "1 hr ago", "Yesterday"];

type Item = { id: number; event: number };

const initial: Item[] = Array.from({ length: VISIBLE + 1 }, (_, i) => ({ id: VISIBLE - i, event: VISIBLE - i }));

export default function TrackerFeed() {
  const [items, setItems] = useState<Item[]>(initial);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let visible = false;
    const io = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
    });
    io.observe(el);
    const tick = window.setInterval(() => {
      if (!visible || document.hidden) return;
      setItems((list) => {
        const head = list[0]!;
        const next = { id: head.id + 1, event: (head.event + 1) % EVENTS.length };
        return [next, ...list].slice(0, VISIBLE + 1);
      });
    }, 2400);
    return () => {
      io.disconnect();
      window.clearInterval(tick);
    };
  }, []);

  const stage = EVENTS[items[0]!.event]!.stage;

  return (
    <div
      ref={ref}
      className="overflow-hidden rounded-[2px] border border-white/10 bg-[#010114] shadow-[0_30px_60px_-30px_rgba(1,1,20,0.8)]"
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <span className="font-sans text-sm font-semibold text-white">Study tracker</span>
          <span className="hidden font-mono text-[11px] text-white/50 sm:inline">JAXIS-202609-0142</span>
        </div>
        <span className="font-mono text-[9.5px] uppercase tracking-wider text-white/40">Example</span>
      </div>

      <ul className="relative" style={{ height: VISIBLE * ROW }} aria-live="off">
        {items.map((item, index) => {
          const ev = EVENTS[item.event]!;
          const EventIcon = ev.icon;
          const top = index === 0;
          return (
            <li
              key={item.id}
              className={`feed-row absolute inset-x-0 flex items-center gap-4 border-b border-white/[0.06] px-5 ${
                top ? "bg-white/[0.03]" : ""
              } ${top && item.id > VISIBLE ? "feed-new" : ""}`}
              style={{
                height: ROW,
                transform: `translateY(${index * ROW}px)`,
                opacity: index >= VISIBLE ? 0 : 1,
              }}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[2px] bg-white/[0.06]">
                <EventIcon size={17} weight="fill" className={top ? "text-[#CC6600]" : "text-white/60"} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-sans text-sm font-medium text-white">{ev.title}</div>
                <div className="truncate font-sans text-[12.5px] text-white/55">{ev.meta}</div>
              </div>
              <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
                <span className="rounded-[2px] bg-white/[0.06] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-white/65">
                  {STAGES[ev.stage]}
                </span>
                <span className="font-mono text-[10px] text-white/45">{TIMES[index] ?? ""}</span>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center gap-3 px-5 py-3.5">
        <div className="flex flex-1 gap-1">
          {STAGES.map((s, i) => (
            <span
              key={s}
              className={`h-1 flex-1 rounded-[1px] transition-colors duration-500 ${i <= stage ? "bg-[#CC6600]" : "bg-white/10"}`}
            />
          ))}
        </div>
        <span className="w-20 text-right font-mono text-[10px] uppercase tracking-wider text-white/55">{STAGES[stage]}</span>
      </div>
    </div>
  );
}
