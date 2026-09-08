"use client";

import React, { useState, useEffect, useTransition, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Alert, Button, FormInput, LoadingState } from "@repo/ui";
import { ArrowLeft, CheckCircle, XCircle, Eye, EyeSlash, Lock } from "@phosphor-icons/react";
import { verifyResetTokenAction, resetPasswordAction } from "@/features/auth/actions";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [email, setEmail] = useState<string>("");
  const [isVerifying, setIsVerifying] = useState<boolean>(true);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setIsVerifying(false);
      setTokenError("No recovery token found. Please request a new recovery link.");
      return;
    }

    let isMounted = true;
    verifyResetTokenAction(token)
      .then((res) => {
        if (!isMounted) return;
        if (res.success) {
          setEmail(res.data.email);
        } else {
          setTokenError(res.error.message || "This recovery link is invalid or has expired.");
        }
      })
      .catch((err) => {
        console.error("Token verification error:", err);
        if (isMounted) {
          setTokenError("Unable to verify recovery link. Please try again.");
        }
      })
      .finally(() => {
        if (isMounted) setIsVerifying(false);
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  // Real-time password requirement checks
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isValid = hasMinLength && hasUppercase && hasNumber && passwordsMatch;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!isValid) {
      if (!hasMinLength) {
        setFormError("Password must be at least 8 characters long.");
      } else if (!hasUppercase) {
        setFormError("Password must contain at least one uppercase letter.");
      } else if (!hasNumber) {
        setFormError("Password must contain at least one number.");
      } else if (!passwordsMatch) {
        setFormError("Passwords do not match.");
      }
      return;
    }

    startTransition(async () => {
      try {
        const res = await resetPasswordAction({
          token,
          password,
          confirmPassword,
        });

        if (res.success) {
          window.location.href = "/login?reset=success";
        } else {
          setFormError(res.error.message || "Failed to update password. Please try again.");
        }
      } catch (err) {
        console.error("Password reset error:", err);
        setFormError("An unexpected error occurred. Please try again.");
      }
    });
  };

  if (isVerifying) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <LoadingState
          variant="page"
          label="Validating recovery link..."
          description="Verifying security credentials with JAXIS."
        />
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="w-full flex flex-col gap-6 animate-content-fade">
        <div className="flex flex-col gap-3">
          <div className="w-12 h-12 rounded-[2px] bg-red-950/40 border border-red-500/30 flex items-center justify-center text-red-400">
            <XCircle weight="fill" size={24} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight font-sans">
            Invalid Recovery Link
          </h1>
          <p className="text-xs sm:text-sm text-white/60 leading-relaxed font-sans">
            {tokenError}
          </p>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <Link href="/forgot-password" className="w-full">
            <Button variant="primary" size="lg" className="w-full py-3.5 font-bold tracking-wide">
              Request New Link →
            </Button>
          </Link>
          <Link href="/login" className="text-xs font-sans text-slate-400 hover:text-white transition-colors text-center py-1">
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 animate-content-fade">
      {/* Top Breadcrumb */}
      <div>
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-sans text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft weight="bold" size={14} />
          <span>Back to Sign In</span>
        </Link>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-[2px] bg-[#CC6600]/10 text-[#CC6600]">
            <Lock weight="fill" size={16} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-sans">
            Set New Password
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-white/60 leading-relaxed font-sans">
          Choose a new password for <strong className="text-white font-medium">{email}</strong>.
        </p>
      </div>

      {formError && (
        <Alert variant="danger" title="Validation Error">
          {formError}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormInput
          label="New Password"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (formError) setFormError(null);
          }}
          placeholder="Enter new password"
          disabled={isPending}
          autoComplete="new-password"
          required
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-slate-400 hover:text-white transition-colors cursor-pointer p-0.5"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeSlash weight="fill" size={16} /> : <Eye weight="fill" size={16} />}
            </button>
          }
        />

        <FormInput
          label="Confirm New Password"
          type={showConfirmPassword ? "text" : "password"}
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (formError) setFormError(null);
          }}
          placeholder="Repeat new password"
          disabled={isPending}
          autoComplete="new-password"
          required
          rightIcon={
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="text-slate-400 hover:text-white transition-colors cursor-pointer p-0.5"
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? <EyeSlash weight="fill" size={16} /> : <Eye weight="fill" size={16} />}
            </button>
          }
        />

        {/* Security Requirements Checklist */}
        <div className="p-3.5 bg-[#01142B] border border-white/10 rounded-[2px] flex flex-col gap-2">
          <span className="text-[0.688rem] font-mono text-white/50 uppercase tracking-wider font-semibold">
            Security Requirements
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-sans">
            <div className={`flex items-center gap-1.5 ${hasMinLength ? "text-emerald-400" : "text-white/40"}`}>
              <CheckCircle weight="fill" size={14} className={hasMinLength ? "text-emerald-400" : "text-white/20"} />
              <span>8+ characters</span>
            </div>
            <div className={`flex items-center gap-1.5 ${hasUppercase ? "text-emerald-400" : "text-white/40"}`}>
              <CheckCircle weight="fill" size={14} className={hasUppercase ? "text-emerald-400" : "text-white/20"} />
              <span>1 uppercase letter</span>
            </div>
            <div className={`flex items-center gap-1.5 ${hasNumber ? "text-emerald-400" : "text-white/40"}`}>
              <CheckCircle weight="fill" size={14} className={hasNumber ? "text-emerald-400" : "text-white/20"} />
              <span>1 number</span>
            </div>
            <div className={`flex items-center gap-1.5 ${passwordsMatch ? "text-emerald-400" : "text-white/40"}`}>
              <CheckCircle weight="fill" size={14} className={passwordsMatch ? "text-emerald-400" : "text-white/20"} />
              <span>Passwords match</span>
            </div>
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full py-3.5 font-bold tracking-wide mt-2"
          loading={isPending}
          disabled={isPending || !isValid}
        >
          {isPending ? "Updating Password..." : "Update Password & Sign In →"}
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-12">
          <LoadingState
            variant="page"
            label="Loading password reset..."
            description="Preparing secure connection."
          />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
