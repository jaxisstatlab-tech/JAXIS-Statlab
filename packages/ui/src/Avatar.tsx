"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "./utils";

export interface AvatarProps
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> {
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  sm: "h-7 w-7 text-[0.625rem]",
  md: "h-9 w-9 text-xs",
  lg: "h-11 w-11 text-sm",
  xl: "h-14 w-14 text-base",
};

export const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  AvatarProps
>(({ className, size = "md", ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex shrink-0 overflow-hidden rounded-full border border-white/15 bg-[#0A0A18] select-none",
      sizeClasses[size],
      className
    )}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

export const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full object-cover", className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

export const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-[#171725] font-sans font-semibold text-xs tracking-normal text-white",
      className
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

/**
 * Convenient UserAvatar facade with automatic name initials extraction.
 */
export interface UserAvatarProps {
  name?: string;
  email?: string;
  src?: string;
  role?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function UserAvatar({
  name,
  email,
  src,
  role,
  size = "md",
  className = "",
}: UserAvatarProps) {
  const getInitials = (n?: string, e?: string) => {
    if (n) {
      const parts = n.trim().split(/\s+/);
      const p0 = parts[0];
      const p1 = parts[1];
      if (p0 && p1 && p0[0] && p1[0]) {
        return `${p0[0]}${p1[0]}`.toUpperCase();
      }
      return n.substring(0, 2).toUpperCase();
    }
    if (e) {
      return e.substring(0, 2).toUpperCase();
    }
    return "??";
  };

  const initials = getInitials(name, email);

  // Enterprise Role color variants
  const getRoleBg = (r?: string) => {
    switch (r?.toUpperCase()) {
      case "SUPERADMIN":
      case "ADMIN":
      case "CEO":
        return "bg-[#CC6600]/20 text-[#CC6600] border-[#CC6600]/40";
      case "STATISTICIAN":
      case "DATA_ANALYST":
        return "bg-[#0284C7]/20 text-[#38BDF8] border-[#38BDF8]/40";
      case "QA_SPECIALIST":
      case "SENIOR_QA_LEAD":
        return "bg-[#10B981]/20 text-[#10B981] border-[#10B981]/40";
      case "FINANCE_OFFICER":
      case "FINANCE":
        return "bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/40";
      case "CLIENT":
      default:
        return "bg-[#171725] text-[#38BDF8] border-white/20";
    }
  };

  return (
    <Avatar size={size} className={cn("border", className)}>
      {src && <AvatarImage src={src} alt={name ?? "User Avatar"} />}
      <AvatarFallback className={getRoleBg(role)}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
