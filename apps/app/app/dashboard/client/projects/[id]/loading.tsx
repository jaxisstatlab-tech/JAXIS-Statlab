import React from "react";
import { LoadingState } from "@repo/ui";

// Shown inside the study layout while a tab loads: the title, tracker and tabs stay in place and
// only the content area waits. It also lets Next prefetch the layout, so tab clicks respond at once.
export default function ClientStudyTabLoading() {
  return (
    <div className="flex min-h-[40vh] flex-1 items-center justify-center animate-content-fade">
      <LoadingState variant="inline" label="Loading..." />
    </div>
  );
}
