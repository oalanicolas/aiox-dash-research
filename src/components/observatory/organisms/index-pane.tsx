import { type RefObject } from "react"
import { LineChart, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { ChipCycler } from "../molecules/chip-cycler"
import { LightScrollArea } from "../molecules/light-scroll-area"
import { RunRow } from "../molecules/run-row"
import {
  GROUPS,
  type GroupKey,
  QUALITIES,
  type QualityKey,
  SORTS,
  type SortKey,
  STATUSES,
  STATUS_LABEL_PLURAL,
  type StatusKey,
} from "../foundations/constants"
import { MONO_FONT, SANS_FONT } from "../foundations/theme"
import type { ObservatoryRunSummary } from "../foundations/types"

/* Organism — coluna esquerda (head + overview button + list).
 * Compõe: search atom, OverviewButton, 3× ChipCycler, group head, RunRow[]. */
export function IndexPane({
  sourceLabel = "Research",
  totalRuns,
  query,
  onQueryChange,
  sort,
  statusF,
  group,
  onCycleSort,
  onCycleStatus,
  onCycleGroup,
  quality = "all",
  onCycleQuality,
  visibleRuns,
  groupedRuns,
  selectedSlug,
  onSelectRun,
  listRef,
  overviewActive = false,
  onToggleOverview,
  overviewCutsCount = 8,
  categoryLabels,
}: {
  sourceLabel?: string
  totalRuns: number
  query: string
  onQueryChange: (q: string) => void
  sort: SortKey
  statusF: StatusKey
  group: GroupKey
  onCycleSort: () => void
  onCycleStatus: () => void
  onCycleGroup: () => void
  quality?: QualityKey
  onCycleQuality?: () => void
  visibleRuns: ObservatoryRunSummary[]
  groupedRuns: Array<[string, ObservatoryRunSummary[]]>
  selectedSlug: string
  onSelectRun: (slug: string) => void
  listRef: RefObject<HTMLDivElement | null>
  overviewActive?: boolean
  onToggleOverview?: () => void
  overviewCutsCount?: number
  categoryLabels: Map<string, string>
}) {
  function groupLabel(key: string): string {
    if (group === "status") return STATUS_LABEL_PLURAL[key as StatusKey] ?? key
    if (group === "category") return categoryLabels.get(key) ?? key
    return key
  }

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden border-r border-[var(--rule)]">
      <div className="border-b border-[var(--rule)] bg-[var(--paper)] px-5 pb-3 pl-5 pr-12 pt-4">
        <div className="mb-3 flex items-baseline justify-between gap-3.5">
          <span
            className="flex min-w-0 items-baseline gap-2.5 truncate text-[10.5px] uppercase tracking-[0.14em] text-[var(--ink-3)]"
            style={{ fontFamily: MONO_FONT }}
          >
            <span className="shrink-0">Index</span>
            <span className="shrink-0 text-[var(--ink-faint)]">·</span>
            <span
              className="truncate text-[10.5px] uppercase tracking-[0.14em] text-[var(--ink-dim)]"
            >
              {sourceLabel} runs
            </span>
          </span>
          <span
            className="shrink-0 whitespace-nowrap text-[11px] tracking-[0.04em] text-[var(--ink-3)]"
            style={{ fontFamily: MONO_FONT }}
          >
            <strong className="font-semibold text-[var(--ink)]">{totalRuns}</strong> total
          </span>
        </div>

        <label className="flex h-[var(--dash-control-h)] cursor-text items-center gap-2.5 border border-[var(--rule)] bg-[var(--paper-alt)] px-2.5">
          <Search size={14} strokeWidth={1.75} className="text-[var(--ink-3)]" />
          <input
            id="observatory-search-input"
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Buscar por slug, título, schema…"
            className="min-w-0 flex-1 bg-transparent text-[13px] tracking-[0.01em] text-[var(--ink)] outline-none placeholder:text-[var(--ink-dim)]"
            style={{ fontFamily: SANS_FONT }}
          />
          <span
            className="border border-[var(--ink-faint)] px-1.5 py-0.5 text-[10px] tracking-[0.1em] text-[var(--ink-dim)]"
            style={{ fontFamily: MONO_FONT }}
          >
            ⌘ K
          </span>
        </label>

        {onToggleOverview && (
          <button
            type="button"
            onClick={onToggleOverview}
            className={cn(
              "mt-2.5 grid w-full grid-cols-[auto_1fr_auto_auto] items-center gap-2 border px-3 py-2.5 transition-colors",
              overviewActive
                ? "border-[var(--ink-faint)] bg-[var(--paper-alt)] text-[var(--ink)]"
                : "border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)] hover:bg-[var(--paper-alt)] hover:text-[var(--ink)]",
            )}
            style={{ fontFamily: MONO_FONT }}
          >
            <LineChart size={13} strokeWidth={1.75} />
            <span className="text-left text-[11px] uppercase tracking-[0.12em]">Visão geral</span>
            <span
              className={cn(
                "text-[10px] uppercase tracking-[0.1em]",
                overviewActive ? "text-[var(--ink-dim)]" : "text-[rgba(245,244,231,0.65)]",
              )}
            >
              {overviewCutsCount} cortes
            </span>
            <span className="text-[14px] opacity-80">›</span>
          </button>
        )}

        <div
          className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[9.5px] uppercase tracking-[0.1em] text-[var(--ink-dim)]"
          style={{ fontFamily: MONO_FONT }}
        >
          <ChipCycler label={SORTS.find((s) => s[0] === sort)?.[1] ?? sort} prefix="↓" onCycle={onCycleSort} />
          <span className="text-[var(--ink-faint)]">·</span>
          <ChipCycler label={STATUSES.find((s) => s[0] === statusF)?.[1] ?? statusF} onCycle={onCycleStatus} />
          <span className="text-[var(--ink-faint)]">·</span>
          <ChipCycler label={GROUPS.find((g) => g[0] === group)?.[1] ?? group} onCycle={onCycleGroup} />
          {onCycleQuality && (
            <>
              <span className="text-[var(--ink-faint)]">·</span>
              <ChipCycler
                label={QUALITIES.find((q) => q[0] === quality)?.[1] ?? quality}
                onCycle={onCycleQuality}
              />
            </>
          )}
        </div>
      </div>

      <LightScrollArea ref={listRef} className="min-h-0 flex-1">
        <div className="relative pb-12">
          {visibleRuns.length === 0 ? (
            <div className="px-5 py-6 text-[13px] text-[var(--ink-3)]" style={{ fontFamily: SANS_FONT }}>
              Nada encontrado.
            </div>
          ) : (
            <ol className="m-0 list-none p-0">
              {groupedRuns.map(([groupKey, items], gIdx) => (
                <li key={`${groupKey}-${gIdx}`} className="contents">
                  {group !== "none" && (
                    <div
                      className="sticky top-0 z-[3] flex items-baseline justify-between border-b border-[var(--rule)] bg-[var(--paper)] px-5 pb-2 pt-4 text-[10px] uppercase tracking-[0.18em] text-[var(--ink-3)] first:pt-2"
                      style={{ fontFamily: MONO_FONT }}
                    >
                      <span>{groupLabel(groupKey)}</span>
                      <span className="text-[var(--ink-dim)]">{items.length}</span>
                    </div>
                  )}
                  {items.map((r) => (
                    <RunRow
                      key={r.slug}
                      slug={r.slug}
                      num={visibleRuns.findIndex((x) => x.slug === r.slug) + 1}
                      displayTitle={r.displayTitle}
                      files={r.files}
                      date={r.date}
                      coverage={r.coverage}
                      status={r.status}
                      coverageInferred={r.inferred?.coverage_score}
                      subjects={
                        Array.isArray(r.extras?.subjects)
                          ? (r.extras?.subjects as string[]).filter((s) => typeof s === "string" && s.length > 0)
                          : undefined
                      }
                      isActive={r.slug === selectedSlug}
                      onSelect={() => onSelectRun(r.slug)}
                    />
                  ))}
                </li>
              ))}
            </ol>
          )}
        </div>
      </LightScrollArea>
    </aside>
  )
}
