"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@repo/ui";
import { ArrowCircleUp, CaretRight, PlusCircle, Wrench } from "@phosphor-icons/react";
import { KIND_LABEL, ROLE_LABEL, SEEN_EVENT, seenKey, type ChangeItem, type ChangeKind, type Release, type Role } from "@/features/whats-new/changelog";

// The update log as a timeline: date and version on the left, each release's changes on the right, grouped under
// Added / Improved / Fixed. Releases this person hadn't opened yet get an orange dot and a "New" tag; opening the
// page marks them read (so the sidebar dot goes away). The CEO sees every change and can sort them by role: "All roles"
// groups each release by who it's for; picking a role shows exactly what that role sees.

const GROUPS: Array<{ kind: ChangeKind; label: string; Icon: typeof PlusCircle }> = [
  { kind: "new", label: "Added", Icon: PlusCircle },
  { kind: "improved", label: "Improved", Icon: ArrowCircleUp },
  { kind: "fixed", label: "Fixed", Icon: Wrench },
];

const ROLE_ORDER: Role[] = ["CLIENT", "STATISTICIAN", "SENIOR_QA_LEAD", "ADMIN", "FINANCE_OFFICER", "CEO"];
type RoleView = "ALL_ROLES" | Role;

/** "Everyone", "Clients", "Analysts and Reviewers", "Clients, Reviewers and Admins". */
const audience = (item: ChangeItem) => {
  if (item.roles.includes("ALL")) return "Everyone";
  const names = ROLE_ORDER.filter((r) => item.roles.includes(r)).map((r) => ROLE_LABEL[r]);
  return names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
};
/** Sort key so groups follow the sidebar's role order, with Everyone first. */
const audienceRank = (item: ChangeItem) =>
  item.roles.includes("ALL") ? -1 : Math.min(...item.roles.map((r) => ROLE_ORDER.indexOf(r as Role)).filter((i) => i >= 0)) * 10 + item.roles.length;
const seenBy = (item: ChangeItem, role: Role) => item.roles.includes("ALL") || item.roles.includes(role);

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

  // CEO only: which role's updates to show.
  const [view, setView] = useState<RoleView>("ALL_ROLES");
  const roleCounts = useMemo(
    () =>
      Object.fromEntries(
        ROLE_ORDER.map((role) => [role, releases.reduce((n, r) => n + r.items.filter((i) => seenBy(i, role)).length, 0)])
      ) as Record<Role, number>,
    [releases]
  );
  const shown = useMemo(
    () =>
      view === "ALL_ROLES"
        ? releases
        : releases.map((r) => ({ ...r, items: r.items.filter((i) => seenBy(i, view)) })).filter((r) => r.items.length > 0),
    [releases, view]
  );
  const byRole = showAudience && view === "ALL_ROLES";

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

      {showAudience && releases.length > 0 ? (
        <div role="tablist" aria-label="Show updates for" className="flex flex-wrap gap-1.5">
          {(["ALL_ROLES", ...ROLE_ORDER] as RoleView[]).map((v) => {
            const on = view === v;
            const count = v === "ALL_ROLES" ? releases.reduce((n, r) => n + r.items.length, 0) : roleCounts[v];
            return (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setView(v)}
                className={`inline-flex h-8 items-center gap-1.5 rounded-[2px] border px-3 text-[13px] transition-colors active:scale-[0.97] ${
                  on ? "border-white/20 bg-white/[0.08] text-white" : "border-white/[0.08] text-white/60 hover:border-white/20 hover:text-white"
                }`}
              >
                {v === "ALL_ROLES" ? "All roles" : ROLE_LABEL[v]}
                <span className={`font-mono text-[11px] ${on ? "text-white/60" : "text-white/35"}`}>{count}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {releases.length === 0 ? (
        <p className="text-[15px] text-white/55">Nothing yet. New features and fixes will be listed here.</p>
      ) : (
        <ol className="relative">
          {shown.map((r, index) => {
            const fresh = isNew(r);
            const last = index === shown.length - 1;
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
                    {byRole
                      ? groupByAudience(r.items).map(([who, items]) => (
                          <section key={who}>
                            <h3 className="text-[13px] font-semibold text-white/60">For {who === "Everyone" ? "everyone" : who}</h3>
                            <ul className="mt-2.5 flex flex-col gap-5 border-l border-white/[0.08] pl-4">
                              {items.map((item, i) => (
                                <Entry key={i} item={item} tag={KIND_LABEL[item.kind]} />
                              ))}
                            </ul>
                          </section>
                        ))
                      : GROUPS.map(({ kind, label, Icon }) => {
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
                                  <Entry key={i} item={item} />
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
    <p className="flex flex-wrap items-center gap-1 text-[12px]" aria-label={`Where: ${steps.join(", then ")}`}>
      {steps.map((step, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          {i > 0 ? <CaretRight size={10} weight="bold" className="text-white/30" aria-hidden="true" /> : null}
          <span className="rounded-[2px] border border-white/10 bg-white/[0.05] px-1.5 py-0.5 text-white/80">{step}</span>
        </span>
      ))}
    </p>
  );
}

/** Items grouped by who they're for (Everyone first, then in role order); Added before Improved before Fixed. */
function groupByAudience(items: ChangeItem[]): Array<[string, ChangeItem[]]> {
  const kindOrder: ChangeKind[] = ["new", "improved", "fixed"];
  const sorted = [...items].sort((a, b) => audienceRank(a) - audienceRank(b) || kindOrder.indexOf(a.kind) - kindOrder.indexOf(b.kind));
  const groups: Array<[string, ChangeItem[]]> = [];
  for (const item of sorted) {
    const who = audience(item);
    const group = groups.find(([g]) => g === who);
    if (group) group[1].push(item);
    else groups.push([who, [item]]);
  }
  return groups;
}

function Entry({ item, tag }: { item: ChangeItem; tag?: string }) {
  return (
    <li className="flex flex-col gap-1">
      {item.where?.length || tag ? (
        <div className="flex flex-wrap items-center gap-2">
          {tag ? <span className="text-[11px] font-medium uppercase tracking-wider text-white/40">{tag}</span> : null}
          {item.where?.length ? <Where steps={item.where} /> : null}
        </div>
      ) : null}
      {item.title ? (
        <>
          <p className="text-[15px] font-semibold leading-6 text-white">{item.title}</p>
          <p className="text-[14px] leading-6 text-white/65">{item.text}</p>
        </>
      ) : (
        <p className="text-[15px] leading-7 text-white/85">{item.text}</p>
      )}
    </li>
  );
}
