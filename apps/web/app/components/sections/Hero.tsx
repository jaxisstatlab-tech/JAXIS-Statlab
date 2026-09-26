import { ArrowRight, ArrowUpRight } from "@phosphor-icons/react/ssr";
import { REGISTER_URL } from "@/lib/config";
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

      <div className={`${container} relative flex min-h-dvh flex-col items-center justify-center pb-16 pt-28 text-center`}>
        <div className="hero-in inline-flex items-center gap-2 font-mono text-xs text-white/70">
          <span className="h-1.5 w-1.5 rounded-full bg-[#CC6600]" />
          <DecryptedText text="jaxis.analyze(your_study)" delay={350} />
        </div>

        <h1
          className="hero-in mt-6 max-w-4xl font-sans text-[2.6rem] font-medium leading-[1.05] tracking-[-0.04em] text-white sm:text-6xl lg:text-[4rem]"
          style={{ animationDelay: "80ms" }}
        >
          <span className="sr-only">Thesis, survey, dissertation, and research statistics, checked by experts</span>
          <span aria-hidden="true">
            <RotatingWord words={["Thesis", "Survey", "Dissertation", "Research"]} className="text-[#FFA040]" /> statistics,
            <br />
            checked by experts
          </span>
        </h1>

        <p
          className="hero-in mt-6 max-w-2xl font-mono text-xs leading-relaxed text-white/60 sm:text-sm"
          style={{ animationDelay: "160ms" }}
        >
          Generic templates won&apos;t pass your panel. We run your analysis for your exact study, checked by two
          statisticians before delivery. Real numbers, plain explanations, zero shortcuts.
        </p>

        <div className="hero-in mt-9 flex flex-wrap items-center justify-center gap-6" style={{ animationDelay: "240ms" }}>
          <a href={REGISTER_URL} data-cta="hero-send" className={btnPrimary}>
            Send your study
            <ArrowRight size={15} weight="bold" />
          </a>
          <a href="#pricing" className={linkArrow}>
            See pricing
            <ArrowUpRight size={14} weight="bold" />
          </a>
        </div>
      </div>
    </section>
  );
}
