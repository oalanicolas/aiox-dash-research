"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import type {
  ObservatoryMatrix,
  ObservatoryMatrixRow,
  ObservatoryPlayerProfile,
} from "../foundations/types"
import { CellDrawer, type CellDrawerData } from "../molecules/cell-drawer"
import { CellSparkline } from "../molecules/cell-sparkline"
import { LightScrollArea } from "../molecules/light-scroll-area"
import { WinnerCard } from "../molecules/winner-card"
import { DISPLAY_FONT, MONO_FONT, SANS_FONT, SERIF_FONT } from "../foundations/theme"

const PALETTE = ["#7C9F3F", "#4F7CAC", "#C97A4A", "#8B6FB0", "#10B981", "#3B82F6", "#8B5CF6"]

function scoreGap(row: ObservatoryMatrixRow): number {
  if (row.cells.length < 2) return 0
  const scores = row.cells.map((c) => c.score)
  return Math.max(...scores) - Math.min(...scores)
}

function formatWeight(weight: number): string {
  if (!Number.isFinite(weight)) return "0"
  return String(Math.round(weight > 1 ? weight : weight * 100))
}

/* Organism — Matrix view with narrative header, sticky-first-col,
 * row-winner highlight (lime), per-cell sparkline, cell intelligence panel,
 * and categorical bottom strip (top-5 dimensions with biggest score gap). */
