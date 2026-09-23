"use client";

import React from "react";
import { ArrowLeft } from "@phosphor-icons/react";

interface BackToWebsiteButtonProps {
  className?: string;
}

export function BackToWebsiteButton({
  className = "",
}: BackToWebsiteButtonProps) {
  const getSiteUrl = () => {
    // If an explicit non-localhost site URL is provided via environment, use it
    if (
      process.env.NEXT_PUBLIC_SITE_URL &&
      !process.env.NEXT_PUBLIC_SITE_URL.includes("localhost")
    ) {
      return process.env.NEXT_PUBLIC_SITE_URL;
    }

    // Default to the live Vercel web domain
    return "https://jaxis-statlab-web.vercel.app";
  };

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (typeof window !== "undefined") {
      const referrer = document.referrer;
      // Only navigate back to referrer if it's the official vercel or custom domain (never localhost)
      if (
        referrer &&
        !referrer.includes(window.location.host) &&
        !referrer.includes("localhost") &&
        (referrer.includes("jaxis-statlab-web.vercel.app") ||
          referrer.includes("jaxis-statlab.com"))
      ) {
        e.preventDefault();
        window.location.href = referrer;
        return;
      }
    }
  };

  return (
    <a
      href={getSiteUrl()}
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 text-xs font-sans text-white/60 hover:text-white transition-colors group select-none no-underline py-1.5 ${className}`}
    >
      <ArrowLeft
        size={14}
        weight="bold"
        className="transition-transform group-hover:-translate-x-0.5 text-white/40 group-hover:text-white"
      />
      <span>Back to Website</span>
    </a>
  );
}
