"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Check, Copy, Link2, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import type {
  ObservatoryMatrix,
  ObservatoryMatrixRow,
  ObservatoryPersona,
  ObservatoryPlayerProfile,
} from "../foundations/types"
import { LightScrollArea } from "../molecules/light-scroll-area"
import { WeightSlider } from "../molecules/weight-slider"
import { DISPLAY_FONT, MONO_FONT, SANS_FONT, SERIF_FONT } from "../foundations/theme"
import { rankPlayers, useDecisionState } from "../foundations/use-decision-state"

/* Organism — Weights view (Reader mode = "weights").
 *
 * Decision-in-one-click contract (see apps/research/DOCTRINE-decision-in-one-click.md):
 *   - State lives in the URL via useDecisionState. Refresh preserves; share-link reproduces.
 *   - Sliders are grouped by `row.group`. Group headers show "(Σ=N%)" and collapse.
 *   - Persona presets write ?persona=ID and clear any ?w_* layered on top.
 *   - "Copiar permalink" copies window.location.href so the operator can paste anywhere.
 *   - Live leaderboard shows the previous rank in a faded chip whenever it differs from now,
 *     so the operator sees what their last slider movement actually changed.
 */
export function WeightsView({
  matrix,
  personas,
  playerProfiles,
}: {
  matrix: ObservatoryMatrix
  personas: ObservatoryPersona[]
  playerProfiles: ObservatoryPlayerProfile[]
}) {
  const {
    weights,
    baselineWeights,
    personaActive,
    visiblePlayers,
    hasOverrides,
    setWeight,
    setPersona,
    resetAll,
    permalink,
  } = useDecisionState(matrix, personas)

  const totalWeight = matrix.rows.reduce((sum, row) => sum + (weights[row.id] ?? 0), 0)

  const ranking = useMemo(
    () => rankPlayers(matrix, weights, visiblePlayers),
    [matrix, weights, visiblePlayers],
  )

  /* Previous-rank shadow: when a slider/persona changes the ranking, show how each
     player moved by comparing with the previous render. Pure UI memory, not URL.
     We compute by player name → rank from last ranking. */
  const previousRankRef = useRef<Map<string, number>>(new Map())
  const previousRank = previousRankRef.current
  useEffect(() => {
    const next = new Map<string, number>()
    for (const item of ranking) next.set(item.player, item.rank)
    previousRankRef.current = next
  }, [ranking])

  const maxScore = Math.max(1, ...ranking.map((r) => r.score))

  const profileByKey = new Map(playerProfiles.map((p) => [p.key, p]))
  const colorOf = (key: string, idx: number) =>
    profileByKey.get(key)?.color || PALETTE[idx % PALETTE.length]
  const displayName = (key: string) => profileByKey.get(key)?.name ?? key

  const groupedRows = useMemo(() => groupRowsByGroup(matrix.rows), [matrix.rows])
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set())

  const groupWeightSum = (rows: ObservatoryMatrixRow[]) =>
    rows.reduce((sum, row) => sum + (weights[row.id] ?? 0), 0)

  const [copied, setCopied] = useState<"link" | "battle" | null>(null)
  function copyTo(label: "link" | "battle", text: string) {
    if (typeof navigator === "undefined") return
    void navigator.clipboard?.writeText(text)
    setCopied(label)
    window.setTimeout(() => setCopied(null), 1500)
  }

  function copyPermalink() {
    copyTo("link", permalink())
  }

  function copyBattleCard() {
    const winnerEntry = ranking[0]
    const runnerEntry = ranking[1]
    const gap = winnerEntry && runnerEntry ? winnerEntry.score - runnerEntry.score : 0
    const lines: string[] = []
    lines.push(`# Battle card · ${matrix.players.length}-player bench`)
    if (personaActive) lines.push(`> Preset: **${personaActive.label}${personaActive.sub ? ` · ${personaActive.sub}` : ""}**`)
    else if (hasOverrides) lines.push("> Preset: **custom weights**")
    else lines.push("> Preset: **neutral baseline**")
    lines.push("")
    lines.push("## Ranking")
    for (const item of ranking.slice(0, 5)) {
      lines.push(`${String(item.rank).padStart(2, "0")}. **${displayName(item.player)}** — ${item.score.toFixed(2)}`)
    }
    if (winnerEntry && runnerEntry) {
      lines.push("")
      lines.push(`## Gap · ${gap.toFixed(2)}`)
      lines.push(`${displayName(winnerEntry.player)} vs ${displayName(runnerEntry.player)}`)
    }
    lines.push("")
    lines.push(`## Permalink`)
    lines.push(permalink())
    copyTo("battle", lines.join("\n"))
  }

  return (
    <LightScrollArea
      className="flex-1"
      viewportClassName="px-4 pb-12 pt-5 sm:px-6 sm:pb-14 sm:pt-6 lg:px-10 lg:pb-16 lg:pt-7"
    >
      <div className="mx-auto grid w-full min-w-0 max-w-[1400px] gap-8 xl:grid-cols-[minmax(320px,0.95fr)_minmax(0,1.05fr)]">
        {/* Sliders panel */}
        <section className="border border-[var(--rule)] bg-[var(--paper)] p-5">
          <div className="flex items-start justify-between gap-4 border-b border-[var(--rule)] pb-4">
            <div>
              <div
                className="text-[10px] uppercase tracking-[0.14em] text-[var(--ink-3)]"
                style={{ fontFamily: MONO_FONT }}
              >
                Dimension weights
              </div>
              <h3
                className="mt-1 text-[22px] font-black tracking-[-0.04em] text-[var(--ink)]"
                style={{ fontFamily: DISPLAY_FONT }}
              >
                Build your own persona
              </h3>
              <p
                className="mt-1 text-[12px] italic text-[var(--ink-3)]"
                style={{ fontFamily: SERIF_FONT }}
              >
                {personaActive
                  ? `Preset: ${personaActive.label}${personaActive.sub ? ` · ${personaActive.sub}` : ""}`
                  : hasOverrides
                  ? "Custom weights — share via permalink to reproduce."
                  : "Neutral baseline — mover qualquer slider altera URL."}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={copyPermalink}
                disabled={!hasOverrides}
                className={cn(
                  "inline-flex items-center gap-1.5 border border-[var(--rule)] px-3 py-2 text-[10px] uppercase tracking-[0.12em] transition-colors",
                  hasOverrides
                    ? "text-[var(--ink)] hover:bg-[var(--paper-alt)]"
                    : "cursor-not-allowed text-[var(--ink-dim)]",
                )}
                style={{ fontFamily: MONO_FONT }}
                title={hasOverrides ? "Copia URL desta decisão" : "Mexa um slider ou persona para ativar"}
              >
                {copied === "link" ? <Check size={12} /> : <Link2 size={12} />}
                {copied === "link" ? "Copiado" : "Permalink"}
              </button>
              <button
                type="button"
                onClick={copyBattleCard}
                className="inline-flex items-center gap-1.5 border border-[var(--rule)] px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-[var(--ink-2)] transition-colors hover:bg-[var(--paper-alt)] hover:text-[var(--ink)]"
                style={{ fontFamily: MONO_FONT }}
                title="Copia battle-card resumido em Markdown"
              >
                {copied === "battle" ? <Check size={12} /> : <Copy size={12} />}
                {copied === "battle" ? "Copiado" : "Battle card"}
              </button>
              <button
                type="button"
                onClick={resetAll}
                disabled={!hasOverrides}
                className={cn(
                  "inline-flex items-center gap-1.5 border border-[var(--rule)] px-3 py-2 text-[10px] uppercase tracking-[0.12em] transition-colors",
                  hasOverrides
                    ? "text-[var(--ink-3)] hover:text-[var(--ink)]"
                    : "cursor-not-allowed text-[var(--ink-dim)]",
                )}
                style={{ fontFamily: MONO_FONT }}
                title="Remove todos os ajustes da URL"
              >
                <RotateCcw size={12} />
                Reset
              </button>
            </div>
          </div>

          {personas.some((p) => p.weights && p.weights.length > 0) && (
            <div className="mt-4 flex flex-wrap gap-2 border-b border-[var(--rule)] pb-4">
              {personas
                .filter((p) => p.weights && p.weights.length > 0)
                .map((persona) => {
                  const active = personaActive?.id === persona.id
                  return (
                    <button
                      key={persona.id}
                      type="button"
                      onClick={() => setPersona(active ? null : persona.id)}
                      className={cn(
                        "inline-flex flex-col items-start gap-0.5 border px-3 py-2 text-[10px] uppercase tracking-[0.1em] transition-colors",
                        active
                          ? "border-[var(--lime-ink)] bg-[var(--lime-ink)]/10 text-[var(--ink)]"
                          : "border-[var(--rule)] bg-[var(--paper-alt)] text-[var(--ink-3)] hover:bg-[var(--paper-deep)] hover:text-[var(--ink)]",
                      )}
                      style={{ fontFamily: MONO_FONT }}
                      title={persona.job || persona.label}
                    >
                      <span className="font-bold leading-none">{persona.label}</span>
                      {persona.sub && (
                        <span className="text-[8px] tracking-[0.06em] text-[var(--ink-3)]">
                          {persona.sub}
                        </span>
                      )}
                    </button>
                  )
                })}
            </div>
          )}

          <div className="mt-4 space-y-4">
            {groupedRows.map((group) => {
              const collapsed = collapsedGroups.has(group.key)
              const sumPct = Math.round(groupWeightSum(group.rows))
              return (
                <div key={group.key} className="border border-[var(--rule-soft)] bg-[var(--paper-alt)]">
                  <button
                    type="button"
                    onClick={() =>
                      setCollapsedGroups((prev) => {
                        const next = new Set(prev)
                        if (next.has(group.key)) next.delete(group.key)
                        else next.add(group.key)
                        return next
                      })
                    }
                    className="grid w-full grid-cols-[1fr_auto] items-baseline gap-3 border-b border-[var(--rule-soft)] px-3 py-2 text-left transition-colors hover:bg-[var(--paper)]"
                  >
                    <span
                      className="truncate text-[11px] font-bold uppercase tracking-[0.13em] text-[var(--ink)]"
                      style={{ fontFamily: MONO_FONT }}
                    >
                      <span className="mr-2 text-[var(--ink-3)]">{collapsed ? "+" : "−"}</span>
                      {group.label}
                      <span className="ml-2 text-[var(--ink-dim)]">· {group.rows.length} dim</span>
                    </span>
                    <span
                      className="text-[12px] font-black text-[var(--lime-ink)]"
                      style={{ fontFamily: DISPLAY_FONT }}
                    >
                      Σ {sumPct}
                    </span>
                  </button>
                  {!collapsed && (
                    <div className="space-y-2.5 px-3 py-3">
                      {group.rows.map((row) => {
                        const value = weights[row.id] ?? 0
                        const baseline = baselineWeights[row.id] ?? 0
                        return (
                          <WeightSlider
                            key={row.id}
                            id={row.id}
                            label={row.label}
                            value={value}
                            baseline={baseline}
                            onChange={(v) => setWeight(row.id, v)}
                          />
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* Live leaderboard */}
        <section>
          <div className="grid gap-px border border-[var(--rule)] bg-[var(--rule)]">
            <div className="grid gap-3 bg-[var(--paper)] px-5 py-4 sm:grid-cols-[1fr_auto]">
              <div>
                <div
                  className="text-[10px] uppercase tracking-[0.14em] text-[var(--ink-3)]"
                  style={{ fontFamily: MONO_FONT }}
                >
                  Live leaderboard
                </div>
                <div
                  className="mt-1 text-[13px] italic text-[var(--ink-3)]"
                  style={{ fontFamily: SERIF_FONT }}
                >
                  Σ pesos {totalWeight} · {visiblePlayers.size} players visíveis
                </div>
              </div>
              <div
                className="text-left text-[24px] font-black tracking-[-0.05em] text-[var(--ink)] sm:text-right"
                style={{ fontFamily: DISPLAY_FONT }}
              >
                {ranking[0] ? displayName(ranking[0].player) : "—"}
              </div>
            </div>
            {ranking.map((item, index) => {
              const previous = previousRank.get(item.player)
              const delta = previous !== undefined ? previous - item.rank : 0
              return (
                <div
                  key={item.player}
                  className="grid grid-cols-[34px_minmax(0,1fr)_64px] items-center gap-3 bg-[var(--paper-alt)] px-4 py-4 sm:grid-cols-[44px_minmax(0,1fr)_72px] sm:gap-4 sm:px-5"
                >
                  <div
                    className={cn(
                      "text-[20px] font-black tracking-[-0.05em] sm:text-[23px] lg:text-[26px]",
                      index === 0 ? "text-[var(--ink)]" : "text-[var(--ink-dim)]",
                    )}
                    style={{ fontFamily: DISPLAY_FONT }}
                  >
                    {item.rank}
                  </div>
                  <div className="min-w-0">
                    <div className="mb-2 flex items-center gap-2">
                      <span
                        className="h-[10px] w-[10px]"
                        style={{ background: colorOf(item.player, matrix.players.indexOf(item.player)) }}
                      />
                      <span
                        className="truncate text-[14px] font-black text-[var(--ink)]"
                        style={{ fontFamily: SANS_FONT }}
                      >
                        {displayName(item.player)}
                      </span>
                      {delta !== 0 && (
                        <span
                          className={cn(
                            "ml-1 inline-flex items-center text-[10px] tabular-nums",
                            delta > 0 ? "text-[var(--lime-ink)]" : "text-[var(--warning-ink)]",
                          )}
                          style={{ fontFamily: MONO_FONT }}
                          title={`Mudou ${Math.abs(delta)} posição(ões) ${delta > 0 ? "para cima" : "para baixo"}`}
                        >
                          {delta > 0 ? "▲" : "▼"}
                          {Math.abs(delta)}
                        </span>
                      )}
                    </div>
                    <div className="h-1.5 bg-[var(--paper-deep)]">
                      <div
                        className={cn(
                          "h-full",
                          index === 0 ? "bg-[var(--lime-ink)]" : "bg-[var(--ink-dim)]",
                        )}
                        style={{ width: `${Math.max(2, (item.score / maxScore) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div
                    className="text-right text-[20px] font-black tabular-nums tracking-[-0.04em] text-[var(--ink)]"
                    style={{ fontFamily: DISPLAY_FONT }}
                  >
                    {item.score.toFixed(1)}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </LightScrollArea>
  )
}

const PALETTE = ["#7C9F3F", "#4F7CAC", "#C97A4A", "#8B6FB0", "#10B981", "#3B82F6", "#8B5CF6"]

type GroupedRowBucket = { key: string; label: string; rows: ObservatoryMatrixRow[] }

function groupRowsByGroup(rows: ObservatoryMatrixRow[]): GroupedRowBucket[] {
  /* Buckets preserve first-appearance order so the UI matches the rubric's
     intent (Architecture Absorption first, etc). Rows with no `group` fall
     into a synthetic "Outros" bucket so they remain reachable. */
  const order: string[] = []
  const map = new Map<string, GroupedRowBucket>()
  for (const row of rows) {
    const rawLabel = (row.group ?? "Outros").trim() || "Outros"
    const key = rawLabel.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "outros"
    if (!map.has(key)) {
      order.push(key)
      map.set(key, { key, label: rawLabel, rows: [] })
    }
    map.get(key)!.rows.push(row)
  }
  return order.map((key) => map.get(key)!).filter(Boolean)
}
