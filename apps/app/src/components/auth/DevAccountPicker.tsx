"use client";

import React, { useEffect, useState } from "react";
import { Wrench } from "@phosphor-icons/react";

type DevAccount = { email: string; password: string; fullName: string; role: string; status: string };

const ROLE_LABEL: Record<string, string> = {
  CLIENT: "Client",
  STATISTICIAN: "Statistician",
  SENIOR_QA_LEAD: "QA Lead",
  ADMIN: "Admin",
  CEO: "CEO",
  FINANCE_OFFICER: "Finance",
};

/**
 * Offline dev only: pick a sample account to fill the login form. Rendered only when the build
 * has NEXT_PUBLIC_JAXIS_OFFLINE=1 (set by `npm run dev:offline`); the list itself comes from
 * /api/dev/accounts, which answers only in offline dev. Picking fills the form; the normal
 * password check still runs when you sign in.
 */
export function DevAccountPicker({ onPick }: { onPick: (email: string, password: string) => void }) {
  const [accounts, setAccounts] = useState<DevAccount[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/dev/accounts", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { accounts?: DevAccount[] } | null) => {
        if (!cancelled && body?.accounts) setAccounts(body.accounts);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (accounts.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 rounded-[2px] border border-dashed border-[#CC6600]/40 bg-[#CC6600]/[0.04] p-3">
      <label htmlFor="dev-account" className="flex items-center gap-1.5 text-xs font-medium text-[#F08A2E]">
        <Wrench size={13} weight="fill" />
        Offline mode: sign in as
      </label>
      <select
        id="dev-account"
        defaultValue=""
        onChange={(e) => {
          const a = accounts.find((x) => x.email === e.target.value);
          if (a) onPick(a.email, a.password);
        }}
        className="h-10 w-full rounded-[2px] border border-white/15 bg-[#050513] px-3 text-sm text-white outline-none focus:border-[#CC6600]"
      >
        <option value="" disabled>
          Pick a sample account…
        </option>
        {accounts.map((a) => (
          <option key={a.email} value={a.email} className="bg-[#0A0A18]">
            {ROLE_LABEL[a.role] ?? a.role} · {a.fullName} ({a.email}){a.status !== "ACTIVE" ? ` · ${a.status.toLowerCase()}` : ""}
          </option>
        ))}
      </select>
      <p className="text-[11px] text-white/40">Fills the form below. Only shows in offline mode.</p>
    </div>
  );
}
