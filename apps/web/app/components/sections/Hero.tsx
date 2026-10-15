import Link from "next/link";
import { ArrowRight, Check } from "@phosphor-icons/react/ssr";
import { SEND_STUDY_URL } from "@/lib/config";
import HeroHorizon from "../ui/HeroHorizon";
import HeroResults from "../ui/HeroResults";
import { btnGhost, btnPrimary, container } from "../ui/styles";

const PROOF = ["Fixed price in 24 hours", "Checked by two analysts", "GCash or bank transfer"];

// Home hero: the pitch on the left, a page of what clients get back on the right, over the sign-in screens' dot field
// and planet edge (HeroHorizon).
export default function Hero() {
  return (
    <section data-hero className="hero-hold relative z-0 overflow-hidden bg-[#010114]">
      {/* Everything that recedes (scales down) while the next section slides over the held hero (ScrollFx) */}
      <div data-hero-stage className="relative origin-[50%_35%]">
      <HeroHorizon />
      {/* A wash behind the copy so the dots stay texture, not noise */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_60%_at_22%_50%,rgba(1,1,20,0.78)_0%,rgba(1,1,20,0.4)_55%,transparent_85%)]"
      />
      {/* Dims the hero as it scrolls away (ScrollFx), so the next section takes the focus */}
      <div data-hero-dim aria-hidden="true" className="pointer-events-none absolute inset-0 z-[5] bg-[#010114] opacity-0" />

      <div
        data-hero-content
        className={`${container} relative z-10 grid min-h-svh grid-cols-1 items-center gap-12 pb-16 pt-28 sm:pb-20 sm:pt-32 lg:grid-cols-12 lg:gap-6 lg:pb-24`}
      >
        <div data-hero-copy className="flex flex-col items-start text-left lg:col-span-7">
          <div
            className="hx-badge inline-flex items-center gap-2.5 rounded-[2px] border border-white/10 bg-[#010114]/80 px-3.5 py-1.5 font-sans text-[12.5px] text-white/75 backdrop-blur-md transition-colors hover:border-white/20 sm:text-[13px]"
            style={{ ["--d" as string]: "0ms" }}
          >
            <span aria-hidden="true" className="relative flex h-2 w-2 shrink-0 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FF8A1F] opacity-65" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-[1px] bg-[#FF8A1F]" />
            </span>
            <span className="whitespace-nowrap sm:hidden">Statistical analysis for researchers</span>
            <span className="hidden sm:inline">Statistical analysis for students and researchers in the Philippines</span>
          </div>

          {/* Line one rises through a masked edge, then "properly analyzed." is revealed and swept with light. On phones the
              size follows the screen width so each line stays on one line ("Your research data," is ~8.9em wide). */}
          <h1 className="mt-7 font-sans text-[min(2.5rem,calc((100vw-3rem)/9.3))] font-medium leading-[1.06] tracking-[-0.04em] text-white sm:mt-8 sm:text-6xl sm:tracking-[-0.045em] xl:text-[4.6rem]">
            <span className="hx-line">
              <span style={{ ["--d" as string]: "90ms" }}>Your research data,</span>
            </span>
            <span className="block">
              <span className="hx-sweep" style={{ ["--d" as string]: "200ms" }}>
                <span>properly analyzed.</span>
              </span>
            </span>
          </h1>

          <p
            className="hx-subtitle mt-5 max-w-xl text-pretty font-sans text-[15px] leading-relaxed text-white/65 sm:mt-7 sm:text-lg"
            style={{ ["--d" as string]: "440ms" }}
          >
            Send us your data. We run the right tests, a second analyst checks every number, and you get clear tables and
            plain-English explanations you can defend.
          </p>

          <div className="mt-8 flex w-full max-w-sm flex-col items-stretch gap-3 sm:mt-10 sm:w-auto sm:max-w-none sm:flex-row sm:items-center">
            <a
              href={SEND_STUDY_URL}
              data-cta="hero-send"
              className={`${btnPrimary} hx-btn-primary group relative h-12 overflow-hidden px-7 text-[15px] font-medium`}
              style={{ ["--d" as string]: "560ms" }}
            >
              <span className="hx-btn-sheen" aria-hidden="true" />
              <span className="relative z-10 inline-flex items-center gap-2">
                Send Your Study
                <ArrowRight
                  size={16}
                  weight="bold"
                  className="transition-transform duration-200 ease-out group-hover:translate-x-1 group-active:translate-x-1.5"
                />
              </span>
            </a>
            <Link
              href="/pricing"
              className={`${btnGhost} hx-btn-ghost h-12 bg-[#010114]/70 px-7 text-[15px] backdrop-blur-sm`}
              style={{ ["--d" as string]: "620ms" }}
            >
              See Pricing
            </Link>
          </div>

          <ul className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[11px] text-white/60 sm:mt-10 sm:gap-x-6 sm:text-xs">
            {PROOF.map((item, i) => (
              <li key={item} className="hx-proof-item flex items-center gap-1.5" style={{ ["--d" as string]: `${700 + i * 60}ms` }}>
                <span className="hx-tick" style={{ ["--d" as string]: `${780 + i * 60}ms` }}>
                  <Check size={12} weight="bold" className="text-[#CC6600]" />
                </span>
                {item}
              </li>
            ))}
          </ul>

          <p
            className="hx-footer mt-10 border-t border-white/[0.08] pt-5 font-sans text-[13px] text-white/45 sm:mt-14"
            style={{ ["--d" as string]: "900ms" }}
          >
            Trusted by thesis groups at <span className="text-white/70">Central Mindanao University</span>
          </p>
        </div>

        <div data-hero-card className="relative lg:col-span-5">
          <HeroResults />
        </div>
      </div>
      </div>
    </section>
  );
}
