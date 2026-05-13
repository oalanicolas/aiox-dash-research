import { DISPLAY_FONT, MONO_FONT, SERIF_FONT } from "../foundations/theme"

/* Molecule — categorical winner card.
 * Used by Matrix view's bottom strip (top-N dimensions with largest score gap).
 * Atoms: id+gap chip, player color dot + name, dimension label italic. */
export function WinnerCard({
  dimensionId,
  gap,
  winnerName,
  dimensionLabel,
  winnerColor,
}: {
  dimensionId: string
  gap: number
  winnerName: string
  dimensionLabel: string
  winnerColor?: string
}) {
  return (
    <section className="border border-[var(--rule)] bg-[var(--paper)] p-4">
      <div
        className="text-[10px] uppercase tracking-[0.14em] text-[var(--ink-3)]"
        style={{ fontFamily: MONO_FONT }}
      >
        {dimensionId} · gap {Math.round(gap)}
      </div>
      <div
        className="mt-3 flex items-center gap-2 text-[20px] font-black tracking-[-0.04em] text-[var(--ink)]"
        style={{ fontFamily: DISPLAY_FONT }}
      >
        <span
          className="inline-block h-[10px] w-[10px]"
          style={{ background: winnerColor || "var(--ink-dim)" }}
        />
        {winnerName}
      </div>
      <p
        className="mt-2 text-[13px] italic leading-[1.5] text-[var(--ink-3)]"
        style={{ fontFamily: SERIF_FONT }}
      >
        {dimensionLabel}
      </p>
    </section>
  )
}
