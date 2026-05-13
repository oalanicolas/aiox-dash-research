import { cn } from "@/lib/utils"
import type { ObservatoryPersona } from "../foundations/types"
import { DISPLAY_FONT, MONO_FONT, SANS_FONT, SERIF_FONT } from "../foundations/theme"

/* Molecule — full persona card with header, ranking bars, verdict, tiebreaker.
 * One per persona scenario (e.g., SMB BR · Mid-market BR · Enterprise).
 * Distinct from PlayerCard (which renders a single research citation). */
export function PersonaCard({ persona, playerColor }: {
  persona: ObservatoryPersona
  playerColor?: (player: string, idx: number) => string
}) {
  const ranking = persona.ranking
  const topScore = ranking[0]?.score ?? 100

  return (
    <section className="border border-[var(--rule)] bg-[var(--paper)] p-6">
      <span
        className="block text-[10px] uppercase tracking-[0.16em] text-[var(--ink-3)]"
        style={{ fontFamily: MONO_FONT }}
      >
        {persona.id.replace(/_/g, " · ")}
      </span>

      {persona.sub && (
        <span
          className="mt-1 block text-[12px] italic text-[var(--ink-3)]"
          style={{ fontFamily: SERIF_FONT }}
        >
          {persona.sub}
        </span>
      )}

      <div className="mt-3 flex items-baseline justify-between gap-3">
        <h3
          className="text-[28px] font-black leading-[1.05] tracking-[-0.04em] text-[var(--ink)]"
          style={{ fontFamily: DISPLAY_FONT }}
        >
          {persona.label}
        </h3>
        {persona.winner && (
          <span
            className="text-[28px] font-black tracking-[-0.04em] text-[var(--lime-ink)]"
            style={{ fontFamily: DISPLAY_FONT }}
          >
            {formatScore(topScore)}
          </span>
        )}
      </div>

      {/* Ranking bars */}
      <div className="mt-4 space-y-1.5">
        {ranking.map((item, idx) => {
          const widthPct = topScore > 0 ? Math.max(4, (item.score / topScore) * 100) : 0
          const isWinner = idx === 0
          return (
            <div
              key={`${persona.id}-${item.player}`}
              className="grid grid-cols-[20px_88px_minmax(0,1fr)_52px] items-center gap-2.5"
            >
              <span
                className="text-[10px] text-[var(--ink-dim)]"
                style={{ fontFamily: MONO_FONT }}
              >
                {String(item.rank).padStart(2, "0")}
              </span>
              <span
                className={cn(
                  "truncate text-[12px]",
                  isWinner ? "font-bold text-[var(--ink)]" : "text-[var(--ink-2)]",
                )}
                style={{ fontFamily: SANS_FONT }}
              >
                {item.player}
              </span>
              <span className="relative block h-[5px] w-full bg-[var(--paper-deep)]">
                <span
                  className={cn(
                    "absolute left-0 top-0 h-full",
                    isWinner ? "bg-[var(--lime-ink)]" : "bg-[var(--ink-dim)]",
                  )}
                  style={{
                    width: `${widthPct}%`,
                    backgroundColor: playerColor ? playerColor(item.player, idx) : undefined,
                  }}
                />
              </span>
              <span
                className={cn(
                  "text-right text-[13px] tabular-nums",
                  isWinner ? "font-bold text-[var(--ink)]" : "text-[var(--ink-2)]",
                )}
                style={{ fontFamily: MONO_FONT }}
              >
                {formatScore(item.score)}
              </span>
            </div>
          )
        })}
      </div>

      {persona.verdict && (
        <p
          className="mt-5 border-t border-[var(--rule)] pt-4 text-[14px] italic leading-[1.55] text-[var(--ink)]"
          style={{ fontFamily: SERIF_FONT }}
        >
          {persona.verdict}
        </p>
      )}

      {persona.tiebreaker && (
        <div className="mt-3">
          <span
            className="block text-[9px] uppercase tracking-[0.16em] text-[var(--ink-3)]"
            style={{ fontFamily: MONO_FONT }}
          >
            Tiebreaker
          </span>
          <p
            className="mt-1 text-[12px] leading-[1.5] text-[var(--ink-2)]"
            style={{ fontFamily: MONO_FONT }}
          >
            {persona.tiebreaker}
          </p>
        </div>
      )}
    </section>
  )
}

function formatScore(n: number): string {
  if (!Number.isFinite(n)) return "—"
  return n % 1 === 0 ? String(n) : n.toFixed(2)
}
