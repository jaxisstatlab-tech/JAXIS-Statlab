import Image from "next/image";
import Link from "next/link";
import { ChatCircleDots, Envelope, FacebookLogo, MapPin } from "@phosphor-icons/react/ssr";
import { BUSINESS_REGISTRATION, CONTACT_EMAIL, FACEBOOK_URL, LOGIN_URL, MESSENGER_URL, REGISTER_URL } from "@/lib/config";
import { container } from "../ui/styles";
import CookieSettingsButton from "./CookieSettingsButton";

const COLUMNS = [
  {
    title: "Services",
    links: [
      { label: "Hypothesis testing", href: "/#services" },
      { label: "Data cleaning", href: "/#services" },
      { label: "Advanced models", href: "/#services" },
      { label: "DefenseLab", href: "/#services" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "How it works", href: "/#how-it-works" },
      { label: "Quality checks", href: "/about#quality" },
      { label: "Pricing", href: "/pricing" },
      { label: "Contact", href: "/contact" },
      { label: "FAQ", href: "/contact#faq" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Log in", href: LOGIN_URL },
      { label: "Create an account", href: REGISTER_URL },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  },
];

const linkClass = "font-sans text-[13px] text-white/60 transition-colors hover:text-white";

export default function Footer() {
  return (
    <footer className="relative border-t border-white/[0.08] bg-[#010114] pb-10 pt-16">
      <div className={container}>
        <div className="grid grid-cols-2 gap-10 md:grid-cols-12">
          <div className="col-span-2 md:col-span-4">
            <div className="flex items-center gap-2.5">
              <Image src="/jaxislogo.png" alt="" width={22} height={22} className="h-[22px] w-[22px]" />
              <span className="font-sans text-[15px] font-semibold text-white">
                JAXIS <span className="font-normal text-white/60">StatLab</span>
              </span>
            </div>
            <p className="mt-4 max-w-xs font-sans text-sm leading-relaxed text-white/60">
              Statistical consulting for students and researchers. Checked twice, explained simply.
            </p>
            <div className="mt-6 flex flex-col gap-2 font-mono text-xs text-white/55">
              <a href={`mailto:${CONTACT_EMAIL}`} className="inline-flex items-center gap-2 transition-colors hover:text-white">
                <Envelope size={14} weight="fill" className="text-white/50" />
                {CONTACT_EMAIL}
              </a>
              {MESSENGER_URL ? (
                <a href={MESSENGER_URL} data-cta="footer-messenger" className="inline-flex items-center gap-2 transition-colors hover:text-white">
                  <ChatCircleDots size={14} weight="fill" className="text-white/50" />
                  Message us on Messenger
                </a>
              ) : null}
              {FACEBOOK_URL ? (
                <a href={FACEBOOK_URL} className="inline-flex items-center gap-2 transition-colors hover:text-white">
                  <FacebookLogo size={14} weight="fill" className="text-white/50" />
                  Facebook page
                </a>
              ) : null}
              <span className="inline-flex items-center gap-2">
                <MapPin size={14} weight="fill" className="text-white/50" />
                Maramag, Bukidnon, Philippines
              </span>
            </div>
          </div>

          {COLUMNS.map((c) => (
            <div key={c.title} className="md:col-span-2 lg:col-span-2">
              <div className="font-mono text-[11px] uppercase tracking-wider text-white/55">{c.title}</div>
              <ul className="mt-4 flex flex-col gap-2.5">
                {c.links.map((l) => (
                  <li key={l.label}>
                    {/* Pages on this site navigate in place; account links go to the app. */}
                    {l.href.startsWith("/") ? (
                      <Link href={l.href} className={linkClass}>
                        {l.label}
                      </Link>
                    ) : (
                      <a href={l.href} className={linkClass}>
                        {l.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-white/[0.08] pt-6 font-mono text-[11px] text-white/55 sm:flex-row sm:justify-between">
          <span className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span>
              © 2026 JAXIS StatLab. All rights reserved.
              {BUSINESS_REGISTRATION ? <span className="sm:ml-3">{BUSINESS_REGISTRATION}</span> : null}
            </span>
            <CookieSettingsButton className="underline decoration-white/20 underline-offset-4 transition-colors hover:text-white" />
          </span>
          <span>Every study is checked by two statisticians.</span>
        </div>
      </div>
    </footer>
  );
}
