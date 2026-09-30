import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/ssr";
import { SEND_STUDY_URL } from "@/lib/config";
import HeroPixels from "../ui/HeroPixels";
import PixelField from "../ui/PixelField";
import RotatingWord from "../ui/RotatingWord";
import { btnGhost, btnPrimary, container } from "../ui/styles";

const PROOF = ["Signed audit certificate on delivery", "Fixed written price within 24 hours", "Pay by GCash or bank"];

export default function Hero() {
  return (
    <section data-hero className="relative overflow-hidden">
      <HeroPixels>
        <PixelField className="pixel-field absolute inset-0 h-full w-full" />
      </HeroPixels>
      {/* Soft wash behind the copy so the grid stays texture, not noise */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_42%_at_50%_50%,rgba(1,1,20,0.82)_0%,rgba(1,1,20,0.5)_50%,transparent_78%)]"
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-[#010114] to-transparent" />

      <div data-hero-content className={`${container} relative z-10 flex min-h-svh flex-col items-center justify-center pb-20 pt-32 text-center`}>
        <div
          className="hero-in flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.1em] min-[380px]:text-[11px] min-[380px]:tracking-[0.14em] text-white/55 sm:text-xs sm:tracking-[0.2em]"
          style={{ ["--d" as string]: "40ms" }}
        >
          <span aria-hidden="true" className="hidden h-px w-10 bg-white/20 sm:block" />
          Statistical consulting for researchers
          <span aria-hidden="true" className="hidden h-px w-10 bg-white/20 sm:block" />
        </div>

        <h1
          className="hero-in mt-7 max-w-5xl font-sans text-[2.1rem] font-medium leading-[1.03] min-[380px]:text-[2.5rem] tracking-[-0.045em] text-white sm:text-6xl lg:text-[5rem]"
          style={{ ["--d" as string]: "100ms" }}
        >
          <span className="sr-only">Thesis, survey, dissertation, and research statistics, checked by experts</span>
          <span aria-hidden="true">
            {/* Below lg the longest word can't share a line with "statistics,", so the word always gets
                its own line there; the line count then stays the same whichever word is showing. */}
            <RotatingWord words={["Thesis", "Survey", "Dissertation", "Research"]} className="text-[#FFA75A]" />{" "}
            <br className="lg:hidden" />
            statistics,
            <br />
            <span className="text-white/90">checked by experts</span>
          </span>
        </h1>

        <p
          className="hero-in mx-auto mt-7 max-w-xl text-balance font-sans text-base leading-relaxed text-white/65 sm:text-lg"
          style={{ ["--d" as string]: "180ms" }}
        >
          We run the analysis for your exact study. A second analyst checks every number, and you get tables and
          plain-English explanations you can defend.
        </p>

        <div
          className="hero-in mt-10 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center"
          style={{ ["--d" as string]: "240ms" }}
        >
          <a href={SEND_STUDY_URL} data-cta="hero-send" className={`${btnPrimary} h-12 px-7 text-[15px]`}>
            Send your study
            <ArrowRight size={15} weight="bold" />
          </a>
          <Link href="/pricing" className={`${btnGhost} h-12 bg-[#010114]/60 px-7 text-[15px] backdrop-blur-sm`}>
            See pricing
          </Link>
        </div>

        <ul
          className="hero-in mt-12 flex flex-col items-center gap-2 font-sans text-[13px] text-white/50 sm:flex-row sm:gap-0"
          style={{ ["--d" as string]: "300ms" }}
        >
          {PROOF.map((item, i) => (
            <li key={item} className="flex items-center">
              {i > 0 ? <span aria-hidden="true" className="mx-4 hidden h-[3px] w-[3px] rounded-full bg-white/25 sm:block" /> : null}
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
