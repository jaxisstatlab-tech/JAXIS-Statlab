import { ArrowRight, ArrowUpRight } from "@phosphor-icons/react/ssr";
import { LOGIN_URL, REGISTER_URL } from "@/lib/config";
import CtaField from "../ui/CtaField";
import HorizonTracker from "../ui/HorizonTracker";
import Reveal from "../ui/Reveal";
import { btnPrimary, container, linkArrow } from "../ui/styles";

const PROMISES = ["Free account", "Written price in 24 hours", "Pay by GCash or bank"];

export default function FinalCTA() {
  return (
    <section id="final-cta" className="relative overflow-hidden pb-48 pt-24 lg:pb-56 lg:pt-32">
      <CtaField />
      <HorizonTracker />
      <div className={`${container} relative text-center`}>
        <Reveal>
          <div className="mb-3 font-mono text-xs font-medium uppercase tracking-[0.15em] text-white/55">Get started</div>
          <h2 data-split className="mx-auto font-sans text-3xl font-medium tracking-[-0.035em] text-white sm:text-4xl lg:text-[2.75rem]">
            Ready to send your study?
          </h2>
          <p className="mx-auto mt-4 max-w-xl font-sans text-base leading-relaxed text-white/65">
            Get a fixed written price within 24 hours. It&apos;s free to ask.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
            <a href={LOGIN_URL} data-cta="final-send" className={`${btnPrimary} h-11 px-6`}>
              Send your study
              <ArrowRight size={15} weight="bold" />
            </a>
            <a href={REGISTER_URL} data-cta="final-register" className={linkArrow}>
              Create an account
              <ArrowUpRight size={14} weight="bold" />
            </a>
          </div>
          <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 font-mono text-[11px] text-white/55">
            {PROMISES.map((p, i) => (
              <li key={p} className="flex items-center gap-5">
                {i > 0 ? <span aria-hidden="true" className="h-1 w-1 rounded-full bg-white/25" /> : null}
                {p}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
