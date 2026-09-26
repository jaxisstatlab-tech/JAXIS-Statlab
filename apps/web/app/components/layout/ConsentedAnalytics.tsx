"use client";

import { useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/next";
import { CONSENT_CHANGED, getConsent, type Consent } from "@/lib/consent";

// Loads Vercel Analytics only after the visitor accepts.
export default function ConsentedAnalytics() {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const sync = () => setAllowed(getConsent() === "accepted");
    sync();
    const onChange = (e: Event) => setAllowed((e as CustomEvent<Consent>).detail === "accepted");
    window.addEventListener(CONSENT_CHANGED, onChange);
    return () => window.removeEventListener(CONSENT_CHANGED, onChange);
  }, []);

  return allowed ? <Analytics /> : null;
}
