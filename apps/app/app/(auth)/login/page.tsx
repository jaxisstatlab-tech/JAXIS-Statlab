"use client";

import React, { useState, useTransition, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Alert, Button, LoadingState, FormInput } from "@repo/ui";
import { ArrowRight, Check, Envelope, Eye, EyeSlash, LockKey } from "@phosphor-icons/react";
import { AuthTrust } from "@/components/auth/AuthTrust";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { AuthDivider } from "@/components/auth/AuthDivider";
import { PASSWORD_RESET_EMAIL_AVAILABLE } from "@/components/auth/availability";
import { SoonTag } from "@/components/auth/SoonTag";
import { authHeading, authField, authSubmit, authSubtitle, authTextLink, authTitle } from "@/components/auth/styles";
import { safeCallbackPath } from "@/lib/site";

function LoginForm() {
  const searchParams = useSearchParams();
  // Only same-site paths are honoured, so a crafted ?callbackUrl= can't send people to another website.
  const callbackUrl = safeCallbackPath(searchParams.get("callbackUrl"));
  // Capture initial URL error/status parameters so they persist on screen even after the URL bar is cleaned
  const [authError] = useState(() => searchParams.get("error"));
  const [reason] = useState(() => searchParams.get("reason"));
  const [isRegistered] = useState(() => searchParams.get("registered") === "true");
  const [isResetSuccess] = useState(() => ["true", "success"].includes(searchParams.get("reset") ?? ""));

  const isIdleTimeout = reason === "idle_timeout";
  const isAccountSuspended = authError === "AccountSuspended";
  const isAccountTerminated = authError === "AccountTerminated";
  const isSessionRevoked = authError === "SessionRevoked";
  const isGoogleError = ["Configuration", "OAuthSignin", "OAuthCallback"].includes(authError ?? "");

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
      setErrorMessage("Enter your email and password.");
      return;
    }

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
            setErrorMessage("Your account is suspended. Email us and we'll help you sort it out.");
          } else if (res.error.includes("ACCOUNT_TERMINATED")) {
            setErrorMessage("This account has been closed.");
          } else {
            setErrorMessage("That email and password don't match. Try again, or reset your password.");
          }
          return;
        }

        window.location.href = callbackUrl;
      } catch (err) {
        console.error("Login submission error:", err);
        setErrorMessage("Something went wrong on our side. Please try again.");
      }
    });
  };

  return (
    <div className="auth-stagger flex w-full flex-col gap-6">
      <div className={authHeading}>
        <h1 className={authTitle}>Welcome back</h1>
        <p className={authSubtitle}>Log in to see your studies, messages from your statistician, and files.</p>
      </div>

      {isIdleTimeout && (
        <Alert variant="warning" title="You were logged out">
          We log you out after 30 minutes of no activity to keep your data safe.
        </Alert>
      )}
      {isAccountSuspended && (
        <Alert variant="danger" title="Account suspended">
          Your account is suspended. Email us and we&apos;ll help you sort it out.
        </Alert>
      )}
      {isAccountTerminated && (
        <Alert variant="danger" title="Account closed">
          This account has been closed.
        </Alert>
      )}
      {isSessionRevoked && (
        <Alert variant="warning" title="Please log in again">
          Your password was changed recently. Log in with your new password.
        </Alert>
      )}
      {isRegistered && (
        <Alert variant="success" title="Account created">
          Your account is ready. Log in to send your first study.
        </Alert>
      )}
      {isResetSuccess && (
        <Alert variant="success" title="Password updated">
          Log in with your new password.
        </Alert>
      )}
      {isGoogleError && (
        <Alert variant="danger" title="Google sign-in didn't work">
          Please log in with your email and password instead.
        </Alert>
      )}

      <GoogleSignInButton callbackUrl={callbackUrl} onError={(err) => setErrorMessage(err)} />
      <AuthDivider>or with email</AuthDivider>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        {errorMessage && (
          <Alert variant="danger" title="Couldn't log you in">
            {errorMessage}
          </Alert>
        )}

        <FormInput
          label="Email"
          name="email"
          type="email"
          required
          monoLabel
          variant="auth"
          leftIcon={<Envelope size={16} weight="fill" />}
          placeholder="you@example.com"
          value={email}
          isInvalid={Boolean(errorMessage)}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errorMessage) setErrorMessage(null);
          }}
          disabled={isPending}
          autoComplete="email"
          className={authField}
        />

        <FormInput
          label="Password"
          name="password"
          type={showPassword ? "text" : "password"}
          required
          monoLabel
          variant="auth"
          leftIcon={<LockKey size={16} weight="fill" />}
          placeholder="Your password"
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
              className="cursor-pointer p-0.5 text-white/40 transition-colors hover:text-white"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeSlash weight="fill" size={16} /> : <Eye weight="fill" size={16} />}
            </button>
          }
          className={authField}
        />

        <div className="-mt-1 flex flex-wrap items-center justify-between gap-2 font-sans text-[13px]">
          <label className="flex cursor-pointer select-none items-center gap-2 text-white/70 transition-colors hover:text-white">
            <span className="relative flex h-4 w-4 shrink-0">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="peer h-4 w-4 cursor-pointer appearance-none rounded-[2px] border border-white/25 bg-[#010D1F] transition-colors duration-150 checked:border-[#CC6600] checked:bg-[#CC6600] focus-visible:shadow-[0_0_0_3px_rgba(204,102,0,0.25)]"
              />
              <Check
                size={10}
                weight="bold"
                className="pointer-events-none absolute left-[3px] top-[3px] scale-50 text-white opacity-0 transition-[opacity,transform] duration-150 ease-out peer-checked:scale-100 peer-checked:opacity-100"
              />
            </span>
            Remember me
          </label>
          <Link href="/forgot-password" className={`${authTextLink} inline-flex items-center gap-2`}>
            Forgot password?
            {!PASSWORD_RESET_EMAIL_AVAILABLE && <SoonTag className="!no-underline" />}
          </Link>
        </div>

        <Button type="submit" variant="primary" size="sm" className={authSubmit} loading={isPending} disabled={isPending}>
          {isPending ? (
            "Logging in..."
          ) : (
            <>
              Log in
              <ArrowRight size={15} weight="bold" className="transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
            </>
          )}
        </Button>
      </form>

      <AuthTrust />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[300px] w-full items-center justify-center">
          <LoadingState variant="card" label="Loading..." />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
