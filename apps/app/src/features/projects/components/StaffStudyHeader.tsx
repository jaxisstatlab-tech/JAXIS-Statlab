"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PageHeader, CopyButton, Toast } from "@repo/ui";
import { getProjectById } from "../actions";
import { getClientStage } from "../client-stage";
import { getProjectDisplayStatus } from "@/lib/project-rules";
import { ClientStudyStepper } from "./ClientStudyStepper";

export interface StaffStudyHeaderData {
  id: string;
  intakeId: string;
  title: string;
  status: string;
  clientName: string;
  due: string | null;
}

export interface StaffStudyTab {
  label: string;
  /** Path after the study base; a full "/dashboard/…" path links outside the study pages. */
  path: string;
  also?: string[];
}

/**
 * Staff version of the shared study header: study title, copy ID, client, due date, status in
 * staff words, the 5-step tracker and the role's tabs. Lives in each role's study layout.
 */
export function StaffStudyHeader({
  initial,
  base,
  home,
  tabs,
  role,
}: {
  initial: StaffStudyHeaderData;
  /** e.g. /dashboard/qa/projects/abc */
  base: string;
  home: { label: string; href: string };
  tabs: StaffStudyTab[];
  role: string;
}) {
  const pathname = usePathname() ?? "";
  const [study, setStudy] = useState(initial);
  const [copied, setCopied] = useState<string | null>(null);
  const firstPath = useRef(pathname);

  // Actions on one tab (submit for QA, approve, release) move the study on; refresh on tab switch.
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
  const status = getProjectDisplayStatus({ masterStatus: study.status }, role);
  const current = pathname.startsWith(base) ? pathname.slice(base.length).replace(/\/$/, "") : pathname;
  const active =
    tabs.find((t) => t.path === current || t.also?.some((p) => current.startsWith(p)))?.path ??
    tabs.find((t) => t.path && !t.path.startsWith("/dashboard") && current.startsWith(t.path))?.path ??
    null;
  const due = study.due
    ? new Date(study.due).toLocaleDateString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric" })
    : null;

  return (
    <div className="flex shrink-0 flex-col print:hidden">
      {copied ? (
        <Toast message="Study ID copied" description={`${copied} is on your clipboard.`} variant="info" onClose={() => setCopied(null)} />
      ) : null}
      <PageHeader
        breadcrumbs={[{ label: "WORKSPACE", href: "/dashboard" }, home, { label: study.intakeId }]}
        title={study.title}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <CopyButton value={study.intakeId} label={study.intakeId} variant="badge" onCopy={(v) => setCopied(v)} />
            <span>
              Client: <span className="text-white/85">{study.clientName}</span>
            </span>
            {due ? (
              <span>
                Due: <span className="text-white/85">{due}</span>
              </span>
            ) : null}
          </span>
        }
        actions={
          <span
            title={status.description}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-[2px] border border-white/10 bg-white/[0.04] px-2 py-0.5 font-sans text-xs font-medium text-white/80"
          >
            {status.pulse ? <span className="h-1.5 w-1.5 rounded-full bg-[#CC6600]" /> : null}
            {status.label}
          </span>
        }
        className="border-b-0 pb-0 sm:pb-0"
      />

      {active === "/messages" ? null : <ClientStudyStepper stage={stage} className="mt-5" />}

      <nav aria-label="Study pages" className="-mx-1 mt-5 overflow-x-auto border-b border-white/[0.08] px-1">
        <ul className="flex min-w-max gap-1">
          {tabs.map((t) => {
            const on = t.path === active;
            const href = t.path.startsWith("/dashboard") ? t.path : `${base}${t.path}`;
            return (
              <li key={t.label}>
                <Link
                  href={href}
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
