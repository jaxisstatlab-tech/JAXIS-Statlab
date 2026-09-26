"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { List, X } from "@phosphor-icons/react";
import { LOGIN_URL, REGISTER_URL } from "@/lib/config";
import { btnGhost, btnPrimary } from "../ui/styles";

const LINKS = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Services", href: "#services" },
  { label: "Quality", href: "#quality" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("");

  useEffect(() => {
    const sections = LINKS.map((l) => document.querySelector(l.href)).filter((el): el is Element => el !== null);
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(`#${entry.target.id}`);
        }
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    sections.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color] duration-300 ${
        scrolled || open ? "border-white/[0.08] bg-[#010114]/85 backdrop-blur-md" : "border-transparent bg-transparent"
      }`}
    >
      <nav
        aria-label="Main"
        className="mx-auto grid h-16 w-full max-w-[90rem] grid-cols-[1fr_auto] items-center gap-6 px-6 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:px-8"
      >
        <Link href="/" aria-label="JAXIS StatLab home" className="flex shrink-0 items-center gap-2.5 justify-self-start">
          <Image src="/favicon-96x96.png" alt="" width={22} height={22} priority className="h-[22px] w-[22px]" />
          <span className="font-sans text-[15px] font-semibold tracking-[-0.01em] text-white">
            JAXIS <span className="font-normal text-white/60">StatLab</span>
          </span>
        </Link>

        <ul className="hidden items-center gap-0.5 lg:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                aria-current={active === l.href ? "true" : undefined}
                className={`relative block rounded-[2px] px-3.5 py-2 font-sans text-[13px] transition-colors duration-150 hover:text-white ${
                  active === l.href ? "text-white" : "text-white/60"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`absolute left-1 top-1/2 h-1 w-1 -translate-y-1/2 rounded-full bg-[#CC6600] transition-opacity duration-200 ${
                    active === l.href ? "opacity-100" : "opacity-0"
                  }`}
                />
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-2 justify-self-end lg:flex">
          <a href={REGISTER_URL} data-cta="nav-register" className={`${btnGhost} h-9 border-transparent px-4 text-[13px]`}>
            Register
          </a>
          <a href={LOGIN_URL} data-cta="nav-send" className={`${btnPrimary} h-9 px-4 text-[13px]`}>
            Send your study
          </a>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          className="flex h-10 w-10 items-center justify-center justify-self-end rounded-[2px] text-white lg:hidden"
        >
          {open ? <X size={20} weight="bold" /> : <List size={20} weight="bold" />}
        </button>
      </nav>

      {open ? (
        <div className="h-[calc(100dvh-4rem)] border-t border-white/[0.08] bg-[#010114] px-6 pb-8 pt-4 lg:hidden">
          <ul className="flex flex-col">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block border-b border-white/[0.06] py-4 font-sans text-lg text-white/85"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-8 grid grid-cols-2 gap-3">
            <a href={REGISTER_URL} data-cta="menu-register" className={btnGhost}>
              Register
            </a>
            <a href={LOGIN_URL} data-cta="menu-send" className={btnPrimary}>
              Send your study
            </a>
          </div>
        </div>
      ) : null}
    </header>
  );
}
