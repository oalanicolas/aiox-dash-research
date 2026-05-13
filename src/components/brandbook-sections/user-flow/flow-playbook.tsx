"use client"

import { cn } from "@/lib/utils"
import { CanvasToolbar, CanvasLegend } from "./canvas-toolbar"
import { useCallback, useEffect, useId, useRef, useState } from "react"

/* ═══════════════════════════════════════════════════════════════════════════
   FLOW PLAYBOOK — IBM-style workflow diagram with orthogonal connectors
   Pure SVG canvas. Tailwind + bb-* tokens for chrome (controls, legend).
   ═══════════════════════════════════════════════════════════════════════════ */

export type PlaybookNodeCategory = "start" | "action" | "condition" | "wait" | "end"

export interface PlaybookNode {
  id: string
  label: string
  sublabel?: string
  x: number
  y: number
  category: PlaybookNodeCategory
  /** SVG path data (24x24 viewBox) for the node icon */
  icon?: string
  /** Node number/index displayed as small badge */
  index?: string
  active?: boolean
}

export interface PlaybookEdge {
  from: string
  to: string
  label?: string
}

export interface FlowPlaybookProps {
  nodes: PlaybookNode[]
  edges: PlaybookEdge[]
  canvasWidth?: number
  canvasHeight?: number
  nodeWidth?: number
  nodeHeight?: number
  theme?: "dark" | "light"
  className?: string
}

/* ─── Visual constants ────────────────────────────────────────────────────── */
const DEFAULT_NODE_W = 160
const DEFAULT_NODE_H = 56
const RADIUS = 8
const ICON_SIZE = 20
const ICON_PAD = 10
const ICON_BG_R = 13

const MIN_ZOOM = 0.3
const MAX_ZOOM = 3
const ZOOM_STEP = 0.15

/* ─── Category accent colors ─────────────────────────────────────────────── */
const CATEGORY_COLORS: Record<PlaybookNodeCategory, string> = {
  start: "var(--bb-lime, #d1ff00)",
  action: "#0099FF",
  condition: "#a855f7",
  wait: "#f59e0b",
  end: "var(--bb-error, #ef4444)",
}

/* ─── SVG color palettes (only used inside <svg>) ─────────────────────────── */
type SvgPalette = {
  bg: string
  surface: string
  border: string
  text: string
  dim: string
  connector: string
  dotGrid: string
}

const SVG_DARK: SvgPalette = {
  bg: "var(--bb-dark, #0c0c0c)",
  surface: "var(--bb-surface, rgba(255,255,255,0.06))",
  border: "var(--bb-border, rgba(255,255,255,0.15))",
  text: "var(--bb-cream, #f5f0e8)",
  dim: "var(--bb-dim, rgba(245,244,231,0.4))",
  connector: "rgba(255,255,255,0.20)",
  dotGrid: "rgba(255,255,255,0.08)",
}

const SVG_LIGHT: SvgPalette = {
  bg: "#e8e2d6",
  surface: "#1a1a1a",
  border: "rgba(0,0,0,0.30)",
  text: "#ffffff",
  dim: "rgba(255,255,255,0.5)",
  connector: "rgba(0,0,0,0.30)",
  dotGrid: "rgba(0,0,0,0.00)",
}

function getSvgPalette(theme: "dark" | "light"): SvgPalette {
  return theme === "light" ? SVG_LIGHT : SVG_DARK
}

/* ─── Geometry helpers ────────────────────────────────────────────────────── */

function getNodeCenter(node: PlaybookNode, nw: number, nh: number) {
  return { cx: node.x + nw / 2, cy: node.y + nh / 2 }
}

function getNodeEdge(
  node: PlaybookNode, nw: number, nh: number,
  side: "top" | "bottom" | "left" | "right",
): { x: number; y: number } {
  const cx = node.x + nw / 2
  const cy = node.y + nh / 2
  switch (side) {
    case "top":    return { x: cx, y: node.y }
    case "bottom": return { x: cx, y: node.y + nh }
    case "left":   return { x: node.x, y: cy }
    case "right":  return { x: node.x + nw, y: cy }
  }
}

/** Orthogonal connector routing — right-angle lines, not curves */
function buildOrthogonalPath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = Math.abs(x2 - x1)
  const dy = Math.abs(y2 - y1)

  // Straight line if aligned
  if (dx < 2) return `M ${x1},${y1} L ${x2},${y2}`
  if (dy < 2) return `M ${x1},${y1} L ${x2},${y2}`

  // Route based on dominant direction
  if (dy >= dx * 0.5) {
    // Vertical-first routing
    const midY = (y1 + y2) / 2
    return `M ${x1},${y1} L ${x1},${midY} L ${x2},${midY} L ${x2},${y2}`
  }
  // Horizontal-first routing
  const midX = (x1 + x2) / 2
  return `M ${x1},${y1} L ${midX},${y1} L ${midX},${y2} L ${x2},${y2}`
}

