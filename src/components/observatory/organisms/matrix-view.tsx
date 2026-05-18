"use client"

import { useMemo, useState, type CSSProperties } from "react"
import { cn } from "@/lib/utils"
import type {
  ObservatoryMatrix,
  ObservatoryMatrixRow,
  ObservatoryPlayerProfile,
} from "../foundations/types"
import { CellDrawer, type CellDrawerData } from "../molecules/cell-drawer"
import { LightScrollArea } from "../molecules/light-scroll-area"
import { DISPLAY_FONT, MONO_FONT, SERIF_FONT } from "../foundations/theme"

const COMPARE_PALETTE = ["#ef4444", "#3b82f6", "#f59e0b", "#8b5cf6", "#10b981", "#ec4899", "#94a3b8"]

function scoreGap(row: ObservatoryMatrixRow): number {
  if (row.cells.length < 2) return 0
  const scores = row.cells.map((c) => c.score)
  return Math.max(...scores) - Math.min(...scores)
}

function formatWeight(weight: number): string {
  if (!Number.isFinite(weight)) return "0"
  return String(Math.round(weight > 1 ? weight : weight * 100))
}

function formatMatrixScore(value: number): string {
  if (!Number.isFinite(value)) return "—"
  if (Math.abs(value) >= 100) return String(Math.round(value))
  if (Math.abs(value) >= 10) return value.toFixed(1).replace(/\.0$/, "")
  return value.toFixed(2).replace(/\.00$/, "").replace(/0$/, "")
}

function matrixRowKey(row: ObservatoryMatrixRow, index: number): string {
  return `${row.id || "row"}::${index}`
}

function matrixCategory(row: ObservatoryMatrixRow): { id: string; label: string } {
  if (row.group) return { id: row.group.slice(0, 3).toUpperCase(), label: row.group }
  const text = `${row.id} ${row.label} ${row.short ?? ""}`.toLowerCase()
  if (/feature|ux|design|layout|visual|edit|output|export/.test(text)) return { id: "C01", label: "Produto" }
  if (/price|pricing|market|fit|growth|commercial|custo|valor/.test(text)) return { id: "C02", label: "Mercado" }
  if (/integration|support|api|desktop|workflow|ops|plataform|platform/.test(text)) return { id: "C03", label: "Operação" }
  return { id: "C04", label: "Critérios" }
}

function matrixCellIndicator(score: number | null, isWinner: boolean): { mark: string; tone: "yes" | "part" | "no"; label: string } {
  if (score === null || !Number.isFinite(score) || score <= 0) return { mark: "×", tone: "no", label: "ausente" }
  if (isWinner || score >= 75) return { mark: "✓", tone: "yes", label: "forte" }
  if (score >= 45) return { mark: "◐", tone: "part", label: "parcial" }
  return { mark: "×", tone: "no", label: "fraco" }
}

function scoringGuideText(guide: Record<string, unknown> | null | undefined, key: string, fallback: string): string {
  const value = guide?.[key]
  return typeof value === "string" && value.trim() ? value : fallback
}

function scoringGuideList(guide: Record<string, unknown> | null | undefined, key: string): Array<Record<string, unknown>> {
  const value = guide?.[key]
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object")) : []
}

