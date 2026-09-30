import { HOW_STEPS } from "../../content/site";
import HowItWorksFlow from "../ui/HowItWorksFlow";
import Reveal from "../ui/Reveal";
import { container, heading, kicker, subtitle } from "../ui/styles";

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative scroll-mt-16 py-16 lg:py-24">
      <div className={container}>
        <Reveal>
          <div className={kicker}>How it works</div>
          <h2 className={heading}>
            From request to defense-ready
          </h2>
          <p className={subtitle}>Five clear steps. You always know what happens next.</p>
        </Reveal>
        <HowItWorksFlow steps={HOW_STEPS} />
      </div>
    </section>
  );
}
