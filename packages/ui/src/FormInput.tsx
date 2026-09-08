"use client";

import React from "react";
import { Eye, EyeSlash, Warning } from "@phosphor-icons/react";
import { Label } from "./Label";
import { Input, type InputProps } from "./Input";
import { cn } from "./utils";

export interface FormInputProps extends Omit<InputProps, "error"> {
  label?: string;
  labelRightAction?: React.ReactNode;
  error?: string;
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
            <div className="flex items-start gap-2.5 rounded-[5px] bg-[#EF4444]/10 border border-[#EF4444]/35 text-[#FCA5A5] text-xs font-sans leading-relaxed mt-1 p-3 border-l-4 border-l-[#EF4444]">
              <div className="w-5 h-5 rounded-[3px] bg-[#EF4444]/20 border border-[#EF4444]/40 flex items-center justify-center text-[#EF4444] shrink-0 mt-0.5">
                <Warning size={14} weight="fill" />
              </div>
              <span className="font-medium text-white/90">{error}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-0.5 mt-0.5">
              <Warning size={14} weight="fill" className="text-[#EF4444] shrink-0" />
              <span className="text-xs text-[#EF4444] font-sans font-medium leading-relaxed">
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
