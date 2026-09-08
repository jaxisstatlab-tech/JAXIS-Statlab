"use client";

import React, { useState } from "react";
import { signOut } from "next-auth/react";
import { SignOut } from "@phosphor-icons/react";

interface LogoutButtonProps {
  className?: string;
  showText?: boolean;
}

export function LogoutButton({ className = "", showText = false }: LogoutButtonProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut({
        callbackUrl: "/login",
        redirect: true,
      });
    } catch (err) {
      console.error("Logout error:", err);
      window.location.href = "/login";
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoggingOut}
      title="Sign out of session"
      className={`text-white/40 hover:text-[#EF4444] transition-colors p-1.5 rounded-[2px] hover:bg-red-500/10 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${className}`}
    >
      {isLoggingOut ? (
        <span className="h-4 w-4 border-2 border-white/20 border-t-red-400 rounded-full animate-spin" />
      ) : (
        <SignOut size={16} weight="bold" />
      )}
      {showText && <span className="text-xs font-mono">LOGOUT</span>}
    </button>
  );
}
