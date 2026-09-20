"use client";

import React, { useState, useTransition } from "react";
import { Card, FormInput, Button, Toast } from "@repo/ui";
import { Key, Eye, EyeSlash, CheckCircle, LockSimple } from "@phosphor-icons/react";
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
            message: "Password Updated",
            description: "Your login credentials have been changed successfully.",
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
            message: "Unable to Change Password",
            description: res.error.message || "Please check the entered values and try again.",
            variant: "danger",
          });
        }
      } catch (err) {
        console.error(err);
        setToastMessage({
          message: "Request Failed",
          description: "An unexpected error occurred while updating your password.",
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
        className={`p-6 md:p-8 bg-[#01142B] border border-white/10 rounded-[2px] shadow-xl animate-card-reveal ${className}`}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Canonical Section Card Header Anatomy (Rule 21) */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2.5">
              <Key size={18} weight="fill" className="text-[#CC6600] shrink-0" />
              <div>
                <h2 className="text-base font-bold text-white font-sans">
                  Change Password
                </h2>
                <p className="text-xs text-white/60 font-sans mt-1">
                  Update your login password to maintain security across your research sessions.
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] bg-white/[0.06] border border-white/10 text-xs font-mono text-white/70 uppercase font-semibold">
              <LockSimple size={12} weight="fill" className="text-white/50" />
              Security
            </span>
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
                        ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                        : "bg-white/[0.04] text-white/40 border border-white/[0.08]"
                    }`}
                  >
                    {hasMinLength && <CheckCircle size={12} weight="fill" className="text-emerald-400" />}
                    8+ characters
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-sans px-2 py-0.5 rounded-[2px] transition-colors ${
                      hasUppercase
                        ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                        : "bg-white/[0.04] text-white/40 border border-white/[0.08]"
                    }`}
                  >
                    {hasUppercase && <CheckCircle size={12} weight="fill" className="text-emerald-400" />}
                    1 uppercase letter
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-sans px-2 py-0.5 rounded-[2px] transition-colors ${
                      hasNumber
                        ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                        : "bg-white/[0.04] text-white/40 border border-white/[0.08]"
                    }`}
                  >
                    {hasNumber && <CheckCircle size={12} weight="fill" className="text-emerald-400" />}
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
                          ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                      }`}
                    >
                      {passwordsMatch && <CheckCircle size={12} weight="fill" className="text-emerald-400" />}
                      {passwordsMatch ? "Passwords match" : "Passwords do not match yet"}
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
