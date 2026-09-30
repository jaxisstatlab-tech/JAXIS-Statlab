import { Quotes, SealCheck } from "@phosphor-icons/react/ssr";
import { TESTIMONIALS, type Testimonial } from "../../content/site";
import Reveal from "../ui/Reveal";
import { container, heading, kicker, subtitle } from "../ui/styles";

function Attribution({ t }: { t: Testimonial }) {
  return (
    <figcaption className="mt-6 flex items-end justify-between gap-4 border-t border-white/[0.08] pt-4">
      <div className="min-w-0">
        <div className="font-sans text-[13px] font-medium leading-snug text-white/85">{t.name || "Anonymous thesis group"}</div>
        <div className="mt-1 font-mono text-[11px] text-white/55">
          {t.name ? [t.program, t.school].filter(Boolean).join(" · ") : "Name withheld"}
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

function Translation({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <p className="mt-3 border-l border-white/15 pl-3 font-sans text-[13px] leading-relaxed text-white/55">
      <span className="mr-1.5 font-mono text-[10px] uppercase tracking-wider text-white/40">In English</span>
      {text}
    </p>
  );
}

const card = "flex flex-col rounded-[2px] border border-white/[0.08] bg-[#0A0A18] p-6 sm:p-7";

export default function Testimonials() {
  if (TESTIMONIALS.length === 0) return null;

  const [featured, ...rest] = TESTIMONIALS;
  const side = rest.slice(0, 2);
  const more = rest.slice(2);

  return (
    <section id="testimonials" className="relative scroll-mt-16 py-16 lg:py-24">
      <div className={container}>
        <Reveal>
          <div>
            <div className={kicker}>From students</div>
            <h2 className={heading}>
              In their own words
            </h2>
            <p className={subtitle}>Messages from thesis groups we&apos;ve worked with, kept as they sent them.</p>
          </div>
        </Reveal>

        {featured ? (
          <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-12">
            <Reveal as="figure" className={`${card} relative overflow-hidden lg:col-span-7 lg:p-10`}>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 bg-[radial-gradient(closest-side,rgba(204,102,0,0.14),transparent)]"
              />
              <Quotes size={32} weight="fill" className="relative text-[#CC6600]" aria-hidden="true" />
              <blockquote className="relative mt-5 flex-1 text-pretty font-sans text-lg leading-relaxed text-white/90 lg:text-[1.35rem] lg:leading-[1.55] lg:tracking-[-0.01em]">
                {featured.quote}
              </blockquote>
              <Translation text={featured.translation} />
              <Attribution t={featured} />
            </Reveal>

            <div className="hidden flex-col gap-4 sm:flex lg:col-span-5">
              {side.map((t, i) => (
                <Reveal as="figure" key={t.quote} delay={(i + 1) * 80} className={`${card} flex-1`}>
                  <blockquote className="flex-1 text-pretty font-sans text-[15px] leading-relaxed text-white/80">{t.quote}</blockquote>
                  <Translation text={t.translation} />
                  <Attribution t={t} />
                </Reveal>
              ))}
            </div>
          </div>
        ) : null}

        {rest.length ? (
          <div data-h-pin className="sm:hidden">
            <div data-h-scroll className="no-scrollbar -mx-6 mt-4 flex snap-x snap-mandatory scroll-px-6 gap-3 overflow-x-auto overscroll-x-contain px-6">
              {rest.map((t) => (
                <figure key={t.quote} className={`${card} w-[85%] shrink-0 snap-start`}>
                  <blockquote className="flex-1 text-pretty font-sans text-[15px] leading-relaxed text-white/80">{t.quote}</blockquote>
                  <Translation text={t.translation} />
                  <Attribution t={t} />
                </figure>
              ))}
            </div>
            <p className="mt-3 font-mono text-[11px] text-white/45">Keep scrolling for {rest.length} more</p>
          </div>
        ) : null}

        {more.length ? (
          <div className="mt-4 hidden gap-4 sm:block sm:columns-2 lg:columns-3">
            {more.map((t, i) => (
              <Reveal as="figure" key={t.quote} delay={(i % 3) * 80} className={`${card} mb-4 break-inside-avoid`}>
                <blockquote className="text-pretty font-sans text-[15px] leading-relaxed text-white/80">{t.quote}</blockquote>
                <Translation text={t.translation} />
                <Attribution t={t} />
              </Reveal>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
