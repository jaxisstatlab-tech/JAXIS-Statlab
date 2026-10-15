import { SealCheck, Star } from "@phosphor-icons/react/ssr";
import type { Testimonial } from "../../content/site";
import type { Rating } from "@/lib/testimonials";

// Pieces shared by the home page's testimonials and the /testimonials page.

export const card = "flex flex-col rounded-[2px] border border-white/[0.08] bg-[#0A0A18] p-6 sm:p-7";
export const quoteText = "text-pretty font-sans text-[15px] leading-relaxed text-white/80";

export function Attribution({ t }: { t: Testimonial }) {
  return (
    <figcaption className="mt-6 flex items-end justify-between gap-4 border-t border-white/[0.08] pt-4">
      <div className="min-w-0">
        <div className="font-sans text-[13px] font-medium leading-snug text-white/85">{t.name || (t.school ? "Thesis group" : "Anonymous thesis group")}</div>
        <div className="mt-1 font-mono text-[11px] text-white/55">
          {(t.name ? [t.program, t.school] : [t.program === "Thesis group" ? "" : t.program, t.school]).filter(Boolean).join(" · ") ||
            "Name withheld"}
        </div>
      </div>
      {t.defended ? (
        <span className="flex shrink-0 items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-wider text-white/70">
          <SealCheck size={13} weight="fill" className="text-[#FF8A1F]" />
          Defended
        </span>
      ) : null}
    </figcaption>
  );
}

export function Translation({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <p className="mt-3 border-l border-white/15 pl-3 font-sans text-[13px] leading-relaxed text-white/55">
      <span className="mr-1.5 font-mono text-[10px] uppercase tracking-wider text-white/40">In English</span>
      {text}
    </p>
  );
}

/** "4.8 out of 5 · average from 23 finished studies" (only shown once enough clients have answered). */
export function RatingLine({ rating, className = "" }: { rating: Rating | null; className?: string }) {
  if (!rating) return null;
  return (
    <p className={`flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-white/70 sm:text-sm ${className}`}>
      <Star size={14} weight="fill" className="text-[#FF8A1F]" aria-hidden="true" />
      <span>
        <span className="font-bold text-white">{rating.average.toFixed(1)}</span> out of 5
      </span>
      <span className="text-white/40">
        <span className="hidden sm:inline">· </span>average from {rating.count} finished studies
      </span>
    </p>
  );
}
