"use client"

import { Check, List, MessageSquarePlus, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { OBSERVATORY_SOURCES, type ObservatorySource } from "../foundations/constants"
import { DISPLAY_FONT, MONO_FONT, SERIF_FONT } from "../foundations/theme"

/* Organism — header em 2 linhas (top: brand+source toggle+actions, bottom: ticker integrado).
 * Source-agnostic: title and CTA labels come from props. */
export function Topbar({
  source,
  brandLabel,
  newActionLabel,
  selectedSlug,
  selectedTitle,
  selectedDate,
  selectedSchema,
  onChangeSource,
  onCopyNew,
  onCopyDeepen,
  onList,
  copiedNew = false,
  copiedDeepen = false,
}: {
  source: ObservatorySource
  brandLabel: string                       // e.g. "Research" or "Bench"
  newActionLabel: string                   // e.g. "Nova Pesquisa" / "Novo Benchmark"
  selectedSlug: string
  selectedTitle: string
  selectedDate: string
  selectedSchema: string
  onChangeSource: (next: ObservatorySource) => void
  onCopyNew: () => void
  onCopyDeepen: () => void
  onList: () => void
  copiedNew?: boolean
  copiedDeepen?: boolean
}) {
  return (
    <header className="border-b border-[var(--rule)]">
      {/* Top row — brand + actions. Flex-wrap so action nav drops below brand
          on tablet/mobile; brand stays single-line via truncate. */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex min-w-0 items-baseline gap-2 overflow-hidden sm:gap-3">
          <h1
            className="truncate text-[22px] font-black uppercase leading-none tracking-[-0.04em] text-[var(--ink)] sm:text-[28px]"
            style={{ fontFamily: DISPLAY_FONT }}
          >
            {brandLabel}
          </h1>
          <span
            className="hidden truncate text-[18px] italic leading-none text-[var(--ink-3)] sm:inline sm:text-[22px]"
            style={{ fontFamily: SERIF_FONT }}
          >
            (observatory)
          </span>
        </div>

        <nav className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Source segmented toggle — dynamic across all registered sources */}
          <div
            className="mr-1 grid gap-px border border-[var(--ink-faint)] bg-[var(--ink-faint)] p-px"
            style={{ gridTemplateColumns: `repeat(${OBSERVATORY_SOURCES.length}, minmax(0, 1fr))` }}
          >
            {OBSERVATORY_SOURCES.map(([key, label]) => {
              const active = key === source
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => !active && onChangeSource(key)}
                  className={cn(
                    "h-8 px-2.5 text-[10px] uppercase tracking-[0.12em] transition-colors sm:h-9 sm:px-3",
                    active
                      ? "bg-[var(--paper)] text-[var(--ink)]"
                      : "bg-[var(--paper-alt)] text-[var(--ink-3)] hover:bg-[var(--paper)] hover:text-[var(--ink)]",
                  )}
                  style={{ fontFamily: MONO_FONT }}
                >
                  {label}
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={onCopyNew}
            title={`Copiar comando CLI: ${newActionLabel}`}
            className={cn(
              "inline-flex h-9 items-center gap-2 whitespace-nowrap border px-3 text-[11px] uppercase tracking-[0.08em] transition-colors sm:h-10 sm:px-4",
              copiedNew
                ? "border-[var(--lime-ink)] bg-[var(--paper)] text-[var(--lime-ink)]"
                : "border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)] hover:bg-[var(--paper)] hover:text-[var(--ink)]",
            )}
            style={{ fontFamily: MONO_FONT }}
          >
            {copiedNew ? <Check size={14} strokeWidth={1.75} /> : <Plus size={14} strokeWidth={1.75} />}
            <span className="hidden md:inline">{copiedNew ? "Copiado" : newActionLabel}</span>
          </button>

          <button
            type="button"
            onClick={onCopyDeepen}
            title="Copia um comando CLI para aprofundar o item selecionado"
            className={cn(
              "inline-flex h-9 items-center gap-2 whitespace-nowrap border px-3 text-[11px] uppercase tracking-[0.08em] transition-colors sm:h-10 sm:px-4",
              copiedDeepen
                ? "border-[var(--lime-ink)] bg-[var(--paper)] text-[var(--lime-ink)]"
                : "border-[var(--ink-faint)] bg-[var(--paper-alt)] text-[var(--ink)] hover:border-[var(--ink)]",
            )}
            style={{ fontFamily: MONO_FONT }}
          >
            {copiedDeepen ? <Check size={14} strokeWidth={1.75} /> : <MessageSquarePlus size={14} strokeWidth={1.75} />}
            <span className="hidden md:inline">{copiedDeepen ? "Copiado" : "Aprofundar"}</span>
          </button>

          <button
            type="button"
            onClick={onList}
            title="Listar"
            className="inline-flex h-9 items-center gap-2 whitespace-nowrap border border-[var(--ink-faint)] bg-transparent px-3 text-[11px] uppercase tracking-[0.08em] text-[var(--ink)] transition-colors hover:border-[var(--ink)] hover:bg-[var(--paper-alt)] sm:h-10 sm:px-4"
            style={{ fontFamily: MONO_FONT }}
          >
            <List size={14} strokeWidth={1.75} />
            <span className="hidden md:inline">Listar</span>
          </button>
        </nav>
      </div>

      {/* Bottom row — ticker integrado. Hides secondary tokens on narrow
          viewports so the selected-title pulse always reads. */}
      <div
        className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[var(--rule)] px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-[var(--ink-dim)] sm:gap-x-5 sm:px-6"
        style={{ fontFamily: MONO_FONT }}
      >
        <span className="flex min-w-0 items-center gap-2 text-[var(--ink)]">
          <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-[var(--lime-ink)] [animation:cleanPulse_2.2s_ease-out_infinite]" />
          <span className="truncate">Selecionado · {selectedTitle}</span>
        </span>
        <span className="hidden text-[var(--ink-faint)] sm:inline">/</span>
        <span className="hidden truncate sm:inline">
          slug · <strong className="font-medium text-[var(--ink)]">{selectedSlug}</strong>
        </span>
        <span className="hidden text-[var(--ink-faint)] md:inline">/</span>
        <span className="hidden md:inline">
          schema · <strong className="font-medium text-[var(--ink)]">{selectedSchema}</strong>
        </span>
        <span className="ml-auto shrink-0">{selectedDate}</span>
      </div>
    </header>
  )
}
