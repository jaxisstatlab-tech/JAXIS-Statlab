import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { getTestimonials } from "@/lib/testimonials";
import SiteShell from "../components/layout/SiteShell";
import FinalCTA from "../components/sections/FinalCTA";
import { Attribution, RatingLine, Translation, card, quoteText } from "../components/sections/TestimonialParts";
import Reveal from "../components/ui/Reveal";
import { container, kicker, pageTitle } from "../components/ui/styles";

// Every testimonial: the hand-picked messages plus the feedback clients chose to share from the app (approved by our
// team first). The home page shows only the first few and links here.

export const revalidate = 3600;

export const metadata: Metadata = pageMetadata({
  title: "Testimonials from Thesis Groups and Researchers",
  description:
    "Messages from thesis groups and researchers we've worked with, kept as they sent them, including groups from Central Mindanao University. Statistical analysis checked by two analysts.",
  path: "/testimonials",
});

export default async function TestimonialsPage() {
  const { items, rating } = await getTestimonials();

  return (
    <SiteShell>
      <section className="relative overflow-hidden pb-10 pt-28 lg:pb-14 lg:pt-36">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(40%_70%_at_15%_0%,rgba(204,102,0,0.22),transparent_72%)]"
        />
        <div className={`${container} relative`}>
          <p className={kicker}>From students</p>
          <h1 className={`${pageTitle} max-w-4xl`}>What thesis groups say about us</h1>
          <p className="mt-5 max-w-3xl font-sans text-base leading-relaxed text-white/70 sm:text-lg">
            Messages from groups we&apos;ve worked with, kept as they sent them. Clients can also share how it went from their account once their
            study is finished; we show only what they allowed, named the way they chose.
          </p>
          <RatingLine rating={rating} className="mt-6" />
        </div>
      </section>

      <section className="pb-20 lg:pb-28">
        <div className={container}>
          {items.length ? (
            <div className="gap-4 sm:columns-2 lg:columns-3">
              {items.map((t, i) => (
                <Reveal as="figure" key={t.quote} delay={(i % 3) * 80} className={`${card} mb-4 break-inside-avoid`}>
                  <blockquote className={quoteText}>{t.quote}</blockquote>
                  <Translation text={t.translation} />
                  <Attribution t={t} />
                </Reveal>
              ))}
            </div>
          ) : (
            <p className="font-mono text-sm text-white/60">Testimonials will appear here soon.</p>
          )}
        </div>
      </section>

      <FinalCTA />
    </SiteShell>
  );
}
