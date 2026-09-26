import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/config";
import type { LegalDoc } from "../../content/legal";
import Reveal from "../ui/Reveal";
import { container, kicker, pageTitle } from "../ui/styles";

function Text({ children }: { children: string }) {
  const parts = children.split("{email}");
  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 ? (
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-white underline decoration-white/25 underline-offset-4 transition-colors hover:text-[#FFA040]"
            >
              {CONTACT_EMAIL}
            </a>
          ) : null}
        </span>
      ))}
    </>
  );
}

export default function LegalPage({ doc, other }: { doc: LegalDoc; other: { href: string; label: string } }) {
  return (
    <section className="relative pb-24 pt-32 lg:pt-40">
      <div className={container}>
        <Reveal className="max-w-3xl">
          <div className={kicker}>Legal</div>
          <h1 className={pageTitle}>{doc.title}</h1>
          <p className="mt-4 font-mono text-xs text-white/55">Last updated {doc.updated}</p>
          <p className="mt-6 font-sans text-base leading-relaxed text-white/70">{doc.intro}</p>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-12 border-t border-white/10 pt-12 lg:grid-cols-12">
          <nav aria-label="On this page" className="hidden lg:col-span-3 lg:block">
            <div className="sticky top-28">
              <div className="font-mono text-[11px] uppercase tracking-wider text-white/55">On this page</div>
              <ol className="mt-4 flex flex-col gap-2.5">
                {doc.sections.map((s, i) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className="flex gap-3 font-sans text-[13px] text-white/60 transition-colors hover:text-white"
                    >
                      <span className="font-mono text-[11px] text-white/35">{String(i + 1).padStart(2, "0")}</span>
                      {s.title}
                    </a>
                  </li>
                ))}
              </ol>
              <Link
                href={other.href}
                className="mt-8 inline-flex font-mono text-xs text-white/55 underline decoration-white/20 underline-offset-4 transition-colors hover:text-white"
              >
                {other.label}
              </Link>
            </div>
          </nav>

          <article className="flex max-w-[44rem] flex-col gap-12 lg:col-span-8 lg:col-start-5">
            {doc.sections.map((s, i) => (
              <section key={s.id} id={s.id} className="scroll-mt-28">
                <h2 className="flex items-baseline gap-3 font-sans text-lg font-semibold tracking-[-0.01em] text-white">
                  <span className="font-mono text-xs font-normal text-white/40">{String(i + 1).padStart(2, "0")}</span>
                  {s.title}
                </h2>
                <div className="mt-4 flex flex-col gap-4 font-sans text-[15px] leading-relaxed text-white/70">
                  {s.blocks.map((b, j) =>
                    typeof b === "string" ? (
                      <p key={j}>
                        <Text>{b}</Text>
                      </p>
                    ) : (
                      <ul key={j} className="flex flex-col gap-2.5">
                        {b.list.map((item) => (
                          <li key={item} className="flex gap-3">
                            <span aria-hidden="true" className="mt-[0.6em] h-1 w-1 shrink-0 bg-[#CC6600]" />
                            <span>
                              <Text>{item}</Text>
                            </span>
                          </li>
                        ))}
                      </ul>
                    ),
                  )}
                </div>
              </section>
            ))}

            <Link
              href={other.href}
              className="font-mono text-xs text-white/55 underline decoration-white/20 underline-offset-4 transition-colors hover:text-white lg:hidden"
            >
              {other.label}
            </Link>
          </article>
        </div>
      </div>
    </section>
  );
}
