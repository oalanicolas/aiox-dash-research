"use client"

import { Check, List, MessageSquarePlus, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { OBSERVATORY_SOURCES, type ObservatorySource } from "../foundations/constants"
import { DISPLAY_FONT, MONO_FONT } from "../foundations/theme"

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
    <header className="border-b border-[var(--rule)] bg-[var(--paper)]">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-baseline gap-2 overflow-hidden sm:gap-3">
          <h1
            className="truncate text-[21px] font-black uppercase leading-none tracking-[-0.035em] text-[var(--ink)] sm:text-[26px]"
            style={{ fontFamily: DISPLAY_FONT }}
          >
            AIOX Dash
          </h1>
          <span
            className="hidden truncate text-[10px] uppercase tracking-[0.16em] text-[var(--ink-3)] sm:inline"
            style={{ fontFamily: MONO_FONT }}
          >
            {brandLabel}
          </span>
        </div>

        <nav className="flex w-full max-w-full items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] sm:w-auto sm:flex-wrap sm:justify-end sm:gap-2 sm:overflow-visible sm:pb-0">
          {/* Source segmented toggle — dynamic across all registered sources */}
          <div
            className="mr-1 grid shrink-0 gap-px border border-[var(--rule)] bg-[var(--rule)] p-px"
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
                    "h-[var(--dash-control-h)] whitespace-nowrap px-2.5 text-[10px] uppercase tracking-[0.12em] transition-colors sm:px-3",
                    active
                      ? "bg-[var(--ink)] text-[var(--paper)]"
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
              "inline-flex h-[var(--dash-control-h)] items-center gap-2 whitespace-nowrap border px-3 text-[10.5px] uppercase tracking-[0.1em] transition-colors sm:px-4",
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
              "inline-flex h-[var(--dash-control-h)] items-center gap-2 whitespace-nowrap border px-3 text-[10.5px] uppercase tracking-[0.1em] transition-colors sm:px-4",
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
            className="inline-flex h-[var(--dash-control-h)] items-center gap-2 whitespace-nowrap border border-[var(--ink-faint)] bg-transparent px-3 text-[10.5px] uppercase tracking-[0.1em] text-[var(--ink)] transition-colors hover:border-[var(--ink)] hover:bg-[var(--paper-alt)] sm:px-4"
            style={{ fontFamily: MONO_FONT }}
          >
            <List size={14} strokeWidth={1.75} />
            <span className="hidden md:inline">Listar</span>
          </button>
        </nav>
      </div>

      <div
        className="flex min-h-[32px] flex-wrap items-center gap-x-3 gap-y-1 border-t border-[var(--rule-soft)] px-4 py-1.5 text-[10px] uppercase tracking-[0.14em] text-[var(--ink-dim)] sm:gap-x-5 sm:px-6"
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
