import { type RefObject } from "react"
import { LineChart, Search } from "lucide-react"
import { cn } from "@/lib/utils"
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
import { MONO_FONT, SANS_FONT, observatoryDarkThemeVars } from "../foundations/theme"
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

  const filterButtons = [
    {
      label: SORTS.find((s) => s[0] === sort)?.[1] ?? sort,
      onCycle: onCycleSort,
      active: sort !== "recent",
    },
    {
      label: STATUSES.find((s) => s[0] === statusF)?.[1] ?? statusF,
      onCycle: onCycleStatus,
      active: statusF !== "all",
    },
    {
      label: GROUPS.find((g) => g[0] === group)?.[1] ?? group,
      onCycle: onCycleGroup,
      active: group !== "category",
    },
    ...(onCycleQuality
      ? [
          {
            label: QUALITIES.find((q) => q[0] === quality)?.[1] ?? quality,
            onCycle: onCycleQuality,
            active: quality !== "all",
          },
        ]
      : []),
  ]

  return (
    <aside
      className="flex h-full min-h-0 flex-col overflow-hidden border-r border-[var(--rule-soft)] bg-[var(--paper-panel)]"
      style={observatoryDarkThemeVars}
    >
      <div className="border-b border-[var(--rule-soft)] bg-[var(--paper-panel)] px-4 pb-3 pt-3">
        {/* Linha 1: Search ocupa tudo. Count + visíveis ficam embutidos
           ao lado do shortcut como meta secundária. Mais compacto que ter
           contagem em linha separada. */}
        <label className="group flex h-9 cursor-text items-center gap-2 border border-[var(--rule)] bg-[var(--paper)] px-2.5 transition-colors focus-within:border-[var(--lime-ink)]/60 hover:border-[var(--rule-strong)]">
          <Search size={13} strokeWidth={1.75} className="shrink-0 text-[var(--ink-3)] group-focus-within:text-[var(--lime-ink)]" />
          <input
            id="observatory-search-input"
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Buscar runs…"
            className="min-w-0 flex-1 bg-transparent text-[13px] tracking-[0.01em] text-[var(--ink)] outline-none placeholder:text-[var(--ink-dim)]"
            style={{ fontFamily: SANS_FONT }}
          />
          <span
            className="shrink-0 text-[9.5px] tracking-[0.16em] text-[var(--ink-dim)]"
            style={{ fontFamily: MONO_FONT }}
          >
            {visibleRuns.length !== totalRuns ? `${visibleRuns.length}/${totalRuns}` : totalRuns}
          </span>
          <span
            className="shrink-0 border border-[var(--ink-faint)] px-1 py-0.5 text-[9px] tracking-[0.08em] text-[var(--ink-dim)]"
            style={{ fontFamily: MONO_FONT }}
          >
            ⌘K
          </span>
        </label>

        {/* Linha 2: Filter chips horizontais. Cada um mostra label + value
           atual ("Sort: recente" / "Cat: todas") com prefix mono no value
           ativo lime. Cycle inline, sem precisar abrir popover. */}
        <div
          className="mt-2 flex flex-wrap gap-1"
          style={{ fontFamily: MONO_FONT }}
        >
          {filterButtons.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={item.onCycle}
              className={cn(
                "inline-flex h-6 min-w-0 items-center gap-1 border px-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] transition-colors",
                item.active
                  ? "border-[var(--lime-ink)]/60 bg-[var(--lime-ink)]/10 text-[var(--lime-ink)]"
                  : "border-[var(--rule-soft)] bg-transparent text-[var(--ink-dim)] hover:border-[var(--rule)] hover:text-[var(--ink-2)]",
              )}
              title={`Trocar (clique para próximo): ${item.label}`}
            >
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Linha 3 (opcional): Visão geral compacta. Só renderiza quando
           handler existe. Botão slim em vez do bloco grande anterior. */}
        {onToggleOverview && (
          <button
            type="button"
            onClick={onToggleOverview}
            className={cn(
              "mt-2 inline-flex h-7 w-full items-center gap-2 border px-2 transition-colors",
              overviewActive
                ? "border-[var(--lime-ink)] bg-[var(--lime-ink)]/10 text-[var(--lime-ink)]"
                : "border-[var(--rule)] bg-transparent text-[var(--ink-3)] hover:border-[var(--rule-strong)] hover:text-[var(--ink-2)]",
            )}
            style={{ fontFamily: MONO_FONT }}
          >
            <LineChart size={12} strokeWidth={1.75} />
            <span className="text-[10px] uppercase tracking-[0.14em]">Visão geral</span>
            <span className="ml-auto text-[9px] tracking-[0.1em] text-[var(--ink-dim)]">
              {overviewCutsCount} cortes
            </span>
            <span className="text-[12px] opacity-70">›</span>
          </button>
        )}
      </div>

      <LightScrollArea ref={listRef} className="min-h-0 flex-1" fadeColor="var(--paper-panel)">
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
                      className="sticky top-0 z-[3] flex items-baseline justify-between border-b border-[var(--rule-soft)] bg-[var(--paper-panel)] px-5 pb-2 pt-4 text-[9.5px] uppercase tracking-[0.22em] text-[var(--ink-3)] first:pt-4"
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
                      categoryTag={
                        Array.isArray(r.extras?.subjects)
                          ? categoryLabels.get(r.category ?? "") ?? r.category ?? undefined
                          : undefined
                      }
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
