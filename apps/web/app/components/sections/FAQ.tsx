"use client";

import React, { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { CaretDown } from "@phosphor-icons/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const FAQ_DATA = [
  {
    index: "01",
    question: "How fast will I receive my analysis?",
    answer:
      "Standard thesis and survey packages (DataCheck, Start, Core) take 3 to 7 business days. Complex structural equation modeling (SEM) or medical dissertations take 2 to 3 weeks. If you are on a tight deadline, our 24-Hour and 48-Hour Rush delivery upgrades guarantee you submit on time.",
    category: "TIMELINE & TURNAROUND",
  },
  {
    index: "02",
    question: "What if my thesis adviser or panel asks for revisions?",
    answer:
      "Revisions are 100% free. If your panel, adviser, or committee asks for changes, clarifications, or alternate tables within your study's original scope, our senior statisticians will revise your deliverables promptly at zero additional cost.",
    category: "FREE REVISION GUARANTEE",
  },
  {
    index: "03",
    question: "Is my survey data and student identity kept confidential?",
    answer:
      "Yes, completely. We scrub all respondent names, emails, and student ID numbers from your files before our analysts ever see them. Every statistician operates under legally binding NDAs, and your research findings remain 100% your own intellectual property.",
    category: "PRIVACY & NDAS",
  },
  {
    index: "04",
    question: "What happens if my results are not statistically significant (p > .05)?",
    answer:
      "Non-significant results are a normal part of real academic research! We never fake data or manipulate numbers. Instead, we provide rigorous theoretical explanations and sample justifications so you can defend your findings to your panel with complete academic credibility.",
    category: "ETHICAL INTEGRITY & P-VALUES",
  },
  {
    index: "05",
    question: "I know nothing about statistics. How will I defend my numbers?",
    answer:
      "That is exactly why students choose JAXIS! You don't just get raw numbers — you receive a plain-English speaking script that explains what each table means in simple words, plus the exact answers to the top 20 questions your panel is likely to ask. You can also book our 1-on-1 mock defense session to practice.",
    category: "DEFENSE READINESS",
  },
  {
    index: "06",
    question: "What exact files will I receive upon delivery?",
    answer:
      "You receive: (1) Publication-ready APA 7th Edition tables ready to paste into Chapter 4, (2) A plain-English narrative report explaining your findings, (3) The cleaned dataset file (.sav / .csv), and (4) The full statistical software code (R, Python, or SPSS) so your study is 100% reproducible.",
    category: "DELIVERABLES & CODE",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".faq-header-box",
        { opacity: 0, y: 25 },
        {
          opacity: 1,
          y: 0,
          duration: 0.75,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".faq-header-box",
            start: "top 85%",
          },
        }
      );

      gsap.fromTo(
        ".faq-item-box",
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.55,
          stagger: 0.08,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".faq-list-container",
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
      className="relative bg-[#010114] py-24 sm:py-32 px-6 text-white z-10"
    >
      <div className="max-w-[1280px] w-full mx-auto relative z-10">
        
        {/* Header Block */}
        <div className="faq-header-box border-b border-white/10 pb-10 mb-12 grid grid-cols-1 lg:grid-cols-2 gap-6 items-end">
          <div>
            <div className="text-[10px] font-mono text-white/40 tracking-[0.18em] uppercase mb-3">
              JAXIS STATLAB · FREQUENTLY ASKED QUESTIONS & POLICIES
            </div>
            <div className="text-xs font-mono text-[#CC6600] tracking-wider uppercase font-semibold flex items-center gap-2 mb-3">
              <span className="inline-block w-1.5 h-1.5 bg-[#CC6600]" />
              SECTION 06 · FREQUENTLY ASKED QUESTIONS
            </div>
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-sans font-light tracking-tight text-white leading-tight">
              Clear Answers.
              <br />
              <span className="text-[#38bdf8] font-normal">
                Zero Ambiguity.
              </span>
            </h2>
          </div>

          <div>
            <p className="text-sm sm:text-base font-sans text-white/70 leading-relaxed max-w-lg">
              Everything you need to know about our statistical protocols, turnaround times, academic revisions, and code deliverables.
            </p>
          </div>
        </div>

        {/* FAQ Accordion Container */}
        <div className="faq-list-container flex flex-col gap-4">
          {FAQ_DATA.map((faq, index) => {
            const isOpen = openIndex === index;

            return (
              <div
                key={index}
                className={[
                  "faq-item-box rounded-[2px] relative transition-all duration-200 border",
                  isOpen
                    ? "border-white/25 bg-[#011B38]"
                    : "border-white/10 bg-[#01142B] hover:border-white/20",
                ].join(" ")}
              >
                {/* Active Indicator Line */}
                {isOpen && (
                  <div className="absolute top-0 left-0 bottom-0 w-[3px] bg-[#CC6600]" />
                )}

                <button
                  type="button"
                  onClick={() => toggleAccordion(index)}
                  className="w-full flex justify-between items-center p-6 sm:p-7 text-left gap-6 cursor-pointer focus:outline-none"
                  aria-expanded={isOpen}
                >
                  <div className="flex items-baseline gap-4 min-w-0">
                    <span
                      className={[
                        "font-mono text-xs font-bold tracking-wider shrink-0",
                        isOpen ? "text-[#CC6600]" : "text-white/40",
                      ].join(" ")}
                    >
                      [{faq.index}]
                    </span>
                    <span
                      className={[
                        "font-sans text-base sm:text-lg font-medium tracking-tight transition-colors",
                        isOpen ? "text-white" : "text-white/90",
                      ].join(" ")}
                    >
                      {faq.question}
                    </span>
                  </div>

                  <CaretDown
                    size={18}
                    weight="fill"
                    className={[
                      "shrink-0 transition-transform duration-300",
                      isOpen ? "rotate-180 text-[#CC6600]" : "text-white/40",
                    ].join(" ")}
                  />
                </button>

                {/* Pure CSS grid height transition */}
                <div
                  className={[
                    "grid transition-[grid-template-rows] duration-350 ease-out",
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                  ].join(" ")}
                >
                  <div className="overflow-hidden">
                    <div className="px-6 pb-6 pt-0 sm:px-7 sm:pb-7 sm:pt-0 border-t border-white/10 mt-1">
                      <span className="font-mono text-[10px] text-[#38bdf8] tracking-wider uppercase block my-3 font-semibold">
                        {faq.category}
                      </span>
                      <p className="font-sans text-sm text-white/75 leading-relaxed m-0">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
