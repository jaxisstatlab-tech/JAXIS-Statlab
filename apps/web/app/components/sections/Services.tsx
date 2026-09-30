import { SEND_STUDY_URL } from "@/lib/config";
import BentoCard from "../ui/BentoCard";
import Reveal from "../ui/Reveal";
import SpotlightGrid from "../ui/SpotlightGrid";
import { CheckArt, CleaningArt, DefenseArt, FindingsArt, ModelsArt, ProfilesArt, TestingArt } from "../ui/ServiceArt";
import { btnPrimary, container, heading, kicker, subtitle } from "../ui/styles";

export default function Services() {
  return (
    <section id="services" className="relative scroll-mt-16 py-16 lg:py-24">
      <div className={container}>
        <Reveal className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className={kicker}>Services</div>
            <h2 data-split className={heading}>Every test your study needs</h2>
            <p className={subtitle}>From a quick data check to full structural models. Checked twice, explained simply.</p>
          </div>
          <a href={SEND_STUDY_URL} data-cta="services-send" className={`${btnPrimary} shrink-0`}>
            Send your study
          </a>
        </Reveal>

        <SpotlightGrid className="mt-10">
            <div className="grid grid-cols-1 gap-px overflow-hidden rounded-[1px] sm:grid-cols-2 lg:grid-cols-4">
            <BentoCard
              index="01"
              title="Data cleaning"
              desc="We flag answers that don't fit, check your data's shape, and confirm your survey is reliable before any test runs."
              delay={90}
            >
              <CleaningArt />
            </BentoCard>

            <BentoCard
              index="02"
              title="Hypothesis testing"
              desc="The right test for your question, with effect sizes, not just p‑values."
              className="sm:order-first sm:col-span-2 lg:order-none"
              >
              <TestingArt />
            </BentoCard>

            <BentoCard
              index="03"
              title="APA tables and findings"
              desc="APA 7th edition, ready for Word, each with a plain-English note."
              delay={180}
            >
              <FindingsArt />
            </BentoCard>

            <BentoCard
              index="04"
              title="Respondent profiles"
              desc="Who answered your survey, as frequency tables, charts, and cross-tabs."
              delay={90}
            >
              <ProfilesArt />
            </BentoCard>

            <BentoCard
              index="05"
              title="Advanced models"
              desc="SEM and path models for dissertations, showing what affects what. Checked by a senior methodologist."
              delay={180}
            >
              <ModelsArt />
            </BentoCard>

            <BentoCard
              index="06"
              title="Checked by two analysts"
              desc="A second analyst reruns everything from scratch. When the numbers match, you get a signed audit certificate."
              delay={270}
            >
              <CheckArt />
            </BentoCard>

            <BentoCard
              index="07"
              title="Defense prep"
              desc="A plain-English guide to the questions panels ask most, plus optional live practice."
              delay={360}
            >
              <DefenseArt />
            </BentoCard>
          </div>
        </SpotlightGrid>
        <p className="mt-4 text-right font-mono text-[11px] text-white/40">Numbers shown are examples.</p>
      </div>
    </section>
  );
}
