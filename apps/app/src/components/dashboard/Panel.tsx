import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";

// Building blocks for redesigned dashboard pages: a calm charcoal surface on the #010114 ground,
// hairline borders, and one consistent header / footer anatomy. Kept presentational (no data logic).

export const SURFACE = "#0A0A18";

export function Panel({
  children,
  className = "",
  as: Tag = "section",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article";
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag className={`flex flex-col rounded-[2px] border border-white/[0.07] bg-[#0A0A18] ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

/** Title (+ optional count) and a one-line subtitle on the left, an optional control on the right. */
export function PanelHeader({
  title,
  subtitle,
  count,
  aside,
  className = "",
}: {
  title: string;
  subtitle?: ReactNode;
  count?: number;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-start justify-between gap-4 px-5 pt-5 sm:px-6 sm:pt-6 ${className}`}>
      <div className="min-w-0">
        <h2 className="flex items-baseline gap-2 font-sans text-[15px] font-semibold tracking-[-0.01em] text-white">
          {title}
          {count !== undefined ? <span className="font-mono text-xs font-normal text-white/40">{count}</span> : null}
        </h2>
        {subtitle ? <p className="mt-1 font-sans text-[13px] text-white/50">{subtitle}</p> : null}
      </div>
      {aside ? <div className="shrink-0">{aside}</div> : null}
    </div>
  );
}

export function PanelBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`px-5 py-5 sm:px-6 ${className}`}>{children}</div>;
}

/** Full-width quiet link at the bottom of a panel ("View all studies →"). */
export function PanelFooterLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <div className="mt-auto px-5 pb-5 pt-5 sm:px-6 sm:pb-6">
      <Link href={href} className={FOOTER_BUTTON}>
        {children}
        <ArrowRight size={13} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}

const FOOTER_BUTTON =
  "group flex h-10 w-full items-center justify-center gap-2 rounded-[2px] border border-white/[0.07] bg-white/[0.02] font-sans text-[13px] text-white/75 transition-colors hover:border-white/[0.14] hover:bg-white/[0.04] hover:text-white";

/** Same look as PanelFooterLink, for actions that don't navigate (e.g. open a drawer). */
export function PanelFooterButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <div className="mt-auto px-5 pb-5 pt-5 sm:px-6 sm:pb-6">
      <button type="button" onClick={onClick} className={FOOTER_BUTTON}>
        {children}
        <ArrowRight size={13} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
      </button>
    </div>
  );
}

/** Thin orange progress bar on a faint track. */
export function Meter({
  value,
  max,
  label,
  className = "",
}: {
  value: number;
  max: number;
  label: string;
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      className={`h-1.5 w-full overflow-hidden rounded-[1px] bg-white/[0.07] ${className}`}
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
    >
      <div className="h-full rounded-[1px] bg-[#CC6600] transition-[width] duration-500" style={{ width: `${pct}%` }} />
    </div>
  );
}
