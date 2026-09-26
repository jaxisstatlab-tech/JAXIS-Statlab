import { LockKey, ShieldCheck } from "@phosphor-icons/react/dist/ssr";

// Small reassurance line under the main button.
export function AuthTrust() {
  return (
    <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 font-mono text-[11px] text-white/45">
      <span className="inline-flex items-center gap-1.5">
        <ShieldCheck size={13} weight="fill" className="text-white/35" />
        Checked by 2 statisticians
      </span>
      <span className="inline-flex items-center gap-1.5">
        <LockKey size={13} weight="fill" className="text-white/35" />
        Your data stays private
      </span>
    </p>
  );
}
