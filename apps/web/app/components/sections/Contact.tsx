"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ArrowUpRight, CaretDown, Check, CheckCircle, CircleNotch, Copy, WarningCircle } from "@phosphor-icons/react";
import { CONTACT_EMAIL, LOGIN_URL, MESSENGER_URL } from "@/lib/config";
import MindanaoMap from "../ui/MindanaoMap";
import Reveal from "../ui/Reveal";
import { btnGhost, btnPrimary, container, kicker } from "../ui/styles";

const SUBJECTS = ["A question about my study", "Pricing and payment", "DefenseLab", "Privacy request", "Something else"];

const card = "rounded-[2px] border border-white/10 bg-[#050513]";
const label = "mb-2 block font-mono text-[11px] uppercase tracking-wider text-white/60";
const field =
  "w-full rounded-[2px] border border-white/15 bg-[#010114] px-3.5 font-mono text-[13px] text-white placeholder:text-white/35 transition-colors duration-150 focus:border-[#CC6600]/60 focus:outline-none disabled:opacity-50";

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
  const [submitting, setSubmitting] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);

    const form = e.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const subject = String(data.get("subject") ?? SUBJECTS[0]);
    const message = String(data.get("message") ?? "").trim();

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to send message. Please try again.");
      }

      setSenderName(name);
      setSenderEmail(email);
      setSentSuccess(true);
      form.reset();
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to send message. Please try again or email us directly."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="relative pb-20 pt-32 lg:pb-28 lg:pt-40">
      <div className={container}>
        <Reveal className="max-w-3xl">
          <div className={kicker}>Contact</div>
          <h1 className="font-sans text-4xl font-medium tracking-[-0.04em] text-white sm:text-5xl lg:text-[3.5rem] lg:leading-[1.05]">
            Talk to a statistical analyst
          </h1>
          <p className="mt-4 max-w-xl font-mono text-xs leading-relaxed text-white/60 sm:text-sm">
            Ask about your study, a payment, or anything else. Send a message below and a statistical analyst will reply by email.
          </p>
        </Reveal>

        <div className="mt-10 grid grid-cols-1 gap-3 lg:grid-cols-3">
          <div className="flex flex-col gap-3 lg:col-span-2">
            <Reveal className="flex-1">
              {sentSuccess ? (
                <div className={`${card} flex h-full min-h-[460px] flex-col items-center justify-center p-8 text-center sm:p-12`}>
                  <div className="flex h-14 w-14 items-center justify-center rounded-[2px] border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                    <CheckCircle size={32} weight="fill" />
                  </div>
                  <h2 className="mt-5 font-sans text-2xl font-medium tracking-[-0.02em] text-white">
                    Message sent successfully
                  </h2>
                  <p className="mt-3 max-w-md font-mono text-xs leading-relaxed text-white/65 sm:text-sm">
                    Thank you{senderName ? `, ${senderName}` : ""}. A statistical analyst will review your inquiry and reply to <span className="font-medium text-white">{senderEmail}</span> within 24 hours.
                  </p>
                  <div className="mt-8 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSentSuccess(false);
                        setErrorMessage(null);
                      }}
                      className={`${btnGhost} h-10 px-5 text-xs`}
                    >
                      Send another message
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={submit} className={`${card} h-full p-6 sm:p-10`}>
                  <h2 className="font-sans text-2xl font-medium tracking-[-0.02em] text-white">Send a message</h2>

                  {errorMessage ? (
                    <div className="mt-5 flex items-start gap-3 rounded-[2px] border border-amber-500/20 bg-amber-500/10 p-4 text-xs font-mono text-amber-200">
                      <WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0 text-amber-400" />
                      <div className="flex-1 leading-relaxed">
                        <p className="font-semibold text-white">{errorMessage}</p>
                        <p className="mt-1 text-white/60">
                          You can also reach us directly at{" "}
                          <a href={`mailto:${CONTACT_EMAIL}`} className="text-white underline decoration-white/30 underline-offset-2">
                            {CONTACT_EMAIL}
                          </a>
                          .
                        </p>
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="contact-name" className={label}>
                        Name
                      </label>
                      <input
                        id="contact-name"
                        name="name"
                        required
                        disabled={submitting}
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
                        disabled={submitting}
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
                      <select
                        id="contact-subject"
                        name="subject"
                        disabled={submitting}
                        className={`${field} h-11 cursor-pointer appearance-none pr-10`}
                      >
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
                      disabled={submitting}
                      rows={5}
                      placeholder="Tell us about your study, your deadline, or your question..."
                      className={`${field} resize-y py-3 leading-relaxed`}
                    />
                  </div>

                  <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
                    <button
                      type="submit"
                      disabled={submitting}
                      data-cta="contact-submit"
                      className={`${btnPrimary} min-w-[140px] ${submitting ? "cursor-not-allowed opacity-75" : ""}`}
                    >
                      {submitting ? (
                        <>
                          <CircleNotch size={16} weight="bold" className="animate-spin text-white/90" />
                          Sending...
                        </>
                      ) : (
                        "Send message"
                      )}
                    </button>
                    <p className="font-mono text-[11px] text-white/50">
                      We reply within 24 hours. Your details are kept strictly confidential.
                    </p>
                  </div>
                </form>
              )}
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
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-3 font-mono text-[11px] uppercase tracking-wider">
                <span className="text-white/50">MINDANAO · PHILIPPINES</span>
                <span className="flex items-center gap-1.5 font-semibold text-[#CC6600]">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#CC6600] opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#CC6600]" />
                  </span>
                  HEADQUARTERS
                </span>
              </div>
              <div className="relative flex flex-1 items-center justify-center border-b border-white/10 bg-[#010114] p-4 sm:p-6">
                <MindanaoMap className="w-full max-w-[26rem]" />
              </div>
              <div className="px-6 py-5 sm:px-7">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="font-sans text-[17px] font-medium text-white">Maramag, Bukidnon</div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">Region X</span>
                </div>
                <p className="mt-1 font-mono text-[11px] text-white/55">Philippines · 7.76° N, 125.00° E</p>
                <p className="mt-3 font-mono text-[11px] leading-relaxed text-white/45">
                  Physical laboratory headquarters. We work 100% online with verified results for researchers across all Philippine regions.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
