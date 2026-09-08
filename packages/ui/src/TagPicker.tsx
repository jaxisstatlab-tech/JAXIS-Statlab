"use client";

import * as React from "react";
import { Check, Plus, X } from "@phosphor-icons/react";
import { cn } from "./utils";

export interface TagPickerProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  label?: string;
  description?: string;
  placeholder?: string;
  allowCustom?: boolean;
  maxSelected?: number;
  className?: string;
}

export function TagPicker({
  options,
  selected,
  onChange,
  label,
  description,
  placeholder = "Add custom tag...",
  allowCustom = true,
  maxSelected,
  className = "",
}: TagPickerProps) {
  const [customInput, setCustomInput] = React.useState("");

  const toggleOption = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((item) => item !== opt));
    } else {
      if (maxSelected && selected.length >= maxSelected) return;
      onChange([...selected, opt]);
    }
  };

  const handleAddCustom = (e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault();
    const trimmed = customInput.trim();
    if (!trimmed) return;
    if (!selected.includes(trimmed)) {
      onChange([...selected, trimmed]);
    }
    setCustomInput("");
  };

  const clearAll = () => {
    onChange([]);
  };

  // Combine standard options + any custom selected options
  const allOptions = Array.from(new Set([...options, ...selected]));

  return (
    <div className={cn("flex flex-col gap-2 font-sans", className)}>
      {(label || description || selected.length > 0) && (
        <div className="flex items-center justify-between gap-2">
          <div>
            {label && (
              <span className="text-xs font-semibold text-slate-200">
                {label}
              </span>
            )}
            {description && (
              <p className="text-xs text-white/50">{description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 text-[0.688rem] font-mono text-white/40 shrink-0">
            {selected.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="text-white/40 hover:text-[#CC6600] transition-colors underline cursor-pointer"
              >
                Clear ({selected.length})
              </button>
            )}
            <span>{selected.length} selected</span>
          </div>
        </div>
      )}

      {/* Tags Flow */}
      <div className="flex flex-wrap gap-1.5 pt-0.5">
        {allOptions.map((opt) => {
          const isSelected = selected.includes(opt);
          const isCustom = !options.includes(opt);

          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggleOption(opt)}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] text-xs font-mono transition-all duration-150 cursor-pointer select-none border",
                isSelected
                  ? "bg-[#CC6600]/15 text-[#FFA040] border-[#CC6600] font-medium shadow-sm"
                  : "bg-[#01142B] text-slate-300 border-white/10 hover:border-white/25 hover:text-white hover:bg-white/[0.04]"
              )}
            >
              {isSelected ? (
                <Check size={12} weight="bold" className="text-[#CC6600] shrink-0" />
              ) : (
                <span className="text-white/30 font-bold text-xs leading-none">+</span>
              )}
              <span className="max-w-[180px] truncate">{opt}</span>
              {isCustom && isSelected && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(selected.filter((s) => s !== opt));
                  }}
                  className="ml-1 text-[#FFA040]/70 hover:text-red-400 font-bold text-xs p-0.5 hover:bg-red-500/20 rounded-[2px] transition-colors inline-flex items-center"
                  title="Remove custom tag"
                >
                  <X size={10} weight="bold" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Add Custom Tag Input */}
      {allowCustom && (
        <div className="flex items-stretch gap-2 pt-1">
          <input
            type="text"
            placeholder={placeholder}
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddCustom(e);
              }
            }}
            className="flex-1 h-8 rounded-[2px] bg-[#01142B] border border-white/10 px-3 text-xs text-white placeholder:text-white/30 focus:border-[#CC6600] focus:outline-none font-mono"
          />
          <button
            type="button"
            onClick={handleAddCustom}
            disabled={!customInput.trim()}
            className="px-3 h-8 rounded-[2px] bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/10 hover:border-white/25 text-xs font-mono transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 shrink-0"
          >
            <Plus size={12} weight="bold" />
            Add Tag
          </button>
        </div>
      )}
    </div>
  );
}
