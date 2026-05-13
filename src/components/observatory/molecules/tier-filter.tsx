import { cn } from "@/lib/utils"
import { type TierFilterKey } from "../foundations/constants"
import { MONO_FONT } from "../foundations/theme"

/* Molecule — segmented filter [All | T1 | T2 | T3] + count.
 * 1 ação: filtrar players por tier. Atoms: 4 segment buttons + count label. */
export function TierFilter({
  value,
  onChange,
  filteredCount,
  totalCount,
}: {
  value: TierFilterKey
  onChange: (v: TierFilterKey) => void
  filteredCount: number
  totalCount: number
}) {
  const options: TierFilterKey[] = ["all", 1, 2, 3]
  return (
    <div
      className="flex items-center gap-1 border-b border-[var(--rule)] px-4 py-2.5 text-[10px] uppercase tracking-[0.12em]"
      style={{ fontFamily: MONO_FONT }}
    >
      <span className="mr-1 text-[var(--ink-dim)]">Tier:</span>
      {options.map((t) => {
        const active = value === t
        return (
          <button
            key={String(t)}
            type="button"
            onClick={() => onChange(t)}
            className={cn(
              "px-2 py-1 transition-colors",
              active ? "bg-[var(--ink)] text-[var(--paper)]" : "text-[var(--ink-3)] hover:text-[var(--ink)]",
            )}
          >
            {t === "all" ? "All" : `T${t}`}
          </button>
        )
      })}
      <span className="ml-auto text-[var(--ink-dim)]">
        {filteredCount}/{totalCount}
      </span>
    </div>
  )
}
