import { IsoScene, STEP_DELIVER, STEP_PAY, STEP_PRICE, STEP_RECHECK, STEP_SEND, type IsoShape } from "../ui/Iso";
import Reveal from "../ui/Reveal";
import { cardDesc, container, heading, kicker } from "../ui/styles";

const STEPS: { id: string; tag: string; time: string; title: string; body: string; shapes: IsoShape[] }[] = [
  {
    id: "send",
    tag: "Submit",
    time: "5 minutes",
    title: "Send your study",
    body: "Upload your research questions, survey, and data through your free account.",
    shapes: STEP_SEND,
  },
  {
    id: "scope",
    tag: "Price",
    time: "< 24 hours",
    title: "Get a fixed price",
    body: "The exact tests, files, and price in writing. No payment needed to ask.",
    shapes: STEP_PRICE,
  },
  {
    id: "deposit",
    tag: "Deposit",
    time: "Same day",
    title: "Pay by GCash or bank",
    body: "Work starts as soon as your deposit clears. Larger plans pay the rest on delivery.",
    shapes: STEP_PAY,
  },
  {
    id: "analysis",
    tag: "Analysis",
    time: "3 to 7 days",
    title: "We run and recheck it",
    body: "One statistician runs your tests, a second reruns them, and a senior reviewer signs off.",
    shapes: STEP_RECHECK,
  },
  {
    id: "delivery",
    tag: "Delivery",
    time: "Instant",
    title: "Download and defend",
    body: "APA tables, a plain-English write-up, cleaned data, code, and your defense script.",
    shapes: STEP_DELIVER,
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative scroll-mt-16 py-16 lg:py-24">
      <div className={container}>
        <div data-pin-steps>
          <Reveal className="text-center">
            <div className={kicker}>How it works</div>
            <h2 data-split className={heading}>
              From request to defense-ready
            </h2>
          </Reveal>

          <ol className="relative mx-auto mt-14 flex max-w-2xl flex-col lg:mt-10">
            <span aria-hidden="true" className="step-rail absolute bottom-10 left-16 top-10 hidden w-px bg-white/10 sm:block">
              <span data-step-bar className="block h-full w-full origin-top scale-y-0 bg-[#CC6600]" />
            </span>
            {STEPS.map((s, i) => (
              <Reveal as="li" key={s.id} delay={i * 60} className="group relative">
                {i < STEPS.length - 1 ? (
                  <span className="absolute bottom-0 left-[3.25rem] top-[70%] w-px bg-linear-to-b from-white/10 to-transparent sm:left-16" />
                ) : null}
                <div
                  data-step
                  className="grid grid-cols-[6.5rem_1fr] items-center gap-6 py-7 sm:grid-cols-[8rem_1fr] sm:gap-8 lg:py-4"
                >
                  <div className="step-art flex h-24 items-center justify-center sm:h-28 lg:h-20">
                    <IsoScene
                      id={`how-${s.id}`}
                      shapes={s.shapes}
                      pad={14}
                      label={`${s.title} illustration`}
                      className="h-full w-auto transition-transform duration-500 ease-out group-hover:-translate-y-1"
                    />
                  </div>
                  <div>
                    <div className="font-mono text-[11px] uppercase tracking-[0.14em]">
                      <span className="text-[#FFA040]">{s.tag}</span>
                      <span className="text-white/50"> · {s.time}</span>
                    </div>
                    <h3 className="mt-2 font-sans text-base font-medium text-white sm:text-lg">{s.title}</h3>
                    <p className={`${cardDesc} mt-1.5`}>{s.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
