"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowClockwise, Check, Copy, House } from "@phosphor-icons/react";

export interface ErrorPageProps {
  error: Error & { digest?: string };
  onRetry: () => void;
  homeHref?: string;
  homeLabel?: string;
  /** "page" fills the screen with the brand header and footer; "inline" sits inside an existing layout. */
  variant?: "page" | "inline";
}

const STYLES = `
.jxerr-in{opacity:0;transform:translateY(10px);animation:jxerr-rise .7s cubic-bezier(.23,1,.32,1) forwards}
@keyframes jxerr-rise{to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.jxerr-in{animation:none;opacity:1;transform:none}}
`;

// Shared error screen in the same language as NotFoundPage: a left-aligned column with the actions, and
// a details panel (reference code, page, time) people can send to support. The raw error message is only
// shown in development. Spacing uses flex gaps and links force their colour, because the app's global
// resets override margin and link-colour utilities.
export function ErrorPage({
  error,
  onRetry,
  homeHref = "/dashboard",
  homeLabel = "Go to your workspace",
  variant = "page",
}: ErrorPageProps) {
  const [path, setPath] = useState("");
  const [time, setTime] = useState("");
  const [copied, setCopied] = useState(false);
  const timer = useRef<number>(0);

  useEffect(() => {
    setPath(window.location.pathname);
    setTime(new Date().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }));
    return () => window.clearTimeout(timer.current);
  }, []);

  const reference = error.digest ?? "Not available";
  const isDev = process.env.NODE_ENV !== "production";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`Reference: ${reference}\nPage: ${path}\nTime: ${time}`);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked; the details stay visible to copy by hand.
    }
  };

  const Title = variant === "page" ? "h1" : "h2";

  const body = (
    <div className="flex w-full max-w-[34rem] flex-col gap-10">
      <div className="flex flex-col gap-5">
        <div className="jxerr-in flex items-center gap-2 font-mono text-xs uppercase tracking-[0.15em] text-white/60">
          <span className="h-1.5 w-1.5 rounded-full bg-[#CC6600]" />
          Unexpected error
        </div>
        <Title
          className="jxerr-in font-sans text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl"
          style={{ animationDelay: "80ms" }}
        >
          Something went wrong
        </Title>
        <p className="jxerr-in font-mono text-sm leading-relaxed text-white/60" style={{ animationDelay: "160ms" }}>
          This page ran into a problem on our side. Your work and files are safe. Try again, and if it keeps happening,
          send us the details below.
        </p>
        <div className="jxerr-in flex flex-wrap gap-3 pt-2" style={{ animationDelay: "240ms" }}>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-[2px] bg-[#CC6600] px-6 font-sans text-sm font-medium text-white transition-[background-color,transform] duration-150 ease-out hover:bg-[#E67300] active:scale-[0.97]"
          >
            <ArrowClockwise size={16} weight="bold" />
            Try again
          </button>
          <a
            href={homeHref}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[2px] border border-white/20 px-6 font-sans text-sm font-medium !text-white transition-[background-color,border-color,transform] duration-150 ease-out hover:border-white/40 hover:bg-white/[0.04] active:scale-[0.97]"
          >
            <House size={16} weight="fill" />
            {homeLabel}
          </a>
        </div>
      </div>

      <div
        className="jxerr-in overflow-hidden rounded-[2px] border border-white/10 bg-[#010D1F]"
        style={{ animationDelay: "340ms" }}
      >
        <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-white/[0.02] px-4 py-2.5">
          <span className="font-mono text-[10px] uppercase tracking-wider text-white/45">Details for support</span>
          <button
            type="button"
            onClick={copy}
            aria-label={copied ? "Details copied" : "Copy details"}
            className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-[2px] border border-white/15 px-2 font-mono text-[10px] text-white/70 transition-[border-color,color,transform] duration-150 ease-out hover:border-white/35 hover:text-white active:scale-[0.97]"
          >
            {copied ? <Check size={11} weight="bold" className="text-[#FFA040]" /> : <Copy size={11} weight="fill" />}
            <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
        <dl className="grid grid-cols-[6.5rem_1fr] gap-y-2.5 px-4 py-4 font-mono text-xs">
          <dt className="text-white/45">Reference</dt>
          <dd className="break-all text-white/85">{reference}</dd>
          <dt className="text-white/45">Page</dt>
          <dd className="break-all text-white/85">{path || "..."}</dd>
          <dt className="text-white/45">Time</dt>
          <dd className="text-white/85">{time || "..."}</dd>
          {isDev && error.message ? (
            <>
              <dt className="text-white/45">Message</dt>
              <dd className="break-words text-[#FFA040]/90">
                {error.message}
                <span className="block pt-1 text-[10px] text-white/35">Shown in development only</span>
              </dd>
            </>
          ) : null}
        </dl>
      </div>
    </div>
  );

  if (variant === "inline") {
    return (
      <div className="flex w-full justify-center px-2 py-10 sm:py-16">
        <style dangerouslySetInnerHTML={{ __html: STYLES }} />
        {body}
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh w-full flex-col bg-[#010114] text-white">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <header className="flex h-20 items-center justify-center px-6">
        <a href={homeHref} className="flex items-center gap-2.5" aria-label="JAXIS StatLab home">
          <img src="/jaxislogo.png" alt="" width={22} height={22} className="h-[22px] w-[22px]" />
          <span className="font-sans text-[15px] font-semibold tracking-[-0.01em] !text-white">
            JAXIS <span className="font-normal text-white/60">StatLab</span>
          </span>
        </a>
      </header>
      <main className="flex flex-1 justify-center px-6 pb-20 pt-10 sm:pt-16">{body}</main>
      <footer className="border-t border-white/[0.08]">
        <div className="mx-auto flex w-full max-w-[90rem] flex-col gap-2 px-6 py-6 font-mono text-[11px] text-white/50 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <span>
            © 2026 <span className="text-white/85">JAXIS StatLab</span>
          </span>
          <span>Every study is checked by two statisticians.</span>
        </div>
      </footer>
    </div>
  );
}
