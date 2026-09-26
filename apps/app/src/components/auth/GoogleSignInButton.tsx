"use client";

import React, { useState } from "react";
import { getProviders, signIn } from "next-auth/react";
import { GOOGLE_SIGN_IN_AVAILABLE } from "./availability";
import { SoonTag } from "./SoonTag";

interface GoogleSignInButtonProps {
  callbackUrl?: string;
  isRegister?: boolean;
  className?: string;
  onError?: (message: string) => void;
  /** Set to true temporarily while custom domain DNS is being resolved */
  temporarilyUnavailable?: boolean;
}

// Switched off until the jaxis-statlab.com domain is live (see ./availability).
const DOMAIN_MAINTENANCE_ACTIVE = !GOOGLE_SIGN_IN_AVAILABLE;

export function GoogleSignInButton({
  callbackUrl = "/dashboard",
  isRegister = false,
  className = "",
  onError,
  temporarilyUnavailable = DOMAIN_MAINTENANCE_ACTIVE,
}: GoogleSignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    if (temporarilyUnavailable) {
      onError?.(
        "Google sign-in is temporarily paused during domain maintenance. Please sign in with your email and password."
      );
      return;
    }

    setIsLoading(true);
    try {
      const providers = await getProviders();
      if (!providers?.google) {
        setIsLoading(false);
        onError?.(
          "Google Sign-In is not configured yet. Please add AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET to your .env file."
        );
        return;
      }
      await signIn("google", { callbackUrl });
    } catch (err) {
      console.error("[GoogleSignIn] Error initiating Google sign-in:", err);
      setIsLoading(false);
      onError?.("Unable to initiate Google sign-in. Please try again.");
    }
  };

  return (
    <button
      type="button"
      onClick={handleGoogleSignIn}
      disabled={isLoading || temporarilyUnavailable}
      title={temporarilyUnavailable ? "Google sign-in is coming soon. For now, use your email and password." : undefined}
      aria-describedby={temporarilyUnavailable ? "google-soon" : undefined}
      className={`relative flex h-12 w-full items-center justify-center gap-3 rounded-[2px] border px-4 font-sans text-sm font-medium outline-none transition-[background-color,border-color,color,transform] duration-150 ease-out ${
        temporarilyUnavailable
          ? "cursor-not-allowed select-none border-white/10 bg-white/[0.02] text-white/45"
          : "cursor-pointer border-white/15 bg-white/[0.03] text-white hover:border-white/30 hover:bg-white/[0.06] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
      } ${className}`}
    >
      {isLoading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-[#CC6600]" />
      ) : (
        <svg
          className={`h-[18px] w-[18px] flex-shrink-0 ${temporarilyUnavailable ? "opacity-40 grayscale" : ""}`}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
      )}
      <span>{isRegister ? "Sign up with Google" : "Continue with Google"}</span>
      {temporarilyUnavailable && (
        <span id="google-soon" className="absolute right-3 top-1/2 -translate-y-1/2">
          <SoonTag />
          <span className="sr-only">Google sign-in is coming soon.</span>
        </span>
      )}
    </button>
  );
}
