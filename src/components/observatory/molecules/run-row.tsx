import { cn } from "@/lib/utils"
import { MONO_FONT, SANS_FONT } from "../foundations/theme"
import { coverageNumeric, fmtDateShort, pad2, statusLabel } from "../foundations/utils"
import { InferredFlag } from "./inferred-flag"

/* Molecule — linha do index list. 1 ação: selecionar run.
 * Atoms: dot, num, title (trimmed), sub mono, coverage, status, inferred flag.
 *
 * Subjects chips foram removidas (2026-05-18) — quando o usuário está em /bench
 * já sabe que o conteúdo é benchmark, e enumerar os 25 players-analisados em
 * chip-row poluía o sidebar. CategoryTag fica como único pin de domínio.
 *
 * Titles têm palavras redundantes (Benchmark, Bench) podadas quando o source
 * já é bench-mode — o context "Bench" vem do nav do header, não precisa
 * repetir em cada card. */
export function RunRow({
  slug,
  num,
  displayTitle,
  files,
  date,
  coverage,
  status,
  coverageInferred,
  categoryTag,
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
  categoryTag?: string
  /* Subjects deliberately removed — see file comment. Kept the prop in the
     IndexPane caller's contract for backwards-compat but ignored here. */
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

  const cleanTitle = pruneRedundantTitle(displayTitle)

  return (
    <button
      type="button"
      data-slug={slug}
      onClick={onSelect}
      className={cn(
        "group grid min-h-[60px] w-full grid-cols-[20px_minmax(0,1fr)_44px] items-center gap-2 border-b border-l-2 border-b-[var(--rule-soft)] border-l-transparent px-5 py-3 text-left transition-colors hover:bg-[var(--paper-deep)]",
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
          {cleanTitle}
        </span>
        <span
          className="mt-1 block truncate text-[10px] uppercase tracking-[0.16em] text-[var(--ink-dim)]"
          style={{ fontFamily: MONO_FONT }}
        >
          {fmtDateShort(date)} · {files} arq · #{pad2(num)} · {statusLabel(status)}
          {categoryTag ? <span className="ml-2 text-[var(--lime-ink)]">· {categoryTag}</span> : null}
        </span>
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

const REDUNDANT_WORDS =
  /\s*(?:—|-)\s*(?:bench(?:mark)?|comparativ[oa]|comparison|research|pesquisa|investiga[çc][ãa]o)\b/gi
const PREFIX_BENCH =
  /^(?:bench(?:mark)?|research|pesquisa|tech[\s-]?research|investiga[çc][ãa]o)\s*[—:-]\s*/i

/* Trim words that already come from the navigation context.
   - "DeepResearch Absorption Benchmark — AIOX vs ..." → "DeepResearch Absorption — AIOX vs ..."
   - "Bench: gstack vs AIOX (Sinkra Hub)" → "gstack vs AIOX (Sinkra Hub)"
   Only trims when the source is bench (caller passes already-clean title for
   research). Never strips standalone "Bench" tokens that carry meaning. */
function pruneRedundantTitle(title: string): string {
  if (!title) return title
  let trimmed = title.replace(PREFIX_BENCH, "")
  trimmed = trimmed.replace(REDUNDANT_WORDS, "")
  trimmed = trimmed.replace(/\s+/g, " ").trim()
  return trimmed || title
}
