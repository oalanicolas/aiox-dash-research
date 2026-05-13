"use client"

import { cn } from "@/lib/utils"
import { CanvasToolbar, CanvasLegend } from "./canvas-toolbar"
import { useCallback, useEffect, useId, useRef, useState } from "react"

/* ═══════════════════════════════════════════════════════════════════════════
   FLOW MAP — Grouped mindmap with zoom + pan
   Pure SVG canvas. Tailwind + bb-* tokens for chrome (controls, legend).
   ═══════════════════════════════════════════════════════════════════════════ */

export interface FlowMapGroup {
  id: string
  label: string
  items: string[]
  x: number
  y: number
  width?: number
  active?: boolean
  activeItems?: number[]
}

export interface FlowMapEdge {
  from: string
  to: string
  label?: string
}

export type FlowMapTheme = "dark" | "light"

export interface FlowMapProps {
  groups: FlowMapGroup[]
  edges: FlowMapEdge[]
  canvasWidth?: number
  canvasHeight?: number
  theme?: FlowMapTheme
  className?: string
}

/* ─── Visual constants ────────────────────────────────────────────────────── */
const DEFAULT_GROUP_W = 160
const HEADER_H = 32
const ITEM_H = 28
const ITEM_GAP = 4
const GROUP_PAD = 12
const GROUP_RADIUS = 10
const ITEM_RADIUS = 6
const CONNECTION_DOT_R = 4

const MIN_ZOOM = 0.3
const MAX_ZOOM = 3
const ZOOM_STEP = 0.15

/* ─── SVG color palettes (only used inside <svg>) ─────────────────────────── */
type SvgPalette = {
  bg: string
  groupFill: string
  groupBorder: string
  headerText: string
  itemFill: string
  itemBorder: string
  itemText: string
  lime: string
  limeDim: string
  activeHeaderBg: string
  activeHeaderText: string
  activeItemFill: string
  activeItemBorder: string
  activeItemText: string
  connector: string
  connectionDot: string
  dotGrid: string
}

const SVG_DARK: SvgPalette = {
  bg: "var(--bb-dark, #0c0c0c)",
  groupFill: "var(--bb-surface, rgba(255,255,255,0.06))",
  groupBorder: "var(--bb-border, rgba(255,255,255,0.15))",
  headerText: "var(--bb-cream, #f5f0e8)",
  itemFill: "rgba(255,255,255,0.04)",
  itemBorder: "rgba(255,255,255,0.08)",
  itemText: "var(--bb-cream, #f5f0e8)",
  lime: "var(--bb-lime, #d1ff00)",
  limeDim: "var(--bb-accent-12, rgba(var(--bb-accent-rgb), 0.12))",
  activeHeaderBg: "var(--bb-lime, #d1ff00)",
  activeHeaderText: "var(--bb-dark, #0c0c0c)",
  activeItemFill: "rgba(var(--bb-accent-rgb), 0.12)",
  activeItemBorder: "var(--bb-lime, #d1ff00)",
  activeItemText: "var(--bb-cream, #f5f0e8)",
  connector: "rgba(255,255,255,0.18)",
  connectionDot: "rgba(255,255,255,0.18)",
  dotGrid: "rgba(255,255,255,0.08)",
}

const SVG_LIGHT: SvgPalette = {
  bg: "#e8e2d6",
  groupFill: "#1a1a1a",
  groupBorder: "rgba(0,0,0,0.30)",
  headerText: "#ffffff",
  itemFill: "rgba(255,255,255,0.06)",
  itemBorder: "rgba(255,255,255,0.10)",
  itemText: "#ffffff",
  lime: "#d1ff00",
  limeDim: "#d1ff00",
  activeHeaderBg: "#d1ff00",
  activeHeaderText: "#1a1a1a",
  activeItemFill: "#d1ff00",
  activeItemBorder: "#d1ff00",
  activeItemText: "#1a1a1a",
  connector: "rgba(0,0,0,0.45)",
  connectionDot: "rgba(0,0,0,0.45)",
  dotGrid: "rgba(0,0,0,0.00)",
}

