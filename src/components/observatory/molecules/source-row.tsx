import { MONO_FONT, SERIF_FONT } from "../foundations/theme"
import { pad2 } from "../foundations/utils"

/* Molecule — linha da Sources tab. 1 ação: abrir URL externa.
 * Atoms: index num, title, meta (credibility · date · flags). */
export function SourceRow({
  index,
  title,
  url,
  credibility,
  date,
  flags,
}: {
  index: number
  title: string
  url: string
  credibility: string
  date: string
  flags: string[]
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="grid grid-cols-[28px_minmax(0,1fr)] gap-2.5 border-b border-[var(--rule-soft)] px-4 py-2.5 text-left transition-colors hover:bg-[var(--paper-alt)]"
    >
      <span className="text-[11px] text-[var(--ink-dim)]" style={{ fontFamily: MONO_FONT }}>
        {pad2(index + 1)}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[11.5px] text-[var(--ink)]" style={{ fontFamily: MONO_FONT }}>
          {title}
        </span>
        <span
          className="mt-1 block truncate text-[12px] italic text-[var(--ink-3)]"
          style={{ fontFamily: SERIF_FONT }}
        >
          {credibility} · {date}
          {flags.length > 0 && ` · ${flags.join(" ")}`}
        </span>
      </span>
    </a>
  )
}
