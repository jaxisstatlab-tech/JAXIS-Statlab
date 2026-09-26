"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { Alert, Button, FormInput } from "@repo/ui";
import { ArrowLeft, ArrowRight, CheckCircle, Info } from "@phosphor-icons/react";
import { requestPasswordResetAction } from "@/features/auth/actions";
import { PASSWORD_RESET_EMAIL_AVAILABLE } from "@/components/auth/availability";
import { SITE_URL } from "@/lib/site";
import {
  authAccentLink,
  authHeading,
  authBackLink,
  authField,
  authLinkButton,
  authSubmit,
  authSubtitle,
  authTextLink,
  authTitle,
} from "@/components/auth/styles";

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
      setErrorMessage("Enter the email you signed up with.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await requestPasswordResetAction({ email });
        if (res.success) {
          setIsSubmitted(true);
          if (res.data?.sandboxNotice) setSandboxNotice(res.data.sandboxNotice);
          if (res.data?.devRecoveryUrl) setDevRecoveryUrl(res.data.devRecoveryUrl);
        } else {
          setErrorMessage(res.error?.message || "We couldn't send the email. Please try again.");
        }
      } catch (err) {
        console.error("Forgot password submission error:", err);
        setErrorMessage("Something went wrong on our side. Please try again.");
      }
    });
  };

  const noAccount = errorMessage?.toLowerCase().includes("no account");

  return (
    <div className="flex w-full flex-col gap-7 animate-content-fade">
      <Link href="/login" className={authBackLink}>
        <ArrowLeft weight="bold" size={13} className="transition-transform group-hover:-translate-x-0.5" />
        Back to log in
      </Link>

      {!PASSWORD_RESET_EMAIL_AVAILABLE ? (
        <div className="flex flex-col gap-6">
          <div className={authHeading}>
            <h1 className={authTitle}>Reset your password</h1>
            <p className={authSubtitle}>
              Password reset emails are paused for a short while as we move to our new email address.
            </p>
          </div>
          <div className="flex items-start gap-3 rounded-[2px] border border-white/10 bg-[#010D1F] p-4">
            <Info weight="fill" size={18} className="mt-0.5 shrink-0 text-[#CC6600]" />
            <p className="font-sans text-[13px] leading-relaxed text-white/65">
              Need to get back in now? Send us a message from our contact page with the email you signed up with, and
              we&apos;ll reset your password for you.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <a href={`${SITE_URL}/contact`} className={authLinkButton}>
              Contact us
              <ArrowRight size={15} weight="bold" />
            </a>
          </div>
        </div>
      ) : isSubmitted ? (
        <div className="flex flex-col gap-6">
          <div className={authHeading}>
            <h1 className={authTitle}>Check your email</h1>
            <p className={authSubtitle}>
              We sent a link to <strong className="font-medium text-white">{email}</strong>. Open it to set a new
              password.
            </p>
          </div>

          <div className="flex items-start gap-3 rounded-[2px] border border-white/10 bg-[#010D1F] p-4">
            <CheckCircle weight="fill" size={18} className="mt-0.5 shrink-0 text-[#CC6600]" />
            <p className="font-sans text-[13px] leading-relaxed text-white/65">
              The link works once and expires in <span className="font-mono text-white/85">60 minutes</span>. Don&apos;t
              see it? Check your spam folder.
            </p>
          </div>

          {sandboxNotice && (
            <Alert variant="warning" title="Test mode">
              <p>{sandboxNotice}</p>
              {devRecoveryUrl && (
                <Link href={devRecoveryUrl} className={`${authAccentLink} mt-2 inline-flex items-center gap-1`}>
                  Open the reset page
                  <ArrowRight size={12} weight="bold" />
                </Link>
              )}
            </Alert>
          )}

          <div className="flex flex-col gap-3">
            <Link href="/login" className={authLinkButton}>
              Back to log in
            </Link>
            <button
              type="button"
              onClick={() => {
                setIsSubmitted(false);
                setEmail("");
              }}
              className="py-1 text-center font-sans text-[13px] text-white/55 transition-colors hover:text-white"
            >
              Use a different email
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-7">
          <div className={authHeading}>
            <h1 className={authTitle}>Reset your password</h1>
            <p className={authSubtitle}>
              Enter the email you signed up with. We&apos;ll send you a link to set a new password.
            </p>
          </div>

          {errorMessage && (
            <Alert variant="danger" title={noAccount ? "No account with that email" : "Couldn't send the email"}>
              <p>{errorMessage}</p>
              {noAccount && (
                <Link href="/register" className={`${authAccentLink} mt-2 inline-flex items-center gap-1`}>
                  Create a free account
                  <ArrowRight size={12} weight="bold" />
                </Link>
              )}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <FormInput
              label="Email"
              name="email"
              type="email"
              required
              variant="auth"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              disabled={isPending}
              autoComplete="email"
              className={authField}
            />

            <Button type="submit" variant="primary" size="sm" className={authSubmit} loading={isPending} disabled={isPending}>
              {isPending ? "Sending..." : "Send reset link"}
            </Button>
          </form>

          <p className="text-center font-sans text-[13px] text-white/60">
            Remember it?{" "}
            <Link href="/login" className={authTextLink}>
              Log in
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
