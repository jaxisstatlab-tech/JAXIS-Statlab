"use client";

import React, { useState, useTransition, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Alert, Button, LoadingState, FormInput, EyeIcon, EyeOffIcon, DividerWithText } from "@repo/ui";
import { IconChevronDown } from "@tabler/icons-react";

const DEV_PRESETS = [
  { label: "Admin", email: "admin@jaxis.dev", pass: "JaxisAdmin2026!", role: "ADMIN" },
  { label: "Client", email: "client@jaxis.dev", pass: "JaxisClient2026!", role: "CLIENT" },
  { label: "Stat", email: "stat@jaxis.dev", pass: "JaxisStat2026!", role: "STATISTICIAN" },
  { label: "QA Lead", email: "qa@jaxis.dev", pass: "JaxisQA2026!", role: "SENIOR_QA_LEAD" },
  { label: "Finance", email: "finance@jaxis.dev", pass: "JaxisFin2026!", role: "FINANCE_OFFICER" },
  { label: "CEO", email: "ceo@jaxis.dev", pass: "JaxisCeo2026!", role: "CEO" },
];

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const isRegistered = searchParams.get("registered") === "true";
  const isResetSuccess = searchParams.get("reset") === "true";

  const [email, setEmail] = useState("admin@jaxis.dev");
  const [password, setPassword] = useState("JaxisAdmin2026!");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [activeRole, setActiveRole] = useState("ADMIN");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSelectPreset = (roleValue: string) => {
    const preset = DEV_PRESETS.find((p) => p.role === roleValue);
    if (!preset) return;
    setEmail(preset.email);
    setPassword(preset.pass);
    setActiveRole(preset.role);
    setErrorMessage(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage("Please provide both email and password.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await signIn("credentials", {
          email,
          password,
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

        // Determine destination desk directly to avoid the intermediate /dashboard 307 redirect bounce
        const roleHomeMap: Record<string, string> = {
          ADMIN: "/dashboard/admin",
          CLIENT: "/dashboard/client",
          STATISTICIAN: "/dashboard/statistician",
          SENIOR_QA_LEAD: "/dashboard/qa",
          FINANCE_OFFICER: "/dashboard/finance",
          CEO: "/dashboard/ceo",
        };

        const targetDestination =
          callbackUrl && callbackUrl !== "/dashboard"
            ? callbackUrl
            : (activeRole && roleHomeMap[activeRole]) || "/dashboard";

        window.location.href = targetDestination;
      } catch (err) {
        console.error("Login submission error:", err);
        setErrorMessage("An unexpected error occurred. Please try again.");
      }
    });
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Title & Subtitle */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-sans">
          Sign In
        </h1>
        <p className="text-xs sm:text-sm text-white/60 leading-relaxed font-sans">
          Sign in to access your research desk, studies, and consultations.
        </p>
      </div>

      {/* Status Alerts */}
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

      {/* Stakeholder Preset Dropdown */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between font-mono uppercase tracking-wider text-xs">
          <span className="font-semibold text-slate-200">Demo Role:</span>
          <span className="text-[#CC6600] font-semibold">1-Click Sign-In</span>
        </div>
        <div className="relative flex items-center w-full">
          <select
            value={activeRole}
            onChange={(e) => handleSelectPreset(e.target.value)}
            className="w-full h-12 px-4 pr-10 rounded-[2px] bg-[#01142B] border border-white/15 focus:border-[#CC6600] focus:ring-0 text-sm text-white transition-colors outline-none font-sans appearance-none cursor-pointer"
            style={{
              height: "3rem",
              paddingLeft: "1rem",
              paddingRight: "2.5rem",
              boxSizing: "border-box",
              outline: "none",
              boxShadow: "none",
            }}
          >
            {DEV_PRESETS.map((preset) => (
              <option
                key={preset.role}
                value={preset.role}
                className="bg-[#01142B] text-white py-2"
              >
                {preset.label} — {preset.email} ({preset.role})
              </option>
            ))}
          </select>
          <div className="absolute right-3.5 pointer-events-none text-slate-400 flex items-center justify-center">
            <IconChevronDown size={16} stroke={1.5} className="text-slate-400" />
          </div>
        </div>
      </div>

      {/* Clean Divider */}
      <DividerWithText className="-my-1">or authenticate via email</DividerWithText>

      {/* Main Login Form */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col"
        style={{ gap: "1.375rem" }}
      >
        <FormInput
          label="Email Address"
          name="email"
          type="email"
          required
          monoLabel
          variant="auth"
          placeholder="name@institution.edu"
          value={email}
          isInvalid={Boolean(errorMessage)}
          onChange={(e) => {
            setEmail(e.target.value);
            setActiveRole("");
            if (errorMessage) setErrorMessage(null);
          }}
          disabled={isPending}
          autoComplete="email"
        />

        <FormInput
          label="Password"
          name="password"
          type={showPassword ? "text" : "password"}
          required
          monoLabel
          variant="auth"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setActiveRole("");
            if (errorMessage) setErrorMessage(null);
          }}
          disabled={isPending}
          autoComplete="current-password"
          error={errorMessage || undefined}
          errorVariant="banner"
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-slate-400 hover:text-white transition-colors cursor-pointer p-0.5"
              title={showPassword ? "Hide password" : "Show password"}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOffIcon className="w-4 h-4" />
              ) : (
                <EyeIcon className="w-4 h-4" />
              )}
            </button>
          }
        />

        {/* Remember Session & Forgot Password Row */}
        <div
          className="flex flex-wrap items-center justify-between gap-2 text-xs font-sans"
          style={{ marginTop: "-0.25rem" }}
        >
          <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300 hover:text-white transition-colors">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded-[2px] bg-[#011227] border border-white/20 text-[#CC6600] focus:ring-0 focus:ring-offset-0 accent-[#CC6600] cursor-pointer"
            />
            <span>Remember session</span>
          </label>
          <Link
            href="/forgot-password"
            className="text-[#38BDF8] hover:text-[#7DD3FC] hover:underline font-sans text-xs transition-colors cursor-pointer select-none"
          >
            Forgot your password?
          </Link>
        </div>

        <div style={{ paddingTop: "0.25rem" }}>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full py-3.5 font-bold tracking-wide"
            loading={isPending}
            disabled={isPending}
          >
            {isPending ? "Signing in..." : "Sign In to Workspace →"}
          </Button>
        </div>
      </form>

      {/* Footer Registration Link */}
      <div className="pt-2 text-center text-xs text-white/60 font-sans">
        <span>New to JAXIS StatLab?</span>{" "}
        <Link
          href="/register"
          className="text-[#CC6600] hover:text-[#E67300] font-semibold transition-colors ml-1"
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
          <LoadingState variant="card" label="INITIALIZING AUTHENTICATION..." />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
