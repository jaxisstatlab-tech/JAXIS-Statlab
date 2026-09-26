"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ArrowUpRight, CaretDown, Check, Copy } from "@phosphor-icons/react";
import { CONTACT_EMAIL, LOGIN_URL, MESSENGER_URL } from "@/lib/config";
import MindanaoMap from "../ui/MindanaoMap";
import Reveal from "../ui/Reveal";
import { btnPrimary, container, kicker } from "../ui/styles";

const SUBJECTS = ["A question about my study", "Pricing and payment", "DefenseLab", "Privacy request", "Something else"];

const card = "rounded-[2px] border border-white/10 bg-[#010D1F]";
const label = "mb-2 block font-mono text-[11px] uppercase tracking-wider text-white/60";
const field =
  "w-full rounded-[2px] border border-white/15 bg-[#010114] px-3.5 font-mono text-[13px] text-white placeholder:text-white/35 transition-colors duration-150 focus:border-[#CC6600]/60 focus:outline-none";

function CopyEmail() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number>(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked; the address is still visible and clickable.
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Email address copied" : "Copy email address"}
      className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-[2px] border border-white/15 px-2 font-mono text-[10px] text-white/70 transition-[border-color,color,transform] duration-150 ease-out hover:border-white/35 hover:text-white active:scale-[0.97]"
    >
      {copied ? <Check size={11} weight="bold" className="text-[#FFA040]" /> : <Copy size={11} weight="fill" />}
      <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

function InfoCard({
  label: title,
  value,
  href,
  note,
  action,
}: {
  label: string;
  value: string;
  href?: string;
  note: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className={`${card} flex w-full flex-col justify-center px-6 py-6 sm:px-7`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-[11px] uppercase tracking-wider text-white/60">{title}</div>
          {href ? (
            <a
              href={href}
              className="group mt-2 inline-flex max-w-full items-center gap-1.5 font-sans text-[17px] font-medium text-white transition-colors hover:text-[#FFA040]"
            >
              <span className="truncate">{value}</span>
              <ArrowUpRight size={13} weight="bold" className="shrink-0 text-white/40 transition-colors group-hover:text-[#FFA040]" />
            </a>
          ) : (
            <div className="mt-2 font-sans text-[17px] font-medium text-white">{value}</div>
          )}
        </div>
        {action}
      </div>
      <p className="mt-1.5 font-mono text-[11px] leading-relaxed text-white/50">{note}</p>
    </div>
  );
}

export default function Contact() {
  const [sent, setSent] = useState(false);

  // No server needed: the message is composed in the visitor's own email app.
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const subject = String(data.get("subject") ?? SUBJECTS[0]);
    const message = String(data.get("message") ?? "").trim();
    const body = `${message}\n\nName: ${name}\nReply to: ${email}`;
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`${subject} (from ${name})`)}&body=${encodeURIComponent(body)}`;
    setSent(true);
  };

  return (
    <section className="relative pb-20 pt-32 lg:pb-28 lg:pt-40">
      <div className={container}>
        <Reveal className="max-w-3xl">
          <div className={kicker}>Contact</div>
          <h1 className="font-sans text-4xl font-medium tracking-[-0.04em] text-white sm:text-5xl lg:text-[3.5rem] lg:leading-[1.05]">
            Talk to a statistician
          </h1>
          <p className="mt-4 max-w-xl font-mono text-xs leading-relaxed text-white/60 sm:text-sm">
            Ask about your study, a payment, or anything else. Send a message below and a statistician will reply by email.
          </p>
        </Reveal>

        <div className="mt-10 grid grid-cols-1 gap-3 lg:grid-cols-3">
          <div className="flex flex-col gap-3 lg:col-span-2">
            <Reveal className="flex-1">
              <form onSubmit={submit} className={`${card} h-full p-6 sm:p-10`}>
                <h2 className="font-sans text-2xl font-medium tracking-[-0.02em] text-white">Send a message</h2>

                <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="contact-name" className={label}>
                      Name
                    </label>
                    <input
                      id="contact-name"
                      name="name"
                      required
                      autoComplete="name"
                      placeholder="ex. Juan Dela Cruz"
                      className={`${field} h-11`}
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-email" className={label}>
                      Email
                    </label>
                    <input
                      id="contact-email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="you@example.com"
                      className={`${field} h-11`}
                    />
                  </div>
                </div>

                <div className="mt-5">
                  <label htmlFor="contact-subject" className={label}>
                    Subject
                  </label>
                  <div className="relative">
                    <select id="contact-subject" name="subject" className={`${field} h-11 cursor-pointer appearance-none pr-10`}>
                      {SUBJECTS.map((s) => (
                        <option key={s} value={s} className="bg-[#010114]">
                          {s}
                        </option>
                      ))}
                    </select>
                    <CaretDown
                      size={13}
                      weight="bold"
                      className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-white/50"
                    />
                  </div>
                </div>

                <div className="mt-5">
                  <label htmlFor="contact-message" className={label}>
                    Message
                  </label>
                  <textarea
                    id="contact-message"
                    name="message"
                    required
                    rows={5}
                    placeholder="Tell us about your study, your deadline, or your question..."
                    className={`${field} resize-y py-3 leading-relaxed`}
                  />
                </div>

                <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
                  <button type="submit" data-cta="contact-submit" className={btnPrimary}>
                    Send message
                  </button>
                  <p className="font-mono text-[11px] text-white/45">Opens your email app with your message ready to send.</p>
                </div>

                {sent ? (
                  <p role="status" className="mt-5 border-t border-white/10 pt-5 font-sans text-sm text-white/70">
                    Your email app should open now. If it didn&apos;t, email us directly at{" "}
                    <a href={`mailto:${CONTACT_EMAIL}`} className="text-white underline decoration-white/25 underline-offset-4">
                      {CONTACT_EMAIL}
                    </a>
                    .
                  </p>
                ) : null}
              </form>
            </Reveal>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Reveal delay={80} className="flex">
                <InfoCard
                  label="Study price"
                  value="Send your study"
                  href={LOGIN_URL}
                  note="Fixed written price within 24 hours"
                />
              </Reveal>
              <Reveal delay={140} className="flex">
                {MESSENGER_URL ? (
                  <InfoCard label="Messenger" value="Message us" href={MESSENGER_URL} note="Quick questions about your study" />
                ) : (
                  <InfoCard
                    label="Privacy requests"
                    value="Ask about your data"
                    href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Privacy request")}`}
                    note="See, correct, or delete your information"
                  />
                )}
              </Reveal>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Reveal delay={60} className="flex">
              <InfoCard
                label="Email"
                value={CONTACT_EMAIL}
                href={`mailto:${CONTACT_EMAIL}`}
                note="Questions about studies, pricing, and DefenseLab"
                action={<CopyEmail />}
              />
            </Reveal>

            <Reveal delay={120} className={`${card} flex flex-1 flex-col overflow-hidden`}>
              <div className="relative flex flex-1 items-center justify-center border-b border-white/10 bg-[#010114] px-6 py-10">
                <MindanaoMap className="aspect-[49/45] w-full max-w-[26rem]" />
                <span className="absolute left-4 top-3 font-mono text-[10px] uppercase tracking-wider text-white/40">
                  Mindanao
                </span>
              </div>
              <div className="px-6 py-5 sm:px-7">
                <div className="font-sans text-[17px] font-medium text-white">Maramag, Bukidnon</div>
                <p className="mt-1 font-mono text-[11px] text-white/55">Philippines · 7.76° N, 125.00° E</p>
                <p className="mt-3 font-mono text-[11px] text-white/45">We work online, so you can send your study from anywhere.</p>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
