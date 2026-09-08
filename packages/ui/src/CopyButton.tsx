"use client";

import * as React from "react";
import { Check, Copy } from "@phosphor-icons/react";
import { cn } from "./utils";

export interface CopyButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onCopy"> {
  value: string;
  label?: string;
  copiedLabel?: string;
  iconOnly?: boolean;
  timeout?: number;
  variant?: "default" | "badge" | "ghost";
  onCopy?: (value: string) => void;
}

export function CopyButton({
  value,
  label = "Copy",
  copiedLabel = "Copied",
  iconOnly = false,
  timeout = 2000,
  variant = "default",
  className = "",
  onCopy,
  onClick,
  ...props
}: CopyButtonProps) {
  const [hasCopied, setHasCopied] = React.useState(false);

  const handleCopy = async (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      setHasCopied(true);
      onCopy?.(value);

      setTimeout(() => {
        setHasCopied(false);
      }, timeout);
    } catch {
      // Fallback if clipboard API not available
      const textArea = document.createElement("textarea");
      textArea.value = value;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setHasCopied(true);
      onCopy?.(value);

      setTimeout(() => {
        setHasCopied(false);
      }, timeout);
    }
  };

  const getVariantClasses = () => {
    if (variant === "badge") {
      return hasCopied
        ? "border-[#10B981]/50 bg-[#10B981]/20 text-[#10B981] font-bold"
        : "border-[#CC6600]/30 bg-[#CC6600]/15 text-[#FF9433] hover:border-[#CC6600] hover:bg-[#CC6600]/25 font-bold";
    }
    if (variant === "ghost") {
      return hasCopied
        ? "border-transparent bg-[#10B981]/15 text-[#10B981]"
        : "border-transparent bg-transparent text-white/60 hover:text-white hover:bg-white/[0.06]";
    }
    return hasCopied
      ? "border-[#10B981]/50 bg-[#10B981]/15 text-[#10B981]"
      : "border-white/15 bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white";
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={hasCopied ? copiedLabel : label}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[2px] border px-2 py-0.5 font-mono text-xs transition-all select-none cursor-pointer active:scale-[0.97]",
        getVariantClasses(),
        iconOnly && "px-1.5 py-0.5",
        className
      )}
      {...props}
    >
      {hasCopied ? (
        <Check size={13} weight="bold" className="text-[#10B981] shrink-0" />
      ) : (
        <Copy size={12} weight="fill" className="opacity-60 hover:opacity-100 shrink-0 transition-opacity" />
      )}
      {!iconOnly && (
        <span className="leading-none">
          {hasCopied ? copiedLabel : label}
        </span>
      )}
    </button>
  );
}
