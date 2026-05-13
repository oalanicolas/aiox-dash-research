"use client"

import { useState } from "react"
import { Check, Clipboard } from "lucide-react"
import { cn } from "@/lib/utils"
import { Pager } from "../molecules/pager"
import type { ObservatorySource, ReaderMode } from "../foundations/constants"
import { DISPLAY_FONT, MONO_FONT, SERIF_FONT } from "../foundations/theme"
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

/* Organism — reader header with optional Reader-mode switcher.
 * Mode chips render only when availableModes.length > 1 (i.e., the source
 * has more than markdown to show). */
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
  /* Editorial eyebrow rendered above the bench title (only in bench visual modes).
     `scale` e.g. "4 players × 9 dim", `subtitle` e.g. "consolidated synthesis" */
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
  const benchVisualMode = source === "bench" && mode !== "document"
  const titleForMode =
    mode === "document"
      ? file
      : MODE_LABELS[mode]

  if (!benchVisualMode) {
    return (
      <div className="shrink-0 border-b border-[var(--rule)] px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-[220px] flex-1">
            <div
              className="mb-1 flex min-w-0 items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-[var(--ink-3)]"
              style={{ fontFamily: MONO_FONT }}
            >
              <span>{mode === "document" ? phase : MODE_LABELS[mode]}</span>
              <span className="text-[var(--ink-faint)]">·</span>
              <span className="truncate">{runTitle}</span>
            </div>
            <h1
              className="m-0 truncate text-[20px] font-black leading-tight tracking-[-0.025em] text-[var(--ink)] sm:text-[22px]"
              style={{ fontFamily: DISPLAY_FONT }}
              title={titleForMode}
            >
              {titleForMode}
            </h1>
            <div
              className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] tracking-[0.06em] text-[var(--ink-3)]"
              style={{ fontFamily: MONO_FONT }}
            >
              <span className="truncate text-[var(--ink-dim)]">
                {sourceRoot}/{runSlug}/{mode === "document" ? file : "structured-view"}
              </span>
              {mode === "document" && (
                <>
                  <span className="text-[var(--ink-faint)]">·</span>
                  <span>{formatBytes(bytes)}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {showSwitcher && (
              <div className="flex gap-px border border-[var(--ink-faint)] bg-[var(--ink-faint)] p-px">
                {availableModes.map((m, idx) => {
                  const active = m === mode
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => !active && onChangeMode?.(m)}
                      className={cn(
                        "h-8 px-2.5 text-[10px] uppercase tracking-[0.12em] transition-colors",
                        active
                          ? "bg-[var(--ink)] text-[var(--paper)]"
                          : "bg-[var(--paper-alt)] text-[var(--ink-3)] hover:bg-[var(--paper)] hover:text-[var(--ink)]",
                      )}
                      style={{ fontFamily: MONO_FONT }}
                    >
                      <span
                        className={cn(
                          "mr-1.5 text-[9px] tabular-nums",
                          active ? "text-[var(--paper)]/60" : "text-[var(--ink-faint)]",
                        )}
                      >
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      {MODE_LABELS[m]}
                    </button>
                  )
                })}
              </div>
            )}

            {mode === "document" && (
              <>
                <button
                  type="button"
                  onClick={handleCopy}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 border px-2.5 transition-colors",
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

  return (
    <div className={cn(
      "shrink-0 border-b border-[var(--rule)]",
      benchVisualMode
        ? "px-4 pb-3 pt-3 sm:px-6 lg:px-8"
        : "px-4 pb-3 pt-4 sm:px-6 sm:pb-4 sm:pt-5 lg:px-10",
    )}>
      <div
        className={cn(
          "flex items-baseline justify-between text-[10.5px] uppercase tracking-[0.14em] text-[var(--ink-3)]",
          benchVisualMode ? "mb-2" : "mb-2.5",
        )}
        style={{ fontFamily: MONO_FONT }}
      >
        <span>Bench · {MODE_LABELS[mode]}</span>
        <div className="flex gap-1.5">
          {showSwitcher && (
            <div className="mr-1 flex gap-px border border-[var(--ink-faint)] bg-[var(--ink-faint)] p-px">
              {availableModes.map((m, idx) => {
                const active = m === mode
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => !active && onChangeMode?.(m)}
                    className={cn(
                      "h-8 px-2.5 text-[10px] uppercase tracking-[0.12em] transition-colors",
                      active
                        ? "bg-[var(--paper)] text-[var(--ink)]"
                        : "bg-[var(--paper-alt)] text-[var(--ink-3)] hover:bg-[var(--paper)] hover:text-[var(--ink)]",
                    )}
                    style={{ fontFamily: MONO_FONT }}
                  >
                    <span
                      className={cn(
                        "mr-1.5 text-[9px] tabular-nums",
                        active ? "text-[var(--ink-dim)]" : "text-[var(--ink-faint)]",
                      )}
                    >
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    {MODE_LABELS[m]}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {benchVisualMode ? (
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-5">
          <div className="min-w-0">
            {benchEyebrow && (
              <div
                className="mb-1.5 flex items-baseline gap-2 text-[10px] uppercase tracking-[0.14em] text-[var(--ink-3)]"
                style={{ fontFamily: MONO_FONT }}
              >
                <span>Bench · {benchEyebrow.scale}</span>
                {benchEyebrow.subtitle && (
                  <>
                    <span className="text-[var(--ink-faint)]">·</span>
                    <span
                      className="text-[12px] italic normal-case tracking-[0] text-[var(--ink-dim)]"
                      style={{ fontFamily: SERIF_FONT }}
                    >
                      {benchEyebrow.subtitle}
                    </span>
                  </>
                )}
              </div>
            )}
            <h1
              className="m-0 truncate text-[18px] font-black leading-[1.05] tracking-[-0.035em] text-[var(--ink)] sm:text-[21px] lg:text-[24px]"
              style={{ fontFamily: DISPLAY_FONT }}
              title={runTitle}
            >
              {runTitle}
            </h1>
            <div
              className="mt-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[10px] uppercase tracking-[0.12em] text-[var(--ink-3)]"
              style={{ fontFamily: MONO_FONT }}
            >
              <span className="text-[var(--ink)]">{titleForMode}</span>
              <span className="text-[var(--ink-faint)]">/</span>
              <span>{sourceRoot}/{runSlug}</span>
              {selectedRun?.coverage && (
                <>
                  <span className="text-[var(--ink-faint)]">/</span>
                  <span>score <strong className="text-[var(--ink)]">{selectedRun.coverage}</strong></span>
                </>
              )}
              {selectedRun?.integrity && (
                <>
                  <span className="text-[var(--ink-faint)]">/</span>
                  <span>{selectedRun.integrity}</span>
                </>
              )}
            </div>
          </div>
          {selectedRun && (
            <div
              className="hidden grid-cols-3 gap-px border border-[var(--rule)] bg-[var(--rule)] text-[10px] uppercase tracking-[0.12em] xl:grid"
              style={{ fontFamily: MONO_FONT }}
            >
              {[
                ["files", selectedRun.files],
                ["players", selectedRun.extras?.subjects ? (selectedRun.extras.subjects as unknown[]).length : "—"],
                ["status", selectedRun.status || "—"],
              ].map(([label, value]) => (
                <div key={String(label)} className="min-w-[74px] bg-[var(--paper-alt)] px-3 py-2 text-right">
                  <div className="text-[var(--ink-3)]">{label}</div>
                  <div className="mt-0.5 truncate text-[12px] font-black text-[var(--ink)]">{String(value)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <p
            className="mb-1 text-[16px] italic leading-[1.25] text-[var(--ink-3)] [text-wrap:pretty]"
            style={{ fontFamily: SERIF_FONT }}
          >
            {runTitle}
          </p>

          <h1
            className="m-0 text-[20px] font-black leading-[1.05] tracking-[-0.025em] text-[var(--ink)] sm:text-[23px] lg:text-[26px]"
            style={{ fontFamily: DISPLAY_FONT }}
          >
            {titleForMode}
          </h1>
        </>
      )}

      <div
        className={cn(
          "flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] tracking-[0.06em] text-[var(--ink-3)]",
          benchVisualMode ? "mt-1.5" : "mt-2.5",
        )}
        style={{ fontFamily: MONO_FONT }}
      >
        {showFileMeta ? (
          <>
            <span className="text-[var(--ink-dim)]">
              {sourceRoot}/{runSlug}/<strong className="font-medium text-[var(--ink)]">{file}</strong>
            </span>
            <span className="text-[var(--ink-faint)]">·</span>
            <span>{formatBytes(bytes)}</span>
            <span className="flex-1" />
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
        ) : (
          <span className="text-[var(--ink-dim)]">
            {sourceRoot}/{runSlug}/ · structured view
          </span>
        )}
      </div>
    </div>
  )
}
