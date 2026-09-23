"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { Plus } from "@phosphor-icons/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const FAQ_DATA = [
  {
    question: "How fast will I receive my statistical analysis?",
    answer:
      "Standard thesis and survey packages take 3 to 7 business days. Complex structural equation modeling (SEM), medical dissertations, or multi-wave panel studies take 2 to 3 weeks. Rush 24-hour and 48-hour delivery upgrades are available if you are on a tight deadline.",
    category: "TIMELINE & TURNAROUND",
  },
  {
    question: "What if my thesis adviser or panel asks for revisions?",
    answer:
      "Revisions within your study's original scope are 100% free of charge. If your committee, adviser, or panel asks for alternate tables, clarifications, or extra diagnostic checks, our senior statisticians revise your deliverables promptly with zero additional fees.",
    category: "FREE REVISION GUARANTEE",
  },
  {
    question: "Is my survey data and student identity kept confidential?",
    answer:
      "Yes, completely. We scrub all respondent names, emails, and student ID numbers from your dataset before our analysts begin work. Every statistician operates under legally binding non-disclosure agreements (NDAs), and your research findings remain 100% your own intellectual property.",
    category: "PRIVACY & STRICT NDA",
  },
  {
    question: "What happens if my results are not statistically significant (p > .05)?",
    answer:
      "Non-significant results are a normal and valid part of empirical academic research. We never fake data or manipulate numbers. Instead, we provide rigorous theoretical explanations, effect sizes, and sample justifications so you can defend your findings with total academic integrity.",
    category: "ETHICAL INTEGRITY & P-VALUES",
  },
  {
    question: "I know very little about statistics. How will I defend my numbers?",
    answer:
      "You don't need to be a statistician to defend with confidence. Every consultation includes a plain-English speaking script that explains what each Chapter 4 table means in simple words, plus direct answers to the top 20 questions thesis panels ask.",
    category: "DEFENSELAB™ COACHING",
  },
  {
    question: "What exact files and reproducible scripts will I receive upon delivery?",
    answer:
      "You receive: (1) Publication-ready APA 7th Edition tables formatted for Microsoft Word, (2) A plain-English narrative writeup explaining your findings, (3) The cleaned dataset (.sav / .csv), and (4) The full reproducible syntax code in R, Python, or SPSS.",
    category: "DELIVERABLES & CODE OWNERSHIP",
  },
  {
    question: "Can I get a custom quote and Scope of Work before paying anything?",
    answer:
      "Yes. Submit your statement of the problem, methodology, and raw data to receive a transparent, fixed Scope of Work (SOW) within 24 hours. No upfront payment or commitment is required to receive your quotation.",
    category: "TRANSPARENT QUOTATIONS",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".faq-left-col",
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.75,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".faq-left-col",
            start: "top 85%",
            once: true,
          },
        }
      );

      gsap.fromTo(
        ".faq-row-item",
        { opacity: 0, y: 15 },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          stagger: 0.06,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".faq-rows-container",
            start: "top 85%",
            once: true,
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section
      id="faq"
      ref={sectionRef}
      className="relative bg-[#010114] py-16 sm:py-20 lg:py-28 text-white z-10"
    >
      <div className="w-full max-w-[90rem] mx-auto px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 xl:gap-24 items-start">
          
          {/* Left Column: Heading & Contact Subtext */}
          <div className="faq-left-col lg:col-span-5 lg:sticky lg:top-28">
            <div className="font-mono text-xs uppercase tracking-[0.15em] text-[#CC6600] mb-3 font-medium">
              FREQUENTLY ASKED QUESTIONS
            </div>
            <h2 className="font-sans text-2xl sm:text-3xl lg:text-[2.25rem] font-medium text-white tracking-[-0.03em] leading-tight mb-4">
              Common questions about our statistical consultation
            </h2>
            <p className="font-mono text-xs sm:text-sm text-white/50 leading-relaxed max-w-sm">
              Can&apos;t find what you need? Reach out to{" "}
              <a
                href="mailto:consult@jaxisstatlab.com"
                className="text-white/80 hover:text-[#CC6600] underline underline-offset-4 decoration-white/30 transition-colors"
              >
                consult@jaxisstatlab.com
              </a>{" "}
              — we&apos;re happy to answer anything.
            </p>

            <div className="mt-8">
              <Link
                href="/dashboard/client/quotations"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#CC6600] hover:bg-[#b35500] text-white font-sans text-xs sm:text-sm font-semibold rounded-[2px] active:scale-[0.97] transition-all shadow-sm"
              >
                <span>Get a quotation</span>
                <span className="w-1.5 h-1.5 rounded-full bg-white/90" />
              </Link>
            </div>
          </div>

          {/* Right Column: Clean Hairline Accordion List */}
          <div className="faq-rows-container lg:col-span-7 border-t border-white/[0.08]">
            {FAQ_DATA.map((faq, index) => {
              const isOpen = openIndex === index;

              return (
                <div
                  key={index}
                  className="faq-row-item border-b border-white/[0.08] transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => toggleAccordion(index)}
                    className="w-full py-5 sm:py-6 flex items-center justify-between gap-6 text-left group cursor-pointer focus:outline-none"
                    aria-expanded={isOpen}
                  >
                    <span
                      className={[
                        "font-sans text-sm sm:text-[15px] lg:text-base font-normal sm:font-medium transition-colors duration-150 leading-snug",
                        isOpen
                          ? "text-white"
                          : "text-white/85 group-hover:text-white",
                      ].join(" ")}
                    >
                      {faq.question}
                    </span>

                    <span
                      className={[
                        "shrink-0 transition-transform duration-200 text-white/40 group-hover:text-white/80",
                        isOpen ? "rotate-45 text-[#CC6600]" : "",
                      ].join(" ")}
                    >
                      <Plus size={16} weight="bold" />
                    </span>
                  </button>

                  {/* Pure CSS grid height transition */}
                  <div
                    className={[
                      "grid transition-[grid-template-rows] duration-300 ease-out",
                      isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                    ].join(" ")}
                  >
                    <div className="overflow-hidden">
                      <div className="pb-6 pt-1 pr-6 sm:pr-8">
                        <p className="font-sans text-xs sm:text-sm text-white/60 leading-relaxed m-0">
                          {faq.answer}
                        </p>
                        <span className="inline-block mt-3 font-mono text-[10px] text-[#CC6600] uppercase tracking-wider font-semibold">
                          {faq.category}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </section>
  );
}
