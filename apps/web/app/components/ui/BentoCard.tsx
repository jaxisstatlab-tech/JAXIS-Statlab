import type { ReactNode } from "react";
import { cardDesc, cardTitle } from "./styles";

// One cell of a joined hairline grid (Services, Your account): title, short description, index, then its art.
export default function BentoCard({
  index,
  title,
  desc,
  children,
  className = "",
  align = "end",
  slide = false,
}: {
  index: string;
  title: string;
  desc: string;
  children: ReactNode;
  className?: string;
  align?: "center" | "end";
  /** In a phone swipe carousel: a full-width slide that snaps into place. */
  slide?: boolean;
}) {
  return (
    <article
      className={`bento-tile relative flex flex-col overflow-hidden bg-[#0A0A18] ${slide ? "max-sm:w-full max-sm:shrink-0 max-sm:snap-start" : ""} ${className}`}
    >
      <div className="flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-4 px-7 pt-7 sm:px-8 sm:pt-8">
          <div>
            <h3 className={`${cardTitle} mb-1.5 lg:text-xl`}>{title}</h3>
            <p className={`${cardDesc} max-w-[44ch] text-pretty`}>{desc}</p>
          </div>
          <span className="pt-1 font-mono text-[11px] tabular-nums text-white/30">{index}</span>
        </div>
        <div className={`relative flex flex-1 ${align === "end" ? "items-end" : "items-center"}`}>{children}</div>
      </div>
    </article>
  );
}
