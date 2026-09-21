"use client";

import React, { useState, useEffect, useTransition, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Alert, Button, FormInput, LoadingState } from "@repo/ui";
import { ArrowLeft, XCircle, Eye, EyeSlash } from "@phosphor-icons/react";
import { verifyResetTokenAction, resetPasswordAction } from "@/features/auth/actions";
import { PasswordRequirements } from "@/components/auth/PasswordRequirements";

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
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;
  const isValid = hasMinLength && hasLowercase && hasUppercase && hasNumber && passwordsMatch;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!isValid) {
      if (!hasLowercase) {
        setFormError("Password must contain at least one lowercase letter.");
      } else if (!hasUppercase) {
        setFormError("Password must contain at least one uppercase letter.");
      } else if (!hasNumber) {
        setFormError("Password must contain at least one number.");
      } else if (!hasMinLength) {
        setFormError("Password must be at least 8 characters long.");
      } else if (!passwordsMatch) {
        setFormError("Passwords do not match.");
      }
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
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
          if (typeof window !== "undefined") {
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        }
      } catch (err) {
        console.error("Password reset error:", err);
        setFormError("An unexpected error occurred. Please try again.");
        if (typeof window !== "undefined") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
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
            <Button variant="primary" size="lg" className="w-full py-3.5 font-bold tracking-wide rounded-[2px]">
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
        <Link href="/login" className="inline-block">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2.5 -ml-2.5 text-xs font-sans text-slate-400 hover:text-white rounded-[2px] gap-1.5 font-semibold"
          >
            <ArrowLeft weight="bold" size={14} />
            <span>Back to Sign In</span>
          </Button>
        </Link>
      </div>

      {/* Title & Subtitle */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl sm:text-[1.65rem] font-bold text-white tracking-tight font-sans">
          Set New Password
        </h1>
        <p className="text-xs sm:text-sm text-white/60 leading-relaxed font-sans">
          Choose a new password for <strong className="text-white font-medium">{email}</strong>.
        </p>
      </div>

      {/* Error Alert Banner on Top */}
      {formError && (
        <Alert
          variant="danger"
          title={
            formError.toLowerCase().includes("same") ||
            formError.toLowerCase().includes("current") ||
            formError.toLowerCase().includes("old")
              ? "Password Already Used"
              : formError.toLowerCase().includes("recovery link") ||
                formError.toLowerCase().includes("expired") ||
                formError.toLowerCase().includes("invalid")
              ? "Invalid Recovery Link"
              : "Validation Error"
          }
        >
          {formError}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col">
          <FormInput
            label="New Password"
            name="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (formError) setFormError(null);
            }}
            placeholder="At least 8 characters"
            disabled={isPending}
            autoComplete="new-password"
            required
            variant="auth"
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-white/40 hover:text-white transition-colors cursor-pointer p-0.5"
                title={showPassword ? "Hide password" : "Show password"}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeSlash weight="fill" size={16} /> : <Eye weight="fill" size={16} />}
              </button>
            }
            className="!h-9 sm:!h-9 text-xs sm:text-sm rounded-[2px]"
          />

          {/* Dynamic Real-time Password Requirements Checklist matching register */}
          <PasswordRequirements password={password} />
        </div>

        <FormInput
          label="Confirm New Password"
          name="confirmPassword"
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
          variant="auth"
          error={confirmPassword && password !== confirmPassword ? "Passwords do not match" : undefined}
          errorVariant="banner"
          rightIcon={
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="text-white/40 hover:text-white transition-colors cursor-pointer p-0.5"
              title={showConfirmPassword ? "Hide password" : "Show password"}
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? <EyeSlash weight="fill" size={16} /> : <Eye weight="fill" size={16} />}
            </button>
          }
          className="!h-9 sm:!h-9 text-xs sm:text-sm rounded-[2px]"
        />

        <Button
          type="submit"
          variant="primary"
          size="sm"
          className="w-full h-9 min-h-[36px] text-xs sm:text-sm font-semibold rounded-[2px] shadow-sm tracking-normal mt-2"
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
