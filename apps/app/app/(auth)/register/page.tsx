"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, FormInput, DividerWithText } from "@repo/ui";
import {
  Eye,
  EyeSlash,
  WarningCircle,
} from "@phosphor-icons/react";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { registerClient } from "@/features/auth/actions";

export default function RegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    if (password !== confirmPassword) {
      setFieldErrors({ confirmPassword: ["Passwords do not match."] });
      return;
    }

    startTransition(async () => {
      const res = await registerClient({
        firstName,
        lastName,
        email,
        password,
        confirmPassword,
      });

      if (!res.success) {
        if (res.error?.code === "EMAIL_TAKEN") {
          setErrorMessage(res.error.message);
        } else if (res.error?.fieldErrors) {
          setFieldErrors(res.error.fieldErrors);
        } else {
          setErrorMessage(res.error?.message || "Registration failed.");
        }
        return;
      }

      router.push("/login?registered=true");
    });
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-content-fade">
      {/* Title & Subtitle */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl sm:text-[1.65rem] font-bold text-white tracking-tight font-sans">
          Sign Up Account
        </h1>
        <p className="text-xs sm:text-sm text-white/60 leading-relaxed font-sans">
          Enter your personal details to create your research account.
        </p>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div
          role="alert"
          className="p-3.5 rounded-[2px] bg-red-500/[0.08] border border-red-500/30 flex items-start gap-3 animate-content-fade"
        >
          <WarningCircle weight="fill" size={18} className="text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 flex flex-col gap-1 text-xs font-sans">
            <span className="font-semibold text-red-200">Registration Error</span>
            <p className="text-white/70 leading-relaxed">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Google Single Sign-On Button */}
      <GoogleSignInButton callbackUrl="/dashboard/client" isRegister />

      {/* Clean Centered Divider */}
      <DividerWithText className="-my-1">Or</DividerWithText>

      {/* Registration Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Name Fields: First & Last Name */}
        <div className="grid grid-cols-2 gap-3">
          <FormInput
            label="First Name"
            name="firstName"
            type="text"
            required
            variant="auth"
            placeholder="e.g. Eleanor"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            error={fieldErrors.firstName?.[0]}
            disabled={isPending}
            autoComplete="given-name"
            className="!h-9 sm:!h-9 text-xs sm:text-sm rounded-[2px]"
          />

          <FormInput
            label="Last Name"
            name="lastName"
            type="text"
            required
            variant="auth"
            placeholder="e.g. Vance"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            error={fieldErrors.lastName?.[0]}
            disabled={isPending}
            autoComplete="family-name"
            className="!h-9 sm:!h-9 text-xs sm:text-sm rounded-[2px]"
          />
        </div>

        <FormInput
          label="University or Work Email"
          name="email"
          type="email"
          required
          variant="auth"
          placeholder="e.g. e.vance@university.edu"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email?.[0]}
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
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password?.[0]}
          errorVariant="banner"
          disabled={isPending}
          autoComplete="new-password"
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

        <FormInput
          label="Confirm Password"
          name="confirmPassword"
          type={showConfirmPassword ? "text" : "password"}
          required
          variant="auth"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={fieldErrors.confirmPassword?.[0]}
          errorVariant="banner"
          disabled={isPending}
          autoComplete="new-password"
          rightIcon={
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="text-white/40 hover:text-white transition-colors cursor-pointer p-0.5"
              title={showConfirmPassword ? "Hide password" : "Show password"}
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? (
                <EyeSlash weight="fill" size={16} />
              ) : (
                <Eye weight="fill" size={16} />
              )}
            </button>
          }
          className="!h-9 sm:!h-9 text-xs sm:text-sm rounded-[2px]"
        />

        <p className="text-[11px] text-white/40 font-sans -mt-1">
          Must be at least 8 characters.
        </p>

        <Button
          type="submit"
          variant="primary"
          size="sm"
          className="w-full h-9 min-h-[36px] text-xs sm:text-sm font-semibold rounded-[2px] shadow-sm tracking-normal mt-1"
          loading={isPending}
          disabled={isPending}
        >
          {isPending ? "Creating Account..." : "Sign Up →"}
        </Button>

        <p className="text-[11px] text-white/40 text-center font-sans leading-relaxed">
          By creating an account, you agree to our Terms of Service and Privacy Policy.
        </p>
      </form>

      {/* Footer Login Link */}
      <div className="text-center text-xs text-white/60 font-sans">
        <span>Already have an account?</span>{" "}
        <Link
          href="/login"
          className="text-[#FFA040] hover:text-[#FFB366] font-semibold transition-colors underline ml-1"
        >
          Log in →
        </Link>
      </div>
    </div>
  );
}