export function MatrixView({
  matrix,
  playerProfiles,
}: {
  matrix: ObservatoryMatrix
  playerProfiles: ObservatoryPlayerProfile[]
}) {
  const players = matrix.players
  const profileByKey = useMemo(() => {
    const map = new Map<string, ObservatoryPlayerProfile>()
    for (const p of playerProfiles) map.set(p.key, p)
    return map
  }, [playerProfiles])

  const totalsByPlayer = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of matrix.totals) map.set(t.player, t.score)
    return map
  }, [matrix.totals])

  const totalsSorted = useMemo(
    () => [...matrix.totals].sort((a, b) => b.score - a.score),
    [matrix.totals],
  )
  const leader = totalsSorted[0]
  const runner = totalsSorted[1]
  const leaderGap = leader && runner ? leader.score - runner.score : 0
  const technicalTie = Math.abs(leaderGap) < 1

  const categoricalRows = useMemo(
    () => [...matrix.rows].sort((a, b) => scoreGap(b) - scoreGap(a)).slice(0, 5),
    [matrix.rows],
  )

  const [selected, setSelected] = useState<{ rowId: string; player: string } | null>(null)

  const gridStyle = {
    gridTemplateColumns: `250px repeat(${players.length}, minmax(170px, 1fr))`,
    minWidth: `${250 + players.length * 170}px`,
  } as const

  const colorOf = (key: string, idx: number) =>
    profileByKey.get(key)?.color || PALETTE[idx % PALETTE.length]

  const displayName = (key: string) => profileByKey.get(key)?.name ?? key

  /* Build CellDrawer data lazily from current selection. */
  const drawerData: CellDrawerData | null = (() => {
    if (!selected) return null
    const row = matrix.rows.find((r) => r.id === selected.rowId)
    const cell = row?.cells.find((c) => c.player === selected.player)
    if (!row || !cell) return null
    const sorted = [...row.cells].sort((a, b) => b.score - a.score)
    const rankIndex = sorted.findIndex((c) => c.player === selected.player)
    return {
      player: displayName(selected.player),
      playerColor: colorOf(selected.player, matrix.players.indexOf(selected.player)),
      dimensionId: row.id,
      dimensionLabel: row.label,
      dimensionWeight: row.weight,
      confidence: cell.confidence,
      score: cell.score,
      notes: cell.notes,
      source: cell.source,
      rowGap: scoreGap(row),
      rank: `${rankIndex + 1}/${row.cells.length}`,
    }
  })()

  return (
    <div className="flex min-h-0 flex-1">
      <LightScrollArea className="flex-1" viewportClassName="px-3 pb-12 pt-4 sm:px-5 sm:pb-14 sm:pt-5 lg:px-6 lg:pb-16">
        <div className="mx-auto max-w-[1500px]">
          {/* Narrative header */}
        <div className="grid gap-6 border-b border-[var(--rule)] pb-5 xl:grid-cols-[minmax(0,1fr)_280px]">
          <p
            className="text-[22px] italic leading-[1.45] text-[var(--ink-3)]"
            style={{ fontFamily: SERIF_FONT }}
          >
            <strong
              className="font-black not-italic tracking-[-0.04em] text-[var(--ink)]"
              style={{ fontFamily: DISPLAY_FONT }}
            >
              {technicalTie ? "Empate técnico." : "Mapa de decisão."}
            </strong>{" "}
            A matriz mostra onde cada player deixa de ser intercambiável. O vencedor neutro é{" "}
            <strong
              className="font-black not-italic text-[var(--ink)]"
              style={{ fontFamily: SANS_FONT }}
            >
              {leader ? displayName(leader.player) : "indefinido"}
            </strong>
            {runner
              ? ` com ${leaderGap.toFixed(2)} ponto(s) de distância para ${displayName(runner.player)}.`
              : "."}
          </p>
          <div
            className="border-l border-[var(--rule)] pl-5 text-[10px] uppercase tracking-[0.12em] text-[var(--ink-3)]"
            style={{ fontFamily: MONO_FONT }}
          >
            {[
              ["players", String(players.length)],
              ["dimensions", String(matrix.rows.length)],
              ["leader", leader ? displayName(leader.player) : "—"],
              ["gap", leaderGap.toFixed(2)],
              ["method", matrix.method || "derived"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="grid grid-cols-[1fr_auto] border-b border-[var(--rule)] py-2 last:border-b-0"
              >
                <span>{label}</span>
                <strong className="text-[var(--ink)]">{value}</strong>
              </div>
            ))}
          </div>
        </div>

        {/* Matrix grid */}
        <div className="mt-5 overflow-x-auto border border-[var(--rule)] bg-[var(--paper)]">
          {/* Header row — sticky top */}
          <div
            className="sticky top-0 z-20 grid border-b border-[var(--rule)] bg-[var(--paper-alt)] shadow-[0_1px_0_var(--rule)]"
            style={gridStyle}
          >
            <div className="sticky left-0 z-30 bg-[var(--paper-deep)] px-4 py-4">
              <div
                className="text-[10px] uppercase tracking-[0.14em] text-[var(--ink-3)]"
                style={{ fontFamily: MONO_FONT }}
              >
                Dimension
              </div>
              <div
                className="text-[13px] italic text-[var(--ink-3)]"
                style={{ fontFamily: SERIF_FONT }}
              >
                {matrix.rows.length} dimensions
              </div>
            </div>
            {players.map((player, idx) => {
              const profile = profileByKey.get(player)
              const total = totalsByPlayer.get(player)
              return (
                <div
                  key={player}
                  className="border-l border-[var(--rule)] bg-[var(--paper-alt)] px-4 py-4"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2"
                      style={{ background: colorOf(player, idx) }}
                    />
                    <div
                      className="truncate text-[18px] font-black tracking-[-0.04em] text-[var(--ink)]"
                      style={{ fontFamily: DISPLAY_FONT }}
                    >
                      {displayName(player)}
                    </div>
                  </div>
                  {profile && (
                    <div
                      className="mt-1 text-[10px] uppercase tracking-[0.1em] text-[var(--ink-3)]"
                      style={{ fontFamily: MONO_FONT }}
                    >
                      {[profile.type, profile.origin, profile.years ? `${profile.years}y` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  )}
                  {typeof total === "number" && Number.isFinite(total) && (
                    <div
                      className="mt-1.5 text-[10px] uppercase tracking-[0.1em] text-[var(--ink-3)]"
                      style={{ fontFamily: MONO_FONT }}
                    >
                      neutral <strong className="text-[var(--ink)]">{total.toFixed(2)}</strong>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Body — one row per dimension */}
          {matrix.rows.map((row, rowIndex) => {
            const winnerCell = row.cells.reduce(
              (best, cell) => (cell.score > best.score ? cell : best),
              row.cells[0],
            )
            return (
              <div
                key={row.id}
                className="grid border-b border-[var(--rule)] last:border-b-0"
                style={gridStyle}
              >
                <div className="sticky left-0 z-10 bg-[var(--paper-deep)] px-4 py-3 shadow-[1px_0_0_var(--rule)]">
                  <div
                    className="text-[9px] uppercase tracking-[0.12em] text-[var(--ink-3)]"
                    style={{ fontFamily: MONO_FONT }}
                  >
                    {row.id} · weight {formatWeight(row.weight ?? 0)}
                  </div>
                  <div
                    className="mt-1 text-[13px] font-bold leading-tight text-[var(--ink)]"
                    style={{ fontFamily: SANS_FONT }}
                  >
                    {row.label}
                  </div>
                </div>
                {row.cells.map((cell) => {
                  const isWinner = cell.player === winnerCell.player
                  const key = `${row.id}::${cell.player}`
                  const isSelected = selected?.rowId === row.id && selected?.player === cell.player
                  return (
                    <button
                      type="button"
                      key={key}
                      onClick={() =>
                        setSelected(isSelected ? null : { rowId: row.id, player: cell.player })
                      }
                      className={cn(
                        "border-l border-[var(--rule)] px-4 py-3 text-left transition-colors hover:bg-[var(--paper-deep)]",
                        isWinner && "bg-[var(--lime-fill)]",
                        !isWinner && rowIndex % 2 === 0 && "bg-[var(--paper-alt)]",
                        isSelected && "outline outline-2 outline-[var(--ink)]",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div
                          className={cn(
                            "text-[24px] font-black leading-none tracking-[-0.05em]",
                            "text-[var(--ink)]",
                          )}
                          style={{ fontFamily: DISPLAY_FONT }}
                        >
                          {cell.score}
                        </div>
                        <div
                          className="text-[9px] uppercase text-[var(--ink-3)]"
                          style={{ fontFamily: MONO_FONT }}
                        >
                          {cell.confidence}
                        </div>
                      </div>
                      <div
                        className={cn(
                          "mt-3 h-1.5",
                          isWinner ? "bg-[var(--ink-faint)]" : "bg-[var(--paper-deep)]",
                        )}
                      >
                        <div
                          className="h-full bg-[var(--ink)]"
                          style={{ width: `${Math.max(0, Math.min(100, cell.score))}%` }}
                        />
                      </div>
                      <div className="mt-2">
                        <CellSparkline
                          score={cell.score}
                          evolution={cell.scoreEvolution}
                          isWinner={isWinner}
                        />
                      </div>
                      {cell.notes && (
                        <div
                          className="mt-2 overflow-hidden text-[12px] leading-[1.45] text-[var(--ink-2)] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3]"
                          style={{ fontFamily: SANS_FONT }}
                        >
                          {cell.notes}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>

          {/* Categorical strip — top-5 dimensions with biggest score gap */}
          {categoricalRows.length > 0 && (
            <div className="mt-6 grid gap-4 xl:grid-cols-5">
              {categoricalRows.map((row) => {
                const winner = [...row.cells].sort((a, b) => b.score - a.score)[0]
                if (!winner) return null
                return (
                  <WinnerCard
                    key={row.id}
                    dimensionId={row.id}
                    gap={scoreGap(row)}
                    winnerName={displayName(winner.player)}
                    dimensionLabel={row.label}
                    winnerColor={colorOf(winner.player, matrix.players.indexOf(winner.player))}
                  />
                )
              })}
            </div>
          )}

          {matrix.method && (
            <p
              className="mt-6 text-[13px] italic leading-[1.55] text-[var(--ink-3)]"
              style={{ fontFamily: SERIF_FONT }}
            >
              Method · {matrix.method}
            </p>
          )}
        </div>
      </LightScrollArea>
      <CellDrawer selection={drawerData} onDismiss={() => setSelected(null)} />
    </div>
  )
}
