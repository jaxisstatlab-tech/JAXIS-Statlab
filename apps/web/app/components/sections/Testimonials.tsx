import Link from "next/link";
import { ArrowRight, Quotes } from "@phosphor-icons/react/ssr";
import { HOME_LIMIT, getTestimonials } from "@/lib/testimonials";
import Reveal from "../ui/Reveal";
import SwipeDots from "../ui/SwipeDots";
import { container, heading, kicker, linkArrow, subtitle } from "../ui/styles";
import { Attribution, RatingLine, Translation, card, quoteText } from "./TestimonialParts";

// Home page testimonials: at most HOME_LIMIT (the featured message, then the newest), with a link to all of them on
// /testimonials so the home page doesn't grow as more clients share feedback.

export default async function Testimonials() {
  const { items: all, rating } = await getTestimonials();
  if (all.length === 0) return null;

  const [featured, ...rest] = all.slice(0, HOME_LIMIT);
  const side = rest.slice(0, 2);
  const more = rest.slice(2);

  return (
    <section id="testimonials" className="relative scroll-mt-16 py-16 lg:py-24">
      <div className={container}>
        <Reveal>
          <div>
            <div className={kicker}>From students</div>
            <h2 className={heading}>In their own words</h2>
            <p className={subtitle}>Messages from thesis groups we&apos;ve worked with, kept as they sent them.</p>
            <RatingLine rating={rating} className="mt-4" />
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
                  <blockquote className={`flex-1 ${quoteText}`}>{t.quote}</blockquote>
                  <Translation text={t.translation} />
                  <Attribution t={t} />
                </Reveal>
              ))}
            </div>
          </div>
        ) : null}

        {rest.length ? (
          <div className="sm:hidden">
            <div id="stories-row" data-h-scroll className="no-scrollbar -mx-6 mt-4 flex snap-x snap-mandatory scroll-px-6 gap-3 overflow-x-auto overscroll-x-contain px-6">
              {rest.map((t) => (
                <figure key={t.quote} className={`${card} w-[85%] shrink-0 snap-start`}>
                  <blockquote className={`flex-1 ${quoteText}`}>{t.quote}</blockquote>
                  <Translation text={t.translation} />
                  <Attribution t={t} />
                </figure>
              ))}
            </div>
            <SwipeDots target="stories-row" />
          </div>
        ) : null}

        {more.length ? (
          <div className="mt-4 hidden gap-4 sm:block sm:columns-2 lg:columns-3">
            {more.map((t, i) => (
              <Reveal as="figure" key={t.quote} delay={(i % 3) * 80} className={`${card} mb-4 break-inside-avoid`}>
                <blockquote className={quoteText}>{t.quote}</blockquote>
                <Translation text={t.translation} />
                <Attribution t={t} />
              </Reveal>
            ))}
          </div>
        ) : null}

        <div className="mt-6 sm:mt-4">
          <Link href="/testimonials" className={`${linkArrow} group`} data-cta="home-all-testimonials">
            Read all {all.length} testimonials
            <ArrowRight size={14} weight="bold" className="transition-transform duration-150 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
