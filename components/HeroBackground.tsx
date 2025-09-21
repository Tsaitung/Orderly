"use client"

import React from 'react'

// Lightweight background used by the landing HeroSection.
// This replaces the previous heavier visual without changing the API.
export function HeroBackground() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 -z-10 overflow-hidden"
    >
      {/* Gradient backdrop */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/60" />
      {/* Subtle radial glow */}
      <div className="pointer-events-none absolute -top-1/4 left-1/2 h-[120vh] w-[120vw] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.18),rgba(0,0,0,0)_60%)]" />
      {/* Soft grid pattern */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.06]" aria-hidden>
        <defs>
          <pattern id="hero-grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M32 0H0V32" fill="none" stroke="white" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hero-grid)" />
      </svg>
    </div>
  )
}

