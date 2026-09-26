"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, FormInput } from "@repo/ui";
import {
  ArrowRight,
  Envelope,
  Eye,
  EyeSlash,
  LockKey,
} from "@phosphor-icons/react";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { AuthDivider } from "@/components/auth/AuthDivider";
import {
  authHeading,
  authField,
  authSubmit,
  authSubtitle,
  authTextLink,
  authTitle,
} from "@/components/auth/styles";
import { SITE_PRIVACY_URL, SITE_TERMS_URL } from "@/lib/site";
import { PasswordRequirements } from "@/components/auth/PasswordRequirements";
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
    <div className="auth-stagger flex w-full flex-col gap-5">
      <div className={authHeading}>
        <h1 className={authTitle}>Create your free account</h1>
        <p className={authSubtitle}>
          Send your study and get a fixed price, all in one place.
        </p>
      </div>

      {errorMessage && (
        <Alert variant="danger" title="Couldn't create your account">
          {errorMessage}
        </Alert>
      )}

      <GoogleSignInButton
        callbackUrl="/dashboard/client"
        isRegister
        onError={(err) => setErrorMessage(err)}
      />
      <AuthDivider>or with email</AuthDivider>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <FormInput
            label="First name"
            name="firstName"
            type="text"
            required
            monoLabel
            variant="auth"
            placeholder="Juan"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            error={fieldErrors.firstName?.[0]}
            disabled={isPending}
            autoComplete="given-name"
            className={authField}
          />

          <FormInput
            label="Last name"
            name="lastName"
            type="text"
            required
            monoLabel
            variant="auth"
            placeholder="Dela Cruz"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            error={fieldErrors.lastName?.[0]}
            disabled={isPending}
            autoComplete="family-name"
            className={authField}
          />
        </div>

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
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email?.[0]}
          disabled={isPending}
          autoComplete="email"
          className={authField}
        />

        <div className="flex flex-col">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-3">
            <FormInput
              label="Password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              monoLabel
              variant="auth"
              leftIcon={<LockKey size={16} weight="fill" />}
              placeholder="8+ characters"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) {
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.password;
                    return next;
                  });
                }
              }}
              error={fieldErrors.password?.[0]}
              errorVariant="banner"
              disabled={isPending}
              autoComplete="new-password"
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-white/40 hover:text-white transition-colors cursor-pointer p-0.5"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeSlash weight="fill" size={16} />
                  ) : (
                    <Eye weight="fill" size={16} />
                  )}
                </button>
              }
              className={authField}
            />

            <FormInput
              label="Confirm password"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              required
              monoLabel
              variant="auth"
              leftIcon={<LockKey size={16} weight="fill" />}
              placeholder="Type it again"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (fieldErrors.confirmPassword) {
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.confirmPassword;
                    return next;
                  });
                }
              }}
              error={fieldErrors.confirmPassword?.[0]}
              errorVariant="banner"
              disabled={isPending}
              autoComplete="new-password"
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="text-white/40 hover:text-white transition-colors cursor-pointer p-0.5"
                  aria-label={
                    showConfirmPassword ? "Hide password" : "Show password"
                  }
                >
                  {showConfirmPassword ? (
                    <EyeSlash weight="fill" size={16} />
                  ) : (
                    <Eye weight="fill" size={16} />
                  )}
                </button>
              }
              className={authField}
            />
          </div>

          {/* Strength meter spans both password fields */}
          <PasswordRequirements password={password} />
        </div>

        <Button
          type="submit"
          variant="primary"
          size="sm"
          className={authSubmit}
          loading={isPending}
          disabled={isPending}
        >
          {isPending ? (
            "Creating your account..."
          ) : (
            <>
              Create account
              <ArrowRight
                size={15}
                weight="bold"
                className="transition-transform duration-200 ease-out group-hover:translate-x-0.5"
              />
            </>
          )}
        </Button>

        <p className="text-center font-sans text-xs leading-relaxed text-white/50">
          By signing up, you agree to our{" "}
          <a href={SITE_TERMS_URL} className={authTextLink}>
            Terms
          </a>{" "}
          and{" "}
          <a href={SITE_PRIVACY_URL} className={authTextLink}>
            Privacy Policy
          </a>
          .
        </p>
      </form>
    </div>
  );
}
