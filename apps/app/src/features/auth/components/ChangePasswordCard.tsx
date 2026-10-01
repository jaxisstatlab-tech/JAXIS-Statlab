"use client";

import React, { useState, useTransition } from "react";
import { Card, FormInput, Button, Toast } from "@repo/ui";
import { Key, Eye, EyeSlash, CheckCircle } from "@phosphor-icons/react";
import { changePasswordAction } from "../actions";

interface ChangePasswordCardProps {
  className?: string;
}

export function ChangePasswordCard({ className = "" }: ChangePasswordCardProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [toastMessage, setToastMessage] = useState<{
    message: string;
    description?: string;
    variant: "info" | "success" | "warning" | "danger";
  } | null>(null);

  const [isPending, startTransition] = useTransition();

  // Dynamic password criteria checks
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmNewPassword;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    startTransition(async () => {
      try {
        const res = await changePasswordAction({
          currentPassword,
          newPassword,
          confirmNewPassword,
        });

        if (res.success) {
          setToastMessage({
            message: "Password changed",
            description: "Use your new password the next time you log in.",
            variant: "success",
          });
          // Reset fields on success
          setCurrentPassword("");
          setNewPassword("");
          setConfirmNewPassword("");
          setFieldErrors({});
        } else {
          if (res.error.fieldErrors) {
            setFieldErrors(res.error.fieldErrors);
          }
          setToastMessage({
            message: "Couldn't change your password",
            description: res.error.message || "Please check what you typed and try again.",
            variant: "danger",
          });
        }
      } catch (err) {
        console.error(err);
        setToastMessage({
          message: "Couldn't change your password",
          description: "Something went wrong. Please try again in a moment.",
          variant: "danger",
        });
      }
    });
  };

  return (
    <>
      {toastMessage && (
        <Toast
          message={toastMessage.message}
          description={toastMessage.description}
          variant={toastMessage.variant}
          onClose={() => setToastMessage(null)}
        />
      )}

      <Card
        className={`p-6 md:p-8 bg-[#0A0A18] border border-white/10 rounded-[2px] shadow-xl animate-card-reveal ${className}`}
      >
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
          {/* Canonical Section Card Header Anatomy (Rule 21) */}
          <div className="flex items-center gap-2.5 border-b border-white/10 pb-4">
            <Key size={18} weight="fill" className="text-[#CC6600] shrink-0" />
            <div>
              <h2 className="text-base font-bold text-white font-sans">Change Password</h2>
              <p className="text-xs text-white/60 font-sans mt-1">
                Type your current password, then choose a new one.
              </p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="flex flex-col gap-5">
            {/* Current Password */}
            <div className="w-full">
              <FormInput
                label="Current Password"
                type={showCurrent ? "text" : "password"}
                required
                placeholder="Enter your current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                error={fieldErrors.currentPassword?.[0]}
                disabled={isPending}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowCurrent((prev) => !prev)}
                    className="text-white/40 hover:text-white/80 transition-colors cursor-pointer p-1"
                    title={showCurrent ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showCurrent ? (
                      <EyeSlash size={16} weight="fill" />
                    ) : (
                      <Eye size={16} weight="fill" />
                    )}
                  </button>
                }
              />
            </div>

            {/* New Password & Confirmation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
              <div className="flex flex-col gap-2">
                <FormInput
                  label="New Password"
                  type={showNew ? "text" : "password"}
                  required
                  placeholder="Enter at least 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  error={fieldErrors.newPassword?.[0]}
                  disabled={isPending}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowNew((prev) => !prev)}
                      className="text-white/40 hover:text-white/80 transition-colors cursor-pointer p-1"
                      title={showNew ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showNew ? (
                        <EyeSlash size={16} weight="fill" />
                      ) : (
                        <Eye size={16} weight="fill" />
                      )}
                    </button>
                  }
                />

                {/* Password Requirements Checklist */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-sans px-2 py-0.5 rounded-[2px] transition-colors ${
                      hasMinLength
                        ? "bg-white/[0.07] text-white border border-white/20"
                        : "bg-white/[0.04] text-white/40 border border-white/[0.08]"
                    }`}
                  >
                    {hasMinLength && <CheckCircle size={12} weight="fill" className="text-white/80" />}
                    8+ characters
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-sans px-2 py-0.5 rounded-[2px] transition-colors ${
                      hasUppercase
                        ? "bg-white/[0.07] text-white border border-white/20"
                        : "bg-white/[0.04] text-white/40 border border-white/[0.08]"
                    }`}
                  >
                    {hasUppercase && <CheckCircle size={12} weight="fill" className="text-white/80" />}
                    1 uppercase letter
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-sans px-2 py-0.5 rounded-[2px] transition-colors ${
                      hasNumber
                        ? "bg-white/[0.07] text-white border border-white/20"
                        : "bg-white/[0.04] text-white/40 border border-white/[0.08]"
                    }`}
                  >
                    {hasNumber && <CheckCircle size={12} weight="fill" className="text-white/80" />}
                    1 number
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <FormInput
                  label="Confirm New Password"
                  type={showConfirm ? "text" : "password"}
                  required
                  placeholder="Re-type your new password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  error={fieldErrors.confirmNewPassword?.[0]}
                  disabled={isPending}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowConfirm((prev) => !prev)}
                      className="text-white/40 hover:text-white/80 transition-colors cursor-pointer p-1"
                      title={showConfirm ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showConfirm ? (
                        <EyeSlash size={16} weight="fill" />
                      ) : (
                        <Eye size={16} weight="fill" />
                      )}
                    </button>
                  }
                />

                {confirmNewPassword.length > 0 && (
                  <div className="pt-1">
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-sans px-2 py-0.5 rounded-[2px] transition-colors ${
                        passwordsMatch
                          ? "bg-white/[0.07] text-white border border-white/20"
                          : "bg-white/[0.04] text-white/55 border border-white/[0.08]"
                      }`}
                    >
                      {passwordsMatch && <CheckCircle size={12} weight="fill" className="text-white/80" />}
                      {passwordsMatch ? "Passwords match" : "Passwords don't match yet"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-end pt-4 border-t border-white/[0.08]">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={isPending}
              disabled={isPending || !currentPassword || !newPassword || !confirmNewPassword}
              className="w-full sm:w-auto font-sans font-semibold rounded-[2px] active:scale-[0.97] transition-transform"
            >
              Update Password
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
