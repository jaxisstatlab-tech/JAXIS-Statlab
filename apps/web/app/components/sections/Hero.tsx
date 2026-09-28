import Link from "next/link";
import { ArrowRight, ArrowUpRight, CheckCircle, Clock, ShieldCheck } from "@phosphor-icons/react/ssr";
import { LOGIN_URL } from "@/lib/config";
import HeroPixels from "../ui/HeroPixels";
import PixelField from "../ui/PixelField";
import DecryptedText from "../ui/DecryptedText";
import RotatingWord from "../ui/RotatingWord";
import { btnPrimary, container, linkArrow } from "../ui/styles";

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <HeroPixels>
        <PixelField className="pixel-field absolute inset-0 h-full w-full" />
      </HeroPixels>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-[#010114] to-transparent" />

      <div className={`${container} relative z-10 flex min-h-svh flex-col items-center justify-center pb-20 pt-32 text-center`}>
        {/* Terminal Command Capsule with Live Beacon */}
        <div
          className="hero-in inline-flex items-center gap-2.5 rounded-[2px] border border-white/10 bg-white/[0.04] px-3.5 py-1.5 backdrop-blur-md"
          style={{ ["--d" as string]: "40ms" }}
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#CC6600] opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#CC6600]" />
          </span>
          <span className="font-mono text-xs text-white/70">
            <DecryptedText text="jaxis.analyze(your_study)" delay={350} />
          </span>
          <span className="h-3 w-px bg-white/15" />
          <span className="font-mono text-[11px] text-white/45">DefenseLab</span>
        </div>

        {/* Authoritative Main Headline */}
        <h1
          className="hero-in mt-6 max-w-4xl font-sans text-[2.3rem] font-medium leading-[1.05] tracking-[-0.04em] text-white sm:text-6xl lg:text-[4.25rem]"
          style={{ ["--d" as string]: "100ms" }}
        >
          <span className="sr-only">Thesis, survey, dissertation, and research statistics, checked by experts</span>
          <span aria-hidden="true">
            {/* Below lg the longest word can't share a line with "statistics,", so the word always gets
                its own line there; the line count then stays the same whichever word is showing. */}
            <RotatingWord words={["Thesis", "Survey", "Dissertation", "Research"]} className="text-[#FFA040]" />{" "}
            <br className="lg:hidden" />
            statistics,
            <br />
            checked by experts
          </span>
        </h1>

        {/* Narrative Subtitle */}
        <p
          className="hero-in mt-6 max-w-2xl font-mono text-xs leading-relaxed text-white/60 sm:text-sm mx-auto"
          style={{ ["--d" as string]: "180ms" }}
        >
          Generic templates won&apos;t pass your panel. We run your analysis for your exact study, checked by two
          statistical analysts before delivery. Real numbers, plain explanations, zero shortcuts.
        </p>

        {/* Action Toolbar */}
        <div
          className="hero-in mt-9 flex flex-wrap items-center justify-center gap-5 sm:gap-6"
          style={{ ["--d" as string]: "240ms" }}
        >
          <a href={LOGIN_URL} data-cta="hero-send" className={btnPrimary}>
            Send your study
            <ArrowRight size={15} weight="bold" />
          </a>
          <Link href="/pricing" className={linkArrow}>
            See pricing
            <ArrowUpRight size={14} weight="bold" />
          </Link>
        </div>

        {/* Dual-Signoff Trust Ribbon */}
        <div
          className="hero-in mt-11 flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5 rounded-[2px] border border-white/[0.08] bg-white/[0.02] px-5 py-2.5 backdrop-blur-xs font-mono text-[11px] text-white/50 sm:text-xs"
          style={{ ["--d" as string]: "300ms" }}
        >
          <span className="flex items-center gap-1.5">
            <CheckCircle size={14} weight="fill" className="text-white/50 shrink-0" />
            <span>Two analysts per study</span>
          </span>
          <span className="hidden sm:inline text-white/15">·</span>
          <span className="flex items-center gap-1.5">
            <Clock size={14} weight="fill" className="text-white/50 shrink-0" />
            <span>24h formal quote</span>
          </span>
          <span className="hidden sm:inline text-white/15">·</span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={14} weight="fill" className="text-white/50 shrink-0" />
            <span>Panel defense support</span>
          </span>
        </div>
      </div>
    </section>
  );
}
