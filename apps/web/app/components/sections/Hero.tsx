"use client";

import React, { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { CheckCircle } from "@phosphor-icons/react";
import { globeScrollState } from "@/lib/globeState";
import { REGISTER_URL } from "@/lib/config";

const KPI_STATS = [
  { value: "99.8%", label: "Accuracy rate" },
  { value: "2", label: "Statisticians per study" },
  { value: "24h", label: "Quote turnaround" },
  { value: "500+", label: "Studies completed" },
];

const ParticleGlobe = dynamic(() => import("../ui/ParticleGlobe"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-[#010114]" />,
});

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

// Timing constants
const HEADLINE_BASE_DELAY   = 600;   // ms — headline starts while globe is mid-fade
const HEADLINE_LINE_STAGGER = 280;   // ms between headline lines
const SNIPPET_BASE_DELAY    = 1200;  // ms — snippets start after headline settles
const SNIPPET_BLOCK_STAGGER = 250;   // ms between each snippet block
const SNIPPET_LINE_STAGGER  = 180;   // ms between lines within a block
const TYPEWRITER_DURATION   = 800;   // ms

// Plain-English telemetry annotations (HUD callouts)
const CODE_SNIPPETS = [
  {
    id: "snippet-top-left",
    code: "01",
    tag: "DATA_AUDIT",
    line1: "Raw survey data checked",
    line2: "No missing entries",
    position: { top: "20%", left: "5%", right: "auto", bottom: "auto" } as React.CSSProperties,
    align: "left" as const,
    blockDelay: 0,
  },
  {
    id: "snippet-top-right",
    code: "02",
    tag: "TEST_SELECTION",
    line1: "Correct tests selected",
    line2: "Matched to research questions",
    position: { top: "20%", right: "5%", left: "auto", bottom: "auto" } as React.CSSProperties,
    align: "right" as const,
    blockDelay: 1,
  },
  {
    id: "snippet-bottom-left",
    code: "03",
    tag: "APA_TABLES",
    line1: "APA 7th Edition tables",
    line2: "Ready to paste into Chapter 4",
    position: { bottom: "20%", left: "5%", top: "auto", right: "auto" } as React.CSSProperties,
    align: "left" as const,
    blockDelay: 2,
  },
  {
    id: "snippet-bottom-right",
    code: "04",
    tag: "QA_VERIFIED",
    line1: "Double-checked by 2 experts",
    line2: "Ready for Thesis Defense",
    position: { bottom: "20%", right: "5%", top: "auto", left: "auto" } as React.CSSProperties,
    align: "right" as const,
    blockDelay: 3,
  },
];

// Headline broken into animatable lines
const HEADLINE_LINES = [
  { text: "Defend Your Thesis.", delay: 0 },
  { text: "With Confidence.", delay: 1, accent: true },
];

const INTRO_TEXT = "JAXIS helps students and researchers pass their thesis defense. We clean your survey data, calculate your statistical tests, format your APA tables, and double-check every number with two independent statisticians — so you walk into your panel defense with zero fear.";
const INTRO_WORDS = INTRO_TEXT.split(" ");

export default function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLElement>(null);

  // Reset scroll on mount
  useEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
  }, []);

  // Subtle parallax on mouse move — pointer-capable devices only
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const headline = wrapper.querySelector<HTMLElement>("#hero-headline");
    if (!headline) return;

    const onMouseEnter = () => { headline.style.willChange = "transform"; };
    const onMouseLeave = () => {
      headline.style.willChange = "auto";
      headline.style.transform = "";
    };
    const onMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX / window.innerWidth  - 0.5) * 12;
      const dy = (e.clientY / window.innerHeight - 0.5) * 8;
      headline.style.transform = `translate(${dx}px, ${dy}px)`;
    };

    wrapper.addEventListener("mouseenter", onMouseEnter, { passive: true });
    wrapper.addEventListener("mouseleave", onMouseLeave, { passive: true });
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    return () => {
      wrapper.removeEventListener("mouseenter", onMouseEnter);
      wrapper.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  useGSAP(() => {
    if (!containerRef.current) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top top",
        end: "+=130%", 
        scrub: 1,
        pin: true,
        invalidateOnRefresh: true,
      }
    });

    // ── Phase 1: Fade out initial headline & telemetry snippets (0% to 25%) ──
    tl.to(".hero-main-content", { y: -35, opacity: 0, duration: 0.25, ease: "power2.inOut" }, 0);
    tl.to(".hero-snippets-container", { y: -20, opacity: 0, duration: 0.25, ease: "power2.inOut" }, 0);

    // ── Phase 2: Moderate Globe Shift & Statement Reveal (20% to 75%) ──
    tl.to(globeScrollState, {
      yOffset: -1.8,
      scale: 1.6,
      offset: Math.PI * 1.2,
      opacity: 1,
      interactiveWeight: 0,
      duration: 0.55, 
      ease: "power2.inOut" 
    }, 0.15); 

    const wordEls = containerRef.current.querySelectorAll(".hero-reveal-word");
    tl.fromTo(wordEls,
      { opacity: 0, y: 15, filter: "blur(3px)" },
      { opacity: 1, y: 0, filter: "blur(0px)", stagger: { amount: 0.35 }, duration: 0.40, ease: "power2.out" },
      0.20
    );

    // ── Phase 3: Smooth dissolve into Approach (75% to 100%) ──
    tl.to(".hero-message-overlay", {
      opacity: 0,
      y: -30,
      filter: "blur(4px)",
      duration: 0.25,
      ease: "power2.inOut"
    }, 0.75);

  }, { scope: containerRef, dependencies: [] });

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", height: "100dvh", backgroundColor: "var(--bg-primary)", overflow: "hidden" }}>
      {/* -- Shared Background Gradients & 3D Globe -- */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 1 }}>
        <ParticleGlobe />
        
        {/* Optical center contrast vignette to keep text razor sharp */}
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2, background: "radial-gradient(ellipse 90% 60% at 50% 110%, rgba(1,22,57,0.50) 0%, rgba(0,4,20,0) 65%)" }} />
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 3, background: "linear-gradient(to bottom, rgba(0,0,8,0.40) 0%, transparent 20%, transparent 75%, rgba(0,0,8,0.45) 100%)" }} />
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 4, background: "radial-gradient(ellipse 65% 55% at 50% 50%, rgba(1,1,20,0.60) 0%, rgba(1,1,20,0.25) 45%, transparent 80%)" }} />
      </div>
      
      <div style={{ position: "absolute", inset: 0, zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <section
          id="hero"
          ref={wrapperRef}
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            background: "transparent",
          }}
        >
          {/* ── Sleek Floating Telemetry Annotations (Muted Grey Monospace Accents) ── */}
          <div className="hero-snippets-container" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 5 }}>
            {CODE_SNIPPETS.map((snippet) => {
              const blockStart = SNIPPET_BASE_DELAY + snippet.blockDelay * SNIPPET_BLOCK_STAGGER;
              const isLeft = snippet.align === "left";
              return (
                <div
                  key={snippet.id}
                  id={snippet.id}
                  className="hero-snippet-block"
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    ...snippet.position,
                    fontFamily: "var(--font-mono), monospace",
                    textAlign: isLeft ? "left" : "right",
                    userSelect: "none",
                    pointerEvents: "none",
                    zIndex: 5,
                    maxWidth: "260px",
                    opacity: 0.85,
                  }}
                >
                  {/* Muted Grey Header: Tag + Index */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: isLeft ? "flex-start" : "flex-end",
                      gap: "7px",
                      marginBottom: "4px",
                    }}
                  >
                    {isLeft && (
                      <span style={{ width: "3.5px", height: "3.5px", borderRadius: "50%", background: "rgba(255, 255, 255, 0.45)" }} />
                    )}
                    <span style={{ fontSize: "0.64rem", fontWeight: 500, color: "rgba(255, 255, 255, 0.42)", letterSpacing: "0.08em" }}>
                      [{snippet.code}] {snippet.tag}
                    </span>
                    {!isLeft && (
                      <span style={{ width: "3.5px", height: "3.5px", borderRadius: "50%", background: "rgba(255, 255, 255, 0.45)" }} />
                    )}
                  </div>

                  {/* Body Lines with delicate grey border indicator */}
                  <div
                    style={{
                      borderLeft: isLeft ? "1px solid rgba(255, 255, 255, 0.12)" : "none",
                      borderRight: !isLeft ? "1px solid rgba(255, 255, 255, 0.12)" : "none",
                      paddingLeft: isLeft ? "10px" : "0",
                      paddingRight: !isLeft ? "10px" : "0",
                      fontSize: "0.70rem",
                      lineHeight: "1.65",
                      letterSpacing: "0.02em",
                      color: "rgba(255, 255, 255, 0.35)",
                    }}
                  >
                    {[snippet.line1, snippet.line2].map((line, lineIdx) => {
                      const lineDelay = blockStart + lineIdx * (TYPEWRITER_DURATION + SNIPPET_LINE_STAGGER);
                      return (
                        <div
                          key={lineIdx}
                          className={`snippet-line${lineIdx === 1 ? " snippet-line-last" : ""}`}
                          style={{
                            animationDelay: `${lineDelay}ms`,
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                            color: "rgba(255, 255, 255, 0.40)",
                            justifyContent: snippet.align === "right" ? "flex-end" : "flex-start",
                          }}
                        >
                          <CheckCircle weight="fill" size={10} style={{ color: "#10B981", flexShrink: 0 }} />
                          <span>{line}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Content: Headline + Caption + CTA ── */}
          <div
            className="hero-main-content"
            style={{
              position: "relative",
              zIndex: 10,
              textAlign: "center",
              padding: "0 1.5rem",
              maxWidth: "1050px",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            {/* ── Eyebrow Breadcrumb (Syntethic-style) ── */}
            <p
              className="hero-caption"
              style={{
                fontFamily: "var(--font-mono), monospace",
                fontSize: "0.68rem",
                fontWeight: 500,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#CC6600",
                margin: "0 0 1.25rem",
                animationDelay: `${HEADLINE_BASE_DELAY - 100}ms`,
              }}
            >
              JAXIS STATLAB · STATISTICAL ANALYSIS & CONSULTING
            </p>

            <h1
              id="hero-headline"
              style={{
                fontFamily: "var(--font-heading), sans-serif",
                fontSize: "clamp(2.4rem, 5.8vw, 4.4rem)",
                fontWeight: 500,
                lineHeight: 1.14,
                letterSpacing: "-0.03em",
                color: "#FFFFFF",
                margin: 0,
                textAlign: "center",
                transition: "transform 0.15s ease-out",
              }}
            >
              {HEADLINE_LINES.map(({ text, delay, accent }) => (
                <span
                  key={text}
                  className="hero-line"
                  style={{ animationDelay: `${HEADLINE_BASE_DELAY + delay * HEADLINE_LINE_STAGGER}ms` }}
                >
                  {accent ? (
                    <em style={{ fontStyle: "normal", color: "var(--accent-orange)" }}>
                      {text}
                    </em>
                  ) : text}
                </span>
              ))}
            </h1>

            <p
              className="hero-caption"
              style={{
                fontFamily: "var(--font-mono), monospace",
                fontSize: "clamp(0.80rem, 1.4vw, 0.90rem)",
                fontWeight: 400,
                color: "rgba(255,255,255,0.65)",
                lineHeight: 1.65,
                maxWidth: "580px",
                margin: "1.75rem auto 0",
                letterSpacing: "-0.015em",
                animationDelay: `${HEADLINE_BASE_DELAY + HEADLINE_LINE_STAGGER * 3 + 200}ms`,
              }}
            >
              We analyze your survey data, format your APA 7th Edition tables, and give you the exact speaking script to defend your results — with 100% accuracy.
            </p>

            <div className="hero-cta-wrapper" style={{ marginTop: "2rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem", flexWrap: "wrap" }}>
              {/* Primary CTA */}
              <a
                href={REGISTER_URL}
                id="hero-cta"
                className="hero-caption hero-cta-btn"
                style={{
                  fontFamily: "var(--font-sans), sans-serif",
                  fontSize: "0.74rem",
                  fontWeight: 500,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#FFFFFF",
                  textDecoration: "none",
                  padding: "14px 36px",
                  border: "1px solid #CC6600",
                  borderRadius: "2px",
                  background: "#CC6600",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "10px",
                  boxShadow: "0 2px 12px rgba(204,102,0,0.30)",
                  transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                  animationDelay: `${HEADLINE_BASE_DELAY + HEADLINE_LINE_STAGGER * 3 + 450}ms`,
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget;
                  el.style.background = "#E67300";
                  el.style.borderColor = "#E67300";
                  const arrow = el.querySelector<HTMLElement>(".hero-cta-arrow");
                  if (arrow) arrow.style.transform = "translateX(4px)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget;
                  el.style.background = "#CC6600";
                  el.style.borderColor = "#CC6600";
                  const arrow = el.querySelector<HTMLElement>(".hero-cta-arrow");
                  if (arrow) arrow.style.transform = "translateX(0)";
                }}
              >
                <span>Get Started</span>
                <span className="hero-cta-arrow" style={{ transition: "transform 0.2s ease", display: "inline-block" }}>&#8594;</span>
              </a>

              {/* Secondary ghost CTA */}
              <a
                href="#approach"
                id="hero-secondary-cta"
                className="hero-caption"
                style={{
                  fontFamily: "var(--font-sans), sans-serif",
                  fontSize: "0.74rem",
                  fontWeight: 500,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.75)",
                  textDecoration: "none",
                  padding: "14px 26px",
                  border: "1px solid rgba(255,255,255,0.16)",
                  borderRadius: "2px",
                  background: "rgba(255,255,255,0.03)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                  animationDelay: `${HEADLINE_BASE_DELAY + HEADLINE_LINE_STAGGER * 3 + 600}ms`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.35)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                  e.currentTarget.style.color = "#FFFFFF";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.16)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                  e.currentTarget.style.color = "rgba(255,255,255,0.75)";
                }}
              >
                Explore Methodology
              </a>
            </div>

            {/* ── Syntethic-style 4-metric KPI stats strip ── */}
            <div
              className="hero-caption"
              style={{
                marginTop: "2.5rem",
                paddingTop: "1.5rem",
                borderTop: "1px solid rgba(255,255,255,0.08)",
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "0",
                width: "100%",
                maxWidth: "680px",
                animationDelay: `${HEADLINE_BASE_DELAY + HEADLINE_LINE_STAGGER * 3 + 750}ms`,
              }}
            >
              {KPI_STATS.map((stat, i) => (
                <div
                  key={stat.label}
                  style={{
                    textAlign: "center",
                    padding: "0 1rem",
                    borderRight: i < KPI_STATS.length - 1 ? "1px solid rgba(255,255,255,0.08)" : "none",
                  }}
                >
                  <div style={{
                    fontFamily: "var(--font-heading), sans-serif",
                    fontSize: "clamp(1.3rem, 2.6vw, 1.8rem)",
                    fontWeight: 500,
                    color: "#FFFFFF",
                    lineHeight: 1,
                    letterSpacing: "-0.02em",
                    marginBottom: "0.35rem",
                  }}>
                    {stat.value}
                  </div>
                  <div style={{
                    fontFamily: "var(--font-mono), monospace",
                    fontSize: "0.62rem",
                    color: "rgba(255,255,255,0.40)",
                    letterSpacing: "0.02em",
                    lineHeight: 1.3,
                  }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── JAXIS Message (Revealed on ScrollTrigger Phase 2) ── */}
          <div 
            className="hero-message-overlay"
            style={{ 
              position: "absolute", 
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "100%",
              maxWidth: "1050px", 
              textAlign: "center", 
              zIndex: 10, 
              padding: "0 2rem",
              pointerEvents: "none"
            }}
          >
            <h2 
              style={{
                fontFamily: "var(--font-sans), sans-serif",
                fontSize: "clamp(1.2rem, 3.2vw, 2.8rem)",
                fontWeight: 300,
                lineHeight: 1.35,
                letterSpacing: "-0.02em",
                color: "#FFFFFF",
                margin: 0
              }}
            >
              {INTRO_WORDS.map((word, i) => (
                <React.Fragment key={i}>
                  <span className="hero-reveal-word" style={{ willChange: "opacity, transform", display: "inline-block", opacity: 0 }}>
                    {word}
                  </span>
                  {i < INTRO_WORDS.length - 1 && " "}
                </React.Fragment>
              ))}
            </h2>
          </div>
        </section>
      </div>
    </div>
  );
}
