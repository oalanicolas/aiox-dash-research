import { Link as LinkIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { MONO_FONT, SERIF_FONT } from "../foundations/theme"

/* Molecule — player card. 1 ação: ler perfil + abrir source.
 * Atoms: number, name, tier badge, category badge, date, whatItDoes/Not, insight, link. */
export function PlayerCard({
  number,
  name,
  tier,
  category,
  whatItDoes,
  whatItDoesNot,
  insight,
  sourceTitle,
  sourceUrl,
  sourceDate,
  excluded,
  exclusionReason,
}: {
  number: string
  name: string
  tier: 1 | 2 | 3 | null
  category: string | null
  whatItDoes: string | null
  whatItDoesNot: string | null
  insight: string | null
  sourceTitle: string | null
  sourceUrl: string | null
  sourceDate: string | null
  excluded: boolean
  exclusionReason: string | null
}) {
  return (
    <article
      className={cn(
        "border-b border-[var(--rule-soft)] px-4 py-3.5",
        excluded && "opacity-60",
      )}
    >
      <header className="flex items-start gap-2">
        <span
          className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-[var(--ink-dim)]"
          style={{ fontFamily: MONO_FONT }}
        >
          {number || "—"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[12px] text-[var(--ink)]" style={{ fontFamily: MONO_FONT }}>
            {name}
          </span>
          <span
            className="mt-1 flex flex-wrap items-center gap-1.5 text-[9.5px] uppercase tracking-[0.1em] text-[var(--ink-dim)]"
            style={{ fontFamily: MONO_FONT }}
          >
            {tier != null && (
              <span className="bg-[var(--paper-deep)] px-1.5 py-0.5 text-[var(--ink)]">
                Tier {tier}
              </span>
            )}
            {category && (
              <span className="bg-[var(--paper-alt)] px-1.5 py-0.5 text-[var(--ink)]">{category}</span>
            )}
            {sourceDate && sourceDate !== "date_unknown" && <span>{sourceDate}</span>}
            {excluded && <span className="text-[var(--warning-ink)]">excluded</span>}
          </span>
        </span>
        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 text-[var(--ink-dim)] transition-colors hover:text-[var(--ink)]"
            title={sourceTitle ?? sourceUrl}
          >
            <LinkIcon size={12} strokeWidth={1.75} />
          </a>
        )}
      </header>
      {whatItDoes && (
        <p
          className="mt-2.5 text-[12px] italic leading-[1.5] text-[var(--ink-2)]"
          style={{ fontFamily: SERIF_FONT }}
        >
          {whatItDoes}
        </p>
      )}
      {whatItDoesNot && (
        <p className="mt-2 text-[12px] italic leading-[1.5] text-[var(--ink-3)]" style={{ fontFamily: SERIF_FONT }}>
          <span
            className="mr-1 text-[9.5px] uppercase not-italic tracking-[0.1em] text-[var(--ink-dim)]"
            style={{ fontFamily: MONO_FONT }}
          >
            Não:
          </span>
          {whatItDoesNot}
        </p>
      )}
      {insight && (
        <p
          className="mt-2 border-l-2 border-[var(--lime-ink)] pl-3 text-[12px] italic leading-[1.5] text-[var(--ink-2)]"
          style={{ fontFamily: SERIF_FONT }}
        >
          {insight}
        </p>
      )}
      {exclusionReason && (
        <p
          className="mt-2 text-[12px] italic leading-[1.5] text-[var(--warning-ink)]"
          style={{ fontFamily: SERIF_FONT }}
        >
          {exclusionReason}
        </p>
      )}
    </article>
  )
}
