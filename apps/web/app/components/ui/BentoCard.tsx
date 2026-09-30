import type { ReactNode } from "react";
import Reveal from "./Reveal";
import { cardDesc, cardTitle } from "./styles";

// One cell of a joined hairline grid (Services, Your account): title, short description, index, then its art.
export default function BentoCard({
  index,
  title,
  desc,
  children,
  className = "",
  delay = 0,
  align = "end",
}: {
  index: string;
  title: string;
  desc: string;
  children: ReactNode;
  className?: string;
  delay?: number;
  align?: "center" | "end";
}) {
  return (
    <article className={`bento-tile relative flex flex-col overflow-hidden bg-[#0A0A18] ${className}`}>
      <Reveal delay={delay} className="flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-4 px-7 pt-7 sm:px-8 sm:pt-8">
          <div>
            <h3 className={`${cardTitle} mb-1.5 lg:text-xl`}>{title}</h3>
            <p className={`${cardDesc} max-w-[44ch] text-pretty`}>{desc}</p>
          </div>
          <span className="pt-1 font-mono text-[11px] tabular-nums text-white/30">{index}</span>
        </div>
        <div className={`relative flex flex-1 ${align === "end" ? "items-end" : "items-center"}`}>{children}</div>
      </Reveal>
    </article>
  );
}
