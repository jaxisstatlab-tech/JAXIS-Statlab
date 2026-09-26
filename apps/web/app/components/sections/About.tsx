import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  ChatText,
  HandCoins,
  Hourglass,
  LockKey,
  Scales,
  User,
  UsersThree,
} from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react";
import { LOGIN_URL } from "@/lib/config";
import {
  CORE_TEAM,
  EXPERT_TEAM,
  NUMBERS,
  SPECIALTIES,
  STORY,
  VALUES,
  type TeamMember,
  type Value,
} from "../../content/about";
import CountUp from "../ui/CountUp";
import { IsoScene, SURFACE_SHAPES } from "../ui/Iso";
import Reveal from "../ui/Reveal";
import {
  btnPrimary,
  container,
  heading,
  kicker,
  linkArrow,
  subtitle,
} from "../ui/styles";

const VALUE_ICONS: Record<Value["icon"], Icon> = {
  honest: Scales,
  twice: UsersThree,
  plain: ChatText,
  private: LockKey,
  fair: HandCoins,
  time: Hourglass,
};

const band = "border-y border-white/[0.06] bg-[#010D1F]";
const card = "rounded-[2px] border border-white/10 bg-[#010114]";

export function AboutHero() {
  return (
    <section className="relative overflow-hidden pb-0 pt-28 lg:min-h-[36rem] lg:pb-20 lg:pt-32">
      {/* Glow rising from both bottom corners, cut off by a hairline where the next band starts */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[26rem] bg-[radial-gradient(38%_70%_at_0%_100%,rgba(204,102,0,0.34),transparent_72%),radial-gradient(34%_60%_at_100%_100%,rgba(204,102,0,0.26),transparent_72%)]"
      />

      <div className={`${container} relative z-10`}>
        <Reveal className="lg:max-w-[36rem]">
          <div className={kicker}>About JAXIS</div>
          <h1
            data-split
            className="font-sans text-4xl font-medium tracking-[-0.04em] text-white sm:text-5xl lg:text-[3.25rem] lg:leading-[1.05]"
          >
            Built for students who have to defend their numbers
          </h1>
          <p className="mt-5 max-w-md font-mono text-xs leading-relaxed text-white/60 sm:text-sm">
            JAXIS StatLab is a statistical consulting team in Maramag, Bukidnon.
            We run, check, and explain the analysis for your thesis or research,
            so you understand every result you present.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-6">
            <a href={LOGIN_URL} data-cta="about-send" className={btnPrimary}>
              Send your study
              <ArrowRight size={15} weight="bold" />
            </a>
            <Link href="/pricing" className={linkArrow}>
              See pricing
              <ArrowUpRight size={14} weight="bold" />
            </Link>
          </div>
        </Reveal>
      </div>

      {/* Oversized chart: in the flow on small screens, bleeding off the right edge on desktop */}
      <div
        aria-hidden="true"
        className="relative -mb-32 -mt-2 w-[125%] max-w-none -translate-x-[6%] sm:-mb-24 sm:-mt-16 sm:ml-auto sm:w-[72%] sm:translate-x-[12%] lg:absolute lg:-top-6 lg:right-[-3%] lg:mb-0 lg:mt-0 lg:ml-0 lg:w-[36rem] lg:translate-x-0 xl:-top-10 xl:right-[6%] xl:w-[47rem] 2xl:right-[11%] 2xl:w-[50rem]"
      >
        <IsoScene
          id="about-surface"
          shapes={SURFACE_SHAPES}
          pad={24}
          className="hero-in w-full"
          label=""
        />
      </div>
    </section>
  );
}

export function AboutMission() {
  return (
    <section className={`${band} py-20 lg:py-28`}>
      <div className={container}>
        <Reveal className="mx-auto max-w-[46rem]">
          <div className={kicker}>Mission</div>
          <h2 data-split className={heading}>
            Help every student understand the results they defend
          </h2>
          <div className="mt-6 flex flex-col gap-5 font-mono text-xs leading-relaxed text-white/60 sm:text-sm">
            <p>
              A thesis defense doesn&apos;t test whether you can run SPSS. It
              tests whether you understand what your numbers say. Generic
              templates and copy-paste outputs leave students holding tables
              they can&apos;t explain.
            </p>
            <p>
              We started JAXIS to close that gap: the right test for your exact
              study, rerun by a second statistician, written up in plain
              English, with the code to run it again in front of your panel.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function AboutNumbers() {
  return (
    <section id="quality" className="scroll-mt-16 py-20 lg:py-28">
      <div className={container}>
        <Reveal>
          <div className={kicker}>By the numbers</div>
          <h2 data-split className={heading}>
            The rules we keep on every study
          </h2>
          <p className={subtitle}>
            Not goals. The same checks, every time, on every plan.
          </p>
        </Reveal>
        <Reveal className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-[2px] border border-white/10 bg-white/10 lg:grid-cols-4">
          {NUMBERS.map((n, i) => (
            <div key={n.label} className="bg-[#010114] px-6 py-7">
              <CountUp
                to={n.to}
                prefix={n.prefix}
                suffix={n.suffix}
                delay={i * 120}
                className="font-mono text-3xl font-bold tracking-[-0.02em] text-white sm:text-4xl"
              />
              <p className="mt-2 font-mono text-[11px] leading-relaxed text-white/55">
                {n.label}
              </p>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

// Hidden until STORY has real milestones.
export function AboutStory() {
  if (STORY.length === 0) return null;
  return (
    <section className="py-20 lg:py-28">
      <div className={container}>
        <div className="mx-auto max-w-[46rem]">
          <Reveal>
            <div className={kicker}>Our story</div>
            <h2 data-split className={heading}>
              How JAXIS started
            </h2>
          </Reveal>
          <ol className="mt-10 border-t border-white/10">
            {STORY.map((m) => (
              <Reveal
                as="li"
                key={m.year + m.title}
                className="grid grid-cols-[4.5rem_1fr] gap-6 border-b border-white/10 py-6"
              >
                <span className="font-mono text-xs text-white/50">
                  {m.year}
                </span>
                <div>
                  <p className="font-sans text-base font-semibold text-white">
                    {m.title}
                  </p>
                  <p className="mt-1.5 font-mono text-xs leading-relaxed text-white/55">
                    {m.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

export function AboutValues() {
  return (
    <section className={`${band} py-20 lg:py-28`}>
      <div className={container}>
        <Reveal className="mx-auto max-w-2xl text-center">
          <div className={kicker}>Values</div>
          <h2 data-split className={heading}>
            The principles we work by
          </h2>
          <p className={`${subtitle} mx-auto`}>
            Not a poster on a wall. Each one is a rule our team follows on your
            study.
          </p>
        </Reveal>
        <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-3 md:grid-cols-2">
          {VALUES.map((v, i) => {
            const ValueIcon = VALUE_ICONS[v.icon];
            return (
              <Reveal
                key={v.title}
                delay={(i % 2) * 80}
                className={`${card} p-6 sm:p-7`}
              >
                <ValueIcon size={20} weight="fill" className="text-[#CC6600]" />
                <h3 className="mt-5 font-sans text-base font-bold text-white">
                  {v.title}
                </h3>
                <p className="mt-2 font-mono text-xs leading-relaxed text-white/60">
                  {v.body}
                </p>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function TeamGroup({
  label,
  count,
  className = "",
  children,
}: {
  label: string;
  count: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <h3 className="mb-6 flex items-baseline gap-3 border-t border-white/10 pt-5 font-mono text-[11px] uppercase tracking-wider text-white/55">
        {label}
        <span className="text-white/30">{String(count).padStart(2, "0")}</span>
      </h3>
      {children}
    </div>
  );
}

// Square headshot: black and white at rest, colour on hover (all photos share one studio backdrop).
function TeamPhoto({ member, sizes }: { member: TeamMember; sizes: string }) {
  return (
    <div className="relative aspect-square overflow-hidden rounded-[2px] bg-[#0B0B1E]">
      {member.photo ? (
        <Image
          src={member.photo}
          alt={`${member.name}, ${member.role}`}
          fill
          sizes={sizes}
          className="object-cover grayscale transition-[filter,transform] duration-500 ease-out group-hover:scale-[1.03] group-hover:grayscale-0"
        />
      ) : (
        <span aria-hidden="true" className="absolute inset-0 flex items-end justify-center">
          <User size={120} weight="fill" className="translate-y-[18%] text-white/[0.07]" />
        </span>
      )}
    </div>
  );
}

export function AboutTeam() {
  return (
    <section className="py-20 lg:py-28">
      <div className={container}>
        <Reveal>
          <div className={kicker}>Team</div>
          <h2 data-split className={heading}>
            The people behind your study
          </h2>
          <p className={subtitle}>
            Mathematicians and statisticians who run, check, and explain your
            analysis from request to delivery.
          </p>
        </Reveal>

        <TeamGroup label="Core team" count={CORE_TEAM.length} className="mt-14">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {CORE_TEAM.map((m, i) => (
              <Reveal
                key={m.name}
                delay={i * 80}
                className={`${card} group grid grid-cols-[8.5rem_1fr] items-center gap-5 p-4 sm:grid-cols-[13rem_1fr] sm:gap-7 sm:p-5`}
              >
                <TeamPhoto
                  member={m}
                  sizes="(min-width: 640px) 208px, 136px"
                />
                <div className="min-w-0">
                  <h4 className="font-sans text-lg font-semibold leading-snug tracking-[-0.02em] text-white">
                    {m.name}
                  </h4>
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-[#FFA040]">
                    {m.role}
                  </p>
                  {m.bio ? (
                    <p className="mt-3 font-sans text-sm leading-relaxed text-white/60">
                      {m.bio}
                    </p>
                  ) : null}
                </div>
              </Reveal>
            ))}
          </div>
        </TeamGroup>

        <TeamGroup label="Expert team" count={EXPERT_TEAM.length} className="mt-14">
          {/* 3 x 3 on desktop: compact cards, photo beside the text */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {EXPERT_TEAM.map((m, i) => (
              <Reveal
                key={m.name}
                delay={(i % 3) * 70}
                className={`${card} group grid grid-cols-[7rem_1fr] items-start gap-4 p-4 sm:grid-cols-[8.5rem_1fr] sm:gap-5`}
              >
                <TeamPhoto member={m} sizes="(min-width: 640px) 136px, 112px" />
                <div className="min-w-0 pt-0.5">
                  <h4 className="font-sans text-[15px] font-semibold leading-snug text-white">
                    {m.name}
                  </h4>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-white/55">
                    {m.role}
                  </p>
                  {m.bio ? (
                    <p className="mt-2 font-sans text-[13px] leading-relaxed text-white/55">
                      {m.bio}
                    </p>
                  ) : null}
                </div>
              </Reveal>
            ))}
          </div>
        </TeamGroup>

        <Reveal className="mt-10 flex flex-col gap-4 border-t border-white/10 pt-8 lg:flex-row lg:items-center lg:gap-10">
          <span className="shrink-0 font-mono text-[11px] uppercase tracking-wider text-white/55">
            Our statisticians specialize in
          </span>
          <ul className="flex flex-wrap gap-2">
            {SPECIALTIES.map((s) => (
              <li
                key={s}
                className="rounded-[2px] border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-[11px] text-white/75"
              >
                {s}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