function getSvgPalette(theme: FlowMapTheme): SvgPalette {
  return theme === "light" ? SVG_LIGHT : SVG_DARK
}

/* ─── Geometry helpers ────────────────────────────────────────────────────── */

function getGroupHeight(group: FlowMapGroup): number {
  return HEADER_H + GROUP_PAD + group.items.length * ITEM_H + (group.items.length - 1) * ITEM_GAP + GROUP_PAD
}

function getGroupWidth(group: FlowMapGroup): number {
  return group.width ?? DEFAULT_GROUP_W
}

function getGroupRightCenter(group: FlowMapGroup): { x: number; y: number } {
  const w = getGroupWidth(group)
  const h = getGroupHeight(group)
  return { x: group.x + w, y: group.y + h / 2 }
}

function getGroupLeftCenter(group: FlowMapGroup): { x: number; y: number } {
  const h = getGroupHeight(group)
  return { x: group.x, y: group.y + h / 2 }
}

function buildPath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = Math.abs(x2 - x1)
  const dy = Math.abs(y2 - y1)
  if (dx < 2) return `M ${x1} ${y1} L ${x2} ${y2}`
  if (dy > dx * 0.5) {
    const midY = (y1 + y2) / 2
    return `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`
  }
  const midX = (x1 + x2) / 2
  return `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`
}

/* ─── Group shape (SVG) ───────────────────────────────────────────────────── */

function GroupShape({
  group,
  p,
}: {
  group: FlowMapGroup
  p: SvgPalette
}) {
  const w = getGroupWidth(group)
  const h = getGroupHeight(group)
  const isActive = group.active
  const activeItems = group.activeItems ?? []

  return (
    <g>
      {/* Group container */}
      <rect
        x={group.x}
        y={group.y}
        width={w}
        height={h}
        rx={GROUP_RADIUS}
        ry={GROUP_RADIUS}
        fill={p.groupFill}
        stroke={p.groupBorder}
        strokeWidth={1}
      />

      {/* Header background (active) */}
      {isActive && (
        <rect
          x={group.x + 1}
          y={group.y + 1}
          width={w - 2}
          height={HEADER_H - 1}
          rx={GROUP_RADIUS - 1}
          ry={GROUP_RADIUS - 1}
          fill={p.activeHeaderBg}
        />
      )}
      {/* Clip the bottom corners of the header highlight */}
      {isActive && (
        <rect
          x={group.x + 1}
          y={group.y + HEADER_H / 2}
          width={w - 2}
          height={HEADER_H / 2}
          fill={p.activeHeaderBg}
        />
      )}

      {/* Header text */}
      <text
        x={group.x + w / 2}
        y={group.y + HEADER_H / 2 + 1}
        textAnchor="middle"
        dominantBaseline="central"
        fill={isActive ? p.activeHeaderText : p.headerText}
        fontFamily="var(--font-bb-sans, sans-serif)"
        fontSize={10}
        fontWeight={600}
        style={{ letterSpacing: "-0.01em", pointerEvents: "none" }}
      >
        {group.label}
      </text>

      {/* Header divider */}
      <line
        x1={group.x + GROUP_PAD}
        y1={group.y + HEADER_H}
        x2={group.x + w - GROUP_PAD}
        y2={group.y + HEADER_H}
        stroke={p.itemBorder}
        strokeWidth={0.5}
      />

      {/* Child items */}
      {group.items.map((item, idx) => {
        const itemY = group.y + HEADER_H + GROUP_PAD + idx * (ITEM_H + ITEM_GAP)
        const itemX = group.x + GROUP_PAD
        const itemW = w - GROUP_PAD * 2
        const isItemActive = activeItems.includes(idx)

        return (
          <g key={idx}>
            <rect
              x={itemX}
              y={itemY}
              width={itemW}
              height={ITEM_H}
              rx={ITEM_RADIUS}
              ry={ITEM_RADIUS}
              fill={isItemActive ? p.activeItemFill : p.itemFill}
              stroke={isItemActive ? p.activeItemBorder : p.itemBorder}
              strokeWidth={isItemActive ? 1 : 0.5}
            />
            <text
              x={itemX + itemW / 2}
              y={itemY + ITEM_H / 2 + 0.5}
              textAnchor="middle"
              dominantBaseline="central"
              fill={isItemActive ? p.activeItemText : p.itemText}
              fontFamily="var(--font-bb-sans, sans-serif)"
              fontSize={9}
              fontWeight={isItemActive ? 500 : 400}
              style={{ letterSpacing: "-0.01em", pointerEvents: "none" }}
            >
              {item}
            </text>
          </g>
        )
      })}
    </g>
  )
}


