import React from "react";
import { CheckCircle } from "@phosphor-icons/react/ssr";
import { analysisGoalsFor } from "../analysis-goals";

/**
 * Staff view of what the client wants the analysis to do (intake form), with the tests each goal usually calls
 * for, to help choose a package and price the study.
 */
export function AnalysisGoalsList({ codes, compact = false }: { codes?: string[] | null; compact?: boolean }) {
  const goals = analysisGoalsFor(codes);

  if (goals.length === 0) {
    return (
      <p className="text-xs leading-relaxed text-white/45">
        Not answered. This study was sent before the form asked about analysis goals.
      </p>
    );
  }

  return (
    <ul className={`flex flex-col ${compact ? "gap-2" : "gap-3"}`}>
      {goals.map((goal) => (
        <li key={goal.code} className="flex gap-2.5">
          <CheckCircle size={16} weight="fill" className="mt-0.5 shrink-0 text-[#CC6600]" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[13px] font-medium text-white">{goal.title}</span>
            {compact ? null : <span className="text-xs leading-relaxed text-white/55">{goal.description}</span>}
            <span className="text-xs leading-relaxed text-white/45">
              <span className="text-white/60">Usual tests:</span> {goal.typicalTests}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
