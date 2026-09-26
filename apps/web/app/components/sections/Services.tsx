import type { ReactNode } from "react";
import { ArrowRight, Broom, ChartBar, Code, Graph, Microphone, TextAlignLeft, UsersThree } from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react";
import { LOGIN_URL } from "@/lib/config";
import { BELL_SHAPES, IsoScene } from "../ui/Iso";
import Reveal from "../ui/Reveal";
import SpotlightGrid from "../ui/SpotlightGrid";
import { btnPrimary, container, heading, kicker, subtitle } from "../ui/styles";

const well = "relative rounded-[2px] bg-[#010D1F]";

function Peso() {
  return <span className="mr-0.5 inline-block select-none font-sans font-normal opacity-85">₱</span>;
}

function Example() {
  return (
    <span className="absolute right-2.5 top-2 font-mono text-[9.5px] uppercase tracking-wider text-white/40">Example</span>
  );
}

function Header({ icon: HeaderIcon, title, sub }: { icon: Icon; title: string; sub: string }) {
  return (
    <div>
      <h3 className="flex items-center gap-2.5 font-sans text-base font-bold text-white">
        <HeaderIcon size={18} weight="fill" className="shrink-0 text-white/60" />
        {title}
      </h3>
      <p className="mt-1.5 font-sans text-sm leading-relaxed text-white/60">{sub}</p>
    </div>
  );
}

function Footer({ value, children }: { value: ReactNode; children: ReactNode }) {
  return (
    <p className="mt-auto flex items-baseline gap-1.5 whitespace-nowrap pt-6 font-mono text-xs text-white/55">
      <span className="font-bold text-white">{value}</span>
      <span>{children}</span>
    </p>
  );
}

function Tile({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <div className={`bento-tile flex flex-col bg-[#01142B] p-6 sm:p-7 ${className}`}>
      <Reveal delay={delay} className="flex flex-1 flex-col">
        {children}
      </Reveal>
    </div>
  );
}

function Row({ label, from, to }: { label: string; from: string; to: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 py-1.5">
      <span className="font-sans text-[13px] text-white/65">{label}</span>
      <span className="font-mono text-xs text-white/40 line-through decoration-white/25">{from}</span>
      <ArrowRight size={10} weight="bold" className="text-white/35" />
      <span className="w-12 text-right font-mono text-xs font-bold text-white">{to}</span>
    </div>
  );
}

const STRANDS = [
  { label: "STEM", pct: 42, tone: "bg-[#CC6600]" },
  { label: "ABM", pct: 31, tone: "bg-white/40" },
  { label: "HUMSS", pct: 27, tone: "bg-white/15" },
];

const TESTS = ["t-test", "ANOVA", "Regression", "Correlation", "Chi-square", "Mann-Whitney"];
const MODELS = ["Structural equation models", "Path analysis", "Multilevel models", "Survival analysis"];

