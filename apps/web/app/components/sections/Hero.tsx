import Link from "next/link";
import { ArrowRight, Check } from "@phosphor-icons/react/ssr";
import { SEND_STUDY_URL } from "@/lib/config";
import HeroGrid from "../ui/HeroGrid";
import { btnGhost, btnPrimary, container } from "../ui/styles";

const PROOF = ["Fixed price in 24 hours", "Checked by two analysts", "GCash or bank transfer"];

export default function Hero() {
  return (
    <section data-hero className="relative overflow-hidden">
      <HeroGrid />
      {/* A wash behind the copy so the grid stays texture, not noise */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_48%_38%_at_50%_52%,rgba(1,1,20,0.72)_0%,rgba(1,1,20,0.35)_55%,transparent_80%)]"
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-[#010114] to-transparent" />

      <div data-hero-content className={`${container} relative z-10 flex min-h-svh flex-col items-center justify-center pb-16 pt-28 text-center sm:pb-20 sm:pt-32`}>
        <div
          className="hx-up inline-flex items-center gap-2.5 rounded-[2px] border border-white/10 bg-[#010114]/70 px-3.5 py-1.5 font-sans text-[12.5px] text-white/70 sm:text-[13px]"
          style={{ ["--d" as string]: "0ms" }}
        >
          <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-[1px] bg-[#FF8A1F]" />
          <span className="whitespace-nowrap sm:hidden">Statistical analysis for researchers</span>
          <span className="hidden sm:inline">Statistical analysis for students and researchers in the Philippines</span>
        </div>

        {/* The authored moment: line one rises through a mask, then "properly analyzed." is revealed and swept with
            light (see .hx-line / .hx-sweep in globals.css). */}
        <h1
          className="mt-7 font-sans text-[2.05rem] font-medium leading-[1.06] tracking-[-0.04em] text-white min-[380px]:text-[2.2rem] sm:mt-8 sm:text-7xl sm:leading-[1.03] sm:tracking-[-0.045em] lg:text-[5.25rem]"
        >
          <span className="hx-line">
            <span style={{ ["--d" as string]: "60ms" }}>Your research data,</span>
          </span>
          <span className="block">
            <span className="hx-sweep" style={{ ["--d" as string]: "180ms" }}>
              <span>properly analyzed.</span>
            </span>
          </span>
        </h1>

        <p
          className="hx-up mx-auto mt-5 max-w-xl text-balance font-sans text-[15px] leading-relaxed text-white/65 sm:mt-7 sm:text-lg"
          style={{ ["--d" as string]: "420ms" }}
        >
          Send us your data. We run the right tests, a second analyst checks every number, and you get clear tables and
          plain-English explanations you can defend.
        </p>

        <div
          className="hx-up mt-8 flex w-full max-w-sm flex-col items-stretch gap-3 sm:mt-10 sm:w-auto sm:max-w-none sm:flex-row sm:items-center"
          style={{ ["--d" as string]: "470ms" }}
        >
          <a href={SEND_STUDY_URL} data-cta="hero-send" className={`${btnPrimary} group h-12 px-7 text-[15px]`}>
            Send Your Study
            <ArrowRight
              size={16}
              weight="bold"
              className="transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-active:translate-x-1"
            />
          </a>
          <Link href="/pricing" className={`${btnGhost} h-12 bg-[#010114]/70 px-7 text-[15px]`}>
            See Pricing
          </Link>
        </div>

        <ul
          className="hx-up mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 font-mono text-[11px] text-white/60 sm:mt-10 sm:gap-x-6 sm:text-xs"
          style={{ ["--d" as string]: "520ms" }}
        >
          {PROOF.map((item, i) => (
            <li key={item} className="flex items-center gap-1.5">
              <span className="hx-tick" style={{ ["--d" as string]: `${600 + i * 40}ms` }}>
                <Check size={12} weight="bold" className="text-[#CC6600]" />
              </span>
              {item}
            </li>
          ))}
        </ul>
        <p className="hx-up mt-8 font-sans text-[13px] text-white/45 sm:mt-14" style={{ ["--d" as string]: "640ms" }}>
          Trusted by thesis groups at <span className="text-white/65">Central Mindanao University</span>
        </p>
      </div>
    </section>
  );
}
