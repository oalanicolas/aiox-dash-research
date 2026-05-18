"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { ArrowRight, ExternalLink } from "lucide-react"
import type {
  ObservatoryGapItem,
  ObservatoryMatrix,
  ObservatoryPersona,
  ObservatoryPlayerProfile,
  ObservatoryRunSummary,
} from "../foundations/types"
import { LightScrollArea } from "../molecules/light-scroll-area"
import { rankPlayers } from "../foundations/use-decision-state"
import { DISPLAY_FONT, MONO_FONT, SANS_FONT, SERIF_FONT, observatoryDarkThemeVars } from "../foundations/theme"

/* Organism — Bench Overview (Reader mode = "map", bench-only).
 *
 * Visual reference: docs/bench (`c_level_operating_model_dashboard`-style hero)
 *   - hero-meta-line com tags lime/warning + hud-label
 *   - hero-grid 1.6fr/1fr (texto narrativo + painel de stats)
 *   - tipografia clamp(38..72px) display + eyebrow lime mono uppercase
 *   - verdict-bar com gradient lateral + barra lime top 2px
 *   - 3 actions cards (Matriz/Pesos/Personas) com hover lime
 *   - provenance footer mono
 *
 * Player links: cada citação de player vira link clicável quando o profile
 * traz repoUrl (preferido) ou vendorUrl. Pattern: <a> com underline-offset
 * grande + decoration lime/30 + hover decoration full. Sem ícone external
 * no h1 (poluiria typography), mas com ícone next-to-name em runner/links menores.
 *
 * Conteúdo strict (1-pager). Heatmap → Matriz. Cliffs → Decisão. Readiness → Pesos.
 */