/* Organism — Matrix view with narrative header, sticky-first-col,
 * row-winner highlight (lime), cell intelligence panel,
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
  const groupedRows = useMemo(() => {
    const groups: Array<{ id: string; label: string; rows: Array<{ row: ObservatoryMatrixRow; rowIndex: number }> }> = []
    for (const [rowIndex, row] of matrix.rows.entries()) {
      const category = matrixCategory(row)
      let group = groups.find((item) => item.id === category.id)
      if (!group) {
        group = { ...category, rows: [] }
        groups.push(group)
      }
      group.rows.push({ row, rowIndex })
    }
    return groups
  }, [matrix.rows])
  const leader = totalsSorted[0]
  const runner = totalsSorted[1]
  const leaderGap = leader && runner ? leader.score - runner.score : 0
  const technicalTie = Math.abs(leaderGap) < 1
  const weightSum = matrix.rows.reduce((sum, row) => sum + (Number.isFinite(row.weight) ? row.weight : 0), 0)
  const cellCount = matrix.rows.reduce((sum, row) => sum + row.cells.length, 0)
  const confidenceCounts = matrix.rows.reduce(
    (acc, row) => {
      for (const cell of row.cells) {
        const key = cell.confidence?.toLowerCase()
        if (key === "high") acc.high += 1
        else if (key === "medium") acc.medium += 1
        else if (key === "low") acc.low += 1
      }
      return acc
    },
    { high: 0, medium: 0, low: 0 },
  )

  const [selected, setSelected] = useState<{ rowKey: string; player: string } | null>(null)

  const matrixGridStyle = {
    gridTemplateColumns: `minmax(320px,1fr) repeat(${players.length}, 140px) 100px`,
    minWidth: `${320 + players.length * 140 + 100}px`,
  } as const

  const colorOf = (_key: string, idx: number) => COMPARE_PALETTE[idx % COMPARE_PALETTE.length]

  const displayName = (key: string) => profileByKey.get(key)?.name ?? key

  /* Build CellDrawer data lazily from current selection. */
  const drawerData: CellDrawerData | null = (() => {
    if (!selected) return null
    const row = matrix.rows.find((r, index) => matrixRowKey(r, index) === selected.rowKey)
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
      scoreBreakdown: cell.scoreBreakdown,
      scoreReason: cell.scoreReason,
      rowGap: scoreGap(row),
      rank: `${rankIndex + 1}/${row.cells.length}`,
    }
  })()

  return (
    <div className="flex min-h-0 flex-1">
      <LightScrollArea className="flex-1" viewportClassName="px-3 pb-12 pt-4 sm:px-5 sm:pb-14 sm:pt-5 lg:px-6 lg:pb-16">
        <div className="mx-auto w-full min-w-0 max-w-[1540px]">
          <div className="border border-[var(--rule)] bg-[#0f0f11]">
            <div className="grid gap-px bg-[var(--rule)] lg:grid-cols-[minmax(0,1fr)_420px]">
              <section className="bg-[#050505] p-5 sm:p-7">
                <div className="text-[10px] uppercase tracking-[0.2em] text-[#d1ff00]" style={{ fontFamily: MONO_FONT }}>
                  matriz · heatmap
                </div>
                <h1 className="mt-3 text-[clamp(34px,5vw,72px)] font-black leading-[0.92] tracking-[-0.07em] text-[var(--ink)]" style={{ fontFamily: DISPLAY_FONT }}>
                  {technicalTie ? "Empate técnico" : "Mapa de decisão"}
                </h1>
                <p className="mt-4 max-w-[920px] text-[17px] leading-[1.55] text-[var(--ink-2)]">
                  A matriz mostra onde cada player deixa de ser intercambiável. Olhe primeiro para células em lime: elas são os vencedores por dimensão.
                </p>
              </section>
              <aside className="grid bg-[#0f0f11] text-[10px] uppercase tracking-[0.13em] text-[var(--ink-3)] sm:grid-cols-2 lg:grid-cols-1" style={{ fontFamily: MONO_FONT }}>
                {[
                  ["players", String(players.length)],
                  ["dimensões", String(matrix.rows.length)],
                  ["líder", leader ? displayName(leader.player) : "—"],
                  ["gap", leaderGap.toFixed(2)],
                  ["método", matrix.method || "derived"],
                ].map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[1fr_auto] border-b border-[var(--rule)] px-5 py-4 last:border-b-0">
                    <span>{label}</span>
                    <strong className="ml-4 text-right text-[var(--ink)]">{value}</strong>
                  </div>
                ))}
              </aside>
            </div>
          </div>

        <div className="mt-5 overflow-x-auto">
          <div className="aiox-duel-fmx-wrap aiox-map-matrix">
            <div className="aiox-duel-fmx-head" style={matrixGridStyle}>
              <span className="cell">Dimensão</span>
              {players.map((player, idx) => (
                <span key={player} className="cell plyr">
                  <span className={cn("dot", idx > 0 && "b")} style={{ background: colorOf(player, idx), boxShadow: idx === 0 ? undefined : "none" }} />
                  {displayName(player)}
                </span>
              ))}
              <span className="cell win">Vence</span>
            </div>
            {groupedRows.map((group) => (
              <div key={group.id}>
                <div className="aiox-duel-fmx-cat">
                  <span className="id">{group.id}</span>
                  {group.label}
                  <span className="count"><b>{group.rows.length}</b> dimensões</span>
                </div>
                {group.rows.map(({ row, rowIndex }) => {
                  const rowKey = matrixRowKey(row, rowIndex)
                  const winnerCell = row.cells.reduce(
                    (best, cell) => (cell.score > best.score ? cell : best),
                    row.cells[0],
                  )
              return (
                <div key={rowKey} className="aiox-duel-fmx-row" style={matrixGridStyle}>
                  <div className="lab">
                    <span className="nm">{row.label}</span>
                    <span className="sub">{row.id} · peso {formatWeight(row.weight ?? 0)}</span>
                    {row.question && <span className="sub normal-case tracking-normal text-[var(--ink-3)]">{row.question}</span>}
                  </div>
                  {players.map((player, idx) => {
                    const cell = row.cells.find((item) => item.player === player)
                    const isWinner = cell?.player === winnerCell.player
                    const isSelected = selected?.rowKey === rowKey && selected?.player === player
                    const indicator = matrixCellIndicator(cell?.score ?? null, Boolean(isWinner))
                    return (
                      <button
                        type="button"
                        key={`${rowKey}::${player}`}
                        onClick={() => setSelected(isSelected ? null : { rowKey, player })}
                        className={cn("pcell", isWinner && "win", isSelected && "outline outline-2 outline-[#f5f4e7]")}
                        style={{ "--fmx-accent": colorOf(player, idx) } as CSSProperties}
                      >
                        <span className={cn("aiox-duel-fmx-mark", indicator.tone)}>{indicator.mark}</span>
                        <span className="val">{cell ? formatMatrixScore(cell.score) : "—"}</span>
                        <span className="state">{indicator.label}</span>
                      </button>
                    )
                  })}
                  <div className="winner" style={{ "--fmx-accent": colorOf(winnerCell.player, players.indexOf(winnerCell.player)) } as CSSProperties}>
                    {displayName(winnerCell.player)}
                  </div>
                </div>
              )
                })}
              </div>
            ))}
          </div>
        </div>

          {matrix.method && (
            <p
              className="mt-6 text-[13px] italic leading-[1.55] text-[var(--ink-3)]"
              style={{ fontFamily: SERIF_FONT }}
            >
              Method · {matrix.method}
            </p>
          )}

          <section className="mt-6 border border-[var(--rule)] bg-[#0f0f11]">
            <div className="border-b border-[var(--rule)] px-5 py-4 sm:px-6">
              <div className="text-[10px] uppercase tracking-[0.18em] text-[#d1ff00]" style={{ fontFamily: MONO_FONT }}>
                transparência da pontuação
              </div>
              <h2 className="mt-2 text-[24px] font-black tracking-[-0.05em] text-[var(--ink)]" style={{ fontFamily: DISPLAY_FONT }}>
                Como esta matriz é medida
              </h2>
            </div>
            <div className="grid gap-px bg-[var(--rule)] md:grid-cols-2 xl:grid-cols-4">
              {[
                ["Escala", scoringGuideText(matrix.scoringGuide, "scale", "0-100 por dimensão/microdimensão.")],
                ["Fórmula", scoringGuideText(matrix.scoringGuide, "formula", "score_total_player = soma(score_da_célula × peso) / soma(pesos).")],
                ["Pesos", scoringGuideText(matrix.scoringGuide, "weight_policy", "Pesos somam 100; dimensões mais críticas recebem maior peso.")],
                ["Interpretação", scoringGuideText(matrix.scoringGuide, "interpretation", "Ranking consolidado é mapa de absorção; use personas e segmentos para decisões justas.")],
              ].map(([title, body]) => (
                <div key={title} className="bg-[#050505] p-5">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--ink-3)]" style={{ fontFamily: MONO_FONT }}>{title}</div>
                  <p className="mt-2 text-[13px] leading-[1.5] text-[var(--ink-2)]">{body}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-px bg-[var(--rule)] md:grid-cols-4">
              {[
                ["Players", String(players.length)],
                ["Dimensões", String(matrix.rows.length)],
                ["Células", String(cellCount)],
                ["Soma dos pesos", weightSum.toFixed(2)],
              ].map(([label, value]) => (
                <div key={label} className="grid grid-cols-[1fr_auto] bg-[#050505] px-5 py-4 text-[10px] uppercase tracking-[0.13em]" style={{ fontFamily: MONO_FONT }}>
                  <span className="text-[var(--ink-3)]">{label}</span>
                  <strong className="text-[var(--ink)]">{value}</strong>
                </div>
              ))}
            </div>
            <div className="grid gap-px bg-[var(--rule)] lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="bg-[#050505] p-5 sm:p-6">
                <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--ink-3)]" style={{ fontFamily: MONO_FONT }}>
                  bandas de score
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-5">
                  {[
                    ["0-20", "ausente ou intenção"],
                    ["21-49", "fraco/protótipo"],
                    ["50-69", "parcial útil"],
                    ["70-84", "forte com gaps"],
                    ["85-100", "referência de absorção"],
                  ].map(([range, label]) => (
                    <div key={range} className="border border-[var(--rule)] bg-[#0f0f11] p-3">
                      <div className="text-[18px] font-black text-[var(--ink)]" style={{ fontFamily: DISPLAY_FONT }}>{range}</div>
                      <div className="mt-1 text-[11px] leading-tight text-[var(--ink-3)]">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-[#050505] p-5 sm:p-6">
                <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--ink-3)]" style={{ fontFamily: MONO_FONT }}>
                  confiança da evidência
                </div>
                <p className="mt-2 text-[13px] leading-[1.5] text-[var(--ink-2)]">
                  {scoringGuideText(matrix.scoringGuide, "evidence_policy", "High = código/docs/testes locais; medium = README/fluxo parcialmente verificado; low = inferência ou sinal indireto.")}
                </p>
                <div className="mt-4 grid grid-cols-3 gap-px bg-[var(--rule)] text-[10px] uppercase tracking-[0.12em]" style={{ fontFamily: MONO_FONT }}>
                  {[
                    ["High", confidenceCounts.high],
                    ["Medium", confidenceCounts.medium],
                    ["Low", confidenceCounts.low],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-[#0f0f11] p-3">
                      <div className="text-[var(--ink-3)]">{label}</div>
                      <div className="mt-1 text-[18px] font-black text-[var(--ink)]">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid gap-px bg-[var(--rule)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="bg-[#050505] p-5 sm:p-6">
                <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--ink-3)]" style={{ fontFamily: MONO_FONT }}>
                  score da célula
                </div>
                <p className="mt-2 text-[13px] leading-[1.5] text-[var(--ink-2)]">
                  {scoringGuideText(matrix.scoringGuide, "cell_formula", "score_da_célula = cobertura + profundidade + fidelidade + evidência + absorvibilidade; cada lente vale 0-20.")}
                </p>
                <div className="mt-4 grid gap-px bg-[var(--rule)] sm:grid-cols-5">
                  {scoringGuideList(matrix.scoringGuide, "score_lenses").map((lens) => (
                    <div key={String(lens.id)} className="bg-[#0f0f11] p-3">
                      <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--ink-3)]" style={{ fontFamily: MONO_FONT }}>
                        {String(lens.points ?? "0-20")}
                      </div>
                      <div className="mt-1 text-[13px] font-bold leading-tight text-[var(--ink)]">
                        {String(lens.label ?? lens.id)}
                      </div>
                      <p className="mt-2 text-[11px] leading-[1.35] text-[var(--ink-3)]">
                        {String(lens.question ?? "")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-[#050505] p-5 sm:p-6">
                <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--ink-3)]" style={{ fontFamily: MONO_FONT }}>
                  diferença dentro de 85-100
                </div>
                <div className="mt-4 grid gap-2">
                  {scoringGuideList(matrix.scoringGuide, "reference_band_detail").map((item) => (
                    <div key={String(item.range)} className="grid grid-cols-[76px_1fr] gap-3 border border-[var(--rule)] bg-[#0f0f11] p-3">
                      <div className="text-[18px] font-black leading-none text-[var(--ink)]" style={{ fontFamily: DISPLAY_FONT }}>
                        {String(item.range)}
                      </div>
                      <div className="text-[12px] leading-[1.45] text-[var(--ink-2)]">
                        {String(item.meaning)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </LightScrollArea>
      <CellDrawer selection={drawerData} onDismiss={() => setSelected(null)} />
    </div>
  )
}
