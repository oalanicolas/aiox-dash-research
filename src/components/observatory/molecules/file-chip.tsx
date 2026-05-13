import { cn } from "@/lib/utils"
import { MONO_FONT, SERIF_FONT } from "../foundations/theme"
import { formatBytes, pad2 } from "../foundations/utils"

/* Molecule — chip horizontal no closer strip rodapé.
 * 1 ação: selecionar arquivo do run atual.
 * Atoms: num small + filename + phase italic + size small. */
export function FileChip({
  index,
  file,
  phase,
  bytes,
  isActive,
  onSelect,
}: {
  index: number
  file: string
  phase: string
  bytes: number
  isActive: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group relative flex shrink-0 flex-col items-start gap-0.5 border-r border-[var(--rule)] px-4 py-2.5 text-left transition-colors",
        "border-b-2",
        isActive ? "border-b-[var(--lime-ink)] bg-[var(--paper)]" : "border-b-transparent hover:bg-[var(--paper)]",
      )}
      title={`${file} · ${phase}`}
    >
      <span className="flex items-baseline gap-1.5">
        <span
          className={cn("text-[10px] tracking-[0.02em]", isActive ? "text-[var(--ink)]" : "text-[var(--ink-dim)]")}
          style={{ fontFamily: MONO_FONT }}
        >
          {pad2(index + 1)}
        </span>
        <span
          className={cn(
            "max-w-[160px] truncate text-[11.5px]",
            isActive ? "text-[var(--ink)]" : "text-[var(--ink-2)] group-hover:text-[var(--ink)]",
          )}
          style={{ fontFamily: MONO_FONT }}
        >
          {file}
        </span>
      </span>
      <span className="flex items-baseline gap-1.5">
        <span
          className="max-w-[140px] truncate text-[11px] italic text-[var(--ink-3)]"
          style={{ fontFamily: SERIF_FONT }}
        >
          {phase}
        </span>
        <span className="text-[10px] text-[var(--ink-dim)]" style={{ fontFamily: MONO_FONT }}>
          · {formatBytes(bytes)}
        </span>
      </span>
    </button>
  )
}
