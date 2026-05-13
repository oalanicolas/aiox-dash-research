/* Molecule — scatter plot SVG (e.g., coverage × integrity).
 * 1 ação: posicionar pontos em 2D com threshold line opcional.
 * Source-agnostic — uso research (coverage × integrity) ou bench (futuro). */
export type ScatterPoint = {
  x: number
  y: number
  label: string
  highlight: boolean
}

export function ScatterChart({
  points,
  xMin = 70,
  xMax = 100,
  yMin = 0.7,
  yMax = 1.0,
  xLabel = "coverage %",
  yLabel = "integrity",
  threshold,
  thresholdLabel,
}: {
  points: ScatterPoint[]
  xMin?: number
  xMax?: number
  yMin?: number
  yMax?: number
  xLabel?: string
  yLabel?: string
  threshold?: number
  thresholdLabel?: string
}) {
  const W = 460
  const H = 240
  const pad = { t: 16, r: 18, b: 36, l: 36 }
  const innerW = W - pad.l - pad.r
  const innerH = H - pad.t - pad.b

  const xs = scale(xMin, xMax, pad.l, pad.l + innerW)
  const ys = scale(yMin, yMax, pad.t + innerH, pad.t)

  const xTicks = ticks(xMin, xMax, 5)
  const yTicks = ticks(yMin, yMax, 0.1)

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      className="block h-full w-full font-[var(--font-bb-mono)] [&_text]:fill-[var(--ink-3)]"
    >
      {/* gridlines + tick labels */}
      {xTicks.map((v) => (
        <g key={`x-${v}`}>
          <line x1={xs(v)} y1={pad.t} x2={xs(v)} y2={pad.t + innerH} stroke="var(--rule-soft)" />
          <text x={xs(v)} y={pad.t + innerH + 14} textAnchor="middle" fontSize={9.5}>
            {v}
          </text>
        </g>
      ))}
      {yTicks.map((v) => (
        <g key={`y-${v}`}>
          <line x1={pad.l} y1={ys(v)} x2={pad.l + innerW} y2={ys(v)} stroke="var(--rule-soft)" />
          <text x={pad.l - 6} y={ys(v) + 3} textAnchor="end" fontSize={9.5}>
            {v.toFixed(1)}
          </text>
        </g>
      ))}

      {/* threshold line */}
      {threshold != null && (
        <>
          <line
            x1={pad.l}
            y1={ys(threshold)}
            x2={pad.l + innerW}
            y2={ys(threshold)}
            stroke="#c44"
            strokeWidth={0.8}
            strokeDasharray="2 3"
          />
          {thresholdLabel && (
            <text x={pad.l + innerW - 4} y={ys(threshold) - 4} textAnchor="end" fill="#c44" fontSize={9.5}>
              {thresholdLabel}
            </text>
          )}
        </>
      )}

      {/* points */}
      {points.map((p, i) => (
        <g key={`${p.label}-${i}`}>
          <circle
            cx={xs(p.x)}
            cy={ys(p.y)}
            r={5}
            fill={p.highlight ? "#1c1815" : "#d4a017"}
            opacity={0.9}
          />
          <text x={xs(p.x) + 8} y={ys(p.y) + 3} fontSize={9}>
            {p.label}
          </text>
        </g>
      ))}

      {/* axes */}
      <line x1={pad.l} y1={pad.t + innerH} x2={pad.l + innerW} y2={pad.t + innerH} stroke="var(--rule)" />
      <line x1={pad.l} y1={pad.t} x2={pad.l} y2={pad.t + innerH} stroke="var(--rule)" />
      <text x={pad.l + innerW / 2} y={H - 6} textAnchor="middle" fontSize={11} fill="var(--ink-2)">
        {xLabel}
      </text>
      <text
        transform={`translate(10 ${pad.t + innerH / 2}) rotate(-90)`}
        textAnchor="middle"
        fontSize={11}
        fill="var(--ink-2)"
      >
        {yLabel}
      </text>
    </svg>
  )
}

function scale(domainMin: number, domainMax: number, rangeMin: number, rangeMax: number) {
  return (v: number) => rangeMin + ((v - domainMin) / (domainMax - domainMin)) * (rangeMax - rangeMin)
}

function ticks(min: number, max: number, step: number): number[] {
  const out: number[] = []
  for (let v = min; v <= max + 1e-9; v += step) {
    out.push(round(v, step))
  }
  return out
}

function round(v: number, step: number): number {
  if (step >= 1) return Math.round(v)
  const digits = Math.max(0, -Math.floor(Math.log10(step)))
  return Number(v.toFixed(digits))
}
