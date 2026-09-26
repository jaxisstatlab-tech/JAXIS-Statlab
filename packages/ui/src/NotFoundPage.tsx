import { Clock, File, Key, LinkSimple, Question, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import { NotFoundPath } from "./NotFoundPath";

type Action = { href: string; label: string };

export interface NotFoundPageProps {
  primary: Action;
  secondary?: Action;
  brandHref?: string;
  registry?: string;
}

const COLUMNS: { icon: Icon; label: string; width: string }[] = [
  { icon: Key, label: "ID", width: "w-[14%]" },
  { icon: LinkSimple, label: "Page_path", width: "w-[22%]" },
  { icon: Clock, label: "Updated", width: "w-[26%]" },
  { icon: ShieldCheck, label: "Status", width: "w-[20%]" },
  { icon: File, label: "Type", width: "w-[18%]" },
];

const SKELETON = [
  [40, 70, 80, 55, 30],
  [30, 60, 70, 45, 35],
  [35, 55, 60, 50, 25],
];

const STYLES = `
.jx404-in{opacity:0;transform:translateY(10px);animation:jx404-rise .8s cubic-bezier(.23,1,.32,1) forwards}
.jx404-bar{background:linear-gradient(90deg,rgba(255,255,255,.06),rgba(255,255,255,.12),rgba(255,255,255,.06));background-size:200% 100%;animation:jx404-shimmer 2.4s linear infinite}
@keyframes jx404-rise{to{opacity:1;transform:none}}
@keyframes jx404-shimmer{from{background-position:200% 0}to{background-position:-200% 0}}
@media (prefers-reduced-motion:reduce){.jx404-in{animation:none;opacity:1;transform:none}.jx404-bar{animation:none}}
`;

export function NotFoundPage({ primary, secondary, brandHref = "/", registry = "jaxis-statlab" }: NotFoundPageProps) {
  return (
    <div className="flex min-h-dvh w-full flex-col bg-[#010114] text-white">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      <header className="flex h-20 items-center justify-center px-6">
        <a href={brandHref} className="flex items-center gap-2.5" aria-label="JAXIS StatLab home">
          <img src="/jaxislogo.png" alt="" width={22} height={22} className="h-[22px] w-[22px]" />
          <span className="font-sans text-[15px] font-semibold tracking-[-0.01em] text-white">
            JAXIS <span className="font-normal text-white/60">StatLab</span>
          </span>
        </a>
      </header>

      <main className="flex flex-1 justify-center px-6 pb-20 pt-10 sm:pt-16">
        <div className="w-full max-w-[34rem]">
          <div className="jx404-in font-mono text-xs uppercase tracking-[0.15em] text-white/60">HTTP 404</div>
          <h1
            className="jx404-in pt-4 font-sans text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl"
            style={{ animationDelay: "80ms" }}
          >
            Page not found
          </h1>
          <p
            className="jx404-in pt-5 font-mono text-sm leading-relaxed text-white/60"
            style={{ animationDelay: "160ms" }}
          >
            This page doesn&apos;t exist. It may have moved, been removed, or the link might be wrong. Use the buttons below
            to get back on track.
          </p>

          <div className="jx404-in mt-7 flex flex-wrap gap-3" style={{ animationDelay: "240ms" }}>
            <a
              href={primary.href}
              className="inline-flex h-11 items-center justify-center rounded-[2px] bg-[#CC6600] px-6 font-sans text-sm font-medium text-white transition-[background-color,transform] duration-150 ease-out hover:bg-[#E67300] active:scale-[0.97]"
            >
              {primary.label}
            </a>
            {secondary ? (
              <a
                href={secondary.href}
                className="inline-flex h-11 items-center justify-center rounded-[2px] border border-white/20 px-6 font-sans text-sm font-medium text-white transition-[background-color,border-color,transform] duration-150 ease-out hover:border-white/40 hover:bg-white/[0.04] active:scale-[0.97]"
              >
                {secondary.label}
              </a>
            ) : null}
          </div>

          <div
            className="jx404-in mt-16 overflow-hidden rounded-[2px] border border-white/10 bg-[#010D1F]"
            style={{ animationDelay: "340ms" }}
          >
            <div className="flex border-b border-white/10 bg-white/[0.02]">
              {COLUMNS.map(({ icon: ColumnIcon, label, width }, i) => (
                <div
                  key={label}
                  className={`${width} flex min-w-0 items-center gap-1.5 px-3 py-2.5 font-mono text-[9.5px] uppercase tracking-wider text-white/45 ${
                    i > 0 ? "border-l border-white/[0.06]" : ""
                  }`}
                >
                  <ColumnIcon size={11} weight="fill" className="shrink-0 text-white/40" />
                  <span className="truncate">{label}</span>
                </div>
              ))}
            </div>

            <div aria-hidden="true" className="[mask-image:linear-gradient(to_bottom,black,transparent)]">
              {SKELETON.map((row, r) => (
                <div key={r} className="flex border-b border-white/[0.04]">
                  {row.map((w, c) => (
                    <div key={c} className={`${COLUMNS[c]!.width} px-3 py-3.5 ${c > 0 ? "border-l border-white/[0.04]" : ""}`}>
                      <span className="jx404-bar block h-1.5 rounded-[1px]" style={{ width: `${w}%`, animationDelay: `${(r + c) * 120}ms` }} />
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="flex flex-col items-center px-6 pb-14 pt-8 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-[2px] border border-dashed border-white/20 text-white/45">
                <Question size={20} weight="fill" />
              </span>
              <p className="pt-5 font-sans text-base font-semibold text-white">No page at this path</p>
              <p className="pt-1.5 font-mono text-xs text-white/50">This address doesn&apos;t match any page on this site.</p>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-white/10 px-4 py-2.5 font-mono text-[10px] text-white/45">
              <span className="min-w-0 truncate">
                page_registry · {registry} · <NotFoundPath />
              </span>
              <span className="shrink-0">0 results</span>
            </div>
          </div>
        </div>
      </main>

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
