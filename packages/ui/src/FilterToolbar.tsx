"use client";

import React, { useCallback, useMemo, useRef, useEffect } from "react";
import { MagnifyingGlass, X, CaretDown, ArrowCounterClockwise } from "@phosphor-icons/react";

/* ─── Types ─── */

/** A single filter dropdown definition */
export interface FilterDropdownConfig {
  /** Unique key for this filter (used as react key and in the values map) */
  key: string;
  /** Label shown before the dropdown */
  label: string;
  /** Options: { value, label } pairs. First option should be the "All" option. */
  options: { value: string; label: string }[];
  /** Current value */
  value: string;
  /** Default / "all" value — used to determine if filter is active */
  defaultValue?: string;
}

export interface FilterToolbarProps {
  /* ── Search ── */
  /** Current search query */
  searchQuery: string;
  /** Callback when search query changes */
  onSearchChange: (query: string) => void;
  /** Placeholder text for search input */
  searchPlaceholder?: string;
  /** Called when user presses Enter in search */
  onSearchSubmit?: () => void;

  /* ── Filter Dropdowns ── */
  /** Array of filter dropdown configurations */
  filters: FilterDropdownConfig[];
  /** Callback when any filter value changes. Receives (filterKey, newValue). */
  onFilterChange: (key: string, value: string) => void;

  /* ── Clear / Reset ── */
  /** Called when user clicks "Clear filters" or "Reset". If omitted, the clear button will
   *  auto-reset search to "" and each filter to its defaultValue (first option). */
  onClear?: () => void;

  /* ── Layout ── */
  /** Additional className on the outer wrapper */
  className?: string;
}

/* ─── Style Constants ─── */

const BAND_STYLE: React.CSSProperties = {
  padding: "1rem 1.75rem",
  backgroundColor: "rgba(1, 14, 30, 0.6)",
  borderTop: "1px solid rgba(255, 255, 255, 0.06)",
  borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
};

const INPUT_CONTAINER_STYLE: React.CSSProperties = {
  height: "2.25rem",
  padding: "0 0.875rem",
  backgroundColor: "rgba(1, 27, 56, 0.7)",
  border: "1px solid rgba(255, 255, 255, 0.10)",
  borderRadius: "2px",
};

const SELECT_STYLE: React.CSSProperties = {
  height: "2.25rem",
  paddingLeft: "0.625rem",
  paddingRight: "1.75rem",
  backgroundColor: "rgba(1, 27, 56, 0.7)",
  border: "1px solid rgba(255, 255, 255, 0.10)",
  borderRadius: "2px",
  fontSize: "0.75rem",
  color: "rgba(255, 255, 255, 0.75)",
};

const LABEL_STYLE: React.CSSProperties = {
  fontSize: "0.6rem",
  letterSpacing: "0.1em",
  color: "rgba(255, 255, 255, 0.35)",
};

const KBD_STYLE: React.CSSProperties = {
  fontSize: "0.6rem",
  padding: "0.15rem 0.4rem",
  borderRadius: "2px",
  backgroundColor: "rgba(255, 255, 255, 0.06)",
  color: "rgba(255, 255, 255, 0.3)",
  border: "1px solid rgba(255, 255, 255, 0.06)",
};

const DIVIDER_STYLE: React.CSSProperties = {
  width: "1px",
  height: "1.25rem",
  backgroundColor: "rgba(255, 255, 255, 0.08)",
};

const CHEVRON_STYLE: React.CSSProperties = {
  paddingRight: "0.5rem",
};

/* ─── Sub-components ─── */

const SearchIcon = () => (
  <MagnifyingGlass className="w-3.5 h-3.5 flex-shrink-0 text-white/30" size={14} weight="bold" />
);

const ClearIcon = () => (
  <X className="w-3 h-3 flex-shrink-0" size={12} weight="bold" />
);

const ChevronIcon = () => (
  <CaretDown className="w-3 h-3 text-white/25" size={12} weight="fill" />
);

const ResetIcon = () => (
  <ArrowCounterClockwise
    className="w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 group-hover:-rotate-90"
    size={14}
    weight="bold"
  />
);

/* ─── Main Component ─── */

