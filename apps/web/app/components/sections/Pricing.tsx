"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowRight, Bank, ChalkboardTeacher, CheckCircle, DeviceMobile, ShieldCheck } from "@phosphor-icons/react";
import { LOGIN_URL, REGISTER_URL } from "@/lib/config";
import { INCLUDED, PLANS, SPEEDS, peso } from "../../content/pricing";
import Reveal from "../ui/Reveal";
import { btnGhost, btnPrimary, container, kicker } from "../ui/styles";

function Peso({ className = "" }: { className?: string }) {
  return <span className={`mr-1 inline-block select-none font-sans font-normal opacity-85 ${className}`}>₱</span>;
}

const microLabel = "font-mono text-[11px] uppercase tracking-wider text-white/50";
const DEFAULT_PLAN = PLANS.findIndex((p) => p.featured);

// /pricing: plan tabs over one wide panel. Links like /pricing#plan-core open that tab.
export default function Pricing() {
  const [planIndex, setPlanIndex] = useState(DEFAULT_PLAN);
  const [speedId, setSpeedId] = useState<(typeof SPEEDS)[number]["id"]>("standard");
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  const plan = PLANS[planIndex]!;
  const speed = SPEEDS.find((s) => s.id === speedId)!;
  const price = plan.base + speed.fee;

  useEffect(() => {
    const read = () => {
      const hit = /^#plan-(\w+)$/.exec(window.location.hash);
      const index = hit ? PLANS.findIndex((p) => p.id === hit[1]) : -1;
      if (index >= 0) setPlanIndex(index);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  const select = (index: number, focus = false) => {
    setPlanIndex(index);
    history.replaceState(null, "", `#plan-${PLANS[index]!.id}`);
    if (focus) tabs.current[index]?.focus();
  };

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const last = PLANS.length - 1;
    const next =
      e.key === "ArrowRight"
        ? planIndex === last
          ? 0
          : planIndex + 1
        : e.key === "ArrowLeft"
          ? planIndex === 0
            ? last
            : planIndex - 1
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? last
              : null;
    if (next === null) return;
    e.preventDefault();
    select(next, true);
  };

  return (
    <section id="pricing" className="relative scroll-mt-16 pb-16 pt-32 lg:pb-24 lg:pt-40">
      <div className={container}>
        <Reveal className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className={kicker}>Pricing</div>
            <h1
              data-split
              className="max-w-3xl font-sans text-4xl font-medium tracking-[-0.04em] text-white sm:text-5xl lg:text-[3.5rem] lg:leading-[1.05]"
            >
              Clear prices, fixed before you pay.
            </h1>
          </div>
          <div className="font-mono text-xs leading-relaxed text-white/60 sm:text-sm lg:text-right">
            <p>Prices below are starting points</p>
            <p>Your written price is final, no surprise fees</p>
          </div>
        </Reveal>

        <Reveal delay={80} className="mt-12">
          <div role="tablist" aria-label="Plans" className="flex overflow-x-auto [scrollbar-width:none]">
            {PLANS.map((p, i) => {
              const active = i === planIndex;
              return (
                <button
                  key={p.id}
                  ref={(el) => {
                    tabs.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`plan-tab-${p.id}`}
                  aria-selected={active}
                  aria-controls="plan-panel"
                  tabIndex={active ? 0 : -1}
                  onClick={() => select(i)}
                  onKeyDown={onTabKey}
                  className={`relative -mb-px flex shrink-0 items-center gap-2 whitespace-nowrap rounded-t-[2px] border px-3 py-3 font-mono text-[12px] transition-colors duration-150 sm:px-5 sm:text-[13px] ${
                    i > 0 ? "-ml-px" : ""
                  } ${
                    active
                      ? "z-10 border-white/10 border-b-[#010D1F] bg-[#010D1F] text-white"
                      : "border-white/10 text-white/55 hover:text-white"
                  }`}
                >
                  {p.short}
                  {p.featured ? (
                    <>
                      <span className="hidden rounded-[2px] border border-[#CC6600]/50 px-1.5 py-px font-mono text-[9.5px] uppercase tracking-wider text-[#FFA040] sm:inline">
                        Recommended
                      </span>
                      <span aria-label="Recommended" className="h-1.5 w-1.5 rounded-full bg-[#CC6600] sm:hidden" />
                    </>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div
            role="tabpanel"
            id="plan-panel"
            aria-labelledby={`plan-tab-${plan.id}`}
            className="grid grid-cols-1 rounded-b-[2px] rounded-tr-[2px] border border-white/10 bg-[#010D1F] lg:grid-cols-2"
          >
            <div key={`left-${plan.id}`} className="plan-swap flex flex-col p-7 sm:p-10 lg:p-12">
              <div
                key={price}
                className="price-swap font-mono text-5xl font-bold leading-none tracking-[-0.03em] text-white sm:text-6xl"
              >
                <Peso className="text-[0.8em]" />
                {peso(price)}
                {plan.plus ? "+" : ""}
              </div>
              <p className="mt-4 font-mono text-[11px] uppercase tracking-wider text-white/80">
                Starting price · Ready in {speed.time ?? plan.standard}
              </p>
              <p className="mt-8 max-w-sm font-sans text-[15px] leading-relaxed text-white/65">
                <span className="text-white">{plan.name}.</span> Best for{" "}
                {plan.bestFor.charAt(0).toLowerCase() + plan.bestFor.slice(1)}.
              </p>

              <div className="mt-auto pt-10">
                <div className={microLabel}>Delivery speed</div>
                <div
                  role="radiogroup"
                  aria-label="Delivery speed"
                  className="mt-3 inline-flex flex-wrap rounded-[2px] border border-white/10 bg-[#010114] p-1"
                >
                  {SPEEDS.map((s) => {
                    const on = s.id === speedId;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => setSpeedId(s.id)}
                        className={`rounded-[2px] px-3 py-1.5 font-mono text-[12px] transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.97] ${
                          on ? "bg-white/[0.1] text-white" : "text-white/55 hover:text-white"
                        }`}
                      >
                        {s.label}
                        {s.fee ? <span className="ml-1.5 text-[10px] text-white/45">+{peso(s.fee)}</span> : null}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 font-mono text-[11px] text-white/45">
                  {speed.fee
                    ? "Faster delivery depends on your study's scope and is confirmed in your written price."
                    : `Standard delivery: ${plan.standard}.`}
                </p>
              </div>
            </div>

            <div
              key={`right-${plan.id}`}
              className="plan-swap flex flex-col border-t border-white/10 p-7 sm:p-10 lg:border-l lg:border-t-0 lg:p-12"
            >
              <div className={microLabel}>What&apos;s included</div>
              <ul className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 font-mono text-[12.5px] leading-snug text-white/80">
                    <CheckCircle size={15} weight="fill" className="mt-px shrink-0 text-[#CC6600]" />
                    {f}
                  </li>
                ))}
              </ul>

              <div className={`${microLabel} mt-8`}>On every plan</div>
              <ul className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                {INCLUDED.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 font-mono text-[12.5px] leading-snug text-white/60">
                    <ShieldCheck size={15} weight="fill" className="mt-px shrink-0 text-white/40" />
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-10">
                <div className="flex flex-wrap gap-3 border-t border-white/10 pt-6">
                  <a href={LOGIN_URL} data-cta={`pricing-${plan.id}`} className={`${btnPrimary} h-11 px-6`}>
                    Send your study
                    <ArrowRight size={15} weight="bold" />
                  </a>
                  <a href={REGISTER_URL} data-cta={`pricing-register-${plan.id}`} className={`${btnGhost} h-11 px-6`}>
                    Create a free account
                  </a>
                </div>
                <p className="mt-4 font-mono text-[11px] text-white/50">
                  Written price within 24 hours · No payment needed to ask
                </p>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal className="mt-6 flex flex-col gap-4 font-sans text-[13px] text-white/60 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="inline-flex items-center gap-2 text-white/80">
              <DeviceMobile size={15} weight="fill" className="text-white/55" />
              GCash
            </span>
            <span className="inline-flex items-center gap-2 text-white/80">
              <Bank size={15} weight="fill" className="text-white/55" />
              Bank transfer
            </span>
            <span className="text-white/50">
              DataCheck and Start are paid upfront. Larger plans pay a deposit, then the rest on delivery.
            </span>
          </div>
          <span className="inline-flex items-center gap-2 text-white/80">
            <ChalkboardTeacher size={15} weight="fill" className="text-[#CC6600]" />
            Add a DefenseLab mock panel for
            <span className="font-mono font-bold text-white">
              <Peso className="mr-0.5" />
              250
            </span>
            <span className="text-white/50">/ hr</span>
          </span>
        </Reveal>
      </div>
    </section>
  );
}
