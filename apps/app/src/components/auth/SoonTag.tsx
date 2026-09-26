// Small "Soon" marker for sign-in options that are switched off for now.
export function SoonTag({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-[2px] border border-white/15 px-1.5 py-px font-mono text-[9.5px] font-medium uppercase tracking-wider text-white/50 ${className}`}
    >
      Soon
    </span>
  );
}
