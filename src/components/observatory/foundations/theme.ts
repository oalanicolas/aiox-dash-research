import { type CSSProperties } from "react"

/* AIOX operational palette.
 * These vars mirror colors_and_type.css so source-specific readers can scope
 * the same dark cockpit tokens without depending on global selector order. */
export const observatoryThemeVars: CSSProperties = {
  "--paper": "var(--dark, #050505)",
  "--paper-alt": "var(--surface, #0f0f11)",
  "--paper-panel": "var(--surface-panel, #18181b)",
  "--paper-deep": "var(--surface-deep, #0a0a0c)",
  "--surface-console": "var(--surface-console, #111113)",
  "--surface-hover": "var(--surface-hover, #1e1f22)",
  "--ink": "var(--cream-alt, #f5f4e7)",
  "--ink-2": "var(--fg2, rgba(244,244,232,0.70))",
  "--ink-3": "var(--fg3, rgba(244,244,232,0.55))",
  "--ink-dim": "var(--fg-dim, rgba(245,244,231,0.40))",
  "--ink-faint": "rgba(245,244,231,0.18)",
  "--rule": "var(--border, rgba(156,156,156,0.15))",
  "--rule-soft": "var(--border-soft, rgba(156,156,156,0.10))",
  "--rule-strong": "var(--border-strong, rgba(156,156,156,0.25))",
  "--lime-ink": "var(--lime, #d1ff00)",
  "--lime-fill": "var(--lime, #d1ff00)",
  "--lime-glow": "var(--lime-glow, rgba(209,255,0,0.25))",
  "--warning-ink": "var(--warning, #f59e0b)",
  "--danger-ink": "var(--error, #ef4444)",
  "--on-lime": "var(--fg-on-lime, #050505)",
  "--dash-control-h": "34px",
  "--dash-header-h": "44px",
  "--serif": "var(--font-bb-sans), 'Geist', system-ui, sans-serif",
} as CSSProperties

export const observatoryDarkThemeVars: CSSProperties = {
  ...observatoryThemeVars,
} as CSSProperties

export const MONO_FONT = "var(--font-bb-mono), 'Geist Mono', ui-monospace, monospace"
export const SANS_FONT = "var(--font-bb-sans), 'Geist', system-ui, sans-serif"
export const DISPLAY_FONT = "var(--font-bb-display), var(--font-bb-sans), system-ui, sans-serif"
export const SERIF_FONT = SANS_FONT
