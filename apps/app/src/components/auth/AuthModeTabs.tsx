"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const MODES = [
  { href: "/login", label: "Log in" },
  { href: "/register", label: "Create account" },
];

// Switch between logging in and signing up. It lives in the auth layout, so it stays mounted across
// the two pages and the highlight slides from one to the other. Hidden on the password pages.
export function AuthModeTabs() {
  const pathname = usePathname() ?? "";
  const index = MODES.findIndex((m) => pathname.startsWith(m.href));
  if (index < 0) return null;

  return (
    <nav aria-label="Log in or create an account" className="relative grid grid-cols-2 rounded-[2px] border border-white/10 bg-[#010D1F] p-1">
      <span
        aria-hidden="true"
        className="auth-tab-indicator absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-[2px] bg-white/[0.08]"
        style={{ transform: `translateX(${index * 100}%)` }}
      />
      {MODES.map((m, i) => (
        <Link
          key={m.href}
          href={m.href}
          aria-current={i === index ? "page" : undefined}
          className={`relative z-10 flex h-9 items-center justify-center rounded-[2px] font-sans text-[13px] font-medium transition-colors duration-200 ${
            i === index ? "!text-white" : "!text-white/50 hover:!text-white/80"
          }`}
        >
          {m.label}
        </Link>
      ))}
    </nav>
  );
}
