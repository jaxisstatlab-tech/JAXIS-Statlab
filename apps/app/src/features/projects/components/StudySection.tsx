import React from "react";

/**
 * Title row for a page inside a study (under the shared study header): a short title, an optional
 * line of help, and the page's own buttons on the right.
 */
export function StudySection({
  title,
  description,
  actions,
  className = "",
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between ${className}`}>
      <div className="min-w-0">
        <h2 className="font-sans text-lg font-semibold text-white">{title}</h2>
        {description ? <p className="mt-1 max-w-3xl text-sm leading-relaxed text-white/55">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2.5">{actions}</div> : null}
    </div>
  );
}
