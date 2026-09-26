"use client";

import { useEffect } from "react";
import { ErrorPage } from "@repo/ui/ErrorPage";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[Error boundary]", error);
  }, [error]);

  return <ErrorPage error={error} onRetry={reset} />;
}
