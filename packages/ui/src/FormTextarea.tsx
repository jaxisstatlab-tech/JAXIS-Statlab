"use client";

import React from "react";
import { Warning } from "@phosphor-icons/react";
import { Label } from "./Label";
import { Textarea, type TextareaProps } from "./Textarea";
import { cn } from "./utils";

export interface FormTextareaProps extends Omit<TextareaProps, "error"> {
  label?: string;
  error?: string;
  helper?: string;
  monoLabel?: boolean;
  containerClassName?: string;
}

export const FormTextarea = React.forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  (
    {
      label,
      error,
      helper,
      monoLabel = false,
      id,
      required,
      rows = 4,
      className = "",
      containerClassName = "",
      ...props
    },
    ref
  ) => {
    const textareaId = id ?? (label ? label.toLowerCase().replace(/[^a-z0-9]/g, "-") : undefined);

    return (
      <div className={cn("flex flex-col gap-2.5 w-full", containerClassName)}>
        {label && (
          <div className="flex items-center justify-between px-0.5">
            <Label
              htmlFor={textareaId}
              variant={monoLabel ? "mono" : "default"}
              required={required}
            >
              {label}
            </Label>
          </div>
        )}
        <Textarea
          ref={ref}
          id={textareaId}
          required={required}
          rows={rows}
          error={Boolean(error)}
          className={className}
          {...props}
        />
        {error ? (
          <div className="flex items-center gap-2 px-0.5 mt-0.5">
            <Warning size={14} weight="fill" className="text-[#EF4444] shrink-0" />
            <span className="text-xs text-[#EF4444] font-sans font-medium leading-relaxed">
              {error}
            </span>
          </div>
        ) : helper ? (
          <span className="text-xs text-white/50 font-sans leading-relaxed px-0.5 mt-0.5 block">
            {helper}
          </span>
        ) : null}
      </div>
    );
  }
);
FormTextarea.displayName = "FormTextarea";
