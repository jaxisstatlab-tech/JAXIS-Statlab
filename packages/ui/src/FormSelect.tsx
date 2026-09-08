"use client";

import React from "react";
import { CaretDown, Warning } from "@phosphor-icons/react";
import { Label } from "./Label";
import { cn } from "./utils";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  helper?: string;
  placeholder?: string;
  monoLabel?: boolean;
  containerClassName?: string;
}

export const FormSelect = React.forwardRef<HTMLSelectElement, FormSelectProps>(
  (
    {
      label,
      options,
      error,
      helper,
      placeholder,
      monoLabel = false,
      id,
      required,
      className = "",
      containerClassName = "",
      ...props
    },
    ref
  ) => {
    const selectId = id ?? (label ? label.toLowerCase().replace(/[^a-z0-9]/g, "-") : undefined);

    return (
      <div className={cn("flex flex-col gap-2.5 w-full", containerClassName)}>
        {label && (
          <div className="flex items-center justify-between px-0.5">
            <Label
              htmlFor={selectId}
              variant={monoLabel ? "mono" : "default"}
              required={required}
            >
              {label}
            </Label>
          </div>
        )}

        <div className="relative flex items-center w-full">
          <select
            ref={ref}
            id={selectId}
            required={required}
            data-no-bg-chevron="true"
            className={cn(
              "w-full h-11 sm:h-12 px-4 pr-10 text-sm rounded-[4px] text-white bg-[#01142B] border border-white/15 hover:border-white/25 focus:border-[#CC6600] focus:outline-none focus:ring-1 focus:ring-[#CC6600]/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-sans box-border appearance-none cursor-pointer",
              error && "!border-[#EF4444] focus:!border-[#EF4444] focus:!ring-[#EF4444]",
              className
            )}
            style={{
              paddingLeft: "1rem",
              paddingRight: "2.5rem",
              boxSizing: "border-box",
              ...props.style,
            }}
            {...props}
          >
            {placeholder && (
              <option value="" disabled className="bg-[#01142B] text-white/40">
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option
                key={opt.value}
                value={opt.value}
                disabled={opt.disabled}
                className="bg-[#01142B] text-white"
              >
                {opt.label}
              </option>
            ))}
          </select>

          {/* Custom Chevron icon */}
          <div className="absolute right-3.5 pointer-events-none flex items-center justify-center text-white/50">
            <CaretDown size={16} weight="fill" />
          </div>
        </div>

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
FormSelect.displayName = "FormSelect";
