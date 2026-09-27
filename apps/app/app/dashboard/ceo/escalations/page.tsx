import React from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getCeoEscalations } from "@/features/qa/actions";
import { PageHeader, Card, Button, Badge, KpiCard } from "@repo/ui";
import {
  IconAlertOctagon,
  IconCheck,
  IconFileText,
  IconShieldLock,
  IconArrowLeft,
} from "@tabler/icons-react";

export default async function CeoEscalationsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/login");
  }

  const role = (session.user as { role?: string }).role;
  if (role !== "CEO" && role !== "ADMIN") {
    redirect("/dashboard");
  }

  const res = await getCeoEscalations();
  const escalations = res.success ? res.data : [];

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-24 w-full animate-content-fade font-sans">
      <PageHeader
        title="Ethical Breach Escalation Desk"
        breadcrumbs={[
          { label: "WORKSPACE", href: "/dashboard" },
          { label: "EXECUTIVE DESK", href: "/dashboard/ceo" },
          { label: "ETHICAL ESCALATIONS" },
        ]}
        badge={
          <Badge variant="danger" className="font-mono text-xs font-bold">
            RULE_ETH_01 LOCKOUT
          </Badge>
        }
        description="Emergency executive queue for flagged statistical data fabrication, p-hacking, and scientific misconduct."
        actions={
          <Link href="/dashboard/ceo">
            <Button variant="secondary" size="sm" className="rounded-[2px] text-xs gap-1.5 cursor-pointer">
              <IconArrowLeft size={14} stroke={2} />
              <span>Return to CEO Desk</span>
            </Button>
          </Link>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-stretch">
        <KpiCard
          label="Active Ethical Lockouts"
          value={escalations.length}
          variant={escalations.length > 0 ? "red" : "default"}
          description={
            escalations.length > 0
              ? "Requires immediate CEO intervention"
              : "Zero active scientific misconduct flags"
          }
        />

        <KpiCard
          label="Executive Protocol"
          value="RULE_ETH_01"
          variant="sky"
          description="Automatic study & file lockout policy"
        />

        <KpiCard
          label="Platform Integrity Score"
          value={escalations.length === 0 ? "100%" : "Under Audit"}
          variant={escalations.length === 0 ? "emerald" : "amber"}
          description="Institutional dual-blind verification"
        />
      </div>

      {/* Escalation Incidents Queue */}
      <Card className="p-0 overflow-hidden border border-white/10 bg-[#0A0A18]/90 rounded-[2px] flex flex-col">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <IconShieldLock size={22} stroke={2} className="text-red-400" />
            <div>
              <h2 className="text-base font-bold text-white font-sans">
                Locked Research Studies Under Ethical Review
              </h2>
              <p className="text-xs text-white/60 mt-0.5">
                Studies locked by Senior QA Leads pending CEO inquiry, disciplinary action, or study termination
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-white/50">{escalations.length} Incident(s)</span>
        </div>

        {escalations.length === 0 ? (
          <div className="p-16 text-center text-white/50 text-sm font-sans flex flex-col items-center justify-center gap-3">
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-full">
              <IconCheck size={28} stroke={2} className="text-emerald-400" />
            </div>
            <span className="font-bold text-white text-base">Zero Active Ethical Escalations</span>
            <p className="text-xs text-white/40 max-w-md">
              No scientific data fabrication or academic dishonesty breaches are currently flagged. All active studies are
              adhering to rigorous empirical reproducibility standards.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {escalations.map((item) => (
              <div key={item.id} className="p-6 hover:bg-white/[0.02] transition-colors flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="danger" className="font-mono text-xs font-bold px-2 py-0.5">
                      LOCKED • ETHICAL_BREACH
                    </Badge>
                    <span className="font-mono text-xs font-bold text-[#CC6600]">
                      {item.intakeId}
                    </span>
                    <span className="text-sm font-bold text-white">{item.researchTitle}</span>
                  </div>

                  <span className="text-xs font-mono text-white/40">
                    Escalated on:{" "}
                    {new Date(item.escalatedAt).toLocaleString("en-PH", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                {/* Specialist Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-black/25 rounded-[2px] border border-white/5">
                    <span className="text-[0.625rem] font-mono uppercase text-white/40 block mb-0.5">
                      Flagged By (Senior QA Lead):
                    </span>
                    <span className="font-semibold text-white">{item.qaLeadName}</span>
                    <span className="text-white/50 text-[0.688rem] block">{item.qaLeadEmail}</span>
                  </div>

                  <div className="p-3 bg-black/25 rounded-[2px] border border-white/5">
                    <span className="text-[0.625rem] font-mono uppercase text-white/40 block mb-0.5">
                      Assigned Lead Statistician:
                    </span>
                    <span className="font-semibold text-white">{item.statisticianName}</span>
                    <span className="text-white/50 text-[0.688rem] block">{item.statisticianEmail}</span>
                  </div>

                  <div className="p-3 bg-black/25 rounded-[2px] border border-white/5">
                    <span className="text-[0.625rem] font-mono uppercase text-white/40 block mb-0.5">
                      Package Tier:
                    </span>
                    <span className="font-semibold text-[#CC6600]">
                      {item.packageName || "Empirical Research"}
                    </span>
                    <span className="text-white/50 text-[0.688rem] block">Institutional Escrow</span>
                  </div>
                </div>

                {/* Flag Reason */}
                <div className="p-4 bg-red-950/30 border border-red-500/30 rounded-[2px] flex flex-col gap-1.5 text-xs text-red-200">
                  <span className="font-mono text-[0.625rem] uppercase text-red-400 font-bold">
                    QA Scorecard Findings &amp; Evidence:
                  </span>
                  <p className="text-slate-200 leading-relaxed font-sans">{item.comments}</p>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                  <Link href={`/dashboard/admin/projects/${item.projectId}/analysis`}>
                    <Button variant="outline" size="sm" className="rounded-[2px] text-xs gap-1.5 cursor-pointer">
                      <IconFileText size={14} stroke={2} />
                      <span>Inspect Audit Vault</span>
                    </Button>
                  </Link>

                  <Link href={`/dashboard/admin/projects/${item.projectId}`}>
                    <Button variant="primary" size="sm" className="rounded-[2px] text-xs font-semibold gap-1.5 cursor-pointer">
                      <IconAlertOctagon size={14} stroke={2} />
                      <span>Manage Study Case</span>
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
