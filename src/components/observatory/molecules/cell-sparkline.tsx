import { cn } from "@/lib/utils"

/* Molecule — SVG sparkline showing micro-evolution of a cell score.
 * Three implicit waypoints: score*0.92 → score*0.97 → score (final).
 * Optional explicit evolution[] overrides the synthetic curve. */
export function CellSparkline({
  score,
  evolution,
  isWinner = false,
}: {
  score: number
  evolution?: number[]
  isWinner?: boolean
}) {
  const points = evolution && evolution.length > 1
    ? evolution
    : [score * 0.92, score * 0.97, score]
  const clamped = points.map((v) => Math.max(0, Math.min(100, v)))
  const max = 100
  const yFor = (v: number) => 16 - v * 0.14
  const xStep = clamped.length > 1 ? 100 / (clamped.length - 1) : 100
  const path = clamped.map((v, i) => `${i * xStep},${yFor(v)}`).join(" ")
  const lastX = (clamped.length - 1) * xStep
  const lastY = yFor(clamped[clamped.length - 1])

  return (
    <svg
      className={cn(
        "block h-4 w-full",
        isWinner ? "text-[#050505]/70" : "text-[var(--ink-dim)]",
      )}
      viewBox={`0 0 ${max} 16`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline
        points={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r="1.8" fill="currentColor" />
    </svg>
  )
}
