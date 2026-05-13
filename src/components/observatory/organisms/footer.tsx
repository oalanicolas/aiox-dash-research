import { DISPLAY_FONT, MONO_FONT, SERIF_FONT } from "../foundations/theme"

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
      className="flex h-8 flex-wrap items-center justify-between gap-x-4 gap-y-1 overflow-hidden border-t border-[var(--rule)] px-4 text-[10.5px] uppercase tracking-[0.1em] text-[var(--ink-3)] sm:px-6 md:px-8"
      style={{ fontFamily: MONO_FONT }}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center bg-[var(--ink)] text-[11px] font-extrabold tracking-[-0.02em] text-[var(--paper)]"
          style={{ fontFamily: DISPLAY_FONT }}
        >
          X
        </span>
        <span className="shrink-0">AIOX {sourceLabel}</span>
        <span
          className="ml-1.5 hidden truncate text-[12px] normal-case italic tracking-[0] text-[var(--ink-2)] md:inline"
          style={{ fontFamily: SERIF_FONT }}
        >
          a quiet reader for loud findings
        </span>
      </div>
      <div className="hidden sm:block">Local-first · read-only MVP</div>
      <div className="hidden truncate text-[var(--ink-dim)] lg:block">{sourceRoot} · AIOX Brandbook DS · Clean mode</div>
    </footer>
  )
}
