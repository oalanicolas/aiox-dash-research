import { cn } from "@/lib/utils"
import { MONO_FONT, SANS_FONT } from "../foundations/theme"
import { coverageNumeric, fmtDateShort, pad2, statusLabel } from "../foundations/utils"
import { InferredFlag } from "./inferred-flag"

const SUBJECT_PALETTE = ["#7C9F3F", "#4F7CAC", "#C97A4A", "#8B6FB0", "#10B981", "#3B82F6", "#8B5CF6"]

function colorForSubject(name: string, index: number): string {
  /* Stable color per subject: hash the lowercased name. Falls back to positional
     index when name is missing, so chips always render even before data lands. */
  if (!name) return SUBJECT_PALETTE[index % SUBJECT_PALETTE.length]
  let hash = 0
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.toLowerCase().charCodeAt(i)) >>> 0
  }
  return SUBJECT_PALETTE[hash % SUBJECT_PALETTE.length]
}

/* Molecule — linha do index list. 1 ação: selecionar run.
 * Atoms: dot, num, title, sub, date, coverage, status, inferred flag.
 *
 * When `subjects` is non-empty (bench rows), an additional chip row renders
 * with colored dots — one per subject — for at-a-glance recognition. */
export function RunRow({
  slug,
  num,
  displayTitle,
  files,
  date,
  coverage,
  status,
  coverageInferred,
  subjects,
  isActive,
  onSelect,
}: {
  slug: string
  num: number
  displayTitle: string
  files: number
  date: string
  coverage: string
  status: string
  coverageInferred?: boolean
  /* Optional list of subject names — when provided, colored chips render below
     the title. Used by bench rows; research rows leave it undefined. */
  subjects?: string[]
  isActive: boolean
  onSelect: () => void
}) {
  const cov = coverageNumeric(coverage)
  const scoreColor =
    cov == null
      ? "text-[var(--ink-dim)]"
      : cov >= 80
        ? "text-[var(--lime-ink)]"
        : cov >= 65
          ? "text-[var(--warning-ink)]"
          : "text-[var(--ink-3)]"

  return (
    <button
      type="button"
      data-slug={slug}
      onClick={onSelect}
      className={cn(
        "group grid min-h-[72px] w-full grid-cols-[20px_minmax(0,1fr)_44px] items-center gap-2 border-b border-l-2 border-b-[var(--rule-soft)] border-l-transparent px-5 py-3 text-left transition-colors hover:bg-[var(--paper-deep)]",
        isActive && "border-l-[var(--lime-ink)] bg-[var(--paper)]",
      )}
    >
      <span
        className="relative flex h-full items-center justify-start"
        aria-label={isActive ? "Pesquisa selecionada" : undefined}
      >
        <span
          className={cn(
            "h-2 w-2 border transition-all",
            isActive
              ? "border-[var(--lime-ink)] bg-[var(--lime-ink)]"
              : "border-[var(--ink-faint)] bg-[var(--ink)] group-hover:border-[var(--lime-ink)]",
          )}
        />
      </span>
      <span className="min-w-0">
        <span
          className="block text-[14px] font-bold leading-[1.18] text-[var(--ink)]"
          style={{
            display: "-webkit-box",
            fontFamily: SANS_FONT,
            overflow: "hidden",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 2,
          }}
          title={displayTitle}
        >
          {displayTitle}
        </span>
        <span
          className="mt-1 block truncate text-[10px] uppercase tracking-[0.16em] text-[var(--ink-dim)]"
          style={{ fontFamily: MONO_FONT }}
        >
          {fmtDateShort(date)} · {files} arquivos · #{pad2(num)} · {statusLabel(status)}
        </span>
        {subjects && subjects.length > 0 && (
          <span className="mt-1.5 flex flex-wrap items-center gap-1" aria-label="Subjects">
            {subjects.slice(0, 5).map((subject, idx) => (
              <span
                key={`${subject}-${idx}`}
                className="inline-flex items-center gap-1 border border-[var(--rule-soft)] bg-[var(--paper-alt)] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.06em] text-[var(--ink-2)]"
                style={{ fontFamily: MONO_FONT }}
              >
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ background: colorForSubject(subject, idx) }}
                  aria-hidden="true"
                />
                <span className="max-w-[52px] truncate xl:max-w-[64px]">{subject}</span>
              </span>
            ))}
            {subjects.length > 5 && (
              <span
                className="text-[9px] tracking-[0.06em] text-[var(--ink-dim)]"
                style={{ fontFamily: MONO_FONT }}
              >
                +{subjects.length - 5}
              </span>
            )}
          </span>
        )}
      </span>

      <span className="grid content-center justify-items-end gap-1 self-stretch text-right">
        <span className="flex items-center justify-end gap-1">
          {coverageInferred && cov != null && <InferredFlag size={9} title="Coverage inferido" />}
          <span
            className={cn("text-[13px] font-bold leading-none tracking-[0.08em]", coverageInferred ? "text-[var(--ink-dim)]" : scoreColor)}
            style={{ fontFamily: MONO_FONT }}
          >
            {cov ?? "—"}
          </span>
        </span>
      </span>
    </button>
  )
}
