// "or with email" divider: two hairlines either side of the label, no background box, so it sits
// cleanly on the panel's gradient.
export function AuthDivider({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3" role="separator">
      <span className="h-px flex-1 bg-white/10" />
      <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-white/40">{children}</span>
      <span className="h-px flex-1 bg-white/10" />
    </div>
  );
}
