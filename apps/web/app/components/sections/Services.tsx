import Link from "next/link";
import BentoCard from "../ui/BentoCard";
import Reveal from "../ui/Reveal";
import SpotlightGrid from "../ui/SpotlightGrid";
import SwipeDots from "../ui/SwipeDots";
import { CheckArt, CleaningArt, DefenseArt, FindingsArt, ModelsArt, ProfilesArt, TestingArt } from "../ui/ServiceArt";
import { btnGhost, container, heading, kicker, subtitle } from "../ui/styles";

export default function Services() {
  return (
    <section id="services" className="relative z-10 scroll-mt-16 bg-[#010114] py-16 lg:py-24">
      <div data-sheet-feather aria-hidden="true" className="sheet-feather" />
      <div className={container}>
        <Reveal className="reveal-quiet flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="stagger">
            <div className={kicker}>Services</div>
            <h2 className={heading}>Every test your study needs</h2>
            <p className={subtitle}>From a quick data check to full structural models. Checked twice, explained simply.</p>
          </div>
          {/* The navbar (and the phone bar) already carry the orange "Send your study"; one orange action per view. */}
          <div className="stagger shrink-0">
            <Link href="/pricing" data-cta="services-pricing" className={btnGhost} style={{ transitionDelay: "270ms" }}>
              See Prices
            </Link>
          </div>
        </Reveal>

        <Reveal className="reveal-quiet">
        <SpotlightGrid className="mt-10">
            <div id="services-row" data-h-scroll role="region" aria-label="Services" className="stagger no-scrollbar flex snap-x snap-mandatory gap-px overflow-x-auto overscroll-x-contain rounded-[1px] sm:grid sm:grid-cols-2 sm:overflow-hidden lg:grid-cols-4">
            <BentoCard
              slide
              index="01"
              title="Data cleaning"
              desc="We flag answers that don't fit, check your data's shape, and confirm your survey is reliable before any test runs."
            >
              <CleaningArt />
            </BentoCard>

            <BentoCard
              slide
              index="02"
              title="Hypothesis testing"
              desc="The right test for your question, with effect sizes, not just p‑values."
              className="sm:order-first sm:col-span-2 lg:order-none"
              >
              <TestingArt />
            </BentoCard>

            <BentoCard
              slide
              index="03"
              title="APA tables and findings"
              desc="APA 7th edition, ready for Word, each with a plain-English note."
            >
              <FindingsArt />
            </BentoCard>

            <BentoCard
              slide
              index="04"
              title="Respondent profiles"
              desc="Who answered your survey, as frequency tables, charts, and cross-tabs."
            >
              <ProfilesArt />
            </BentoCard>

            <BentoCard
              slide
              index="05"
              title="Advanced models"
              desc="SEM and path models for dissertations, showing what affects what. Checked by a senior methodologist."
            >
              <ModelsArt />
            </BentoCard>

            <BentoCard
              slide
              index="06"
              title="Checked by two analysts"
              desc="One analyst runs your tests. A second runs them again on their own and checks the numbers match before you see anything."
            >
              <CheckArt />
            </BentoCard>

            <BentoCard
              slide
              index="07"
              title="Defense prep"
              desc="A plain-English guide to the questions panels ask most, plus optional live practice."
            >
              <DefenseArt />
            </BentoCard>
          </div>
        </SpotlightGrid>
        </Reveal>
        <SwipeDots target="services-row" />
        <p className="mt-2 font-mono text-[11px] text-white/55 sm:mt-4 sm:text-right">Numbers shown are examples.</p>
      </div>
    </section>
  );
}
