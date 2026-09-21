"use client";

import React, { useState, useTransition, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Alert, Button, LoadingState, FormInput, DividerWithText } from "@repo/ui";
import {
  Eye,
  EyeSlash,
} from "@phosphor-icons/react";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  // Capture initial URL error/status parameters so they persist on screen even after the URL bar is cleaned
  const [authError] = useState(() => searchParams.get("error"));
  const [reason] = useState(() => searchParams.get("reason"));
  const [isRegistered] = useState(() => searchParams.get("registered") === "true");
  const [isResetSuccess] = useState(() => searchParams.get("reset") === "true");

  const isIdleTimeout = reason === "idle_timeout";
  const isAccountSuspended = authError === "AccountSuspended";
  const isAccountTerminated = authError === "AccountTerminated";
  const isSessionRevoked = authError === "SessionRevoked";
  const isConfigurationError = authError === "Configuration";
  const isOAuthError = authError === "OAuthSignin" || authError === "OAuthCallback";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Clean URL search parameters (e.g. ?error=Configuration, ?reason=idle_timeout) on mount
  // so refreshing the page reloads a clean /login without lingering error states
  React.useEffect(() => {
    if (typeof window !== "undefined" && window.location.search) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  // Load remembered email on mount if user previously checked "Remember me"
  React.useEffect(() => {
    try {
      const savedEmail = localStorage.getItem("jaxis_remember_email");
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    } catch {
      // ignore localStorage in restricted environments
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage("Please provide both email and password.");
      return;
    }

    // Persist or clear remembered email
    try {
      if (rememberMe && email) {
        localStorage.setItem("jaxis_remember_email", email.trim());
      } else {
        localStorage.removeItem("jaxis_remember_email");
      }
    } catch {
      // ignore
    }

    startTransition(async () => {
      try {
        const res = await signIn("credentials", {
          email,
          password,
          rememberMe: String(rememberMe),
          redirect: false,
          callbackUrl,
        });

        if (res?.error) {
          if (res.error.includes("ACCOUNT_SUSPENDED")) {
            setErrorMessage(
              "Your account has been suspended. Please contact JAXIS administration."
            );
          } else if (res.error.includes("ACCOUNT_TERMINATED")) {
            setErrorMessage(
              "This account has been permanently deactivated."
            );
          } else {
            setErrorMessage("Incorrect email or password. All passwords must be at least 8 characters.");
          }
          return;
        }

        const targetDestination = callbackUrl || "/dashboard";
        window.location.href = targetDestination;
      } catch (err) {
        console.error("Login submission error:", err);
        setErrorMessage("An unexpected error occurred. Please try again.");
      }
    });
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-content-fade">
      {/* Title & Subtitle */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl sm:text-[1.65rem] font-bold text-white tracking-tight font-sans">
          Sign In Account
        </h1>
        <p className="text-xs sm:text-sm text-white/60 leading-relaxed font-sans">
          Enter your credentials to access your research workspace.
        </p>
      </div>

      {/* Status Alerts */}
      {isIdleTimeout && (
        <Alert variant="warning" title="Session Timed Out">
          You were signed out after 30 minutes of inactivity to protect client data.
        </Alert>
      )}
      {isAccountSuspended && (
        <Alert variant="danger" title="Account Suspended">
          Your account has been suspended. Please contact JAXIS administration.
        </Alert>
      )}
      {isAccountTerminated && (
        <Alert variant="danger" title="Account Deactivated">
          This account has been permanently deactivated.
        </Alert>
      )}
      {isSessionRevoked && (
        <Alert variant="warning" title="Session Expired">
          Your password was recently changed. Please sign in with your new password.
        </Alert>
      )}
      {isRegistered && (
        <Alert variant="success" title="Account Created">
          Your account is ready. Sign in with your credentials.
        </Alert>
      )}
      {isResetSuccess && (
        <Alert variant="success" title="Password Updated">
          Your password has been reset successfully. Please sign in with your new credentials.
        </Alert>
      )}
      {isConfigurationError && (
        <Alert variant="danger" title="Google Sign-In Error">
          Unable to complete Google sign-in. Please verify that your Vercel deployment has finished building, or sign in using your email and password below.
        </Alert>
      )}
      {isOAuthError && (
        <Alert variant="danger" title="Google Sign-In Failed">
          Unable to complete Google sign-in. Please verify your Google Cloud OAuth credentials and authorized redirect URIs.
        </Alert>
      )}


      {/* Google Single Sign-On */}
      <GoogleSignInButton
        callbackUrl={callbackUrl}
        onError={(err) => setErrorMessage(err)}
      />

      {/* Clean Centered Divider */}
      <DividerWithText className="-my-1">Or</DividerWithText>

      {/* Main Login Form */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4"
      >
        {/* Error Alert Banner */}
        {errorMessage && (
          <Alert
            variant="danger"
            title={
              errorMessage.toLowerCase().includes("google")
                ? "Google OAuth Required"
                : errorMessage.toLowerCase().includes("suspended")
                ? "Account Suspended"
                : errorMessage.toLowerCase().includes("deactivated")
                ? "Account Deactivated"
                : "Invalid Credentials"
            }
          >
            {errorMessage}
          </Alert>
        )}

        <FormInput
          label="Email Address"
          name="email"
          type="email"
          required
          variant="auth"
          placeholder="name@institution.edu"
          value={email}
          isInvalid={Boolean(errorMessage)}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errorMessage) setErrorMessage(null);
          }}
          disabled={isPending}
          autoComplete="email"
          className="!h-9 sm:!h-9 text-xs sm:text-sm rounded-[2px]"
        />

        <FormInput
          label="Password"
          name="password"
          type={showPassword ? "text" : "password"}
          required
          variant="auth"
          placeholder="Enter your password"
          value={password}
          isInvalid={Boolean(errorMessage)}
          onChange={(e) => {
            setPassword(e.target.value);
            if (errorMessage) setErrorMessage(null);
          }}
          disabled={isPending}
          autoComplete="current-password"
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-white/40 hover:text-white transition-colors cursor-pointer p-0.5"
              title={showPassword ? "Hide password" : "Show password"}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeSlash weight="fill" size={16} />
              ) : (
                <Eye weight="fill" size={16} />
              )}
            </button>
          }
          className="!h-9 sm:!h-9 text-xs sm:text-sm rounded-[2px]"
        />

        {/* Remember Session & Forgot Password Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-sans pt-0.5">
          <label className="flex items-center gap-2 cursor-pointer select-none text-white/70 hover:text-white transition-colors">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded-[2px] bg-[#01142B] border border-white/20 text-[#CC6600] focus:ring-0 focus:ring-offset-0 accent-[#CC6600] cursor-pointer"
            />
            <span>Remember me</span>
          </label>
          <Link
            href="/forgot-password"
            className="text-[#38BDF8] hover:text-[#7DD3FC] hover:underline font-sans text-xs transition-colors cursor-pointer select-none"
          >
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="sm"
          className="w-full h-9 min-h-[36px] text-xs sm:text-sm font-semibold rounded-[2px] shadow-sm tracking-normal mt-1"
          loading={isPending}
          disabled={isPending}
        >
          {isPending ? "Signing in..." : "Sign In to Workspace →"}
        </Button>
      </form>

      {/* Footer Registration Link */}
      <div className="pt-1 text-center text-xs text-white/60 font-sans">
        <span>New to JAXIS StatLab?</span>{" "}
        <Link
          href="/register"
          className="text-[#FFA040] hover:text-[#FFB366] font-semibold transition-colors underline ml-1"
        >
          Create an account →
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full min-h-[300px] flex items-center justify-center">
          <LoadingState variant="card" label="Loading Sign In..." />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
