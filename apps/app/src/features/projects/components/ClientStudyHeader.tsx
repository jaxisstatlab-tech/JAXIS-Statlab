"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PageHeader, CopyButton, Toast } from "@repo/ui";
import { getProjectById } from "../actions";
import { getClientStage } from "../client-stage";
import { ClientStageTag, ClientStudyStepper } from "./ClientStudyStepper";

export interface StudyHeaderData {
  id: string;
  intakeId: string;
  title: string;
  status: string;
  createdAt: string;
}

type Tab = { label: string; path: string; also?: string[] };

/** Which of the study's pages exist yet, based on how far the study has come. */
function tabsFor(step: number): Tab[] {
  const tabs: Tab[] = [{ label: "Overview", path: "" }, { label: "Price", path: "/quote" }];
  if (step >= 1) tabs.push({ label: "Agreement", path: "/sow" });
  if (step >= 2) tabs.push({ label: "Payment", path: "/payment" });
  tabs.push({ label: "Messages", path: "/messages" });
  if (step >= 4) tabs.push({ label: "Files", path: "/deliverables", also: ["/revision"] });
  return tabs;
}

/**
 * The same top section on every page of one study: title, study ID, stage, the 5-step tracker,
 * and tabs to move between the study's pages. Lives in the study layout, so it stays put while
 * switching tabs and refreshes its stage on each switch.
 */
export function ClientStudyHeader({ initial }: { initial: StudyHeaderData }) {
  const pathname = usePathname() ?? "";
  const [study, setStudy] = useState(initial);
  const [copied, setCopied] = useState<string | null>(null);
  const firstPath = useRef(pathname);

  // After an action on one tab (accept a price, sign, pay) the stage may have moved on.
  useEffect(() => {
    if (pathname === firstPath.current) return;
    let cancelled = false;
    getProjectById(initial.id)
      .then((res) => {
        if (!cancelled && res.success && res.data) {
          setStudy((s) => ({ ...s, title: res.data.researchTitle, status: res.data.masterStatus }));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pathname, initial.id]);

  const stage = getClientStage(study.status);
  const base = `/dashboard/client/projects/${study.id}`;
  const current = pathname.startsWith(base) ? pathname.slice(base.length).replace(/\/$/, "") : "";
  const tabs = tabsFor(stage.step);
  const active =
    tabs.find((t) => t.path === current || t.also?.some((p) => current.startsWith(p)))?.path ??
    tabs.find((t) => t.path && current.startsWith(t.path))?.path ??
    "";
  const submitted = new Date(study.createdAt).toLocaleDateString("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="flex shrink-0 flex-col print:hidden">
      {copied ? (
        <Toast message="Study ID copied" description={`${copied} is on your clipboard.`} variant="info" onClose={() => setCopied(null)} />
      ) : null}
      <PageHeader
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "My Studies", href: "/dashboard/client" },
          { label: study.intakeId },
        ]}
        title={study.title}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <CopyButton value={study.intakeId} label={study.intakeId} variant="badge" onCopy={(v) => setCopied(v)} />
            <span>Sent {submitted}</span>
          </span>
        }
        actions={<ClientStageTag stage={stage} />}
        className="border-b-0 pb-0 sm:pb-0"
      />

      {/* The chat needs the room, so the tracker hides on the Messages tab. */}
      {active === "/messages" ? null : <ClientStudyStepper stage={stage} className="mt-5" />}

      <nav aria-label="Study pages" className="-mx-1 mt-5 overflow-x-auto border-b border-white/[0.08] px-1">
        <ul className="flex min-w-max gap-1">
          {tabs.map((t) => {
            const on = t.path === active;
            return (
              <li key={t.label}>
                <Link
                  href={`${base}${t.path}`}
                  aria-current={on ? "page" : undefined}
                  className={`relative block px-3 pb-3 pt-1 text-sm transition-colors ${
                    on ? "font-semibold text-white" : "text-white/55 hover:text-white"
                  }`}
                >
                  {t.label}
                  {on ? <span className="absolute inset-x-3 -bottom-px h-0.5 bg-[#CC6600]" /> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
