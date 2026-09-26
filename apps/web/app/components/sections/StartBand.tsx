import { ArrowRight } from "@phosphor-icons/react/ssr";
import { LOGIN_URL } from "@/lib/config";
import Reveal from "../ui/Reveal";
import { btnInk, container } from "../ui/styles";

// Short orange call-to-action band for pages where a visitor may not need to write to us at all.
export default function StartBand() {
  return (
    <section className="bg-[#CC6600] py-12 lg:py-14">
      <Reveal className={`${container} flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between`}>
        <div>
          <h2 className="font-sans text-2xl font-medium tracking-[-0.03em] text-white sm:text-[1.75rem]">Prefer to just start?</h2>
          <p className="mt-2 font-mono text-xs text-white/85">
            Send your study through a free account. Fixed written price within 24 hours, no payment needed to ask.
          </p>
        </div>
        <a href={LOGIN_URL} data-cta="band-contact-send" className={`${btnInk} shrink-0`}>
          Send your study
          <ArrowRight size={15} weight="bold" />
        </a>
      </Reveal>
    </section>
  );
}