function computeConnector(from: PlaybookNode, to: PlaybookNode, nw: number, nh: number) {
  const fc = getNodeCenter(from, nw, nh)
  const tc = getNodeCenter(to, nw, nh)

  if (tc.cy > fc.cy + nh * 0.4) {
    const p1 = getNodeEdge(from, nw, nh, "bottom")
    const p2 = getNodeEdge(to, nw, nh, "top")
    return { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y }
  }
  if (tc.cy < fc.cy - nh * 0.4) {
    const p1 = getNodeEdge(from, nw, nh, "top")
    const p2 = getNodeEdge(to, nw, nh, "bottom")
    return { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y }
  }
  if (tc.cx >= fc.cx) {
    const p1 = getNodeEdge(from, nw, nh, "right")
    const p2 = getNodeEdge(to, nw, nh, "left")
    return { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y }
  }
  const p1 = getNodeEdge(from, nw, nh, "left")
  const p2 = getNodeEdge(to, nw, nh, "right")
  return { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y }
}

/* ─── Node shape (SVG) ────────────────────────────────────────────────────── */

function PlaybookNodeShape({
  node, nw, nh, p,
}: {
  node: PlaybookNode
  nw: number
  nh: number
  p: SvgPalette
}) {
  const accent = CATEGORY_COLORS[node.category]
  const isActive = node.active
  const stripeW = 3

  const iconX = node.x + ICON_PAD
  const iconCy = node.y + nh / 2

  const labelX = node.x + ICON_PAD + ICON_SIZE + 8
  const hasSubLabel = !!node.sublabel
  const labelY = hasSubLabel ? node.y + nh / 2 - 5 : node.y + nh / 2
  const subLabelY = node.y + nh / 2 + 7

  return (
    <g>
      {/* Active glow */}
      {isActive && (
        <rect
          x={node.x - 3} y={node.y - 3}
          width={nw + 6} height={nh + 6}
          rx={RADIUS + 2}
          fill="none" stroke={accent} strokeWidth={0.6} opacity={0.35}
        />
      )}

      {/* Node body */}
      <rect
        x={node.x} y={node.y}
        width={nw} height={nh}
        rx={RADIUS} ry={RADIUS}
        fill={p.surface}
        stroke={isActive ? accent : p.border}
        strokeWidth={isActive ? 1.5 : 1}
      />

      {/* Left accent stripe */}
      <rect
        x={node.x} y={node.y + 4}
        width={stripeW} height={nh - 8}
        rx={1.5}
        fill={accent}
      />

      {/* Icon circle background */}
      <circle
        cx={iconX + ICON_SIZE / 2}
        cy={iconCy}
        r={ICON_BG_R}
        fill="none"
        stroke={accent}
        strokeWidth={0.8}
        opacity={0.35}
      />

      {/* Icon (SVG path if provided) */}
      {node.icon && (
        <g transform={`translate(${iconX}, ${iconCy - ICON_SIZE / 2})`}>
          <svg
            width={ICON_SIZE} height={ICON_SIZE}
            viewBox="0 0 24 24"
          >
            <path
              d={node.icon}
              fill="none"
              stroke={accent}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </g>
      )}

      {/* Label */}
      <text
        x={labelX} y={labelY}
        dominantBaseline="central"
        fill={isActive ? accent : p.text}
        fontFamily="var(--font-bb-sans, sans-serif)"
        fontSize={10} fontWeight={600}
        style={{ pointerEvents: "none" }}
      >
        {node.label}
      </text>

      {/* Sublabel */}
      {hasSubLabel && (
        <text
          x={labelX} y={subLabelY}
          dominantBaseline="central"
          fill={p.dim}
          fontFamily="var(--font-bb-mono, monospace)"
          fontSize={7}
          style={{ pointerEvents: "none", letterSpacing: "0.04em" }}
        >
          {node.sublabel}
        </text>
      )}

      {/* Index badge (bottom-right) */}
      {node.index && (
        <g>
          <rect
            x={node.x + nw - 20} y={node.y + nh - 13}
            width={16} height={10}
            rx={3}
            fill={accent}
            opacity={0.15}
          />
          <text
            x={node.x + nw - 12} y={node.y + nh - 8}
            textAnchor="middle"
            dominantBaseline="central"
            fill={p.dim}
            fontFamily="var(--font-bb-mono, monospace)"
            fontSize={6}
            style={{ pointerEvents: "none" }}
          >
            {node.index}
          </text>
        </g>
      )}
    </g>
  )
}

/* ─── Edge label pill ─────────────────────────────────────────────────────── */

