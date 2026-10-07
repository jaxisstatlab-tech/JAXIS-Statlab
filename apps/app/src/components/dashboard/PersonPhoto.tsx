"use client";

import React, { useEffect, useRef, useState } from "react";

// A person's profile photo with their initials underneath: the initials show until the photo loads, and stay
// when there's no photo (the photo link answers 404) or it fails.

export function initialsOf(name?: string | null) {
  const words = (name ?? "")
    .split(/\s+/)
    .filter((w) => w && !/^(dr|mr|mrs|ms|prof)\.?$/i.test(w) && !/^[A-Z]\.$/.test(w));
  return ((words[0]?.[0] ?? "") + (words.length > 1 ? (words[words.length - 1]?.[0] ?? "") : "")).toUpperCase() || "?";
}

export function PersonPhoto({
  userId,
  name,
  src,
  className = "h-9 w-9 text-xs",
  rounded = "rounded-full",
}: {
  /** Loads /api/avatar/{userId} when no src is given. */
  userId?: string | null;
  name?: string | null;
  /** A known photo link (e.g. with a version), or null for none. */
  src?: string | null;
  className?: string;
  rounded?: string;
}) {
  const url = src !== undefined ? src : userId ? `/api/avatar/${encodeURIComponent(userId)}` : null;
  const [ok, setOk] = useState(false);
  const img = useRef<HTMLImageElement>(null);
  // A cached photo can finish loading before React listens for it, so check once mounted too.
  useEffect(() => {
    const el = img.current;
    setOk(!!el && el.complete && el.naturalWidth > 0);
  }, [url]);
  return (
    <span className={`relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden bg-white/[0.08] font-semibold text-white/80 ${rounded} ${className}`}>
      <span aria-hidden={ok}>{initialsOf(name)}</span>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={img}
          src={url}
          alt={name ? `${name}'s photo` : "Profile photo"}
          onLoad={() => setOk(true)}
          onError={() => setOk(false)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${ok ? "opacity-100" : "opacity-0"}`}
        />
      ) : null}
    </span>
  );
}
