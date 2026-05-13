"use client"

import { useEffect, useMemo, useState } from "react"
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

/* Organism — Weights view (Reader mode = "weights").
 * Interactive weight simulator with live leaderboard + closest-persona detection. */
export function WeightsView({
  matrix,
  personas,
  playerProfiles,
}: {
  matrix: ObservatoryMatrix
  personas: ObservatoryPersona[]
  playerProfiles: ObservatoryPlayerProfile[]
}) {
  const matrixSignature = matrix.rows.map((r) => `${r.id}:${r.weight}`).join("|")
  const defaultWeights = useMemo(
    () => weightsFromMatrix(matrix),
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
    [matrixSignature],
  )
  const [weights, setWeights] = useState<Record<string, number>>(() => defaultWeights)

  useEffect(() => {
    setWeights(defaultWeights)
  }, [defaultWeights])

  const totalWeight = matrix.rows.reduce((sum, row) => sum + (weights[row.id] ?? 0), 0)

  const ranking = useMemo(() => {
    return matrix.players
      .map((player) => ({ player, score: weightedScore(matrix, player, weights) }))
      .sort((a, b) => b.score - a.score)
  }, [matrix, weights])

  const maxScore = Math.max(1, ...ranking.map((r) => r.score))
  const closest = closestPersona(weights, matrix.rows, personas)

  const profileByKey = new Map(playerProfiles.map((p) => [p.key, p]))
  const colorOf = (key: string, idx: number) =>
    profileByKey.get(key)?.color || PALETTE[idx % PALETTE.length]

  function applyPersona(persona: ObservatoryPersona) {
    if (!persona.weights || persona.weights.length === 0) return
    setWeights(
      Object.fromEntries(matrix.rows.map((row, i) => [row.id, persona.weights[i] ?? 0])),
    )
  }

  return (
    <LightScrollArea className="flex-1" viewportClassName="px-4 pb-12 pt-5 sm:px-6 sm:pb-14 sm:pt-6 lg:px-10 lg:pb-16 lg:pt-7">
      <div className="mx-auto grid max-w-[1400px] gap-8 xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)]">
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
            </div>
            <button
              type="button"
              onClick={() => setWeights(defaultWeights)}
              className="border border-[var(--rule)] px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-[var(--ink-3)] transition-colors hover:text-[var(--ink)]"
              style={{ fontFamily: MONO_FONT }}
            >
              Reset
            </button>
          </div>

          {personas.some((p) => p.weights && p.weights.length > 0) && (
            <div className="mt-4 flex flex-wrap gap-2 border-b border-[var(--rule)] pb-4">
              {personas
                .filter((p) => p.weights && p.weights.length > 0)
                .map((persona) => (
                  <button
                    key={persona.id}
                    type="button"
                    onClick={() => applyPersona(persona)}
                    className="border border-[var(--rule)] bg-[var(--paper-alt)] px-3 py-2 text-[10px] uppercase tracking-[0.1em] text-[var(--ink-3)] transition-colors hover:bg-[var(--paper-deep)] hover:text-[var(--ink)]"
                    style={{ fontFamily: MONO_FONT }}
                  >
                    {persona.label}
                  </button>
                ))}
            </div>
          )}

          <div className="mt-4 space-y-3">
            {matrix.rows.map((row) => {
              const value = weights[row.id] ?? 0
              const baseline = defaultWeights[row.id] ?? 0
              return (
                <WeightSlider
                  key={row.id}
                  id={row.id}
                  label={row.label}
                  value={value}
                  baseline={baseline}
                  onChange={(v) => setWeights((current) => ({ ...current, [row.id]: v }))}
                />
              )
            })}
          </div>
        </section>

        {/* Live leaderboard */}
        <section>
          <div className="grid gap-px border border-[var(--rule)] bg-[var(--rule)]">
            <div className="grid grid-cols-[1fr_auto] bg-[var(--paper)] px-5 py-4">
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
                  Σ weights {totalWeight} · closest preset: {closest}
                </div>
              </div>
              <div
                className="text-right text-[24px] font-black tracking-[-0.05em] text-[var(--ink)]"
                style={{ fontFamily: DISPLAY_FONT }}
              >
                {ranking[0] ? profileByKey.get(ranking[0].player)?.name ?? ranking[0].player : "—"}
              </div>
            </div>
            {ranking.map((item, index) => (
              <div
                key={item.player}
                className="grid grid-cols-[44px_minmax(0,1fr)_72px] items-center gap-4 bg-[var(--paper-alt)] px-5 py-4"
              >
                <div
                  className={cn(
                    "text-[20px] font-black tracking-[-0.05em] sm:text-[23px] lg:text-[26px]",
                    index === 0 ? "text-[var(--ink)]" : "text-[var(--ink-dim)]",
                  )}
                  style={{ fontFamily: DISPLAY_FONT }}
                >
                  {index + 1}
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
                      {profileByKey.get(item.player)?.name ?? item.player}
                    </span>
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
                  className="text-right text-[20px] font-black tracking-[-0.04em] text-[var(--ink)]"
                  style={{ fontFamily: DISPLAY_FONT }}
                >
                  {item.score.toFixed(1)}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </LightScrollArea>
  )
}

const PALETTE = ["#7C9F3F", "#4F7CAC", "#C97A4A", "#8B6FB0", "#10B981", "#3B82F6", "#8B5CF6"]

function weightsFromMatrix(matrix: ObservatoryMatrix): Record<string, number> {
  return Object.fromEntries(
    matrix.rows.map((row) => [row.id, Math.round((Number(row.weight) || 0) * 100)]),
  )
}

function weightedScore(
  matrix: ObservatoryMatrix,
  player: string,
  weights: Record<string, number>,
): number {
  let sum = 0
  let total = 0
  for (const row of matrix.rows) {
    const weight = weights[row.id] ?? 0
    const cell = row.cells.find((c) => c.player === player)
    if (!cell || weight <= 0) continue
    sum += cell.score * weight
    total += weight
  }
  return total > 0 ? sum / total : 0
}

function closestPersona(
  weights: Record<string, number>,
  rows: ObservatoryMatrixRow[],
  personas: ObservatoryPersona[],
): string {
  const entries = rows.map((row) => weights[row.id] ?? 0)
  const total = entries.reduce((sum, value) => sum + value, 0) || 1
  const normalized = entries.map((v) => v / total)

  const baseline = rows.map((row) => Math.round((Number(row.weight) || 0) * 100))
  const baselineTotal = baseline.reduce((s, v) => s + v, 0) || 1
  const baselineNorm = baseline.map((v) => v / baselineTotal)

  let bestLabel = "Neutral baseline"
  let bestDistance = Math.sqrt(
    normalized.reduce((acc, v, i) => acc + (v - baselineNorm[i]) ** 2, 0),
  )

  for (const persona of personas) {
    if (!persona.weights || persona.weights.length === 0) continue
    const pTotal = persona.weights.reduce((s, v) => s + v, 0) || 1
    const pNorm = persona.weights.map((v) => v / pTotal)
    const d = Math.sqrt(normalized.reduce((acc, v, i) => acc + (v - (pNorm[i] ?? 0)) ** 2, 0))
    if (d < bestDistance) {
      bestDistance = d
      bestLabel = persona.sub ? `${persona.label} · ${persona.sub}` : persona.label
    }
  }

  return bestLabel
}
