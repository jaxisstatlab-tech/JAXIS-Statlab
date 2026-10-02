import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ChatCircleText, Database, SealCheck, Table, TextAlignLeft } from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react";
import { SAMPLE_OUTPUT_URL } from "@/lib/config";
import { DELIVERABLES } from "../../content/site";
import { CORE_TEAM, EXPERT_TEAM, type TeamMember } from "../../content/about";
import Reveal from "../ui/Reveal";
import SpotlightGrid from "../ui/SpotlightGrid";
import { FindingsPreview } from "../ui/ServiceArt";
import { btnGhost, cardDesc, cardTitle, container, heading, kicker, subtitle } from "../ui/styles";

// Icons for the five DELIVERABLES, in the same order.
const FILE_ICONS: Icon[] = [Table, TextAlignLeft, Database, SealCheck, ChatCircleText];

// Featured on the home page; the full team is on /about.
const FEATURED = ["Jobelle S. Sorino-Simblante", "Jerome P. Gallego"]
  .map((name) => CORE_TEAM.find((m) => m.name === name))
  .filter((m): m is TeamMember => m !== undefined);

function Headshot({ member, size }: { member: TeamMember; size: number }) {
  if (!member.photo) return <span className="block rounded-[2px] bg-white/10" style={{ width: size, height: size }} />;
  return (
    <Image
      src={member.photo}
      alt={member.name}
      width={size}
      height={size}
      sizes={`${size}px`}
      className="rounded-[2px] object-cover"
      style={{ width: size, height: size }}
    />
  );
}

// Faint text lines on the pages behind the front one.
function Lines({ widths, className = "" }: { widths: number[]; className?: string }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {widths.map((w, i) => (
        <span key={i} className="block h-[5px] rounded-[1px] bg-white/[0.08]" style={{ width: `${w}%` }} />
      ))}
    </div>
  );
}

const page = "absolute inset-x-0 top-0 mx-auto w-full max-w-[25rem] rounded-[2px] border";

export default function SampleOutput() {
  return (
    <section id="sample" className="relative scroll-mt-16 py-16 lg:py-24">
      <div className={container}>
        <Reveal className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className={kicker}>What you get</div>
            <h2 className={heading}>
              Files your adviser can open and check
            </h2>
            <p className={subtitle}>Five files with every study, and the people who stand behind them.</p>
          </div>
          {SAMPLE_OUTPUT_URL ? (
            <a href={SAMPLE_OUTPUT_URL} data-cta="sample-download" className={`${btnGhost} shrink-0`}>
              Download a full sample
            </a>
          ) : null}
        </Reveal>

        <SpotlightGrid className="mt-10">
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-[1px] lg:grid-cols-12">
            {/* A page from the findings summary, with the table and defense guide pages stacked behind it */}
            <div data-art-card className="relative flex flex-col overflow-hidden bg-[#0A0A18] lg:col-span-7">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-[radial-gradient(ellipse_55%_60%_at_50%_100%,rgba(204,102,0,0.1),transparent)]"
              />
              <div className="relative flex items-start justify-between gap-4 px-7 pt-7 sm:px-8 sm:pt-8">
                <div>
                  <h3 className={`${cardTitle} mb-1.5 lg:text-xl`}>Findings summary</h3>
                  <p className={`${cardDesc} max-w-[44ch]`}>A page from what you receive: the result, then what it means.</p>
                </div>
                <span className="pt-1 font-mono text-[11px] uppercase tracking-wider text-white/40">Example</span>
              </div>

              <Reveal className="paper-stage relative mx-auto mt-4 h-[23rem] w-full max-w-[32rem] px-7 pt-10 sm:h-[24rem] sm:px-10">
                <div className="relative h-full">
                  <div aria-hidden="true" className={`paper paper-c ${page} h-[17rem] border-white/[0.06] bg-[#0B0B1C] p-6`}>
                    <div className="font-mono text-[10px] uppercase tracking-wider text-white/30">Defense guide</div>
                    <Lines widths={[88, 72, 94, 60, 80]} className="mt-4" />
                  </div>
                  <div aria-hidden="true" className={`paper paper-b ${page} h-[17rem] border-white/[0.08] bg-[#0D0D20] p-6`}>
                    <div className="font-mono text-[10px] uppercase tracking-wider text-white/35">Table 3</div>
                    <div className="mt-3 border-y border-white/15 py-2">
                      <Lines widths={[100, 100, 100, 100]} />
                    </div>
                  </div>

                  <figure className={`paper paper-a ${page} border-white/[0.14] bg-[#101024] p-6 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.9)] sm:p-7`}>
                    <FindingsPreview />
                    <figcaption className="sr-only">
                      Example page from a findings summary, explaining a t-test result in plain English.
                    </figcaption>
                  </figure>
                </div>
              </Reveal>
            </div>

            {/* What arrives */}
            <div className="bg-[#0A0A18] lg:col-span-5">
              <ul className="divide-y divide-white/[0.07]">
                {DELIVERABLES.map(({ name, format, body }, i) => {
                  const FileIcon = FILE_ICONS[i] ?? Table;
                  return (
                  <li key={name} className="flex gap-4 px-6 py-5 sm:px-8 lg:py-[1.4rem]">
                    <FileIcon size={18} weight="fill" className="mt-0.5 shrink-0 text-white/55" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-sans text-[15px] font-medium text-white">{name}</span>
                        <span className="shrink-0 font-mono text-[10.5px] uppercase tracking-wider text-white/55">{format}</span>
                      </div>
                      <p className="mt-1 font-sans text-[13.5px] leading-relaxed text-white/60">{body}</p>
                    </div>
                  </li>
                  );
                })}
              </ul>
            </div>

            {/* Who checks it */}
            <div className="bg-[#0A0A18] lg:col-span-12">
              <div className="grid grid-cols-1 gap-8 px-6 py-7 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1.1fr)_auto] lg:items-center lg:gap-10">
                <div>
                  <div className="font-mono text-[11px] uppercase tracking-wider text-white/55">Who checks your numbers</div>
                  <p className="mt-2 max-w-xs font-sans text-[14px] leading-relaxed text-white/70">
                    Mathematicians and statisticians. Statistical Analysts run your tests, and Statistical Review Editors audit the methods and findings.
                  </p>
                </div>

                {FEATURED.map((m) => (
                  <div key={m.name} className="flex items-center gap-4">
                    <Headshot member={m} size={60} />
                    <div className="min-w-0">
                      <div className="font-sans text-[15px] font-medium leading-snug text-white">{m.name}</div>
                      <div className="mt-0.5 font-mono text-[10.5px] uppercase tracking-wider text-white/55">{m.role}</div>
                      {m.bio ? <p className="mt-1.5 font-sans text-[12.5px] leading-snug text-white/55">{m.bio}</p> : null}
                    </div>
                  </div>
                ))}

                <Link href="/about" className="group flex items-center gap-3 lg:justify-self-end">
                  <span className="flex -space-x-2">
                    {EXPERT_TEAM.map((m) => (
                      <span key={m.name} className="rounded-[2px] ring-2 ring-[#0A0A18]">
                        <Headshot member={m} size={34} />
                      </span>
                    ))}
                  </span>
                  <span className="font-mono text-[11px] text-white/70 transition-colors group-hover:text-white">
                    +{EXPERT_TEAM.length} analysts
                    <ArrowUpRight size={12} weight="bold" className="ml-1 inline" />
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </SpotlightGrid>
      </div>
    </section>
  );
}
