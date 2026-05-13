"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import type {
  ObservatoryMatrix,
  ObservatoryMatrixRow,
  ObservatoryPlayerProfile,
} from "../foundations/types"
import { LightScrollArea } from "../molecules/light-scroll-area"
import { DISPLAY_FONT, MONO_FONT, SANS_FONT, SERIF_FONT } from "../foundations/theme"

type DuelRow = {
  row: ObservatoryMatrixRow
  leftCell: ObservatoryMatrixRow["cells"][number]
  rightCell: ObservatoryMatrixRow["cells"][number]
}

/* Organism — Duel view (Reader mode = "duel").
 * Two players head-to-head, dimension by dimension, with wins arrays. */
export function DuelView({
  matrix,
  playerProfiles,
}: {
  matrix: ObservatoryMatrix
  playerProfiles: ObservatoryPlayerProfile[]
}) {
  const totalsByPlayer = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of matrix.totals) map.set(t.player, t.score)
    return map
  }, [matrix.totals])

  const sortedPlayers = useMemo(
    () => [...matrix.players].sort((a, b) => (totalsByPlayer.get(b) ?? 0) - (totalsByPlayer.get(a) ?? 0)),
    [matrix.players, totalsByPlayer],
  )

  const pairOptions = useMemo(() => {
    const pairs: Array<[string, string]> = []
    for (let i = 0; i < sortedPlayers.length; i += 1) {
      for (let j = i + 1; j < sortedPlayers.length; j += 1) {
        pairs.push([sortedPlayers[i], sortedPlayers[j]])
      }
    }
    return pairs
  }, [sortedPlayers])

  const [pairIndex, setPairIndex] = useState(0)
  const pair = pairOptions[pairIndex] ?? [sortedPlayers[0], sortedPlayers[1]]
  const [left, right] = pair

  if (!left || !right) {
    return (
      <div className="flex-1 px-4 pt-5 sm:px-6 sm:pt-6 lg:px-10 lg:pt-7">
        <p
          className="text-[14px] italic text-[var(--ink-3)]"
          style={{ fontFamily: SERIF_FONT }}
        >
          Este benchmark precisa de pelo menos dois players para renderizar duelo.
        </p>
      </div>
    )
  }

  const profileByKey = new Map(playerProfiles.map((p) => [p.key, p]))
  const colorOf = (key: string, idx: number) =>
    profileByKey.get(key)?.color || PALETTE[idx % PALETTE.length]

  const leftScore = totalsByPlayer.get(left) ?? 0
  const rightScore = totalsByPlayer.get(right) ?? 0

  const leftWins: ObservatoryMatrixRow[] = []
  const rightWins: ObservatoryMatrixRow[] = []
  const ties: ObservatoryMatrixRow[] = []

  const rows = matrix.rows
    .map((row) => {
      const leftCell = row.cells.find((c) => c.player === left)
      const rightCell = row.cells.find((c) => c.player === right)
      if (!leftCell || !rightCell) return null
      if (leftCell.score > rightCell.score) leftWins.push(row)
      else if (rightCell.score > leftCell.score) rightWins.push(row)
      else ties.push(row)
      return { row, leftCell, rightCell }
    })
    .filter((r): r is DuelRow => r !== null)

  return (
    <LightScrollArea className="flex-1" viewportClassName="px-4 pb-12 pt-5 sm:px-6 sm:pb-14 sm:pt-6 lg:px-10 lg:pb-16 lg:pt-7">
      <div className="mx-auto w-full min-w-0 max-w-[1400px] space-y-6">
        {/* Pair picker */}
        <div className="flex justify-end">
          <div className="inline-flex max-w-full flex-wrap justify-end gap-px border border-[var(--rule)] bg-[var(--rule)] p-px">
            {pairOptions.map(([a, b], index) => (
              <button
                key={`${a}-${b}`}
                type="button"
                onClick={() => setPairIndex(index)}
                className={cn(
                  "h-8 px-3 text-[10px] uppercase tracking-[0.1em] transition-colors",
                  pairIndex === index
                    ? "bg-[var(--paper)] text-[var(--ink)]"
                    : "bg-[var(--paper-alt)] text-[var(--ink-3)] hover:text-[var(--ink)]",
                )}
                style={{ fontFamily: MONO_FONT }}
              >
                {a} × {b}
              </button>
            ))}
          </div>
        </div>

        {/* Headers — side-by-side big scores */}
        <div className="grid grid-cols-1 border border-[var(--rule)] bg-[var(--paper)] md:grid-cols-[minmax(0,1fr)_60px_minmax(0,1fr)]">
          <div className="px-3 py-4 sm:px-5 sm:py-5 lg:px-8 lg:py-6">
            <div className="flex items-center gap-3">
              <span
                className="h-3 w-3"
                style={{ background: colorOf(left, matrix.players.indexOf(left)) }}
              />
              <h3
                className="text-[24px] font-black tracking-[-0.05em] text-[var(--ink)] sm:text-[28px] lg:text-[34px]"
                style={{ fontFamily: DISPLAY_FONT }}
              >
                {profileByKey.get(left)?.name ?? left}
              </h3>
            </div>
            <div
              className="mt-3 text-[10px] uppercase tracking-[0.12em] text-[var(--ink-3)]"
              style={{ fontFamily: MONO_FONT }}
            >
              neutral score
            </div>
            <div
              className="text-[36px] font-black leading-none tracking-[-0.06em] text-[var(--ink)] sm:text-[44px] lg:text-[56px]"
              style={{ fontFamily: DISPLAY_FONT }}
            >
              {leftScore.toFixed(2)}
            </div>
          </div>
          <div
            className="grid place-items-center border-y border-[var(--rule)] bg-[var(--paper-alt)] py-2 text-[14px] italic text-[var(--ink-3)] md:border-x md:border-y-0 md:py-0"
            style={{ fontFamily: SERIF_FONT }}
          >
            vs.
          </div>
          <div className="px-3 py-4 text-right sm:px-5 sm:py-5 lg:px-8 lg:py-6">
            <div className="flex items-center justify-end gap-3">
              <h3
                className="text-[24px] font-black tracking-[-0.05em] text-[var(--ink)] sm:text-[28px] lg:text-[34px]"
                style={{ fontFamily: DISPLAY_FONT }}
              >
                {profileByKey.get(right)?.name ?? right}
              </h3>
              <span
                className="h-3 w-3"
                style={{ background: colorOf(right, matrix.players.indexOf(right)) }}
              />
            </div>
            <div
              className="mt-3 text-[10px] uppercase tracking-[0.12em] text-[var(--ink-3)]"
              style={{ fontFamily: MONO_FONT }}
            >
              neutral score
            </div>
            <div
              className="text-[36px] font-black leading-none tracking-[-0.06em] text-[var(--ink)] sm:text-[44px] lg:text-[56px]"
              style={{ fontFamily: DISPLAY_FONT }}
            >
              {rightScore.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Dimension rows */}
        <div className="border border-[var(--rule)] bg-[var(--paper)]">
          {rows.map(({ row, leftCell, rightCell }) => {
            const leftWon = leftCell.score > rightCell.score
            const rightWon = rightCell.score > leftCell.score
            return (
              <div
                key={row.id}
                className="grid grid-cols-1 border-b border-[var(--rule-soft)] last:border-b-0 md:grid-cols-[minmax(0,1fr)_140px_minmax(0,1fr)]"
              >
                <div className={cn("px-5 py-4", leftWon && "bg-[var(--paper-deep)]")}>
                  <div
                    className={cn(
                      "text-[20px] font-black leading-none tracking-[-0.05em] sm:text-[24px] lg:text-[28px]",
                      leftWon ? "text-[var(--ink)]" : "text-[var(--ink-dim)]",
                    )}
                    style={{ fontFamily: DISPLAY_FONT }}
                  >
                    {leftCell.score}
                  </div>
                  <div className="mt-3 h-1.5 bg-[var(--paper-alt)]">
                    <div
                      className={cn("h-full", leftWon ? "bg-[var(--lime-ink)]" : "bg-[var(--ink-dim)]")}
                      style={{ width: `${leftCell.score}%` }}
                    />
                  </div>
                </div>
                <div className="border-y border-[var(--rule-soft)] bg-[var(--paper-alt)] px-3 py-3 text-center md:border-x md:border-y-0 md:py-4">
                  <div
                    className="text-[9px] uppercase tracking-[0.12em] text-[var(--ink-3)]"
                    style={{ fontFamily: MONO_FONT }}
                  >
                    {row.id} · w{Math.round((row.weight ?? 0) * 100)}
                  </div>
                  <div
                    className="mt-1 text-[12px] font-bold leading-tight text-[var(--ink)]"
                    style={{ fontFamily: SANS_FONT }}
                  >
                    {row.label}
                  </div>
                </div>
                <div className={cn("px-5 py-4", rightWon && "bg-[var(--paper-deep)]")}>
                  <div
                    className={cn(
                      "text-right text-[20px] font-black leading-none tracking-[-0.05em] sm:text-[24px] lg:text-[28px]",
                      rightWon ? "text-[var(--ink)]" : "text-[var(--ink-dim)]",
                    )}
                    style={{ fontFamily: DISPLAY_FONT }}
                  >
                    {rightCell.score}
                  </div>
                  <div className="mt-3 h-1.5 bg-[var(--paper-alt)]">
                    <div
                      className={cn(
                        "ml-auto h-full",
                        rightWon ? "bg-[var(--lime-ink)]" : "bg-[var(--ink-dim)]",
                      )}
                      style={{ width: `${rightCell.score}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Wins summary */}
        <div className="grid gap-4 xl:grid-cols-3">
          {([
            [left, leftWins, profileByKey.get(left)?.name ?? left],
            [right, rightWins, profileByKey.get(right)?.name ?? right],
            ["__ties__", ties, "Empates"],
          ] as Array<[string, ObservatoryMatrixRow[], string]>).map(([key, wins, displayName]) => (
            <section key={key} className="border border-[var(--rule)] bg-[var(--paper)] p-5">
              <div className="flex items-center justify-between">
                <h4
                  className="text-[18px] font-black tracking-[-0.04em] text-[var(--ink)]"
                  style={{ fontFamily: DISPLAY_FONT }}
                >
                  {key === "__ties__" ? displayName : `${displayName} wins`}
                </h4>
                <span
                  className="text-[10px] uppercase tracking-[0.12em] text-[var(--ink-3)]"
                  style={{ fontFamily: MONO_FONT }}
                >
                  {wins.length}/{matrix.rows.length}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {wins.map((row) => (
                  <span
                    key={`${key}-${row.id}`}
                    className="border border-[var(--rule)] bg-[var(--paper-alt)] px-2 py-1 text-[10px] uppercase tracking-[0.08em] text-[var(--ink-2)]"
                    style={{ fontFamily: MONO_FONT }}
                  >
                    {row.id} · {row.label}
                  </span>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </LightScrollArea>
  )
}

const PALETTE = ["#7C9F3F", "#4F7CAC", "#C97A4A", "#8B6FB0", "#10B981", "#3B82F6", "#8B5CF6"]
