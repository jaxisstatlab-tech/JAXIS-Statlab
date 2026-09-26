"use client";

import { openConsentSettings } from "@/lib/consent";

// Footer link that reopens the consent card so visitors can change their choice.
export default function CookieSettingsButton({ className = "" }: { className?: string }) {
  return (
    <button type="button" onClick={openConsentSettings} className={className}>
      Cookie settings
    </button>
  );
}
