import { TESTIMONIALS } from "../../content/site";
import Reveal from "../ui/Reveal";
import { container, heading, kicker } from "../ui/styles";

export default function Testimonials() {
  if (TESTIMONIALS.length === 0) return null;

  return (
    <section className="relative py-16 lg:py-24">
      <div className={container}>
        <Reveal>
          <div className={kicker}>From students</div>
          <h2 className={heading}>What students say after their defense</h2>
        </Reveal>
        <div className="mt-14 grid grid-cols-1 gap-px overflow-hidden rounded-[2px] border border-white/10 bg-white/10 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <Reveal as="figure" key={t.name} delay={i * 80} className="flex flex-col bg-[#010114] p-6 sm:p-8">
              <blockquote className="flex-1 font-sans text-[15px] leading-relaxed text-white/85">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-6 border-t border-white/[0.08] pt-4">
                <div className="font-sans text-sm font-medium text-white">{t.name}</div>
                <div className="font-mono text-[11px] text-white/55">
                  {t.program} · {t.school}
                </div>
              </figcaption>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
