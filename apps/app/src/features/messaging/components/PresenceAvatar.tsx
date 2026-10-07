import React from "react";
import { initials } from "./chat-format";
import { PersonPhoto } from "@/components/dashboard/PersonPhoto";

/** Initials tile with a green dot when the person is online (no dot when offline or unknown). */
export function PresenceAvatar({
  name,
  userId,
  online = false,
  size = "md",
  title,
  children,
}: {
  name?: string | null;
  /** Shows their profile photo when they have one. */
  userId?: string | null;
  online?: boolean;
  size?: "sm" | "md";
  title?: string;
  /** Replaces the initials (e.g. a lock icon). */
  children?: React.ReactNode;
}) {
  const box = size === "sm" ? "h-7 w-7 text-[0.625rem]" : "h-10 w-10 text-sm";
  return (
    <span title={title} className={`relative flex shrink-0 items-center justify-center rounded-[2px] bg-white/[0.08] font-semibold text-white/80 select-none ${box}`}>
      {children ?? (userId ? <PersonPhoto userId={userId} name={name} rounded="rounded-[2px]" className={`absolute inset-0 h-full w-full ${size === "sm" ? "text-[0.625rem]" : "text-sm"}`} /> : initials(name))}
      {online ? (
        <span
          aria-hidden
          className={`absolute -bottom-0.5 -right-0.5 rounded-full bg-emerald-400 ring-2 ring-[#0A0A18] ${size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5"}`}
        />
      ) : null}
    </span>
  );
}

/** Two overlapping tiles for a group chat, Messenger style. Green dot when anyone is online. */
export function GroupAvatar({
  people,
  size = "md",
}: {
  people: Array<{ id?: string | null; name?: string | null; online?: boolean }>;
  size?: "md" | "lg";
}) {
  const list = people.filter((p) => p.name);
  const anyOnline = list.some((p) => p.online);
  if (list.length < 2) return <PresenceAvatar name={list[0]?.name} userId={list[0]?.id} online={anyOnline} />;
  const [a, b] = list;
  const box = size === "lg" ? "h-12 w-12" : "h-11 w-11";
  const tile = "absolute flex h-7 w-7 items-center justify-center rounded-[2px] text-[0.625rem] font-semibold select-none";
  return (
    <span aria-hidden className={`relative shrink-0 ${box}`}>
      <span className={`${tile} left-0 top-0 overflow-hidden bg-white/[0.08] text-[0.563rem] text-white/60`}>
        {a!.id ? <PersonPhoto userId={a!.id} name={a!.name} rounded="rounded-[2px]" className="h-full w-full text-[0.563rem]" /> : initials(a!.name)}
      </span>
      <span className={`${tile} bottom-0 right-0 overflow-hidden bg-[#1A1A2A] text-white/85 ring-2 ring-[#0A0A18]`}>
        {b!.id ? <PersonPhoto userId={b!.id} name={b!.name} rounded="rounded-[2px]" className="h-full w-full text-[0.625rem]" /> : initials(b!.name)}
      </span>
      {anyOnline ? (
        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0A0A18]" />
      ) : null}
    </span>
  );
}
