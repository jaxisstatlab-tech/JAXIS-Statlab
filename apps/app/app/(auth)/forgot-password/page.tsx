"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { Button, FormInput } from "@repo/ui";
import {
  ArrowLeft,
  CheckCircle,
  WarningCircle,
  ArrowRight,
} from "@phosphor-icons/react";
import { requestPasswordResetAction } from "@/features/auth/actions";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [sandboxNotice, setSandboxNotice] = useState<string | null>(null);
  const [devRecoveryUrl, setDevRecoveryUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSandboxNotice(null);
    setDevRecoveryUrl(null);

    if (!email.trim()) {
      setErrorMessage("Please enter your email address.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await requestPasswordResetAction({ email });
        if (res.success) {
          setIsSubmitted(true);
          if (res.data?.sandboxNotice) {
            setSandboxNotice(res.data.sandboxNotice);
          }
          if (res.data?.devRecoveryUrl) {
            setDevRecoveryUrl(res.data.devRecoveryUrl);
          }
        } else {
          setErrorMessage(res.error?.message || "Unable to send recovery email. Please try again.");
        }
      } catch (err) {
        console.error("Forgot password submission error:", err);
        setErrorMessage("An unexpected error occurred. Please try again.");
      }
    });
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-content-fade">
      {/* Back to Sign In Link */}
      <div>
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-sans text-white/50 hover:text-white transition-colors group select-none"
        >
          <ArrowLeft
            weight="bold"
            size={13}
            className="transition-transform group-hover:-translate-x-0.5 text-white/40 group-hover:text-white"
          />
          <span>Back to Sign In</span>
        </Link>
      </div>

      {isSubmitted ? (
        /* Confirmation State */
        <div className="flex flex-col gap-6 py-2">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl font-bold text-white tracking-tight font-sans">
              Check your inbox
            </h1>
            <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans">
              We have sent a single-use recovery link to{" "}
              <strong className="text-white font-semibold">{email}</strong>.
            </p>
          </div>

          <div className="p-4 rounded-[2px] bg-[#01142B] border border-white/10 flex items-start gap-3">
            <CheckCircle weight="fill" size={18} className="text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1 text-xs font-sans">
              <span className="font-semibold text-emerald-400">Recovery Link Active</span>
              <p className="text-white/60 leading-relaxed">
                The link expires in <span className="font-mono text-white/80 font-medium">60 minutes</span>. If you do not see it shortly, please check your spam folder.
              </p>
            </div>
          </div>

          {sandboxNotice && (
            <div className="p-4 rounded-[2px] bg-amber-500/10 border border-amber-500/30 flex flex-col gap-2.5 animate-content-fade">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                <span>⚠️ Resend Sandbox Notice</span>
              </div>
              <p className="text-xs font-sans text-white/80 leading-relaxed">
                {sandboxNotice}
              </p>
              {devRecoveryUrl && (
                <div className="pt-2 border-t border-amber-500/20 flex flex-col gap-1.5">
                  <span className="text-[11px] font-sans text-white/50">
                    Testing sandbox bypass link:
                  </span>
                  <Link
                    href={devRecoveryUrl}
                    className="inline-flex items-center gap-1.5 text-xs font-sans font-semibold text-[#FFA040] hover:text-[#FFB366] underline transition-colors"
                  >
                    Open Password Reset Desk Directly →
                  </Link>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-3 pt-2">
            <Link href="/login" className="w-full">
              <Button
                variant="primary"
                size="sm"
                className="w-full h-9 min-h-[36px] text-xs sm:text-sm font-semibold rounded-[2px] shadow-sm tracking-normal"
              >
                Return to Sign In →
              </Button>
            </Link>
            <button
              type="button"
              onClick={() => {
                setIsSubmitted(false);
                setEmail("");
              }}
              className="text-xs font-sans text-white/50 hover:text-white transition-colors text-center py-1 cursor-pointer"
            >
              Try a different email address
            </button>
          </div>
        </div>
      ) : (
        /* Email Input State */
        <div className="flex flex-col gap-6">
          {/* Title & Subtitle */}
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl font-bold text-white tracking-tight font-sans">
              Reset Password
            </h1>
            <p className="text-xs sm:text-sm text-white/60 leading-relaxed font-sans">
              Enter your registered email address to receive a secure recovery link.
            </p>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="p-3.5 rounded-[2px] bg-red-500/[0.08] border border-red-500/30 flex items-start gap-3 animate-content-fade"
            >
              <WarningCircle
                weight="fill"
                size={18}
                className="text-red-400 shrink-0 mt-0.5"
              />
              <div className="flex-1 flex flex-col gap-1 text-xs font-sans">
                <span className="font-semibold text-red-200">
                  {errorMessage.toLowerCase().includes("no account")
                    ? "Account Not Found"
                    : "Unable to Process"}
                </span>
                <p className="text-white/70 leading-relaxed">{errorMessage}</p>
                {errorMessage.toLowerCase().includes("no account") && (
                  <div className="pt-1">
                    <Link
                      href="/register"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#FFA040] hover:text-[#FFB366] transition-colors"
                    >
                      <span>Create a new account</span>
                      <ArrowRight size={12} weight="bold" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <FormInput
              label="Account Email"
              name="email"
              type="email"
              required
              monoLabel
              variant="auth"
              placeholder="name@university.edu.ph"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              disabled={isPending}
              autoComplete="email"
              className="!h-9 sm:!h-9 text-xs sm:text-sm rounded-[2px]"
            />

            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="w-full h-9 min-h-[36px] text-xs sm:text-sm font-semibold rounded-[2px] shadow-sm tracking-normal mt-1"
              loading={isPending}
              disabled={isPending}
            >
              {isPending ? "Sending Recovery Link..." : "Send Recovery Link →"}
            </Button>
          </form>

          <div className="flex items-center justify-center gap-2 text-xs text-white/50 font-sans pt-1">
            <span>Remember your password?</span>
            <Link
              href="/login"
              className="text-white hover:text-[#FFA040] font-medium transition-colors underline"
            >
              Sign in
            </Link>
            <span className="text-white/20">·</span>
            <Link
              href="/register"
              className="text-white hover:text-[#FFA040] font-medium transition-colors underline"
            >
              Create account
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
