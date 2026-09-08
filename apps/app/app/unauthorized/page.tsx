"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button, Card, LoadingState } from "@repo/ui";
import { Warning } from "@phosphor-icons/react";

function UnauthorizedContent() {
  const searchParams = useSearchParams();
  const requiredRole = searchParams.get("role") || "RESTRICTED";

  return (
    <div className="min-h-screen w-full bg-[#010114] text-white flex items-center justify-center p-6 font-sans selection:bg-[#CC6600]/30 selection:text-white">
      <Card className="max-w-md w-full p-8 border border-white/[0.12] bg-[#01142B]/90 backdrop-blur-xl rounded-[2px] shadow-2xl flex flex-col items-center text-center">
        {/* Warning Icon Emblem */}
        <div className="h-14 w-14 rounded-[2px] bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 mb-6 shadow-inner">
          <Warning size={28} weight="fill" />
        </div>

        {/* Status Stamp */}
        <span className="px-3 py-1 rounded-[2px] bg-red-500/15 border border-red-500/30 text-red-400 font-mono text-xs font-semibold uppercase tracking-widest mb-3">
          403 Access Forbidden
        </span>

        <h1 className="text-2xl font-bold text-white tracking-tight mb-2">
          Stakeholder Desk Restricted
        </h1>

        <p className="text-sm text-slate-400 leading-relaxed mb-6">
          Your current session role does not have administrative clearance to access this department console.
        </p>

        {/* Security Audit Notice */}
        <div className="w-full p-3.5 rounded-[2px] bg-white/[0.03] border border-white/[0.08] text-left text-xs font-mono text-slate-300 mb-6 space-y-1">
          <div className="flex justify-between">
            <span className="text-white/40 uppercase">Required Clearance:</span>
            <span className="text-[#CC6600] font-bold">{requiredRole}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/40 uppercase">Audit Enforcement:</span>
            <span className="text-emerald-400">RULE_ETH_01 ACTIVE</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Link href="/dashboard" className="flex-1">
            <Button variant="primary" size="md" className="w-full rounded-[2px]">
              Return to Workspace
            </Button>
          </Link>
          <Link href="/login" className="flex-1">
            <Button variant="secondary" size="md" className="w-full rounded-[2px]">
              Switch Account
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

export default function UnauthorizedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full bg-[#010114] flex items-center justify-center p-6">
          <LoadingState variant="card" label="Verifying access..." />
        </div>
      }
    >
      <UnauthorizedContent />
    </Suspense>
  );
}
