"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LOGIN_URL, REGISTER_URL } from "@/lib/config";
import { btnGhost, btnPrimary } from "../ui/styles";

// The FAQ lives on /contact.
const LINKS = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Pricing", href: "/pricing" },
  { label: "Contact", href: "/contact" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color] duration-300 ${
        scrolled || open
          ? "border-white/[0.08] bg-[#010114]/85 backdrop-blur-md"
          : "border-transparent bg-transparent"
      }`}
    >
      <nav
        aria-label="Main"
        className="mx-auto grid h-16 w-full max-w-[90rem] grid-cols-[1fr_auto] items-center gap-6 px-6 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:px-8"
      >
        <Link
          href="/"
          aria-label="JAXIS StatLab home"
          className="flex shrink-0 items-center gap-2.5 justify-self-start"
        >
          <Image
            src="/jaxislogo.png"
            alt=""
            width={22}
            height={22}
            priority
            className="h-[22px] w-[22px]"
          />
          <span className="font-sans text-[15px] font-semibold tracking-[-0.01em] text-white">
            JAXIS <span className="font-normal text-white/60">StatLab</span>
          </span>
        </Link>

        <ul className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={isActive(l.href) ? "page" : undefined}
                className={`block rounded-[2px] px-3.5 py-1.5 font-sans text-[13px] transition-[background-color,color] duration-150 ease-out ${
                  isActive(l.href)
                    ? "bg-white/[0.08] font-medium text-white"
                    : "text-white/60 hover:text-white"
                }`}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-2 justify-self-end lg:flex">
          <a
            href={REGISTER_URL}
            data-cta="nav-register"
            className={`${btnGhost} h-9 border-transparent px-4 text-[13px]`}
          >
            Register
          </a>
          <a
            href={LOGIN_URL}
            data-cta="nav-send"
            className={`${btnPrimary} h-9 px-4 text-[13px]`}
          >
            Send your study
          </a>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          className="flex h-10 w-10 items-center justify-center justify-self-end rounded-[2px] text-white transition-transform duration-150 ease-out active:scale-[0.97] lg:hidden"
        >
          <span
            aria-hidden="true"
            className="menu-icon"
            data-open={open ? "" : undefined}
          >
            <span />
            <span />
            <span />
          </span>
        </button>
      </nav>

      <div
        className="mobile-menu absolute inset-x-0 top-full h-[calc(100dvh-4rem)] border-t border-white/[0.08] bg-[#010114] px-6 pb-8 pt-4 lg:hidden"
        data-open={open ? "" : undefined}
        inert={!open}
      >
        <ul className="flex flex-col">
          {LINKS.map((l, i) => (
            <li key={l.href} style={{ ["--i" as string]: i }}>
              <Link
                href={l.href}
                onClick={() => setOpen(false)}
                aria-current={isActive(l.href) ? "page" : undefined}
                className={`block border-b border-white/[0.06] py-4 font-sans text-lg ${
                  isActive(l.href) ? "text-white" : "text-white/85"
                }`}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <div
          className="mt-8 grid grid-cols-2 gap-3"
          style={{ ["--i" as string]: LINKS.length }}
        >
          <a href={REGISTER_URL} data-cta="menu-register" className={btnGhost}>
            Register
          </a>
          <a href={LOGIN_URL} data-cta="menu-send" className={btnPrimary}>
            Send your study
          </a>
        </div>
      </div>
    </header>
  );
}