export function BenchOverviewView({
  runs,
  matrix,
  personas,
  playerProfiles,
  gapItems,
  sourceCount,
}: {
  runs: ObservatoryRunSummary[]
  matrix: ObservatoryMatrix | null
  personas: ObservatoryPersona[]
  playerProfiles: ObservatoryPlayerProfile[]
  gapItems: ObservatoryGapItem[]
  sourceCount: number
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeRun = runs.find((run) => run.active) ?? runs[0]
  const profileByKey = new Map(playerProfiles.map((p) => [p.key, p]))
  const displayName = (key: string) => profileByKey.get(key)?.name ?? key
  const playerLinkOf = (key: string): string | null => {
    const profile = profileByKey.get(key)
    if (!profile) return null
    if (profile.repoUrl && /^https?:/.test(profile.repoUrl)) return profile.repoUrl
    if (profile.vendorUrl && /^https?:/.test(profile.vendorUrl)) return profile.vendorUrl
    return null
  }

  const ranking = matrix ? rankPlayers(matrix, weightsFromMatrix(matrix)) : []
  const winner = ranking[0]
  const runner = ranking[1]
  const gap = winner && runner ? winner.score - runner.score : 0
  const tie = gap > 0 && gap < 1

  const winnerProfile = winner ? profileByKey.get(winner.player) : undefined
  const winnerHref = winner ? playerLinkOf(winner.player) : null
  const runnerHref = runner ? playerLinkOf(runner.player) : null
  const playerCount = matrix?.players.length ?? playerProfiles.length
  const dimensionCount = matrix?.rows.length ?? 0
  const personaCount = personas.length
  const cellCount = matrix ? matrix.rows.reduce((acc, r) => acc + r.cells.length, 0) : 0
  const highConfidenceCells = matrix
    ? matrix.rows.reduce(
        (acc, row) =>
          acc + row.cells.filter((c) => (c.confidence ?? "").toLowerCase() === "high").length,
        0,
      )
    : 0
  const highPct = cellCount > 0 ? Math.round((highConfidenceCells / cellCount) * 100) : 0

  function goToView(view: string) {
    const params = new URLSearchParams(searchParams?.toString() ?? "")
    params.set("view", view)
    router.push(`?${params.toString()}`, { scroll: false })
  }

  const heroTags: Array<{ label: string; tone: "lime" | "neutral" | "warn" }> = [
    { label: `▸ ${matrix?.method ? "AUDIT" : "BENCH"} · ${dimensionCount} DIM`, tone: "lime" },
    tie ? { label: "▸ EMPATE TÉCNICO", tone: "warn" } : { label: `▸ GAP ${gap.toFixed(2)} PTS`, tone: "neutral" },
    { label: `▸ ${highPct}% EVIDÊNCIA ALTA`, tone: highPct >= 60 ? "lime" : "warn" },
  ]

  return (
    <LightScrollArea
      className="aiox-report-dark flex-1"
      viewportClassName="px-4 pb-16 pt-8 sm:px-6 sm:pt-12 lg:px-12 lg:pt-16"
      fadeColor="var(--report-bg)"
      style={observatoryDarkThemeVars}
    >
      <article className="mx-auto w-full min-w-0 max-w-[1280px]">
        {/* Hero meta-line */}
        <div className="mb-9 flex flex-wrap items-center gap-3">
          {heroTags.map((tag) => (
            <span
              key={tag.label}
              className={
                tag.tone === "lime"
                  ? "border border-[var(--lime-ink)]/40 px-3.5 py-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--lime-ink)]"
                  : tag.tone === "warn"
                  ? "border border-[var(--warning-ink)]/40 px-3.5 py-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--warning-ink)]"
                  : "border border-[var(--rule-strong)] px-3.5 py-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--ink-2)]"
              }
              style={{ fontFamily: MONO_FONT }}
            >
              {tag.label}
            </span>
          ))}
          <span
            className="ml-auto text-[11px] uppercase tracking-[0.16em] text-[var(--ink-dim)]"
            style={{ fontFamily: MONO_FONT }}
          >
            {activeRun?.date || "—"} · {activeRun?.slug || "bench"}
          </span>
        </div>

        {/* Hero grid: narrative + stats panel */}
        <section className="grid gap-10 lg:grid-cols-[1.6fr_1fr] lg:items-end">
          <div>
            <div
              className="mb-7 text-[12px] uppercase tracking-[0.22em] text-[var(--lime-ink)]"
              style={{ fontFamily: MONO_FONT }}
            >
              ▸ Overview · {activeRun?.displayTitle ?? activeRun?.title ?? "bench"}
            </div>

            <h1
              className="font-black leading-[0.92] tracking-[-0.05em] text-[var(--ink)]"
              style={{
                fontFamily: DISPLAY_FONT,
                fontSize: "clamp(44px, 5.6vw, 88px)",
              }}
            >
              {winner ? (
                <>
                  {winnerHref ? (
                    <a
                      href={winnerHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-baseline gap-3 text-[var(--lime-ink)] underline-offset-[14px] decoration-[var(--lime-ink)]/25 transition-colors hover:decoration-[var(--lime-ink)]/80 hover:underline"
                      title={`Abrir ${displayName(winner.player)} em nova aba`}
                    >
                      {displayName(winner.player)}
                      <ExternalLink
                        size={28}
                        strokeWidth={2}
                        className="opacity-50 transition-opacity hover:opacity-100"
                      />
                    </a>
                  ) : (
                    <span className="text-[var(--lime-ink)]">{displayName(winner.player)}</span>
                  )}
                  <br />
                  lidera o bench.
                  <span className="ml-2 inline-block align-middle text-[0.42em] font-semibold leading-tight tracking-[-0.02em] text-[var(--ink-dim)]">
                    {tie ? "Empate técnico." : `+${gap.toFixed(2)} pts`}
                  </span>
                </>
              ) : (
                "Sem ranking disponível."
              )}
            </h1>

            {winner && runner && (
              <p
                className="mt-6 max-w-[640px] text-[17px] leading-[1.65] text-[var(--ink-2)]"
                style={{ fontFamily: SERIF_FONT }}
              >
                <PlayerInlineLink
                  name={displayName(winner.player)}
                  href={winnerHref}
                />{" "}
                vence{" "}
                <PlayerInlineLink
                  name={displayName(runner.player)}
                  href={runnerHref}
                />{" "}
                por {gap.toFixed(2)} pts no{" "}
                <strong className="font-semibold text-[var(--ink)]">baseline neutro</strong>.{" "}
                {tie
                  ? "Recomendação varia conforme o cenário — explore Pesos."
                  : "Os pesos padrão estão ativos; mude em Pesos para ver se vence no seu cenário."}
              </p>
            )}

            {winnerProfile && (winnerProfile.license || winnerProfile.origin || winnerProfile.years) && (
              <div
                className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10.5px] uppercase tracking-[0.14em] text-[var(--ink-dim)]"
                style={{ fontFamily: MONO_FONT }}
              >
                {winnerProfile.license && <span>license · {winnerProfile.license}</span>}
                {winnerProfile.origin && (
                  <>
                    <span className="text-[var(--ink-faint)]">·</span>
                    <span>origin · {winnerProfile.origin}</span>
                  </>
                )}
                {winnerProfile.years !== null && (
                  <>
                    <span className="text-[var(--ink-faint)]">·</span>
                    <span>{winnerProfile.years}y in market</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* decisão-panel lime sólido (AIOX Dash v2 pattern) */}
          <aside
            className="relative flex flex-col gap-4 px-8 py-9"
            style={{
              background: "var(--lime-ink)",
              color: "#1a1502",
            }}
          >
            <span
              className="text-[11px] font-bold uppercase opacity-70"
              style={{ fontFamily: MONO_FONT, letterSpacing: "0.22em" }}
            >
              ▸ Decisão
            </span>
            <h2
              className="font-black uppercase leading-none tracking-[-0.04em]"
              style={{
                fontFamily: DISPLAY_FONT,
                fontSize: "clamp(40px, 4.4vw, 56px)",
                color: "#1a1502",
              }}
            >
              {tie ? "Empate" : winner ? "Absorver" : "Sem dados"}
            </h2>
            <p className="text-[14.5px] font-medium leading-[1.55]" style={{ fontFamily: SANS_FONT }}>
              {winner
                ? tie
                  ? `Diferença de ${gap.toFixed(2)} pt entre top-1 e top-2 — recomendação depende de cenário. Use Pesos.`
                  : `${displayName(winner.player)} é o vetor de absorção. Próxima ação: ver os 3 deltas em Matriz.`
                : "Carregue um bench com matrix preenchida para gerar uma recomendação."}
            </p>
            <div className="mt-auto grid grid-cols-2 gap-x-0 gap-y-0 border-t border-black/15 pt-5">
              <DecisaoMetric label="Players" value={String(playerCount)} />
              <DecisaoMetric label="Dimensões" value={String(dimensionCount)} last />
              <DecisaoMetric label="Personas" value={String(personaCount)} bottom />
              <DecisaoMetric label="Evidência ALTA" value={`${highPct}%`} last bottom />
            </div>
          </aside>
        </section>

        {/* Stat-row sob hero (AIOX Dash v2 pattern metric-row) */}
        <div
          className="mt-10 grid border border-[var(--rule)] bg-[var(--paper-alt)] sm:grid-cols-4"
          style={{ gridAutoFlow: "column dense" }}
        >
          <MetricCell label="Células" value={String(cellCount)} />
          <MetricCell label="Fontes" value={String(sourceCount)} />
          <MetricCell label="Coverage" value={`${highPct}%`} accent={highPct >= 60 ? "lime" : "neutral"} />
          <MetricCell label="Método" value={matrix?.method?.split(" ")[0] || "weighted"} last />
        </div>

        {/* Verdict bar */}
        {winner && (
          <section
            className="relative mt-12 border border-[var(--rule)] px-7 py-7"
            style={{
              background:
                "linear-gradient(135deg, rgba(209, 255, 0, 0.04) 0%, var(--paper-alt) 70%)",
            }}
          >
            <span className="absolute inset-x-0 top-0 h-[2px] bg-[var(--lime-ink)]" aria-hidden />
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)] lg:items-center">
              <div>
                <div
                  className="text-[10px] uppercase tracking-[0.18em] text-[var(--ink-dim)]"
                  style={{ fontFamily: MONO_FONT }}
                >
                  ▸ veredito baseline
                </div>
                <div
                  className="mt-2 text-[28px] font-black tracking-[-0.04em] text-[var(--lime-ink)]"
                  style={{ fontFamily: DISPLAY_FONT }}
                >
                  {tie ? "EMPATE" : "ABSORVER"}
                </div>
              </div>
              <p
                className="text-[14.5px] leading-[1.55] text-[var(--ink-2)]"
                style={{ fontFamily: SANS_FONT }}
              >
                <strong className="font-semibold text-[var(--ink)]">
                  {winnerProfile?.tag
                    ? `${winnerProfile.tag}.`
                    : `${displayName(winner.player)} domina.`}
                </strong>{" "}
                {tie
                  ? "Use Personas + Pesos para encontrar a configuração em que sua escolha vence — gap de 1pt não justifica decisão única."
                  : "Próxima ação concreta: abra Matriz para identificar as 3 dimensões mais decisivas, e Pesos para testar se o ranking sobrevive aos seus critérios."}
              </p>
              <div className="grid gap-2 lg:justify-end lg:text-right">
                <div
                  className="text-[10px] uppercase tracking-[0.18em] text-[var(--ink-dim)]"
                  style={{ fontFamily: MONO_FONT }}
                >
                  ▸ próxima ação
                </div>
                <button
                  type="button"
                  onClick={() => goToView("matrix")}
                  className="inline-flex items-center gap-2 text-[16px] font-bold text-[var(--ink)] underline-offset-4 transition-colors hover:text-[var(--lime-ink)] hover:underline"
                  style={{ fontFamily: SANS_FONT }}
                >
                  Abrir Matriz
                  <ArrowRight size={16} />
                </button>
                {winnerHref && (
                  <a
                    href={winnerHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-[var(--ink-3)] transition-colors hover:text-[var(--lime-ink)]"
                    style={{ fontFamily: MONO_FONT }}
                  >
                    Repo {displayName(winner.player)}
                    <ExternalLink size={11} strokeWidth={1.75} />
                  </a>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Next-action cards */}
        <section className="mt-12">
          <div
            className="mb-4 flex items-baseline justify-between text-[11px] uppercase tracking-[0.16em] text-[var(--ink-dim)]"
            style={{ fontFamily: MONO_FONT }}
          >
            <span>▸ 01 · navegação primária</span>
            <span className="text-[var(--ink-3)]">3 modos</span>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <ActionCard
              kbd="02"
              label="Matriz"
              copy="Onde cada player vence e perde dimensão a dimensão. Heatmap denso 25×130 com toggle por player."
              onClick={() => goToView("matrix")}
            />
            <ActionCard
              kbd="04"
              label="Pesos"
              copy="Arraste sliders para ver se o ranking muda. Persona presets aplicam recortes pré-calibrados. URL preserva."
              onClick={() => goToView("weights")}
            />
            <ActionCard
              kbd="05"
              label="Personas"
              copy={`${personaCount} cenários (acadêmico, founder, agência…). Cada um aponta um vencedor diferente.`}
              onClick={() => goToView("personas")}
            />
          </div>
        </section>

        {/* Provenance footer */}
        <footer
          className="mt-12 grid gap-4 border-t border-[var(--rule)] pt-6 text-[11px] uppercase tracking-[0.14em] text-[var(--ink-dim)] sm:grid-cols-5"
          style={{ fontFamily: MONO_FONT }}
        >
          <ProvenanceItem label="Bench date" value={activeRun?.date || "—"} />
          <ProvenanceItem label="Método" value={matrix?.method || "weighted"} />
          <ProvenanceItem label="Players" value={String(playerCount)} />
          <ProvenanceItem label="Dimensões" value={String(dimensionCount)} />
          <ProvenanceItem label="Fontes auditadas" value={String(sourceCount)} />
        </footer>

        {gapItems.length > 0 && (
          <p
            className="mt-6 text-[12.5px] italic text-[var(--ink-3)]"
            style={{ fontFamily: SERIF_FONT }}
          >
            {gapItems.length} {gapItems.length === 1 ? "gap aberto" : "gaps abertos"} para absorção.{" "}
            <button
              onClick={() => goToView("roadmap")}
              className="font-semibold text-[var(--ink-2)] underline underline-offset-2 transition-colors hover:text-[var(--lime-ink)]"
            >
              Ver detalhes em Execução →
            </button>
          </p>
        )}
      </article>
    </LightScrollArea>
  )
}

function PlayerInlineLink({ name, href }: { name: string; href: string | null }) {
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-[var(--ink)] underline decoration-[var(--ink-dim)] decoration-1 underline-offset-2 transition-colors hover:text-[var(--lime-ink)] hover:decoration-[var(--lime-ink)]"
        title={`Abrir ${name} em nova aba`}
      >
        {name}
      </a>
    )
  }
  return <strong className="font-semibold text-[var(--ink)]">{name}</strong>
}

function DecisaoMetric({
  label,
  value,
  last = false,
  bottom = false,
}: {
  label: string
  value: string
  last?: boolean
  bottom?: boolean
}) {
  return (
    <div
      className={`flex flex-col gap-1.5 ${last ? "" : "border-r"} ${bottom ? "" : "border-b"} border-black/15 ${last ? "pl-3" : "pr-3"} ${bottom ? "pt-3" : "pb-3"}`}
    >
      <span
        className="text-[9.5px] font-bold uppercase opacity-60"
        style={{ fontFamily: MONO_FONT, letterSpacing: "0.20em" }}
      >
        {label}
      </span>
      <span
        className="text-[26px] font-black leading-none tracking-[-0.03em]"
        style={{ fontFamily: DISPLAY_FONT }}
      >
        {value}
      </span>
    </div>
  )
}

function MetricCell({
  label,
  value,
  accent = "neutral",
  last = false,
}: {
  label: string
  value: string
  accent?: "lime" | "warn" | "neutral"
  last?: boolean
}) {
  return (
    <div className={`flex flex-col gap-2 px-5 py-4 ${last ? "" : "border-r border-[var(--rule-soft)]"}`}>
      <span
        className="text-[10px] uppercase tracking-[0.18em] text-[var(--ink-dim)]"
        style={{ fontFamily: MONO_FONT }}
      >
        {label}
      </span>
      <span
        className="text-[28px] font-black leading-none tracking-[-0.02em]"
        style={{
          fontFamily: DISPLAY_FONT,
          color: accent === "lime" ? "var(--lime-ink)" : accent === "warn" ? "var(--warning-ink)" : "var(--ink)",
        }}
      >
        {value}
      </span>
    </div>
  )
}

function ActionCard({
  kbd,
  label,
  copy,
  onClick,
}: {
  kbd: string
  label: string
  copy: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative grid gap-3 overflow-hidden border border-[var(--rule)] bg-[var(--paper-alt)] p-5 text-left transition-all hover:-translate-y-0.5 hover:border-[var(--lime-ink)] hover:bg-[var(--paper)]"
    >
      <div className="flex items-center justify-between">
        <span
          className="text-[10px] uppercase tracking-[0.16em] text-[var(--ink-dim)] transition-colors group-hover:text-[var(--lime-ink)]"
          style={{ fontFamily: MONO_FONT }}
        >
          ▸ {kbd}
        </span>
        <ArrowRight
          size={15}
          strokeWidth={1.75}
          className="text-[var(--ink-3)] transition-all group-hover:translate-x-1 group-hover:text-[var(--lime-ink)]"
        />
      </div>
      <div
        className="text-[24px] font-black tracking-[-0.04em] text-[var(--ink)]"
        style={{ fontFamily: DISPLAY_FONT }}
      >
        {label}
      </div>
      <p
        className="text-[12.5px] leading-[1.55] text-[var(--ink-3)]"
        style={{ fontFamily: SANS_FONT }}
      >
        {copy}
      </p>
    </button>
  )
}

function ProvenanceItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[var(--ink-dim)]">{label}</div>
      <div className="mt-1 font-bold tracking-[0.06em] text-[var(--ink-2)]">{value}</div>
    </div>
  )
}

function weightsFromMatrix(matrix: ObservatoryMatrix): Record<string, number> {
  const out: Record<string, number> = {}
  for (const row of matrix.rows) {
    const raw = Number(row.weight) || 0
    out[row.id] = Math.round(raw <= 1 ? raw * 100 : raw)
  }
  return out
}
