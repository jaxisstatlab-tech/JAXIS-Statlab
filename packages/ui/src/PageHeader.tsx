"use client";

import React from "react";
import Link from "next/link";
import { cn } from "./utils";

export interface PageHeaderBreadcrumb {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  title: string;
  description?: React.ReactNode;
  breadcrumbs?: PageHeaderBreadcrumb[];
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  breadcrumbs,
  actions,
  badge,
  className = "",
}) => {
  return (
    <div
      className={cn("flex flex-col gap-3 pb-6 sm:pb-8 border-b border-white/10 w-full", className)}
    >
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-xs font-sans text-white/50 mb-0.5 select-none flex-wrap"
        >
          {breadcrumbs.map((item, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span className="text-white/30 select-none">/</span>}
              {item.href ? (
                <Link
                  href={item.href}
                  className="hover:text-white transition-colors duration-150"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-white/90 font-medium">{item.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* Header Container: Title, Description & Action Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-sans">
              {title}
            </h1>
            {badge}
          </div>

          {description && (
            <p className="text-sm text-white/60 leading-relaxed max-w-3xl font-sans">
              {description}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full lg:w-auto shrink-0 pt-1 lg:pt-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

