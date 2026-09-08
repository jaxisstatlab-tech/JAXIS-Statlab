"use client";

import React from "react";
import { FolderDashed } from "@phosphor-icons/react";

import type { IconProps } from "@phosphor-icons/react";

export interface EmptyStateProps {
  icon?: React.ComponentType<IconProps>;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = FolderDashed,
  title = "No Records Found",
  description = "There are no records matching your current filter criteria.",
  action,
  className = "",
}) => {
  return (
    <div className={`flex flex-col items-center justify-center gap-2.5 py-6 text-center animate-content-fade ${className}`}>
      <div className="h-10 w-10 rounded-[2px] bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white/40 shadow-inner">
        <Icon size={20} weight="fill" className="text-white/50" />
      </div>
      <div className="flex flex-col items-center gap-1 max-w-sm">
        <span className="text-sm font-semibold text-white/80 font-sans tracking-tight">
          {title}
        </span>
        {description && (
          <span className="text-xs text-white/40 font-sans leading-relaxed">
            {description}
          </span>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
};
