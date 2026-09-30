import Link from "next/link";
import { ArrowRight, ClipboardText, CreditCard, ShieldCheck } from "@phosphor-icons/react/ssr";
import { SEND_STUDY_URL } from "@/lib/config";
import HeroPixels from "../ui/HeroPixels";
import PixelField from "../ui/PixelField";
import { btnGhost, btnPrimary, container } from "../ui/styles";

const PROOF = [
  { icon: ClipboardText, lines: ["Clear deliverables", "before we start"] },
  { icon: ShieldCheck, lines: ["Fixed pricing", "confirmed upfront"] },
  { icon: CreditCard, lines: ["Pay via GCash", "or bank transfer"] },
];

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
          className="hero-in inline-flex items-center gap-2.5 rounded-full border border-white/[0.12] bg-[#010114]/60 px-4 py-2 font-sans text-[12.5px] text-white/80 backdrop-blur-sm sm:text-sm"
          style={{ ["--d" as string]: "40ms" }}
        >
          <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-[1px] bg-[#FF8A1F] shadow-[0_0_8px_rgba(255,138,31,0.8)]" />
          <span className="whitespace-nowrap sm:hidden">Statistical analysis for researchers</span>
          <span className="hidden sm:inline">Statistical analysis for students and researchers in the Philippines</span>
        </div>

        <h1
          className="hero-in mt-8 font-sans text-[2.6rem] font-bold leading-[1.02] tracking-[-0.045em] text-white min-[380px]:text-[2.9rem] sm:text-7xl lg:text-[5.5rem]"
          style={{ ["--d" as string]: "100ms" }}
        >
          Your research data,
          <br />
          <span className="bg-[linear-gradient(180deg,#FFA040_0%,#F07A12_100%)] bg-clip-text pb-[0.08em] text-transparent">
            properly analyzed.
          </span>
        </h1>

        <p
          className="hero-in mx-auto mt-7 max-w-2xl text-balance font-sans text-base leading-relaxed text-white/70 sm:text-lg lg:text-xl"
          style={{ ["--d" as string]: "180ms" }}
        >
          We help students and researchers analyze their data using the right statistical methods. Get clear results,
          organized tables, and explanations that make sense for your study.
        </p>

        <div
          className="hero-in mt-10 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-4"
          style={{ ["--d" as string]: "240ms" }}
        >
          <a href={SEND_STUDY_URL} data-cta="hero-send" className={`${btnPrimary} group h-13 px-8 text-base`}>
            Submit Your Study
            <ArrowRight size={16} weight="bold" className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </a>
          <Link href="/pricing" className={`${btnGhost} h-13 bg-[#010114]/60 px-8 text-base backdrop-blur-sm`}>
            See Pricing
          </Link>
        </div>

        <ul
          className="hero-in mt-12 grid w-full max-w-xs grid-cols-1 gap-4 text-left sm:flex sm:max-w-none sm:w-auto sm:gap-0"
          style={{ ["--d" as string]: "300ms" }}
        >
          {PROOF.map(({ icon: Icon, lines }, i) => (
            <li
              key={lines[0]}
              className={`flex items-center gap-3 sm:px-8 ${i > 0 ? "sm:border-l sm:border-white/10" : "sm:pl-0"} ${i === PROOF.length - 1 ? "sm:pr-0" : ""}`}
            >
              <Icon size={24} weight="fill" className="shrink-0 text-white/55" />
              <span className="font-sans text-[13px] leading-snug text-white/60 sm:text-sm">
                {lines[0]}
                <br className="hidden sm:block" />
                <span className="sm:hidden"> </span>
                {lines[1]}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
