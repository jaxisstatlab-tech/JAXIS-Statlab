import HowItWorksFlow, { type Step } from "../ui/HowItWorksFlow";
import Reveal from "../ui/Reveal";
import { container, heading, kicker, subtitle } from "../ui/styles";

const STEPS: Step[] = [
  {
    tag: "Submit",
    time: "5 minutes",
    title: "Send your study",
    body: "Upload your research questions, survey, and data through your free account.",
    chips: ["Research questions", "Survey", "Data"],
  },
  {
    tag: "Price",
    time: "Under 24 hours",
    title: "Get a fixed price",
    body: "The exact tests, files, and price in writing. No payment needed to ask.",
    chips: ["Tests", "Files", "Price in writing"],
  },
  {
    tag: "Deposit",
    time: "Same day",
    title: "Pay by GCash or bank",
    body: "Work starts as soon as your deposit clears. Larger plans pay the rest on delivery.",
    chips: ["GCash", "Bank transfer"],
  },
  {
    tag: "Analysis",
    time: "3 to 7 days",
    title: "We run and recheck it",
    body: "One statistical analyst runs your tests, a second reruns them, and a senior reviewer signs off.",
    chips: ["First run", "Rerun", "Senior review"],
  },
  {
    tag: "Delivery",
    time: "Instant",
    title: "Download and defend",
    body: "APA tables, a plain-English write-up, cleaned data, and your defense prep guide.",
    chips: ["APA tables", "Write-up", "Cleaned data", "Defense guide"],
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative scroll-mt-16 py-16 lg:py-24">
      <div className={container}>
        <Reveal>
          <div className={kicker}>How it works</div>
          <h2 data-split className={heading}>
            From request to defense-ready
          </h2>
          <p className={subtitle}>Five clear steps. You always know what happens next.</p>
        </Reveal>
        <HowItWorksFlow steps={STEPS} />
      </div>
    </section>
  );
}
