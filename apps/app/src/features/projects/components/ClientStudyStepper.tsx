import { Check } from "@phosphor-icons/react/dist/ssr";
import { CLIENT_STEPS, type ClientStage } from "../client-stage";

// The 5 client steps as one segmented track: finished steps get a check, the current one is lit.
// Stopped studies (on hold, cancelled, expired) show the track dimmed at the step they stopped on.
export function ClientStudyStepper({ stage, className = "" }: { stage: ClientStage; className?: string }) {
  const stopped = stage.tone === "stopped";
  const finished = stage.tone === "done";

  return (
    <ol className={`grid grid-cols-5 gap-2 ${className}`} aria-label="Study progress">
      {CLIENT_STEPS.map((name, i) => {
        const done = i < stage.step || (finished && i === stage.step);
        const current = i === stage.step && !finished;
        return (
          <li key={name} className="flex min-w-0 flex-col gap-2" aria-current={current ? "step" : undefined}>
            <span
              className={`h-1 rounded-[1px] ${
                current ? (stopped ? "bg-white/30" : "bg-[#CC6600]") : done ? "bg-white/45" : "bg-white/[0.08]"
              }`}
            />
            <span
              className={`flex items-center gap-1 truncate font-sans text-[11px] sm:gap-1.5 sm:text-xs ${
                current ? "font-semibold text-white" : done ? "text-white/65" : "text-white/35"
              }`}
            >
              {done ? <Check size={11} weight="bold" className="hidden shrink-0 text-white/55 sm:block" /> : null}
              {name}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// Status tag: orange only when the client needs to act; everything else stays neutral.
export function ClientStageTag({ stage, className = "" }: { stage: ClientStage; className?: string }) {
  const tone =
    stage.tone === "action"
      ? "border-[#CC6600]/50 bg-[#CC6600]/10 text-[#FFA040]"
      : stage.tone === "done"
        ? "border-white/20 bg-white/[0.06] text-white"
        : stage.tone === "stopped"
          ? "border-white/10 bg-transparent text-white/50"
          : "border-white/10 bg-white/[0.04] text-white/70";
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-[2px] border px-2 py-0.5 font-sans text-xs font-medium ${tone} ${className}`}
    >
      {stage.tone === "action" ? <span className="h-1.5 w-1.5 rounded-full bg-[#CC6600]" /> : null}
      {stage.label}
    </span>
  );
}
