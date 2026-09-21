"use client";

import React from "react";
import { Eye, EyeSlash, WarningCircle } from "@phosphor-icons/react";
import { Label } from "./Label";
import { Input, type InputProps } from "./Input";
import { cn } from "./utils";

export interface FormInputProps extends Omit<InputProps, "error"> {
  label?: string;
  labelRightAction?: React.ReactNode;
  error?: string;
  errorTitle?: string;
  errorAction?: React.ReactNode;
  isInvalid?: boolean;
  errorVariant?: "text" | "banner";
  helper?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  monoLabel?: boolean;
  containerClassName?: string;
}

export function EyeIcon({ className = "w-4 h-4" }: { className?: string }) {
  return <Eye size={16} weight="fill" className={className} />;
}

export function EyeOffIcon({ className = "w-4 h-4" }: { className?: string }) {
  return <EyeSlash size={16} weight="fill" className={className} />;
}

export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  (
    {
      label,
      labelRightAction,
      error,
      errorTitle,
      errorAction,
      isInvalid = false,
      errorVariant = "text",
      helper,
      leftIcon,
      rightIcon,
      monoLabel = false,
      variant = "default",
      id,
      required,
      className = "",
      containerClassName = "",
      ...props
    },
    ref
  ) => {
    const inputId = id ?? (label ? label.toLowerCase().replace(/[^a-z0-9]/g, "-") : undefined);
    const hasError = Boolean(error) || Boolean(isInvalid);

    return (
      <div className={cn("flex flex-col gap-2.5 w-full", containerClassName)}>
        {/* Label Row */}
        {(label || labelRightAction) && (
          <div className="flex items-center justify-between px-0.5">
            {label && (
              <Label
                htmlFor={inputId}
                variant={monoLabel ? "mono" : "default"}
                required={required}
              >
                {label}
              </Label>
            )}
            {labelRightAction && (
              <div className="text-xs font-sans text-white/60">{labelRightAction}</div>
            )}
          </div>
        )}

        {/* Input Field with optional left/right icons */}
        <div className="relative flex items-center w-full">
          {leftIcon && (
            <div className="absolute left-3.5 flex items-center justify-center text-white/40 pointer-events-none z-10">
              {leftIcon}
            </div>
          )}

          <Input
            ref={ref}
            id={inputId}
            required={required}
            variant={variant}
            error={hasError}
            className={cn(
              leftIcon ? "!pl-11" : "",
              rightIcon ? "!pr-11" : "",
              className
            )}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3.5 flex items-center justify-center text-white/40 z-10">
              {rightIcon}
            </div>
          )}
        </div>

        {/* Error or Helper text */}
        {error ? (
          errorVariant === "banner" ? (
            <div
              role="alert"
              className="p-3.5 rounded-[2px] bg-red-500/[0.08] border border-red-500/30 flex items-start gap-3 mt-1.5 animate-content-fade"
            >
              <WarningCircle
                weight="fill"
                size={18}
                className="text-red-400 shrink-0 mt-0.5"
              />
              <div className="flex-1 flex flex-col gap-1 text-xs font-sans">
                {errorTitle && (
                  <span className="font-semibold text-red-200">
                    {errorTitle}
                  </span>
                )}
                <p className="text-white/70 leading-relaxed">{error}</p>
                {errorAction && <div className="pt-1">{errorAction}</div>}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-0.5 mt-0.5">
              <WarningCircle size={14} weight="fill" className="text-red-400 shrink-0" />
              <span className="text-xs text-red-400 font-sans font-medium leading-relaxed">
                {error}
              </span>
            </div>
          )
        ) : helper ? (
          <span className="text-xs text-white/50 font-sans leading-relaxed px-0.5 mt-0.5 block">
            {helper}
          </span>
        ) : null}
      </div>
    );
  }
);
FormInput.displayName = "FormInput";
