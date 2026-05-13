import { cn } from "@/lib/utils"
import { DISPLAY_FONT, MONO_FONT, SANS_FONT } from "../foundations/theme"

/* Molecule — single cell in the score matrix (one player × one dimension).
 * Atoms: score number, confidence chip, score bar, optional categorical winner mark.
 * Renders compactly inside a grid cell ~170px wide. */
export function ScoreCell({
  player,
  score,
  confidence,
  notes,
  categoricalWinner = false,
  isSelected = false,
  onSelect,
}: {
  player: string
  score: number
  confidence: string
  notes?: string
  categoricalWinner?: boolean
  isSelected?: boolean
  onSelect?: () => void
}) {
  const tone = scoreTone(score)
  const width = Math.max(4, Math.min(100, score))
  const conf = (confidence || "").toUpperCase().charAt(0)
  const confTitle = confTitleFor(conf)

  return (
    <button
      type="button"
      onClick={onSelect}
      data-player={player}
      className={cn(
        "group flex h-full w-full flex-col items-start gap-1 border-r border-b border-[var(--rule-soft)] px-3 py-2.5 text-left transition-colors hover:bg-[var(--paper)]",
        isSelected && "bg-[var(--paper-deep)]",
      )}
    >
      <div className="flex w-full items-baseline justify-between gap-2">
        <span
          className={cn(
            "text-[24px] font-black leading-none tracking-[-0.04em] text-[var(--ink)]",
            score === 0 && "text-[var(--ink-dim)]",
          )}
          style={{ fontFamily: DISPLAY_FONT }}
        >
          {score || "—"}
        </span>
        {conf && (
          <span
            className="border border-[var(--ink-faint)] px-1 text-[9px] leading-none tracking-[0.08em] text-[var(--ink-3)]"
            style={{ fontFamily: MONO_FONT }}
            title={confTitle}
          >
            {conf}
          </span>
        )}
      </div>

      <div className="relative h-[3px] w-full bg-[var(--paper-deep)]">
        <span
          className={cn("absolute left-0 top-0 h-full", tone)}
          style={{ width: `${width}%` }}
        />
      </div>

      {(notes || categoricalWinner) && (
        <span
          className="line-clamp-3 text-[11.5px] leading-[1.4] text-[var(--ink-2)]"
          style={{ fontFamily: SANS_FONT }}
        >
          {categoricalWinner && (
            <span
              className="mr-1 inline-block border border-[var(--lime-ink)] bg-[var(--lime-ink)] px-1 text-[9px] not-italic uppercase tracking-[0.1em] text-[var(--paper)]"
              style={{ fontFamily: MONO_FONT }}
            >
              winner
            </span>
          )}
          {notes}
        </span>
      )}
    </button>
  )
}

function scoreTone(score: number): string {
  if (score >= 80) return "bg-[var(--lime-ink)]"
  if (score >= 55) return "bg-[var(--warning-ink)]"
  if (score === 0) return "bg-[var(--ink-faint)]"
  return "bg-[var(--ink-dim)]"
}

function confTitleFor(c: string): string {
  if (c === "H") return "High confidence"
  if (c === "M") return "Medium confidence"
  if (c === "L") return "Low confidence"
  return "Unknown confidence"
}
