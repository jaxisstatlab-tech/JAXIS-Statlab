"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { Alert, Button, FormInput } from "@repo/ui";
import { ArrowLeft, EnvelopeSimple, CheckCircle } from "@phosphor-icons/react";
import { requestPasswordResetAction } from "@/features/auth/actions";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage("Please enter your email address.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await requestPasswordResetAction({ email });
        if (res.success) {
          setIsSubmitted(true);
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
          className="inline-flex items-center gap-1.5 text-xs font-sans text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft weight="bold" size={14} />
          <span>Back to Sign In</span>
        </Link>
      </div>

      {isSubmitted ? (
        /* Confirmation State */
        <div className="flex flex-col gap-6 py-2">
          <div className="flex flex-col gap-3">
            <div className="w-12 h-12 rounded-[2px] bg-[#CC6600]/10 border border-[#CC6600]/30 flex items-center justify-center text-[#CC6600]">
              <EnvelopeSimple weight="fill" size={24} />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight font-sans">
              Check your inbox
            </h1>
            <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans">
              If an account exists for <strong className="text-white font-semibold">{email}</strong>, we have dispatched a single-use recovery link via Resend.
            </p>
          </div>

          <div className="p-4 rounded-[2px] bg-[#01142B] border border-white/10 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 font-sans">
              <CheckCircle weight="fill" size={16} />
              <span>Recovery Link Active</span>
            </div>
            <p className="text-[0.75rem] text-white/50 leading-relaxed font-sans">
              The link expires in <span className="font-mono text-white/80">60 minutes</span>. If you do not see it shortly, please inspect your spam folder.
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <Link href="/login" className="w-full">
              <Button variant="primary" size="lg" className="w-full py-3.5 font-bold tracking-wide">
                Return to Sign In →
              </Button>
            </Link>
            <button
              type="button"
              onClick={() => {
                setIsSubmitted(false);
                setEmail("");
              }}
              className="text-xs font-sans text-slate-400 hover:text-white transition-colors text-center py-1 cursor-pointer"
            >
              Try a different email address
            </button>
          </div>
        </div>
      ) : (
        /* Email Input State */
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-sans">
              Reset Password
            </h1>
            <p className="text-xs sm:text-sm text-white/60 leading-relaxed font-sans">
              Enter your registered email address to receive a secure recovery link.
            </p>
          </div>

          {errorMessage && (
            <Alert variant="danger" title="Unable to Process">
              {errorMessage}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <FormInput
              label="Account Email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="e.g. name@university.edu.ph"
              disabled={isPending}
              autoComplete="email"
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full py-3.5 font-bold tracking-wide mt-1"
              loading={isPending}
              disabled={isPending}
            >
              {isPending ? "Sending Recovery Link..." : "Send Recovery Link →"}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