export default function Services() {
  return (
    <section id="services" className="relative scroll-mt-16 py-16 lg:py-24">
      <div className={container}>
        <Reveal className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className={kicker}>Services</div>
            <h2 data-split className={heading}>Every test your study needs</h2>
            <p className={subtitle}>From a quick data check to full structural models. Checked twice, explained simply.</p>
          </div>
          <a href={LOGIN_URL} data-cta="services-send" className={`${btnPrimary} shrink-0`}>
            Send your study
          </a>
        </Reveal>

        <SpotlightGrid className="mt-10">
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-[1px] sm:grid-cols-2 lg:grid-cols-4">
            <div className="bento-tile relative flex flex-col overflow-hidden bg-[#01142B] sm:col-span-2 lg:row-span-2">
              <Reveal className="flex flex-1 flex-col">
                <div className="p-6 sm:p-8">
                  <h3 className="flex items-center gap-2.5 font-sans text-xl font-bold tracking-[-0.02em] text-white">
                    <ChartBar size={20} weight="fill" className="text-[#CC6600]" />
                    Hypothesis testing
                  </h3>
                  <p className="mt-2 max-w-md font-sans text-[15px] leading-relaxed text-white/65">
                    The right test for your questions, assumptions checked first, and effect sizes reported, not just
                    p-values. Every result is rerun by a second statistician.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-1.5">
                    {TESTS.map((t) => (
                      <span key={t} className="rounded-[2px] bg-white/[0.06] px-2 py-1 font-mono text-[11px] text-white/75">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="relative mt-auto flex min-h-[14rem] flex-1 flex-col justify-end bg-[#010D1F]">
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:100%_2.75rem]"
                  />
                  <span className="absolute left-5 top-4 font-mono text-[10px] uppercase tracking-wider text-white/45">
                    Frequency
                  </span>
                  <div data-parallax="0.25" className="relative flex justify-center">
                    <IsoScene
                      id="bell"
                      shapes={BELL_SHAPES}
                      pad={6}
                      label="Isometric bar chart shaped like a normal distribution"
                      className="w-[70%] max-w-[23rem] translate-y-2 brightness-125"
                    />
                  </div>
                  <div className="relative mx-auto flex w-[70%] max-w-[23rem] justify-between border-t border-white/[0.06] px-1 py-2.5 font-mono text-[10px] text-white/45">
                    <span>−3σ</span>
                    <span>−2σ</span>
                    <span>−1σ</span>
                    <span className="text-[#FFA040]">μ</span>
                    <span>+1σ</span>
                    <span>+2σ</span>
                    <span>+3σ</span>
                  </div>
                </div>
              </Reveal>
            </div>

            <Tile delay={90}>
              <Header icon={Broom} title="Data cleaning" sub="Messy survey sheets fixed before any test runs." />
              <div className={`${well} mt-5 px-3 pb-2 pt-6`}>
                <Example />
                <Row label="Missing answers" from="14" to="0" />
                <Row label="Outliers flagged" from="0" to="3" />
                <Row label="Reliability" from="—" to="α .87" />
              </div>
              <Footer value="4">checks per dataset</Footer>
            </Tile>

            <Tile delay={180}>
              <Header icon={UsersThree} title="Respondent profiles" sub="Who answered your survey, in tables panels expect." />
              <div className={`${well} mt-5 px-3 pb-3 pt-7`}>
                <Example />
                <div className="flex h-1.5 overflow-hidden rounded-[1px]">
                  {STRANDS.map((s) => (
                    <span key={s.label} className={s.tone} style={{ width: `${s.pct}%` }} />
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {STRANDS.map((s) => (
                    <div key={s.label}>
                      <div className="font-mono text-[10px] uppercase tracking-wider text-white/50">{s.label}</div>
                      <div className="font-mono text-sm font-bold text-white">{s.pct}%</div>
                    </div>
                  ))}
                </div>
              </div>
              <Footer value="3">table types</Footer>
            </Tile>

            <Tile delay={270}>
              <Header icon={Graph} title="Advanced models" sub="For graduate and doctoral work." />
              <ul className="mt-5 flex flex-col gap-1.5">
                {MODELS.map((m) => (
                  <li key={m} className="font-sans text-[15px] font-medium tracking-[-0.01em] text-white/85">
                    {m}
                  </li>
                ))}
              </ul>
              <Footer value="4">model families</Footer>
            </Tile>

            <Tile delay={360}>
              <Header icon={TextAlignLeft} title="Chapter 4 write-up" sub="Every table explained in plain English." />
              <div className={`${well} mt-5 px-3.5 pb-3.5 pt-7`}>
                <Example />
                <p className="font-apa text-[15px] leading-relaxed text-white/85">
                  Students with better study habits tended to have higher grades, <span className="italic">r</span>(218) = .42,{" "}
                  <span className="italic">p</span> &lt; .001.
                </p>
              </div>
              <Footer value="1">paragraph per table</Footer>
            </Tile>

            <Tile delay={90} className="sm:col-span-2">
              <Header icon={Code} title="Code you can rerun" sub="The exact script behind every result. If your panel asks, run it again in front of them." />
              <pre className={`${well} mt-5 overflow-x-auto py-3 font-mono text-[12px] leading-[1.8] text-white/80`}>
                <code className="grid">
                  {[
                    <span key="c" className="italic text-white/45"># Multiple regression on GWA</span>,
                    <span key="m">
                      model &lt;- <span className="text-[#FFA040]">lm</span>(gwa ~ habits + hours + sleep + strand, data = df)
                    </span>,
                    <span key="s">summary(model)</span>,
                  ].map((line, i) => (
                    <span key={i} className="grid grid-cols-[2.25rem_1fr] pr-4">
                      <span className="select-none pr-3 text-right text-white/25">{i + 1}</span>
                      <span className="whitespace-pre">{line}</span>
                    </span>
                  ))}
                </code>
              </pre>
              <Footer value="3">languages · R, Python, SPSS</Footer>
            </Tile>

            <Tile delay={180} className="sm:col-span-2">
              <Header
                icon={Microphone}
                title="Defense prep"
                sub="A written script for the questions panels ask most, plus live practice before the real thing."
              />
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-[1.4fr_1fr]">
                <div className={`${well} px-3.5 pb-3 pt-3`}>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-white/50">Panel asks</div>
                  <p className="mt-0.5 font-sans text-[13px] text-white/85">Why did you use multiple regression?</p>
                  <div className="mt-3 font-mono text-[10px] uppercase tracking-wider text-[#FFA040]">You say</div>
                  <p className="mt-0.5 font-sans text-[13px] text-white/70">To see how four factors predict GWA together.</p>
                </div>
                <div className={`${well} flex flex-col justify-between px-3.5 py-3`}>
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-wider text-white/50">DefenseLab</div>
                    <p className="mt-0.5 font-sans text-[13px] font-semibold text-white">Live mock panel</p>
                    <p className="mt-0.5 font-sans text-[13px] text-white/60">1-on-1 video call, recorded</p>
                  </div>
                  <p className="mt-3 font-mono text-sm font-bold text-white">
                    <Peso />
                    250
                    <span className="ml-1 text-[11px] font-normal text-white/50">per hour</span>
                  </p>
                </div>
              </div>
              <Footer value="20">panel questions answered</Footer>
            </Tile>
          </div>
        </SpotlightGrid>

        <Reveal className="mt-6 flex justify-end">
          <a href="#how-it-works" className="inline-flex items-center gap-1.5 font-mono text-xs text-white/60 transition-colors hover:text-white">
            See how a study moves from request to delivery
            <ArrowRight size={13} weight="bold" />
          </a>
        </Reveal>
      </div>
    </section>
  );
}
