import { SEND_STUDY_URL } from "@/lib/config";
import BentoCard from "../ui/BentoCard";
import Reveal from "../ui/Reveal";
import { ChatArt, LedgerArt } from "../ui/ServiceArt";
import SpotlightGrid from "../ui/SpotlightGrid";
import TrackerFeed from "../ui/TrackerFeed";
import { btnPrimary, container, heading, kicker, subtitle } from "../ui/styles";

// What the client account looks like, drawn in the same joined grid as Services.
export default function PipelineBand() {
  return (
    <section id="account" className="relative scroll-mt-16 py-16 lg:py-24">
      <div className={container}>
        <Reveal className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className={kicker}>Your account</div>
            <h2 className={heading}>
              Always know where your study is
            </h2>
            <p className={subtitle}>Every message, check, payment, and file shows up the moment it happens.</p>
          </div>
          <a href={SEND_STUDY_URL} data-cta="band-signup" className={`${btnPrimary} shrink-0`}>
            Send your study
          </a>
        </Reveal>

        <SpotlightGrid className="mt-10">
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-[1px] lg:grid-cols-12">
            <BentoCard
              index="01"
              title="Study tracker"
              desc="Five stages, from proposal to delivery. Each update lands the moment it happens."
              align="end"
              className="lg:col-span-7 lg:row-span-2"
            >
              <div className="mt-6 w-full">
                <TrackerFeed />
              </div>
            </BentoCard>

            <BentoCard
              index="02"
              title="Chat inside your study"
              desc="Ask your analyst about your results, right next to your files."
              className="lg:col-span-5"
            >
              <div className="mt-6 w-full">
                <ChatArt />
              </div>
            </BentoCard>

            <BentoCard
              index="03"
              title="Price and payments"
              desc="Your written price and every payment, on record."
              className="lg:col-span-5"
            >
              <div className="mt-6 w-full">
                <LedgerArt />
              </div>
            </BentoCard>
          </div>
        </SpotlightGrid>
      </div>
    </section>
  );
}
