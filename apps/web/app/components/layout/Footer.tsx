import Image from "next/image";
import Link from "next/link";
import { ChatCircleDots, Envelope, FacebookLogo, InstagramLogo, MapPin, SealCheck } from "@phosphor-icons/react/ssr";
import { BUSINESS_REGISTRATION, CONTACT_EMAIL, FACEBOOK_URL, INSTAGRAM_URL, LOGIN_URL, MESSENGER_URL, REGISTER_URL, SOCIAL_HANDLE } from "@/lib/config";
import { container } from "../ui/styles";
import CookieSettingsButton from "./CookieSettingsButton";

// Site footer: the brand with its social buttons and contact details, three link columns, and a bottom bar with
// the legal links.

const COLUMNS = [
  {
    title: "Services",
    links: [
      { label: "Hypothesis testing", href: "/#services" },
      { label: "Data cleaning", href: "/#services" },
      { label: "Advanced models", href: "/#services" },
      { label: "DefenseLab", href: "/#services" },
      { label: "Thesis statistics", href: "/statistical-analysis-for-thesis" },
      { label: "Statistician in Bukidnon", href: "/statistician-bukidnon" },
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
];

const SOCIALS = [
  { name: "Facebook", href: FACEBOOK_URL, Icon: FacebookLogo, cta: "footer-facebook" },
  { name: "Instagram", href: INSTAGRAM_URL, Icon: InstagramLogo, cta: "footer-instagram" },
  ...(MESSENGER_URL ? [{ name: "Messenger", href: MESSENGER_URL, Icon: ChatCircleDots, cta: "footer-messenger" }] : []),
];

// 40px tall on phones (easy to tap); the list gap is removed there to keep the footer compact.
const linkClass = "inline-flex min-h-10 items-center font-sans text-[13px] text-white/60 transition-colors hover:text-white sm:min-h-0";
const legalClass =
  "inline-flex min-h-10 items-center underline decoration-white/20 underline-offset-4 transition-colors hover:text-white hover:decoration-white/50 sm:min-h-0";

export default function Footer() {
  return (
    <footer className="relative bg-[#010114] pb-10 pt-14 sm:pt-16">
      <div className={container}>
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-8">
          {/* Brand, socials, contact */}
          <div className="lg:col-span-5">
            <Link href="/" className="inline-flex items-center gap-2.5" aria-label="JAXIS StatLab home">
              <Image src="/logo-66.webp" alt="" width={24} height={24} unoptimized className="h-6 w-6" />
              <span className="font-sans text-base font-semibold text-white">
                JAXIS <span className="font-normal text-white/60">StatLab</span>
              </span>
            </Link>
            <p className="mt-4 max-w-sm font-sans text-sm leading-relaxed text-white/60">
              Statistical consulting for students and researchers. Checked twice, explained simply.
            </p>

            <div className="mt-6 flex items-center gap-2">
              {SOCIALS.map(({ name, href, Icon, cta }) => (
                <a
                  key={name}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-cta={cta}
                  aria-label={`${name}: @${SOCIAL_HANDLE}`}
                  title={`${name} · @${SOCIAL_HANDLE}`}
                  className="flex h-10 w-10 items-center justify-center rounded-[2px] border border-white/10 bg-white/[0.03] text-white/65 transition-[color,border-color,background-color,transform] duration-150 hover:border-white/25 hover:bg-white/[0.06] hover:text-white active:scale-[0.96]"
                >
                  <Icon size={18} weight="fill" />
                </a>
              ))}
              <span className="ml-1.5 font-mono text-[11px] text-white/45">@{SOCIAL_HANDLE}</span>
            </div>

            <div className="mt-5 flex flex-col font-mono text-xs text-white/55 sm:gap-2">
              <a href={`mailto:${CONTACT_EMAIL}`} className="inline-flex min-h-10 items-center gap-2 transition-colors hover:text-white sm:min-h-0">
                <Envelope size={14} weight="fill" className="text-white/45" />
                {CONTACT_EMAIL}
              </a>
              <span className="inline-flex min-h-10 items-center gap-2 sm:min-h-0">
                <MapPin size={14} weight="fill" className="text-white/45" />
                Maramag, Bukidnon, Philippines
              </span>
            </div>
          </div>

          {/* Links */}
          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:col-span-7">
            {COLUMNS.map((c) => (
              <div key={c.title}>
                <div className="font-mono text-[11px] uppercase tracking-[0.15em] text-white/45">{c.title}</div>
                <ul className="mt-2 flex flex-col sm:mt-4 sm:gap-2.5">
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
          </nav>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 flex flex-col gap-4 border-t border-white/[0.08] pt-6 font-mono text-[11px] text-white/50 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <span>
              © 2026 JAXIS StatLab. All rights reserved.
              {BUSINESS_REGISTRATION ? <span className="ml-3">{BUSINESS_REGISTRATION}</span> : null}
            </span>
            <Link href="/privacy" className={legalClass}>
              Privacy Policy
            </Link>
            <Link href="/terms" className={legalClass}>
              Terms of Service
            </Link>
            <CookieSettingsButton className={legalClass} />
          </div>
          <span className="inline-flex items-center gap-1.5">
            <SealCheck size={14} weight="fill" className="text-[#CC6600]" />
            Every study is checked by two statistical analysts.
          </span>
        </div>
      </div>
    </footer>
  );
}