function EdgeLabelPill({
  x, y, label, p,
}: {
  x: number
  y: number
  label: string
  p: SvgPalette
}) {
  const padX = 6
  const padY = 3
  const charW = 4.2
  const pillW = label.length * charW + padX * 2
  const pillH = 12

  return (
    <g>
      <rect
        x={x - pillW / 2} y={y - pillH / 2}
        width={pillW} height={pillH}
        rx={pillH / 2}
        fill={p.surface}
        stroke={p.border}
        strokeWidth={0.5}
      />
      <text
        x={x} y={y + padY - 2}
        textAnchor="middle"
        dominantBaseline="central"
        fill={p.dim}
        fontFamily="var(--font-bb-mono, monospace)"
        fontSize={6}
        style={{ textTransform: "uppercase", letterSpacing: "0.06em", pointerEvents: "none" }}
      >
        {label}
      </text>
    </g>
  )
}


/* ─── Main component ──────────────────────────────────────────────────────── */

export function FlowPlaybook({
  nodes,
  edges,
  canvasWidth = 560,
  canvasHeight = 400,
  nodeWidth = DEFAULT_NODE_W,
  nodeHeight = DEFAULT_NODE_H,
  theme: initialTheme = "dark",
  className,
}: FlowPlaybookProps) {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  const [activeTheme, setActiveTheme] = useState<"dark" | "light">(initialTheme)
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
    for (const n of nodes) {
      minX = Math.min(minX, n.x)
      minY = Math.min(minY, n.y)
      maxX = Math.max(maxX, n.x + nodeWidth)
      maxY = Math.max(maxY, n.y + nodeHeight)
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
  }, [canvasHeight, canvasWidth, nodeHeight, nodeWidth, nodes, setPan, setZoom])

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
          aria-label="Flow playbook diagram"
          role="img"
        >
          <defs>
            {/* Paper texture filter for light mode */}
            <filter id={`pb-paper-${uid}`} x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves={5} seed={3} result="noise" />
              <feDiffuseLighting in="noise" lightingColor="#e8e2d6" surfaceScale={1.5} result="lit">
                <feDistantLight azimuth={45} elevation={55} />
              </feDiffuseLighting>
              <feComposite in="SourceGraphic" in2="lit" operator="arithmetic" k1={0} k2={1} k3={0.12} k4={0} />
            </filter>
            <pattern
              id={`pb-dot-${uid}`}
              width={24} height={24}
              patternUnits="userSpaceOnUse"
            >
              <circle cx={12} cy={12} r={0.5} fill={P.dotGrid} />
            </pattern>
            {/* Arrowhead marker */}
            <marker
              id={`pb-arr-${uid}`}
              markerWidth={6} markerHeight={6}
              refX={5} refY={3} orient="auto" markerUnits="strokeWidth"
            >
              <path d="M0,0.5 L0,5.5 L6,3 z" fill={P.connector} />
            </marker>
          </defs>

          {/* Background */}
          <rect width={canvasWidth} height={canvasHeight} fill={P.bg} />
          {!isDark && (
            <rect width={canvasWidth} height={canvasHeight} fill={P.bg} filter={`url(#pb-paper-${uid})`} opacity={0.6} />
          )}
          <rect width={canvasWidth} height={canvasHeight} fill={`url(#pb-dot-${uid})`} />

          {/* Edges (orthogonal connectors) */}
          {edges.map((edge, idx) => {
            const fromNode = nodeMap.get(edge.from)
            const toNode = nodeMap.get(edge.to)
            if (!fromNode || !toNode) return null

            const { x1, y1, x2, y2 } = computeConnector(fromNode, toNode, nodeWidth, nodeHeight)
            const pathD = buildOrthogonalPath(x1, y1, x2, y2)

            // Label position: midpoint of the path
            const labelX = (x1 + x2) / 2
            const labelY = (y1 + y2) / 2

            return (
              <g key={`edge-${idx}`}>
                <path
                  d={pathD}
                  fill="none"
                  stroke={P.connector}
                  strokeWidth={0.8}
                  markerEnd={`url(#pb-arr-${uid})`}
                  strokeLinejoin="round"
                />
                {edge.label && (
                  <EdgeLabelPill x={labelX} y={labelY} label={edge.label} p={P} />
                )}
              </g>
            )
          })}

          {/* Nodes */}
          {nodes.map((node) => (
            <PlaybookNodeShape
              key={node.id}
              node={node}
              nw={nodeWidth}
              nh={nodeHeight}
              p={P}
            />
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
          { label: "Start", color: CATEGORY_COLORS.start, shape: "dot" },
          { label: "Action", color: CATEGORY_COLORS.action, shape: "dot" },
          { label: "Condition", color: CATEGORY_COLORS.condition, shape: "dot" },
          { label: "Wait", color: CATEGORY_COLORS.wait, shape: "dot" },
          { label: "End", color: CATEGORY_COLORS.end, shape: "dot" },
        ]}
      />
    </div>
  )
}
