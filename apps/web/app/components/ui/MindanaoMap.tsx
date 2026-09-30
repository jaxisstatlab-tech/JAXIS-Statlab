"use client";

import { useEffect, useState } from "react";

// High-precision geographic locator for Mindanao, Bukidnon, and Maramag.
// Uses official Philippine boundary vectors with Dashdark X tactical cartography.

import mapData from "./mindanao-data.json";

export default function MindanaoMap({ className = "" }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { width, height, maramag, bukidnonPath, mindanaoOutline } = mapData;

  return (
    <div className={`relative w-full select-none overflow-hidden ${className}`}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-full w-full"
        role="img"
        aria-label="Map of Mindanao highlighting Bukidnon and Maramag headquarters"
      >
        <defs>
          {/* Tactical Digital Dot Matrix Patterns */}
          <pattern id="mindanao-dot-grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <circle cx="5" cy="5" r="1.15" fill="rgba(255, 255, 255, 0.22)" />
          </pattern>
          <pattern id="bukidnon-dot-grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <circle cx="5" cy="5" r="1.6" fill="#CC6600" />
          </pattern>

          {/* Masks */}
          <mask id="mindanao-island-mask">
            <path d={mindanaoOutline} fill="#FFFFFF" />
            <path d={bukidnonPath} fill="#FFFFFF" />
          </mask>
          <mask id="bukidnon-province-mask">
            <path d={bukidnonPath} fill="#FFFFFF" />
          </mask>
        </defs>

        {/* Ambient Radial Gradient behind Bukidnon */}
        <radialGradient id="hq-glow" cx="67%" cy="51%" r="35%">
          <stop offset="0%" stopColor="#CC6600" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#CC6600" stopOpacity="0" />
        </radialGradient>
        <rect x="0" y="0" width={width} height={height} fill="url(#hq-glow)" />

        {/* Background Coordinate Grid */}
        <g stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" strokeDasharray="2 4">
          <line x1="0" y1="120" x2={width} y2="120" />
          <line x1="0" y1="240" x2={width} y2="240" />
          <line x1="0" y1="360" x2={width} y2="360" />
          <line x1="0" y1="480" x2={width} y2="480" />

          <line x1="120" y1="0" x2="120" y2={height} />
          <line x1="240" y1="0" x2="240" y2={height} />
          <line x1="360" y1="0" x2="360" y2={height} />
          <line x1="480" y1="0" x2="480" y2={height} />
        </g>

        {/* Corner Reticle Crosshairs */}
        <g stroke="rgba(255, 255, 255, 0.25)" strokeWidth="1">
          <path d="M 12 18 L 12 12 L 18 12" fill="none" />
          <path d={`M ${width - 18} 12 L ${width - 12} 12 L ${width - 12} 18`} fill="none" />
          <path d={`M 12 ${height - 18} L 12 ${height - 12} L 18 ${height - 12}`} fill="none" />
          <path d={`M ${width - 18} ${height - 12} L ${width - 12} ${height - 12} L ${width - 12} ${height - 18}`} fill="none" />
        </g>



        {/* Mainland Base Silhouette */}
        <path
          d={mindanaoOutline}
          fill="#080C20"
          stroke="rgba(255, 255, 255, 0.16)"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />

        {/* Mainland Dot Matrix Overlay */}
        <rect
          x="0"
          y="0"
          width={width}
          height={height}
          fill="url(#mindanao-dot-grid)"
          mask="url(#mindanao-island-mask)"
        />

        {/* Bukidnon Province Boundary and Glow Substrate */}
        <path
          d={bukidnonPath}
          fill="rgba(204, 102, 0, 0.18)"
          stroke="#CC6600"
          strokeWidth="1.5"
          strokeDasharray="3 2"
          strokeLinejoin="round"
        />

        {/* Bukidnon Lit Orange Dots */}
        <rect
          x="0"
          y="0"
          width={width}
          height={height}
          fill="url(#bukidnon-dot-grid)"
          mask="url(#bukidnon-province-mask)"
        />

        {/* Sonar Radar Wave Pulses from Maramag */}
        {mounted && (
          <>
            <circle
              cx={maramag.x}
              cy={maramag.y}
              r="4"
              fill="none"
              stroke="#CC6600"
              className="animate-ping"
              style={{
                transformOrigin: `${maramag.x}px ${maramag.y}px`,
                animationDuration: "2.8s",
              }}
            />
          </>
        )}

        {/* Maramag Reticle Crosshairs */}
        <g stroke="#CC6600" strokeWidth="1" opacity="0.8">
          <line x1={maramag.x - 14} y1={maramag.y} x2={maramag.x - 5} y2={maramag.y} />
          <line x1={maramag.x + 5} y1={maramag.y} x2={maramag.x + 14} y2={maramag.y} />
          <line x1={maramag.x} y1={maramag.y - 14} x2={maramag.x} y2={maramag.y - 5} />
          <line x1={maramag.x} y1={maramag.y + 5} x2={maramag.x} y2={maramag.y + 14} />
        </g>

        {/* Maramag Pinpoint Core */}
        <circle cx={maramag.x} cy={maramag.y} r="3.5" fill="#CC6600" stroke="#FFFFFF" strokeWidth="1.5" />

        {/* Leader line from the pin to the label's corner */}
        <path
          d={`M ${maramag.x + 5} ${maramag.y - 5} L ${maramag.x + 24} ${maramag.y - 26}`}
          fill="none"
          stroke="rgba(255, 255, 255, 0.45)"
          strokeWidth="1.2"
        />

        {/* Location label. The map is drawn at 600 units and shown at about 26rem, so sizes here are roughly 1.45x
            what they read as on screen. */}
        <g transform={`translate(${maramag.x + 24}, ${maramag.y - 78})`}>
          <rect x="0" y="0" width="172" height="52" rx="3" fill="#0A0A18" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="1.2" />
          <rect x="0" y="0" width="3" height="52" fill="#CC6600" />
          <text x="14" y="23" fill="#FFFFFF" fontFamily="var(--font-sans), sans-serif" fontSize="15" fontWeight="600">
            Maramag, Bukidnon
          </text>
          <text
            x="14"
            y="41"
            fill="#FFA040"
            fontFamily="var(--font-mono), monospace"
            fontSize="11.5"
            fontWeight="500"
            letterSpacing="0.08em"
          >
            JAXIS STATLAB HQ
          </text>
        </g>
      </svg>
    </div>
  );
}
