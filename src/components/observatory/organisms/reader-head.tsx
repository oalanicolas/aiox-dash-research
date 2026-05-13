"use client"

import { useState } from "react"
import { Check, Clipboard } from "lucide-react"
import { cn } from "@/lib/utils"
import { Pager } from "../molecules/pager"
import type { ObservatorySource, ReaderMode } from "../foundations/constants"
import { DISPLAY_FONT, MONO_FONT } from "../foundations/theme"
import { formatBytes } from "../foundations/utils"
import type { ObservatoryRunSummary } from "../foundations/types"

const MODE_LABELS: Record<ReaderMode, string> = {
  document: "Doc",
  overview: "Overview",
  map: "Map",
  sources: "Fontes",
  players: "Players",
  score: "Score",
  matrix: "Matrix",
  duel: "Duel",
  personas: "Personas",
  tco: "TCO",
  coverage: "Coverage",
  decision: "Decision",
  weights: "Weights",
  workflow: "Workflow",
  tasks: "Tasks",
  gates: "Gates",
  flow: "Flow",
  automation: "Automation",
  governance: "Governance",
  accountability: "RACI",
  gaps: "Gaps",
  evidence: "Evidence",
}

export function ReaderHead({
  phase,
  runTitle,
  runSlug,
  file,
  bytes,
  sourceRoot,
  fileIdx,
  totalFiles,
  canPrev,
  canNext,
  onPrev,
  onNext,
  onCopy,
  source = "research",
  selectedRun,
  mode = "document",
  availableModes = ["document"],
  onChangeMode,
  benchEyebrow,
}: {
  phase: string
  runTitle: string
  runSlug: string
  file: string
  bytes: number
  sourceRoot: string
  fileIdx: number
  totalFiles: number
  canPrev: boolean
  canNext: boolean
  onPrev: () => void
  onNext: () => void
  onCopy: () => void
  source?: ObservatorySource
  selectedRun?: ObservatoryRunSummary
  mode?: ReaderMode
  availableModes?: ReaderMode[]
  onChangeMode?: (mode: ReaderMode) => void
  benchEyebrow?: { scale: string; subtitle?: string }
}) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    onCopy()
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  const showSwitcher = availableModes.length > 1 && onChangeMode
  const showFileMeta = mode === "document"
  const modeLabel = MODE_LABELS[mode]
  const title = showFileMeta ? file : modeLabel
  const context = source === "bench" && benchEyebrow ? benchEyebrow.scale : selectedRun?.schema || phase
  const path = `${sourceRoot}/${runSlug}/${showFileMeta ? file : "structured-view"}`

  return (
    <div className="shrink-0 border-b border-[var(--rule)] bg-[var(--paper)] px-4 py-3 sm:px-6 lg:px-8">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <div className="min-w-0">
          <div
            className="mb-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[10px] uppercase tracking-[0.14em] text-[var(--ink-3)]"
            style={{ fontFamily: MONO_FONT }}
          >
            <span>{modeLabel}</span>
            <span className="text-[var(--ink-faint)]">·</span>
            <span className="truncate">{context}</span>
            {selectedRun?.coverage && (
              <>
                <span className="text-[var(--ink-faint)]">·</span>
                <span>
                  score <strong className="font-semibold text-[var(--ink)]">{selectedRun.coverage}</strong>
                </span>
              </>
            )}
          </div>

          <h1
            className="m-0 truncate text-[21px] font-black leading-tight tracking-[-0.03em] text-[var(--ink)] sm:text-[24px]"
            style={{ fontFamily: DISPLAY_FONT }}
            title={showFileMeta ? title : runTitle}
          >
            {showFileMeta ? title : runTitle}
          </h1>

          <div
            className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] tracking-[0.06em] text-[var(--ink-3)]"
            style={{ fontFamily: MONO_FONT }}
          >
            <span className="truncate text-[var(--ink-dim)]">{path}</span>
            {showFileMeta && (
              <>
                <span className="text-[var(--ink-faint)]">·</span>
                <span>{formatBytes(bytes)}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap items-center justify-start gap-2 xl:justify-end">
          {showSwitcher && (
            <div className="flex max-w-full gap-px overflow-x-auto border border-[var(--rule)] bg-[var(--rule)] p-px [scrollbar-width:none]">
              {availableModes.map((m, idx) => {
                const active = m === mode
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => !active && onChangeMode?.(m)}
                    className={cn(
                      "h-[var(--dash-control-h)] shrink-0 px-2.5 text-[10px] uppercase tracking-[0.12em] transition-colors",
                      active
                        ? "bg-[var(--ink)] text-[var(--paper)]"
                        : "bg-[var(--paper-alt)] text-[var(--ink-3)] hover:bg-[var(--paper)] hover:text-[var(--ink)]",
                    )}
                    style={{ fontFamily: MONO_FONT }}
                  >
                    <span className={cn("mr-1.5 text-[9px] tabular-nums", active ? "text-[var(--paper)]/55" : "text-[var(--ink-faint)]")}>
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    {MODE_LABELS[m]}
                  </button>
                )
              })}
            </div>
          )}

          {showFileMeta && (
            <>
              <button
                type="button"
                onClick={handleCopy}
                className={cn(
                  "inline-flex h-[var(--dash-control-h)] items-center gap-1.5 border px-2.5 transition-colors",
                  copied
                    ? "border-[var(--lime-ink)] text-[var(--lime-ink)]"
                    : "border-[var(--ink-faint)] text-[var(--ink-3)] hover:border-[var(--ink)] hover:text-[var(--ink)]",
                )}
                title="Copiar conteúdo"
              >
                {copied ? <Check size={13} strokeWidth={1.75} /> : <Clipboard size={13} strokeWidth={1.75} />}
                <span className="text-[10px] uppercase tracking-[0.12em]" style={{ fontFamily: MONO_FONT }}>
                  {copied ? "Copiado" : "Copiar"}
                </span>
              </button>
              <Pager
                index={fileIdx}
                total={totalFiles}
                canPrev={canPrev}
                canNext={canNext}
                onPrev={onPrev}
                onNext={onNext}
                prevTitle="Arquivo anterior (←)"
                nextTitle="Próximo arquivo (→)"
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
