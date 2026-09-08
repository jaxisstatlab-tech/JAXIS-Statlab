"use client";

import React from "react";
import { Check, Warning } from "@phosphor-icons/react";

export interface FormCheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: React.ReactNode;
  description?: string;
  error?: string;
  containerClassName?: string;
  variant?: "default" | "card";
}

export const FormCheckbox = React.forwardRef<HTMLInputElement, FormCheckboxProps>(
  (
    {
      label,
      description,
      error,
      id,
      className = "",
      containerClassName = "",
      checked,
      onChange,
      disabled,
      variant = "default",
      ...props
    },
    ref
  ) => {
    const inputId = id ?? (typeof label === "string" ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div
        className={`flex flex-col gap-1.5 ${containerClassName} ${className}`.trim()}
        style={{ boxSizing: "border-box" }}
      >
        <label
          htmlFor={inputId}
          className={`flex items-start gap-3.5 cursor-pointer select-none transition-all ${
            disabled ? "opacity-50 cursor-not-allowed" : "hover:text-white"
          } ${
            variant === "card"
              ? `p-4 sm:p-5 rounded-[2px] border ${
                  checked
                    ? "bg-[#CC6600]/10 border-[#CC6600]/50"
                    : "bg-[#01142B]/85 border-white/[0.09] hover:border-white/20"
                }`
              : ""
          }`}
          style={
            variant === "card"
              ? {
                  padding: "1.25rem 1.5rem",
                  borderRadius: "2px",
                  border: checked ? "1px solid rgba(204, 102, 0, 0.5)" : "1px solid rgba(255, 255, 255, 0.09)",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "1rem",
                  boxSizing: "border-box",
                }
              : {
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.75rem",
                  boxSizing: "border-box",
                }
          }
        >
          {/* Custom Styled Checkbox Container */}
          <div
            className="relative flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ width: "1.25rem", height: "1.25rem", flexShrink: 0 }}
          >
            <input
              ref={ref}
              type="checkbox"
              id={inputId}
              checked={checked}
              onChange={onChange}
              disabled={disabled}
              className="sr-only"
              {...props}
            />
            <div
              className={`w-5 h-5 rounded-[2px] border flex items-center justify-center transition-all ${
                checked
                  ? "bg-[#CC6600] border-[#CC6600] text-white shadow-sm"
                  : "bg-[#011C38] border-white/25 text-transparent hover:border-[#CC6600]/70"
              }`}
              style={{
                width: "1.25rem",
                height: "1.25rem",
                borderRadius: "2px",
                backgroundColor: checked ? "#CC6600" : "#011C38",
                borderColor: checked ? "#CC6600" : "rgba(255, 255, 255, 0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {checked && <Check size={14} weight="bold" style={{ color: "#FFFFFF" }} />}
            </div>
          </div>

          <div
            className="flex flex-col gap-1 min-w-0 flex-1"
            style={{ display: "flex", flexDirection: "column", gap: "0.25rem", flex: 1, minWidth: 0 }}
          >
            <div className="font-sans text-sm text-white font-medium leading-snug">
              {label}
            </div>
            {description && (
              <p
                className="text-xs text-white/70 font-sans leading-relaxed"
                style={{ fontSize: "0.75rem", lineHeight: 1.5, color: "rgba(255, 255, 255, 0.7)" }}
              >
                {description}
              </p>
            )}
          </div>
        </label>

        {error && (
          <div
            className="flex items-center gap-1.5 px-0.5 mt-1"
            style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginTop: "0.25rem" }}
          >
            <Warning size={13} weight="fill" className="text-[#EF4444] shrink-0" style={{ color: "#EF4444", flexShrink: 0 }} />
            <span className="text-xs text-[#EF4444] font-mono leading-relaxed" style={{ fontSize: "0.75rem", color: "#EF4444" }}>
              {error}
            </span>
          </div>
        )}
      </div>
    );
  }
);

FormCheckbox.displayName = "FormCheckbox";
