"use client"

import { type CSSProperties } from "react"
import { Check, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { OBSERVATORY_SOURCES, type ObservatorySource } from "../foundations/constants"
import { MONO_FONT } from "../foundations/theme"

/* Organism — header principal do Observatory. Mantém a navegação entre fontes,
 * mas usa a faixa única brutalist do dashboard AIOX. */
export function Topbar({
  source,
  newActionLabel,
  selectedTitle,
  availableSources = OBSERVATORY_SOURCES,
  onChangeSource,
  onCopyNew,
  copiedNew = false,
}: {
  source: ObservatorySource
  brandLabel: string                       // e.g. "Research" or "Bench"
  newActionLabel: string                   // e.g. "Nova Pesquisa" / "Novo Benchmark"
  selectedSlug: string
  selectedTitle: string
  selectedDate: string
  selectedSchema: string
  availableSources?: Array<[ObservatorySource, string]>
  onChangeSource: (next: ObservatorySource) => void
  onCopyNew: () => void
  copiedNew?: boolean
}) {
  const navSources = availableSources
  const topbarVars = {
    "--top-paper": "var(--dark, #050505)",
    "--top-paper-alt": "var(--surface, #0f0f11)",
    "--top-ink": "var(--cream-alt, #f5f4e7)",
    "--top-ink-3": "var(--fg3, rgba(244,244,232,0.55))",
    "--top-ink-dim": "var(--fg-dim, rgba(245,244,231,0.40))",
    "--top-ink-faint": "rgba(245,244,231,0.18)",
    "--top-rule": "var(--border, rgba(156,156,156,0.15))",
    "--top-rule-soft": "var(--border-soft, rgba(156,156,156,0.10))",
    "--top-lime": "var(--lime, #d1ff00)",
    "--top-on-lime": "var(--fg-on-lime, #050505)",
  } as CSSProperties

  return (
    <header
      className="sticky top-0 z-50 grid min-h-14 grid-cols-[auto_minmax(0,1fr)_auto] items-stretch border-b border-[var(--top-rule-soft)] bg-[var(--top-paper)]"
      style={topbarVars}
      aria-label={`Observatory: ${selectedTitle}`}
    >
      <button
        type="button"
        onClick={() => source !== "research" && onChangeSource("research")}
        className="flex h-14 min-w-0 shrink-0 items-center gap-3.5 overflow-hidden border-r border-[var(--top-rule-soft)] px-[22px] text-left transition-colors hover:bg-[rgba(245,244,231,0.025)]"
      >
        <img
          src="/logo/AIOX-White.svg"
          alt="AIOX"
          className="h-[18px] w-auto shrink-0"
        />
        <span className="h-4 w-px shrink-0 bg-[var(--top-rule)]" />
        <span
          className="truncate text-[11px] font-black uppercase leading-none tracking-[0.2em] text-[var(--top-ink)]"
          style={{ fontFamily: MONO_FONT, fontSize: "11px", letterSpacing: "0.2em" }}
        >
          Research
        </span>
      </button>

      <nav
        className="hidden min-w-0 items-stretch overflow-x-auto [scrollbar-width:none] md:flex"
        aria-label="Fontes do Observatory"
      >
        {navSources.map(([key, rawLabel], idx) => {
          const active = key === source
          const label = key === "research" ? "Pesquisas" : rawLabel
          return (
            <button
              key={key}
              type="button"
              onClick={() => !active && onChangeSource(key)}
              className={cn(
                "relative inline-flex h-14 shrink-0 items-center gap-2 px-[18px] text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors",
                active
                  ? "text-[var(--top-lime)]"
                  : "text-[var(--top-ink-dim)] hover:bg-[rgba(245,244,231,0.025)] hover:text-[var(--top-ink)]",
              )}
              style={{ fontFamily: MONO_FONT, fontSize: "11px", letterSpacing: "0.18em" }}
            >
              <span className="text-[var(--top-ink-dim)]">{String(idx + 1).padStart(2, "0")}</span>
              <span className="truncate">{label}</span>
              {active && <span className="absolute inset-x-0 bottom-0 h-px bg-[var(--top-lime)]" />}
            </button>
          )
        })}
      </nav>

      <div className="flex h-14 shrink-0 items-center px-5">
        <button
          type="button"
          onClick={onCopyNew}
          title={source === "research" ? "Abrir nova pesquisa" : `Copiar comando CLI: ${newActionLabel}`}
          className={cn(
            "inline-flex h-8 min-w-[132px] items-center justify-center gap-2 bg-[var(--top-lime)] px-3 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--top-on-lime)] transition-opacity hover:opacity-90 md:min-w-[148px] md:px-4",
            copiedNew && "opacity-85",
          )}
          style={{ fontFamily: MONO_FONT, fontSize: "11px", letterSpacing: "0.14em" }}
        >
          {copiedNew ? <Check size={14} strokeWidth={2} /> : <Plus size={14} strokeWidth={2} />}
          <span>{copiedNew ? "Copiado" : newActionLabel}</span>
        </button>
      </div>
    </header>
  )
}
