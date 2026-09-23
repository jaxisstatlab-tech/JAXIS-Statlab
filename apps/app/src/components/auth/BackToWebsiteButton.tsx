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
    if (process.env.NEXT_PUBLIC_SITE_URL) {
      return process.env.NEXT_PUBLIC_SITE_URL;
    }
    if (typeof window !== "undefined") {
      const isLocalhost =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";
      return isLocalhost
        ? "http://localhost:3002"
        : "https://jaxis-statlab-web.vercel.app";
    }
    return "http://localhost:3002";
  };

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (typeof window !== "undefined") {
      const referrer = document.referrer;
      // If the user arrived from the website or a valid prior page
      if (
        referrer &&
        !referrer.includes(window.location.host) &&
        (referrer.includes("3002") ||
          referrer.includes("jaxis-statlab.com") ||
          referrer.includes("jaxis-statlab-web.vercel.app"))
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
