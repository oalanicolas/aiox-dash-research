import { ChevronLeft, ChevronRight } from "lucide-react"
import { pad2 } from "../foundations/utils"

/* Molecule — pager [← 02/12 →]. 1 ação: navegar arquivos.
 * 3 atoms: prev btn, position label, next btn. */
export function Pager({
  index,
  total,
  canPrev,
  canNext,
  onPrev,
  onNext,
  prevTitle = "Anterior (←)",
  nextTitle = "Próximo (→)",
}: {
  index: number
  total: number
  canPrev: boolean
  canNext: boolean
  onPrev: () => void
  onNext: () => void
  prevTitle?: string
  nextTitle?: string
}) {
  return (
    <span className="inline-flex h-[26px] items-stretch border border-[var(--ink-faint)]">
      <button
        type="button"
        onClick={onPrev}
        disabled={!canPrev}
        className="inline-flex w-[30px] items-center justify-center text-[var(--ink-3)] transition-colors hover:bg-[var(--paper-alt)] hover:text-[var(--ink)] disabled:cursor-default disabled:text-[var(--ink-faint)] disabled:hover:bg-transparent"
        title={prevTitle}
      >
        <ChevronLeft size={13} strokeWidth={2} />
      </button>
      <span className="inline-flex items-center border-x border-[var(--ink-faint)] px-3 text-[11px] tracking-[0.08em] text-[var(--ink)]">
        <strong className="font-medium">{pad2(Math.max(0, index) + 1)}</strong>
        <span className="mx-1.5 text-[var(--ink-dim)]">/</span>
        <span>{pad2(total)}</span>
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={!canNext}
        className="inline-flex w-[30px] items-center justify-center text-[var(--ink-3)] transition-colors hover:bg-[var(--paper-alt)] hover:text-[var(--ink)] disabled:cursor-default disabled:text-[var(--ink-faint)] disabled:hover:bg-transparent"
        title={nextTitle}
      >
        <ChevronRight size={13} strokeWidth={2} />
      </button>
    </span>
  )
}
