"use client";

import { useEffect } from "react";
import { ErrorPage } from "@repo/ui/ErrorPage";

// Renders inside the dashboard shell, so the sidebar stays and people can navigate away.
export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[Dashboard error boundary]", error);
  }, [error]);

  return <ErrorPage error={error} onRetry={reset} variant="inline" />;
}
