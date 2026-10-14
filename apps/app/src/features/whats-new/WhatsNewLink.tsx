"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Megaphone } from "@phosphor-icons/react";
import { SEEN_EVENT, latestReleaseId, seenKey } from "./changelog";

// Sidebar row (beside Notifications): "What's new", with an orange dot while there's a release for this role
// that the person hasn't opened yet (remembered in this browser).
export function WhatsNewLink({ role, email, isCollapsed = false }: { role?: string; email?: string; isCollapsed?: boolean }) {
  const pathname = usePathname();
  const active = pathname === "/dashboard/whats-new";
  const latest = latestReleaseId(role);
  const [unread, setUnread] = useState(false);

  useEffect(() => {
    const check = () => {
      let seen: string | null = null;
      try {
        seen = window.localStorage.getItem(seenKey(email));
      } catch {
        // storage blocked: show no dot rather than a dot that never clears
        seen = latest;
      }
      setUnread(!!latest && (!seen || seen < latest));
    };
    check();
    window.addEventListener(SEEN_EVENT, check);
    window.addEventListener("storage", check);
    return () => {
      window.removeEventListener(SEEN_EVENT, check);
      window.removeEventListener("storage", check);
    };
  }, [email, latest]);

  if (!latest) return null;

  return (
    <Link
      href="/dashboard/whats-new"
      aria-label={unread ? "What's new (new updates)" : "What's new"}
      title={isCollapsed ? (unread ? "What's new · new updates" : "What's new") : undefined}
      className={`group relative flex h-9 items-center rounded-[2px] outline-none transition-[background-color,color] duration-150 ease-out ${
        isCollapsed ? "mx-auto w-10 justify-center" : "w-full gap-3 px-2.5"
      } ${active ? "bg-white/[0.08] text-white" : "text-white/60 hover:bg-white/[0.04] hover:text-white"}`}
    >
      <Megaphone
        size={16}
        weight="fill"
        className={`shrink-0 transition-colors duration-150 ${active ? "text-white" : "text-white/40 group-hover:text-white/80"}`}
      />
      {isCollapsed ? (
        unread ? <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#CC6600]" aria-hidden="true" /> : null
      ) : (
        <>
          <span className="truncate font-sans text-[13px]">What&apos;s new</span>
          {unread ? (
            <span className="relative ml-auto flex h-2 w-2 shrink-0" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#CC6600] opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#CC6600]" />
            </span>
          ) : null}
        </>
      )}
    </Link>
  );
}
