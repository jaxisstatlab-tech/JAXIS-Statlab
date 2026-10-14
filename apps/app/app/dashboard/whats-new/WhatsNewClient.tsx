"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@repo/ui";
import { ArrowCircleUp, CaretRight, PlusCircle, Wrench } from "@phosphor-icons/react";
import { ROLE_LABEL, SEEN_EVENT, seenKey, type ChangeItem, type ChangeKind, type Release, type Role } from "@/features/whats-new/changelog";

// The update log as a timeline: date and version on the left, each release's changes on the right, grouped under
// Added / Improved / Fixed. Releases this person hadn't opened yet get an orange dot and a "New" tag; opening the
// page marks them read (so the sidebar dot goes away). The CEO also sees who each change is for.

const GROUPS: Array<{ kind: ChangeKind; label: string; Icon: typeof PlusCircle }> = [
  { kind: "new", label: "Added", Icon: PlusCircle },
  { kind: "improved", label: "Improved", Icon: ArrowCircleUp },
  { kind: "fixed", label: "Fixed", Icon: Wrench },
];

const audience = (item: ChangeItem) =>
  item.roles.includes("ALL") ? "Everyone" : item.roles.map((role) => ROLE_LABEL[role as Role] ?? role).join(", ");

export function WhatsNewClient({ releases, email, showAudience }: { releases: Release[]; email?: string; showAudience: boolean }) {
  // The newest release opened before this visit; undefined until read in the browser (so nothing is tagged on the server).
  const [seenBefore, setSeenBefore] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const key = seenKey(email);
    let seen: string | null = null;
    try {
      seen = window.localStorage.getItem(key);
      if (releases[0]) window.localStorage.setItem(key, releases[0].id);
    } catch {
      // storage blocked: nothing to remember
    }
    setSeenBefore(seen);
    window.dispatchEvent(new Event(SEEN_EVENT));
  }, [email, releases]);

  const isNew = (r: Release) => seenBefore !== undefined && (!seenBefore || r.id > seenBefore);
  const newCount = releases.filter(isNew).length;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-24 font-sans animate-content-fade">
      <PageHeader
        title="What's new"
        description={
          releases.length === 0
            ? "Updates to JAXIS StatLab will show up here."
            : newCount > 0
              ? `${newCount} ${newCount === 1 ? "update" : "updates"} since you last looked.`
              : "The latest changes to JAXIS StatLab for you."
        }
        breadcrumbs={[{ label: "WORKSPACE", href: "/dashboard" }, { label: "What's new" }]}
      />

      {releases.length === 0 ? (
        <p className="text-[15px] text-white/55">Nothing yet. New features and fixes will be listed here.</p>
      ) : (
        <ol className="relative">
          {releases.map((r, index) => {
            const fresh = isNew(r);
            const last = index === releases.length - 1;
            return (
              <li key={r.id} className="relative grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-4 lg:grid-cols-[11rem_1.25rem_minmax(0,1fr)] lg:gap-x-6">
                {/* Date and version (wide screens) */}
                <div className="hidden pt-0.5 text-right lg:block">
                  <p className="text-sm text-white/75">{r.date}</p>
                  <p className="mt-1 font-mono text-xs text-white/40">v{r.version}</p>
                </div>

                {/* Timeline: a dot per release (orange while unread) on a thin line */}
                <div className="relative flex justify-center" aria-hidden="true">
                  {!last ? <span className="absolute bottom-0 top-3 w-px bg-white/[0.09]" /> : null}
                  <span
                    className={`relative mt-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-[#010114] ${fresh ? "bg-[#CC6600]" : "bg-white/25"}`}
                  />
                </div>

                <article aria-labelledby={`release-${r.id}`} className={last ? "pb-2" : "pb-14"}>
                  <p className="mb-1.5 text-xs text-white/50 lg:hidden">
                    {r.date} · <span className="font-mono">v{r.version}</span>
                  </p>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 id={`release-${r.id}`} className="text-xl font-semibold tracking-[-0.01em] text-white">
                      {r.title}
                    </h2>
                    {fresh ? (
                      <span className="rounded-[2px] bg-[#CC6600] px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase text-white">New</span>
                    ) : null}
                  </div>

                  <div className="mt-5 flex max-w-3xl flex-col gap-6">
                    {GROUPS.map(({ kind, label, Icon }) => {
                      const items = r.items.filter((i) => i.kind === kind);
                      if (items.length === 0) return null;
                      return (
                        <section key={kind}>
                          <h3 className="flex items-center gap-2 text-[13px] font-semibold text-white/60">
                            <Icon size={15} weight="fill" className="text-white/45" />
                            {label}
                          </h3>
                          <ul className="mt-2.5 flex flex-col gap-5 border-l border-white/[0.08] pl-4">
                            {items.map((item, i) => (
                              <li key={i} className="flex flex-col gap-1">
                                {item.where?.length ? <Where steps={item.where} /> : null}
                                {item.title ? (
                                  <>
                                    <p className="text-[15px] font-semibold leading-6 text-white">{item.title}</p>
                                    <p className="text-[14px] leading-6 text-white/65">{item.text}</p>
                                  </>
                                ) : (
                                  <p className="text-[15px] leading-7 text-white/85">{item.text}</p>
                                )}
                                {showAudience ? <p className="text-[12px] text-white/40">For: {audience(item)}</p> : null}
                              </li>
                            ))}
                          </ul>
                        </section>
                      );
                    })}
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

/** Where to find the change: "My studies › a study › Price", page names highlighted. */
function Where({ steps }: { steps: string[] }) {
  return (
    <p className="mb-0.5 flex flex-wrap items-center gap-1 text-[12px]" aria-label={`Where: ${steps.join(", then ")}`}>
      {steps.map((step, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          {i > 0 ? <CaretRight size={10} weight="bold" className="text-white/30" aria-hidden="true" /> : null}
          <span className="rounded-[2px] border border-white/10 bg-white/[0.05] px-1.5 py-0.5 text-white/80">{step}</span>
        </span>
      ))}
    </p>
  );
}
