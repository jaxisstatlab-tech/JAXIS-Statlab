"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { List, X } from "@phosphor-icons/react";
import { REGISTER_URL, LOGIN_URL } from "@/lib/config";

const NAV_LINKS = [
  { label: "Our Approach", href: "#approach" },
  { label: "Solutions", href: "#solutions" },
  { label: "Packages", href: "#pricing" },
  { label: "Security", href: "#security" },
  { label: "FAQ", href: "#faq" },
  { label: "Contact", href: "#contact" },
];

const STATS_CHIPS = [
  { label: "99.8% Accuracy" },
  { label: "2 Statisticians" },
  { label: "24h Quote" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Prevent body scroll when mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <header
      id="main-header"
      className={[
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-[#010114]/90 border-b border-white/10 backdrop-blur-md"
          : "bg-[#010114]/50 border-b border-white/5 backdrop-blur-sm",
      ].join(" ")}
    >
      <nav
        id="navbar"
        aria-label="Main navigation"
        className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between gap-4"
      >
        {/* Brand Lockup */}
        <Link
          href="/"
          id="navbar-brand"
          aria-label="JAXIS StatLab Home"
          className="flex items-center gap-2.5 shrink-0 select-none no-underline"
        >
          <Image
            src="/jaxislogo.png"
            alt="JAXIS Logo"
            width={24}
            height={24}
            className="h-6 w-auto"
            priority
          />
          <span className="font-sans text-sm font-semibold tracking-[0.08em] uppercase text-white whitespace-nowrap">
            JAXIS <span className="text-[#CC6600]">StatLab</span>
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <ul
          id="navbar-nav-links"
          className="hidden lg:flex items-center gap-5 xl:gap-7 list-none m-0 p-0"
        >
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="font-sans text-xs font-medium tracking-[0.06em] uppercase text-white/70 hover:text-white transition-colors duration-150 whitespace-nowrap no-underline"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Live Stats Chip + Action Buttons (Desktop) */}
        <div className="hidden lg:flex items-center gap-3 xl:gap-4 shrink-0">
          {/* Live Stats Chip (Shown on xl screens to maintain clean spacing on laptops) */}
          <div className="hidden xl:flex items-center gap-2 text-[10px] font-mono text-white/50 border border-white/10 px-2.5 py-1.5 rounded-[2px] bg-white/[0.03] select-none whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            {STATS_CHIPS.map((chip, i) => (
              <React.Fragment key={chip.label}>
                <span>{chip.label}</span>
                {i < STATS_CHIPS.length - 1 && (
                  <span className="w-1 h-1 rounded-full bg-white/20 inline-block shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Sign In ghost link */}
          <a
            href={LOGIN_URL}
            id="navbar-signin"
            className="font-sans text-xs font-medium tracking-[0.08em] uppercase text-white/70 hover:text-white px-3 py-1.5 transition-colors duration-150 whitespace-nowrap no-underline"
          >
            Sign In
          </a>

          {/* Get Started CTA */}
          <a
            href={REGISTER_URL}
            id="navbar-cta"
            className="font-sans text-xs font-semibold tracking-[0.1em] uppercase text-white no-underline px-4 py-2 border border-[#CC6600]/60 bg-[#CC6600]/10 hover:bg-[#CC6600] hover:border-[#CC6600] rounded-[2px] transition-all duration-150 active:scale-[0.97] whitespace-nowrap shadow-sm"
          >
            Get Started
          </a>
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          id="mobile-menu-toggle"
          aria-label="Toggle mobile menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          className="lg:hidden p-2 text-white/80 hover:text-white hover:bg-white/[0.05] rounded-[2px] transition-colors duration-150 focus:outline-none cursor-pointer"
        >
          {menuOpen ? (
            <X weight="fill" size={22} />
          ) : (
            <List weight="fill" size={22} />
          )}
        </button>
      </nav>

      {/* Mobile Drawer */}
      <div
        id="mobile-drawer"
        aria-hidden={!menuOpen}
        className={[
          "lg:hidden overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          menuOpen ? "max-h-[600px] opacity-100 border-b border-white/10" : "max-h-0 opacity-0",
        ].join(" ")}
      >
        <div className="bg-[#01142B] px-6 py-6 flex flex-col gap-4 shadow-xl">
          {/* Nav links */}
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="font-sans text-xs font-medium tracking-[0.08em] uppercase text-white/80 no-underline hover:text-[#CC6600] transition-colors duration-150 py-2.5 border-b border-white/5"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Mobile CTAs */}
          <div className="flex flex-col gap-3 pt-2">
            <a
              href={LOGIN_URL}
              onClick={() => setMenuOpen(false)}
              className="font-sans text-xs font-medium tracking-[0.08em] uppercase text-white/80 no-underline py-2.5 border border-white/15 rounded-[2px] text-center hover:border-white/30 hover:text-white transition-all duration-150"
            >
              Sign In
            </a>
            <a
              href={REGISTER_URL}
              onClick={() => setMenuOpen(false)}
              className="font-sans text-xs font-semibold tracking-[0.1em] uppercase text-white no-underline py-3 bg-[#CC6600] hover:bg-[#b35900] rounded-[2px] text-center transition-all duration-150 active:scale-[0.97] shadow-sm"
            >
              Get Started
            </a>
          </div>

          {/* Mobile stats strip */}
          <div className="flex items-center justify-center gap-2 text-[10px] font-mono text-white/40 pt-2 flex-wrap">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            {STATS_CHIPS.map((chip, i) => (
              <React.Fragment key={chip.label}>
                <span>{chip.label}</span>
                {i < STATS_CHIPS.length - 1 && (
                  <span className="w-1 h-1 rounded-full bg-white/20 inline-block shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
