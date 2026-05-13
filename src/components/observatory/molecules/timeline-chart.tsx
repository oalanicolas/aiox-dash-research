import { type StatusKey } from "../foundations/constants"

/* Status color mapping shared with other overview molecules.
 * Lives here (next to the consumer) because it's purely presentational —
 * not enough mass to justify a separate foundation. */
const STATUS_COLOR: Record<StatusKey, string> = {
  all: "#1c1815",
  completed: "#1c1815",
  partial: "#d4a017",
  missing: "#c44",
  legacy: "#a89c87",
}

/* Molecule — horizontal timeline com jitter ±.
 * 1 ação: plotar runs no eixo do tempo, color-coded por status, com legenda. */
export type TimelinePoint = {
  date: string
  label: string
  statusKey: StatusKey
}

export function TimelineChart({ points }: { points: TimelinePoint[] }) {
  if (points.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-[12px] italic text-[var(--ink-3)]">
        Nenhum dado.
      </div>
    )
  }

  const W = 920
  const H = 200
  const pad = { t: 30, r: 24, b: 36, l: 24 }
  const innerW = W - pad.l - pad.r

  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date))
  const dates = sorted.map((p) => new Date(p.date).getTime())
  const dMin = Math.min(...dates)
  const dMax = Math.max(...dates)
  const span = dMax - dMin || 1

  const monthTicks = buildMonthTicks(dMin, dMax)

  const legend: Array<[string, string]> = [
    ["completed", STATUS_COLOR.completed],
    ["partial", STATUS_COLOR.partial],
    ["missing", STATUS_COLOR.missing],
    ["legacy", STATUS_COLOR.legacy],
  ]

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      className="block h-full w-full font-[var(--font-bb-mono)] [&_text]:fill-[var(--ink-3)]"
    >
      <line x1={pad.l} y1={H / 2} x2={W - pad.r} y2={H / 2} stroke="var(--rule)" />

      {monthTicks.map((m) => {
        const x = pad.l + ((m.t - dMin) / span) * innerW
        return (
          <g key={m.label}>
            <line x1={x} y1={H / 2 - 6} x2={x} y2={H / 2 + 6} stroke="#a89c87" />
            <text x={x} y={H - 12} textAnchor="middle" fontSize={9.5}>
              {m.label}
            </text>
          </g>
        )
      })}

      {sorted.map((p, i) => {
        const x = pad.l + ((new Date(p.date).getTime() - dMin) / span) * innerW
        const side = i % 2 === 0 ? -1 : 1
        const y = H / 2 + side * (18 + (i % 3) * 12)
        const color = STATUS_COLOR[p.statusKey]
        return (
          <g key={`${p.label}-${i}`}>
            <line x1={x} y1={H / 2} x2={x} y2={y} stroke={color} strokeWidth={0.8} opacity={0.6} />
            <circle cx={x} cy={y} r={4.5} fill={color} />
            <text x={x} y={y + (side > 0 ? 14 : -8)} textAnchor="middle" fontSize={9}>
              {p.label}
            </text>
          </g>
        )
      })}

      {legend.map(([label, color], i) => {
        const lx = pad.l + i * 110
        return (
          <g key={label}>
            <rect x={lx} y={8} width={9} height={9} fill={color} />
            <text x={lx + 14} y={16} fontSize={9}>
              {label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function buildMonthTicks(dMin: number, dMax: number): Array<{ t: number; label: string }> {
  const out: Array<{ t: number; label: string }> = []
  const start = new Date(dMin)
  start.setDate(1)
  start.setHours(0, 0, 0, 0)
  const cur = new Date(start)
  while (cur.getTime() <= dMax) {
    out.push({
      t: cur.getTime(),
      label: `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`,
    })
    cur.setMonth(cur.getMonth() + 1)
  }
  return out
}
