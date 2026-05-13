"use client"

import { cn } from "@/lib/utils"

export type CanvasMode = "pan" | "select"

export interface CanvasToolbarProps {
  zoom: number
  onZoomChange: (zoom: number) => void
  onFit: () => void
  isDark: boolean
  onToggleTheme: () => void
  minZoom?: number
  maxZoom?: number
  mode?: CanvasMode
  onModeChange?: (mode: CanvasMode) => void
  className?: string
}

const ZOOM_PRESETS = [0.5, 0.75, 1, 1.5, 2]

export function CanvasToolbar({
  zoom,
  onZoomChange,
  onFit,
  isDark,
  onToggleTheme,
  minZoom = 0.3,
  maxZoom = 3,
  mode = "pan",
  onModeChange,
  className,
}: CanvasToolbarProps) {
  const chrome = isDark
    ? "border-white/[0.10] bg-[#111]/85 text-white"
    : "border-black/[0.10] bg-white/80 text-[#111]"

  return (
    <div className={cn("absolute right-3 top-3 z-10 flex items-center gap-1.5 border px-2 py-1 backdrop-blur-sm", chrome, className)}>
      {onModeChange && (
        <div className="flex border border-current/15">
          {(["pan", "select"] as const).map((nextMode) => (
            <button
              key={nextMode}
              type="button"
              onClick={() => onModeChange(nextMode)}
              className={cn(
                "h-7 px-2 font-mono text-[10px] uppercase tracking-[0.12em]",
                mode === nextMode ? "bg-[var(--bb-lime)] text-black" : "text-current/65 hover:text-current",
              )}
              aria-pressed={mode === nextMode}
            >
              {nextMode}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onToggleTheme}
        className="h-7 border border-current/15 px-2 font-mono text-[10px] uppercase tracking-[0.12em] text-current/70 hover:text-current"
      >
        {isDark ? "light" : "dark"}
      </button>

      <button
        type="button"
        onClick={() => onZoomChange(Math.max(minZoom, zoom - 0.15))}
        className="h-7 w-7 border border-current/15 font-mono text-[13px]"
        aria-label="Reduzir zoom"
      >
        -
      </button>
      <select
        value={String(ZOOM_PRESETS.includes(zoom) ? zoom : "")}
        onChange={(event) => {
          const next = Number(event.target.value)
          if (Number.isFinite(next)) onZoomChange(next)
        }}
        className="h-7 border border-current/15 bg-transparent px-2 font-mono text-[10px] uppercase tracking-[0.1em]"
        aria-label="Zoom"
      >
        <option value="">{Math.round(zoom * 100)}%</option>
        {ZOOM_PRESETS.map((preset) => (
          <option key={preset} value={preset}>
            {Math.round(preset * 100)}%
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => onZoomChange(Math.min(maxZoom, zoom + 0.15))}
        className="h-7 w-7 border border-current/15 font-mono text-[13px]"
        aria-label="Aumentar zoom"
      >
        +
      </button>
      <button
        type="button"
        onClick={onFit}
        className="h-7 border border-current/15 px-2 font-mono text-[10px] uppercase tracking-[0.12em] text-current/70 hover:text-current"
      >
        fit
      </button>
    </div>
  )
}

export interface LegendItem {
  label: string
  color?: string
  shape?: "square" | "diamond" | "line" | "circle" | "dot"
  fill?: string
  border?: string
}

export interface CanvasLegendProps {
  items: LegendItem[]
  isDark: boolean
  hint?: string
  className?: string
}

export function CanvasLegend({ items, isDark, hint = "scroll to zoom · drag to pan", className }: CanvasLegendProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2 border-t px-4 py-2", isDark ? "border-white/[0.12]" : "border-black/10", className)}>
      {items.map((item) => (
        <span
          key={item.label}
          className={cn(
            "inline-flex items-center gap-1.5 border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em]",
            isDark ? "border-white/[0.12] text-white/65" : "border-black/[0.12] text-black/55",
          )}
        >
          <LegendSwatch item={item} />
          {item.label}
        </span>
      ))}
      <span className={cn("ml-auto font-mono text-[9px] uppercase tracking-[0.12em]", isDark ? "text-white/35" : "text-black/35")}>
        {hint}
      </span>
    </div>
  )
}

function LegendSwatch({ item }: { item: LegendItem }) {
  const style: React.CSSProperties = {}
  if (item.fill) style.background = item.fill
  if (item.border) style.border = `1px solid ${item.border}`
  if (item.color) {
    style.background = item.color
    style.border = `1px solid ${item.color}`
  }

  if (item.shape === "line") return <span className="inline-block h-px w-3" style={style} />
  if (item.shape === "diamond") return <span className="inline-block h-1.5 w-1.5 rotate-45" style={style} />
  if (item.shape === "circle" || item.shape === "dot") return <span className="inline-block h-1.5 w-1.5 rounded-full" style={style} />
  return <span className="inline-block h-2 w-2" style={style} />
}