/* ─── Main component ──────────────────────────────────────────────────────── */

export function FlowMap({
  groups,
  edges,
  canvasWidth = 800,
  canvasHeight = 500,
  theme: initialTheme = "dark",
  className,
}: FlowMapProps) {
  const groupMap = new Map(groups.map((g) => [g.id, g]))
  const [activeTheme, setActiveTheme] = useState<FlowMapTheme>(initialTheme)
  const P = getSvgPalette(activeTheme)
  const isDark = activeTheme === "dark"
  const toggleTheme = useCallback(() => setActiveTheme((t) => t === "dark" ? "light" : "dark"), [])

  // Pan & zoom state
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const isPanningRef = useRef(false)
  const panStart = useRef({ x: 0, y: 0 })
  const panOrigin = useRef({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z))

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
    setZoom((prev) => clampZoom(prev + delta))
  }, [setZoom])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isPanningRef.current = true
    setIsPanning(true)
    panStart.current = { x: e.clientX, y: e.clientY }
    panOrigin.current = { ...pan }
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }, [pan])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanningRef.current) return
    const dx = e.clientX - panStart.current.x
    const dy = e.clientY - panStart.current.y
    setPan({ x: panOrigin.current.x + dx, y: panOrigin.current.y + dy })
  }, [])

  const handlePointerUp = useCallback(() => {
    isPanningRef.current = false
    setIsPanning(false)
  }, [])

  const handleFit = useCallback(() => {
    const container = containerRef.current
    if (!container) {
      setZoom(1)
      setPan({ x: 0, y: 0 })
      return
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const g of groups) {
      const w = getGroupWidth(g)
      const h = getGroupHeight(g)
      minX = Math.min(minX, g.x)
      minY = Math.min(minY, g.y)
      maxX = Math.max(maxX, g.x + w)
      maxY = Math.max(maxY, g.y + h)
    }

    const contentW = maxX - minX
    const contentH = maxY - minY
    const containerW = container.clientWidth
    const containerH = canvasHeight * 1.1

    const pad = 40
    const fitZoom = clampZoom(Math.min(
      (containerW - pad * 2) / contentW,
      (containerH - pad * 2) / contentH,
    ))

    const contentCenterX = (minX + maxX) / 2
    const contentCenterY = (minY + maxY) / 2
    const screenCenterX = containerW / 2
    const screenCenterY = containerH / 2

    const svgOriginX = canvasWidth / 2
    const svgOriginY = canvasHeight / 2
    const panX = screenCenterX - (contentCenterX - svgOriginX) * fitZoom - canvasWidth / 2
    const panY = screenCenterY - (contentCenterY - svgOriginY) * fitZoom - canvasHeight / 2

    setZoom(fitZoom)
    setPan({ x: panX, y: panY })
  }, [canvasHeight, canvasWidth, groups, setPan, setZoom])

  // Auto-fit on mount
  const didAutoFit = useRef(false)
  useEffect(() => {
    if (didAutoFit.current) return
    const raf = requestAnimationFrame(() => {
      handleFit()
      didAutoFit.current = true
    })
    return () => cancelAnimationFrame(raf)
  }, [handleFit])

  // Unique IDs per instance to avoid SVG def collisions
  const reactId = useId()
  const uid = reactId.replace(/:/g, "")

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full overflow-hidden rounded-[10px] cursor-grab",
        isDark
          ? "bg-[var(--bb-dark)] border border-white/[0.12]"
          : "bg-[#e8e2d6] border border-black/10",
        className,
      )}
    >
      {/* Interactive canvas area */}
      <div
        className="w-full overflow-hidden touch-none"
        style={{ height: canvasHeight * 1.1 }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <svg
          viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
          style={{
            width: canvasWidth,
            height: canvasHeight,
            display: "block",
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center center",
            transition: isPanning ? "none" : "transform 0.15s ease-out",
          }}
          aria-label="Flow map"
          role="img"
        >
          <defs>
            {/* Paper texture filter for light mode */}
            <filter id={`fm-paper-${uid}`} x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves={5} seed={3} result="noise" />
              <feDiffuseLighting in="noise" lightingColor="#e8e2d6" surfaceScale={1.5} result="lit">
                <feDistantLight azimuth={45} elevation={55} />
              </feDiffuseLighting>
              <feComposite in="SourceGraphic" in2="lit" operator="arithmetic" k1={0} k2={1} k3={0.12} k4={0} />
            </filter>
            <pattern
              id={`fm-dot-${uid}`}
              width={24}
              height={24}
              patternUnits="userSpaceOnUse"
            >
              <circle cx={12} cy={12} r={0.5} fill={P.dotGrid} />
            </pattern>
            <marker
              id={`fm-arr-${uid}`}
              markerWidth={6}
              markerHeight={6}
              refX={5}
              refY={3}
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0,0.5 L0,5.5 L6,3 z" fill={P.connector} />
            </marker>
          </defs>

          {/* Background */}
          <rect width={canvasWidth} height={canvasHeight} fill={P.bg} />
          {!isDark && (
            <rect
              width={canvasWidth}
              height={canvasHeight}
              fill={P.bg}
              filter={`url(#fm-paper-${uid})`}
              opacity={0.6}
            />
          )}
          <rect width={canvasWidth} height={canvasHeight} fill={`url(#fm-dot-${uid})`} />

          {/* Edges */}
          {edges.map((edge, idx) => {
            const fromGroup = groupMap.get(edge.from)
            const toGroup = groupMap.get(edge.to)
            if (!fromGroup || !toGroup) return null

            const p1 = getGroupRightCenter(fromGroup)
            const p2 = getGroupLeftCenter(toGroup)
            const pathD = buildPath(p1.x, p1.y, p2.x, p2.y)
            const labelX = (p1.x + p2.x) / 2
            const labelY = (p1.y + p2.y) / 2

            return (
              <g key={`edge-${idx}`}>
                {/* Connection dot on source */}
                <circle
                  cx={p1.x}
                  cy={p1.y}
                  r={CONNECTION_DOT_R}
                  fill={P.connectionDot}
                />
                {/* Connection dot on target */}
                <circle
                  cx={p2.x}
                  cy={p2.y}
                  r={CONNECTION_DOT_R}
                  fill={P.connectionDot}
                />
                {/* Connector path */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={P.connector}
                  strokeWidth={0.8}
                  markerEnd={`url(#fm-arr-${uid})`}
                />
                {edge.label && (
                  <text
                    x={labelX}
                    y={labelY - 6}
                    textAnchor="middle"
                    fill={P.connector}
                    fontFamily="var(--font-bb-mono, monospace)"
                    fontSize={7}
                    fontWeight={500}
                    style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}
                  >
                    {edge.label}
                  </text>
                )}
              </g>
            )
          })}

          {/* Groups */}
          {groups.map((group) => (
            <GroupShape key={group.id} group={group} p={P} />
          ))}
        </svg>
      </div>

      {/* Toolbar */}
      <CanvasToolbar
        zoom={zoom}
        onZoomChange={setZoom}
        onFit={handleFit}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
      />

      {/* Legend */}
      <CanvasLegend
        isDark={isDark}
        items={[
          { label: "Active", fill: P.activeHeaderBg, border: P.lime },
          { label: "Group", fill: P.groupFill, border: P.groupBorder },
          { label: "Connector", color: P.connector, shape: "line" },
        ]}
      />
    </div>
  )
}
