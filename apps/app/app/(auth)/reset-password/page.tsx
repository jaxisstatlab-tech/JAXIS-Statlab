"use client";

import React, { useState, useEffect, useTransition, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Alert, Button, FormInput, LoadingState } from "@repo/ui";
import { ArrowLeft, XCircle, Eye, EyeSlash } from "@phosphor-icons/react";
import { verifyResetTokenAction, resetPasswordAction } from "@/features/auth/actions";
import { authHeading, authBackLink, authField, authLinkButton, authSubmit, authSubtitle, authTextLink, authTitle } from "@/components/auth/styles";
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
      setTokenError("This link is missing its code. Ask for a new reset link.");
      return;
    }

    let isMounted = true;
    verifyResetTokenAction(token)
      .then((res) => {
        if (!isMounted) return;
        if (res.success) {
          setEmail(res.data.email);
        } else {
          setTokenError(res.error.message || "This link has expired or was already used. Ask for a new one.");
        }
      })
      .catch((err) => {
        console.error("Token verification error:", err);
        if (isMounted) {
          setTokenError("We couldn't check your link. Please try again.");
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
          label="Checking your link..."
        />
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="flex w-full flex-col gap-7 animate-content-fade">
        <div className={authHeading}>
          <XCircle weight="fill" size={28} className="mb-2 text-red-400" />
          <h1 className={authTitle}>This link doesn&apos;t work</h1>
          <p className={authSubtitle}>{tokenError}</p>
        </div>
        <div className="flex flex-col gap-3">
          <Link href="/forgot-password" className={authLinkButton}>
            Get a new link
          </Link>
          <Link href="/login" className={`${authTextLink} self-center py-1 font-sans text-[13px]`}>
            Back to log in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-7 animate-content-fade">
      <Link href="/login" className={authBackLink}>
        <ArrowLeft weight="bold" size={13} className="transition-transform group-hover:-translate-x-0.5" />
        Back to log in
      </Link>

      <div className={authHeading}>
        <h1 className={authTitle}>Set a new password</h1>
        <p className={authSubtitle}>
          For <strong className="font-medium text-white">{email}</strong>. You&apos;ll use it the next time you log in.
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
              ? "Pick a different password"
              : formError.toLowerCase().includes("recovery link") ||
                formError.toLowerCase().includes("expired") ||
                formError.toLowerCase().includes("invalid")
              ? "This link doesn't work"
              : "Check your password"
          }
        >
          {formError}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col">
          <FormInput
            label="New password"
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
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeSlash weight="fill" size={16} /> : <Eye weight="fill" size={16} />}
              </button>
            }
            className={authField}
          />

          {/* Dynamic Real-time Password Requirements Checklist matching register */}
          <PasswordRequirements password={password} />
        </div>

        <FormInput
          label="Confirm new password"
          name="confirmPassword"
          type={showConfirmPassword ? "text" : "password"}
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (formError) setFormError(null);
          }}
          placeholder="Type it again"
          disabled={isPending}
          autoComplete="new-password"
          required
          variant="auth"
          error={confirmPassword && password !== confirmPassword ? "The passwords don't match yet." : undefined}
          errorVariant="banner"
          rightIcon={
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="text-white/40 hover:text-white transition-colors cursor-pointer p-0.5"
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? <EyeSlash weight="fill" size={16} /> : <Eye weight="fill" size={16} />}
            </button>
          }
          className={authField}
        />

        <Button
          type="submit"
          variant="primary"
          size="sm"
          className={authSubmit}
          loading={isPending}
          disabled={isPending || !isValid}
        >
          {isPending ? "Saving..." : "Save new password"}
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
            label="Loading..."
          />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
