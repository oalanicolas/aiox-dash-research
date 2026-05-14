import { cn } from "@/lib/utils"
import { DISPLAY_FONT, MONO_FONT, SANS_FONT } from "../foundations/theme"
import { coverageNumeric, fmtDateShort, pad2, statusKeyFromRaw, statusLabel } from "../foundations/utils"
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
  const isCompleted = statusKeyFromRaw(status) === "completed"
  return (
    <button
      type="button"
      data-slug={slug}
      onClick={onSelect}
      className={cn(
        "group grid min-h-[82px] w-full grid-cols-[22px_minmax(0,1fr)_72px] items-stretch gap-2 border-b border-l-[3px] border-b-[var(--rule-soft)] border-l-transparent px-3 py-0 text-left transition-colors hover:bg-[var(--paper-alt)] xl:grid-cols-[28px_minmax(0,1fr)_82px] xl:gap-3 xl:px-5",
        isActive && "border-l-[var(--lime-ink)] bg-[var(--paper-deep)]",
      )}
    >
      <span
        className="relative flex h-full items-center justify-center"
        aria-label={isActive ? "Pesquisa selecionada" : undefined}
      >
        <span className="absolute bottom-0 top-0 left-1/2 w-px -translate-x-1/2 bg-[var(--rule)] transition-colors group-hover:bg-[var(--ink-faint)]" />
        <span
          className={cn(
            "relative z-[1] h-2.5 w-2.5 border bg-[var(--paper)] transition-all",
            isActive
              ? "border-[var(--lime-ink)] bg-[var(--lime-ink)]"
              : "border-[var(--lime-ink)] group-hover:bg-[var(--paper-alt)]",
          )}
        />
      </span>
      <span className="min-w-0 self-center py-3">
        <span
            className="block text-[12.5px] font-bold leading-[1.18] tracking-[-0.005em] text-[var(--ink)] xl:text-[13px]"
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
        {!isCompleted && (
          <span
            className="mt-1 block text-[10px] uppercase tracking-[0.1em] text-[var(--ink-dim)]"
            style={{ fontFamily: MONO_FONT }}
          >
            {status}
          </span>
        )}
        {isCompleted && (
          <span
            className="mt-0.5 block text-[11px] tracking-[0.04em] text-[var(--ink-dim)]"
            style={{ fontFamily: MONO_FONT }}
          >
            {files} arquivos · {pad2(num)}
          </span>
        )}
        {subjects && subjects.length > 0 && (
          <span className="mt-1.5 flex flex-wrap items-center gap-1" aria-label="Subjects">
            {subjects.slice(0, 5).map((subject, idx) => (
              <span
                key={`${subject}-${idx}`}
                className="inline-flex items-center gap-1 border border-[var(--rule-soft)] bg-[var(--paper)] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.06em] text-[var(--ink-2)]"
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

      <span className="grid content-center justify-items-end gap-1 self-stretch py-3 text-right">
        <span className="flex items-center justify-end gap-1">
          {coverageInferred && cov != null && <InferredFlag size={9} title="Coverage inferido" />}
          <span
            className={cn(
              "text-[22px] font-black leading-none tracking-[-0.045em]",
              cov == null
                ? "font-normal text-[var(--ink-dim)]"
                : coverageInferred
                  ? "text-[var(--ink-dim)]"
                  : "text-[var(--ink)]",
            )}
            style={{ fontFamily: DISPLAY_FONT }}
          >
            {cov ?? "—"}
          </span>
        </span>
        <span className="block leading-none text-[var(--ink-dim)]" style={{ fontFamily: MONO_FONT }}>
          {dateMissing(date) ? (
            <span
              className="text-[13px] font-black tracking-[-0.04em] text-[var(--ink-dim)]"
              style={{ fontFamily: DISPLAY_FONT }}
              aria-label="data ausente"
              title="data ausente"
            >
              —
            </span>
          ) : (
            <>
              <span className="text-[13px] font-black tracking-[-0.035em] text-[var(--ink-2)]" style={{ fontFamily: DISPLAY_FONT }}>
                {fmtDateShort(date).split("/")[0]}
              </span>
              <span className="ml-1 text-[9px] uppercase tracking-[0.08em]">
                {monthSigla(date)}
              </span>
            </>
          )}
        </span>
        <span className="block text-[8.5px] uppercase tracking-[0.12em] text-[var(--ink-dim)]" style={{ fontFamily: MONO_FONT }}>
          {statusLabel(status)}
        </span>
      </span>
    </button>
  )
}

function dateMissing(d: string): boolean {
  return !d || d === "undated" || d === "undefined" || d === "—"
}

function monthSigla(iso: string): string {
  const parts = iso.split("-")
  const m = Number(parts[1])
  if (Number.isNaN(m)) return ""
  return ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"][m - 1] ?? ""
}
