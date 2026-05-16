import { DISPLAY_FONT, MONO_FONT } from "../foundations/theme"

/* Organism — footer fixo. Seção reusável (shell context). */
export function Footer({
  sourceLabel = "Research",
  sourceRoot = "docs/research",
}: {
  sourceLabel?: string
  sourceRoot?: string
}) {
  return (
    <footer
      className="flex h-8 flex-wrap items-center justify-between gap-x-4 gap-y-1 overflow-hidden border-t border-[var(--rule)] bg-[var(--paper)] px-4 text-[10px] uppercase tracking-[0.12em] text-[var(--ink-3)] sm:px-6 md:px-8"
      style={{ fontFamily: MONO_FONT }}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center bg-[var(--ink)] text-[11px] font-extrabold tracking-[-0.02em] text-[var(--paper)]"
          style={{ fontFamily: DISPLAY_FONT }}
        >
          X
        </span>
        <span className="shrink-0">AIOX Research · {sourceLabel}</span>
      </div>
      <div className="hidden sm:block">Local-first · read-only</div>
      <div className="hidden truncate text-[var(--ink-dim)] lg:block">{sourceRoot} · unified shell</div>
    </footer>
  )
}
