import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { MONO_FONT, SERIF_FONT } from "../foundations/theme"
import { formatBytes, pad2 } from "../foundations/utils"

/* Molecule — linha do closer artifact list. 1 ação: selecionar arquivo.
 * Atoms: num, name, phase, size, arrow. */
export function ArtifactRow({
  index,
  title,
  subtitle,
  file,
  bytes,
  status = "present",
  isActive,
  onSelect,
}: {
  index: number
  title: string
  subtitle: string
  file: string
  bytes: number
  status?: "present" | "missing" | "invalid"
  isActive: boolean
  onSelect: () => void
}) {
  const hasIssue = status === "missing" || status === "invalid"
  return (
    <li
      onClick={onSelect}
      className={cn(
        "grid min-h-[72px] cursor-pointer grid-cols-[34px_minmax(0,1fr)_12px] items-center gap-x-3 border-t border-[var(--rule-soft)] px-4 py-3 transition-colors",
        isActive ? "bg-[var(--paper)]" : "hover:bg-[var(--paper)]",
        hasIssue && "bg-[var(--paper-alt)]",
      )}
    >
      <span
        className={cn("text-[11.5px]", isActive ? "text-[var(--ink)]" : "text-[var(--ink-dim)]")}
        style={{ fontFamily: MONO_FONT }}
      >
        {pad2(index)}
      </span>
      <span className="min-w-0 overflow-hidden">
        <span
          className={cn(
            "block truncate text-[13px] leading-tight",
            status === "missing"
              ? "text-[var(--ink-dim)]"
              : status === "invalid"
                ? "text-red-700"
                : isActive ? "text-[var(--ink)]" : "text-[var(--ink-2)]",
          )}
          title={title}
        >
          {title}
        </span>
        <span className="mt-1 block truncate text-[14px] italic leading-tight text-[var(--ink-3)]" style={{ fontFamily: SERIF_FONT }} title={file}>
          {subtitle || `${file} · ${formatBytes(bytes)}`}
        </span>
        {hasIssue && (
          <span
            className={cn(
              "mt-1 inline-flex w-fit border px-1.5 py-0.5 text-[9px] uppercase tracking-[0.12em]",
              status === "invalid" ? "border-red-400/60 text-red-700" : "border-[var(--ink-faint)] text-[var(--ink-dim)]",
            )}
            style={{ fontFamily: MONO_FONT }}
          >
            {status === "invalid" ? "inválido" : "ausente"}
          </span>
        )}
      </span>
      <ArrowRight
        size={12}
        strokeWidth={2}
        className={cn("h-3 w-3", isActive ? "text-[var(--ink)]" : "text-[var(--ink-dim)]")}
      />
    </li>
  )
}
