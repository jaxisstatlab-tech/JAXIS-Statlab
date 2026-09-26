"use client";

import { useEffect } from "react";
import { ErrorPage } from "@repo/ui/ErrorPage";
import "./globals.css";

// Last resort when the root layout itself fails: it must render its own <html> and <body>.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[Root error boundary]", error);
  }, [error]);

  return (
    <html lang="en" style={{ backgroundColor: "#010114" }}>
      <body className="font-sans antialiased" style={{ backgroundColor: "#010114", color: "#ffffff" }}>
        <ErrorPage error={error} onRetry={reset} />
      </body>
    </html>
  );
}
