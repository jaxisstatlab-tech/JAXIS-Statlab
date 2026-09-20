"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Alert, FormInput, EyeIcon, EyeOffIcon, DividerWithText } from "@repo/ui";
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
    <div className="w-full flex flex-col gap-6">
      {/* Title & Subtitle */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-sans">
          Create Account
        </h1>
        <p className="text-xs sm:text-sm text-white/60 leading-relaxed font-sans">
          Register as a researcher or university client for statistical services.
        </p>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <Alert variant="danger" title="Registration Error">
          {errorMessage}
        </Alert>
      )}

      {/* Google Single Sign-On Button */}
      <GoogleSignInButton callbackUrl="/dashboard/client" isRegister />

      {/* Clean Divider */}
      <DividerWithText className="-my-1">or register with email</DividerWithText>

      {/* Registration Form with Reusable FormInput Components */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col"
        style={{ gap: "1.375rem" }}
      >
        {/* Name Fields: First & Last Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput
            label="First Name"
            name="firstName"
            type="text"
            required
            monoLabel
            variant="auth"
            placeholder="e.g. Eleanor"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            error={fieldErrors.firstName?.[0]}
            disabled={isPending}
            autoComplete="given-name"
          />

          <FormInput
            label="Last Name"
            name="lastName"
            type="text"
            required
            monoLabel
            variant="auth"
            placeholder="e.g. Vance"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            error={fieldErrors.lastName?.[0]}
            disabled={isPending}
            autoComplete="family-name"
          />
        </div>

        <FormInput
          label="University or Work Email"
          name="email"
          type="email"
          required
          monoLabel
          variant="auth"
          placeholder="e.g. e.vance@university.edu"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email?.[0]}
          disabled={isPending}
          autoComplete="email"
        />

        <FormInput
          label="Password (min. 8 characters)"
          name="password"
          type={showPassword ? "text" : "password"}
          required
          monoLabel
          variant="auth"
          placeholder="Enter a secure password"
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

        <FormInput
          label="Confirm Password"
          name="confirmPassword"
          type={showConfirmPassword ? "text" : "password"}
          required
          monoLabel
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
              className="text-slate-400 hover:text-white transition-colors cursor-pointer p-0.5"
              title={showConfirmPassword ? "Hide password" : "Show password"}
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? (
                <EyeOffIcon className="w-4 h-4" />
              ) : (
                <EyeIcon className="w-4 h-4" />
              )}
            </button>
          }
        />

        <div style={{ paddingTop: "0.25rem" }}>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full py-3.5 font-bold tracking-wide rounded-[2px]"
            loading={isPending}
            disabled={isPending}
          >
            {isPending ? "Creating Account..." : "Create Researcher Account →"}
          </Button>
        </div>
      </form>

      {/* Footer Login Link */}
      <div className="pt-2 text-center text-xs text-white/60 font-sans">
        <span>Already have an account?</span>{" "}
        <Link
          href="/login"
          className="text-[#CC6600] hover:text-[#E67300] font-semibold transition-colors ml-1"
        >
          Sign In Instead →
        </Link>
      </div>
    </div>
  );
}
