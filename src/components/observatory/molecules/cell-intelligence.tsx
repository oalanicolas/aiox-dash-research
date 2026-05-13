import { DISPLAY_FONT, MONO_FONT, SANS_FONT } from "../foundations/theme"

/* Molecule — Cell intelligence panel for the selected matrix cell.
 * Two-column layout: identity (player+score+conf) | analysis (label+notes+meta). */
export function CellIntelligence({
  player,
  playerColor,
  dimensionId,
  dimensionLabel,
  dimensionWeight,
  confidence,
  score,
  notes,
  source,
  rowGap,
  rank,
}: {
  player: string
  playerColor?: string
  dimensionId: string
  dimensionLabel: string
  dimensionWeight: number
  confidence: string
  score: number
  notes?: string
  source?: string
  rowGap: number
  rank: string
}) {
  return (
    <section className="mt-6 grid gap-5 border border-[var(--rule)] bg-[var(--paper)] p-5 xl:grid-cols-[220px_minmax(0,1fr)]">
      <div>
        <div
          className="text-[10px] uppercase tracking-[0.14em] text-[var(--ink-3)]"
          style={{ fontFamily: MONO_FONT }}
        >
          Cell intelligence
        </div>
        <div
          className="mt-3 flex items-center gap-2 text-[28px] font-black tracking-[-0.05em] text-[var(--ink)]"
          style={{ fontFamily: DISPLAY_FONT }}
        >
          <span
            className="inline-block h-3 w-3"
            style={{ background: playerColor || "var(--ink-dim)" }}
          />
          {player}
        </div>
        <div
          className="mt-2 text-[10px] uppercase tracking-[0.12em] text-[var(--ink-3)]"
          style={{ fontFamily: MONO_FONT }}
        >
          {dimensionId} · weight {Math.round(dimensionWeight * 100)} · {confidence || "no"} confidence
        </div>
        <div
          className="mt-5 text-[56px] font-black leading-none tracking-[-0.06em] text-[var(--ink)]"
          style={{ fontFamily: DISPLAY_FONT }}
        >
          {score}
        </div>
      </div>
      <div className="space-y-4">
        <h3
          className="text-[22px] font-black tracking-[-0.04em] text-[var(--ink)]"
          style={{ fontFamily: DISPLAY_FONT }}
        >
          {dimensionLabel}
        </h3>
        {notes && (
          <p
            className="text-[15px] leading-[1.55] text-[var(--ink-2)]"
            style={{ fontFamily: SANS_FONT }}
          >
            {notes}
          </p>
        )}
        <div className="grid gap-px border border-[var(--rule)] bg-[var(--rule)] sm:grid-cols-3">
          {[
            ["source", source || "not mapped"],
            ["row gap", rowGap.toFixed(0)],
            ["rank", rank],
          ].map(([label, value]) => (
            <div key={label} className="bg-[var(--paper-alt)] p-3">
              <div
                className="text-[9px] uppercase tracking-[0.12em] text-[var(--ink-3)]"
                style={{ fontFamily: MONO_FONT }}
              >
                {label}
              </div>
              <div
                className="mt-1 truncate text-[13px] font-bold text-[var(--ink)]"
                style={{ fontFamily: "var(--font-bb-sans), system-ui" }}
              >
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