export const FilterToolbar = React.forwardRef<HTMLDivElement, FilterToolbarProps>(
  (
    {
      searchQuery,
      onSearchChange,
      searchPlaceholder = "Search...",
      onSearchSubmit,
      filters,
      onFilterChange,
      onClear,
      className = "",
    },
    ref,
  ) => {
    const searchInputRef = useRef<HTMLInputElement>(null);

    /* Keyboard shortcut: Press '/' anywhere to focus search, 'Escape' to clear and blur */
    useEffect(() => {
      const handleGlobalKeyDown = (e: KeyboardEvent) => {
        if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey) {
          const target = e.target as HTMLElement | null;
          const isInput =
            target &&
            (target.tagName === "INPUT" ||
              target.tagName === "TEXTAREA" ||
              target.isContentEditable);
          if (!isInput) {
            e.preventDefault();
            searchInputRef.current?.focus();
            searchInputRef.current?.select();
          }
        } else if (e.key === "Escape") {
          if (document.activeElement === searchInputRef.current) {
            e.preventDefault();
            onSearchChange("");
            searchInputRef.current?.blur();
          }
        }
      };

      window.addEventListener("keydown", handleGlobalKeyDown);
      return () => window.removeEventListener("keydown", handleGlobalKeyDown);
    }, [onSearchChange]);

    /* Determine if any filter is active (non-default) */
    const hasActiveFilters = useMemo(() => {
      const hasSearch = searchQuery.trim().length > 0;
      const hasFilter = filters.some((f) => {
        const def = f.defaultValue ?? f.options[0]?.value ?? "";
        return f.value !== def;
      });
      return hasSearch || hasFilter;
    }, [searchQuery, filters]);

    /* Default clear handler */
    const handleClear = useCallback(() => {
      if (onClear) {
        onClear();
        return;
      }
      onSearchChange("");
      for (const f of filters) {
        const def = f.defaultValue ?? f.options[0]?.value ?? "";
        onFilterChange(f.key, def);
      }
    }, [onClear, onSearchChange, filters, onFilterChange]);

    return (
      <div ref={ref} className={className} style={BAND_STYLE}>
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          {/* ── Search Input ── */}
          <div
            className="relative flex-1 min-w-[220px] flex items-center gap-3 rounded-[3px] transition-colors"
            style={INPUT_CONTAINER_STYLE}
          >
            <SearchIcon />
            <input
              ref={searchInputRef}
              type="text"
              aria-label={searchPlaceholder}
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSearchSubmit?.()}
              style={{
                outline: "none",
                boxShadow: "none",
                border: "none",
                backgroundColor: "transparent",
              }}
              className="flex-1 bg-transparent border-0 outline-none shadow-none text-base sm:text-xs font-sans text-white placeholder-white/30 p-0 focus:outline-none focus:ring-0 focus:border-0"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="text-white/40 hover:text-white cursor-pointer"
                title="Clear search text"
                aria-label="Clear search text"
              >
                <ClearIcon />
              </button>
            ) : (
              <kbd className="font-mono select-none leading-none" style={KBD_STYLE}>
                /
              </kbd>
            )}
          </div>

          {/* ── Divider ── */}
          {filters.length > 0 && (
            <div className="hidden md:block" style={DIVIDER_STYLE} />
          )}

          {/* ── Filter Dropdowns ── */}
          {filters.map((filter) => (
            <div key={filter.key} className="flex items-center gap-2 flex-shrink-0">
              <span className="font-mono uppercase select-none" style={LABEL_STYLE}>
                {filter.label}
              </span>
              <div className="relative">
                <select
                  value={filter.value}
                  onChange={(e) => onFilterChange(filter.key, e.target.value)}
                  style={SELECT_STYLE}
                  className="appearance-none font-mono focus:outline-none cursor-pointer hover:border-white/20 transition-colors"
                >
                  {filter.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <div
                  className="pointer-events-none absolute inset-y-0 right-0 flex items-center"
                  style={CHEVRON_STYLE}
                >
                  <ChevronIcon />
                </div>
              </div>
            </div>
          ))}

          {/* ── Reset / Clear Filters Icon Button ── */}
          <button
            type="button"
            onClick={handleClear}
            disabled={!hasActiveFilters}
            title={hasActiveFilters ? "Reset search and filters to default" : "Filters are at default values"}
            aria-label="Reset filters"
            className={`w-9 h-9 flex items-center justify-center rounded-[3px] transition-all duration-150 group flex-shrink-0 border ${
              hasActiveFilters
                ? "border-[#CC6600]/40 bg-[#CC6600]/10 text-[#CC6600] hover:bg-[#CC6600]/20 hover:border-[#CC6600] cursor-pointer shadow-sm shadow-[#CC6600]/10"
                : "border-white/[0.06] bg-white/[0.02] text-white/20 cursor-not-allowed opacity-50"
            }`}
            style={{
              height: "2.25rem",
              width: "2.25rem",
              boxSizing: "border-box",
            }}
          >
            <ResetIcon />
          </button>
        </div>
      </div>
    );
  },
);

FilterToolbar.displayName = "FilterToolbar";
