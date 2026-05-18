"use client"

import { cn } from "@/lib/utils"
import { LightScrollArea } from "../molecules/light-scroll-area"
import { DISPLAY_FONT, MONO_FONT, SANS_FONT, SERIF_FONT } from "../foundations/theme"
import type { ObservatoryData } from "../foundations/types"

/* Organisms cross-poll do research-mode para bench-mode (2026-05-18).
 *
 * Bench tem dados de curiosity (curiosity-queue.yaml) e waves
 * (execution-log.jsonl) sidecar files, mas o adapter histórico não os
 * expunha como modes. Esses organisms renderizam os dados tipados
 * propagados via ObservatoryData.curiosity / ObservatoryData.waves.
 *
 * Padrão visual: mesma DNA do bench (matrix/duel/weights) —
 * dark editorial, lime accent, mono labels, display headlines.
 * Não reusa os renderers de research pq eles assumem documents[]
 * markdown shape; aqui temos shape estruturado tipado. */

export type BenchCuriosity = ObservatoryData["curiosity"]
export type BenchWaves = ObservatoryData["waves"]

/* ─── Curiosity ─── */

export function BenchCuriosityView({ curiosity }: { curiosity: BenchCuriosity }) {
  if (curiosity.length === 0) {
    return (
      <div className="flex-1 px-4 pt-5 sm:px-6 sm:pt-6 lg:px-10 lg:pt-7">
        <p
          className="text-[14px] italic text-[var(--ink-3)]"
          style={{ fontFamily: SERIF_FONT }}
        >
          Nenhuma pergunta aberta neste bench.
        </p>
      </div>
    )
  }

  const byPriority = (p: string) => {
    const norm = p.toUpperCase()
    if (norm === "HIGH" || norm === "P1") return 0
    if (norm === "MEDIUM" || norm === "P2") return 1
    return 2
  }
  const sorted = [...curiosity].sort((a, b) => byPriority(a.priority) - byPriority(b.priority))
  const high = sorted.filter((q) => /^(HIGH|P1)$/i.test(q.priority)).length
  const medium = sorted.filter((q) => /^(MEDIUM|P2)$/i.test(q.priority)).length

  return (
    <LightScrollArea
      className="flex-1"
      viewportClassName="px-4 pb-12 pt-5 sm:px-6 sm:pb-14 sm:pt-6 lg:px-10 lg:pb-16 lg:pt-7"
    >
      <div className="mx-auto w-full min-w-0 max-w-[920px]">
        <div
          className="mb-2 flex items-baseline gap-3 text-[10px] uppercase tracking-[0.2em] text-[var(--lime-ink)]"
          style={{ fontFamily: MONO_FONT }}
        >
          <span>▸ Perguntas abertas</span>
          <span className="text-[var(--ink-faint)]">·</span>
          <span className="text-[var(--ink-dim)]">{curiosity.length} no total</span>
        </div>
        <h1
          className="text-[clamp(32px,4vw,52px)] font-black leading-[0.95] tracking-[-0.04em] text-[var(--ink)]"
          style={{ fontFamily: DISPLAY_FONT }}
        >
          O que ainda muda a decisão
        </h1>
        <p
          className="mt-3 max-w-[680px] text-[15px] leading-[1.6] text-[var(--ink-2)]"
          style={{ fontFamily: SERIF_FONT }}
        >
          Lacunas com prioridade explícita. Cada uma indica por que importa e a
          próxima ação concreta. {high > 0 && <strong className="text-[var(--lime-ink)]">{high} HIGH</strong>}
          {high > 0 && medium > 0 && " · "}
          {medium > 0 && <strong className="text-[var(--warning-ink)]">{medium} MEDIUM</strong>}.
        </p>

        <div className="mt-7 grid gap-3">
          {sorted.map((q) => (
            <article
              key={q.id}
              className="grid grid-cols-[64px_minmax(0,1fr)] gap-4 border border-[var(--rule)] bg-[var(--paper-alt)] p-5"
            >
              <div className="flex flex-col gap-1.5">
                <span
                  className="text-[10px] font-bold tracking-[0.14em] text-[var(--ink-dim)]"
                  style={{ fontFamily: MONO_FONT }}
                >
                  {q.id}
                </span>
                <PriorityBadge priority={q.priority} />
                {q.category && (
                  <span
                    className="text-[9.5px] uppercase tracking-[0.12em] text-[var(--ink-dim)]"
                    style={{ fontFamily: MONO_FONT }}
                  >
                    {q.category}
                  </span>
                )}
              </div>
              <div className="grid gap-3">
                <h3
                  className="text-[18px] font-black leading-[1.3] tracking-[-0.02em] text-[var(--ink)]"
                  style={{ fontFamily: SANS_FONT }}
                >
                  {q.question}
                </h3>
                {q.whyItMatters && (
                  <div>
                    <div
                      className="text-[10px] uppercase tracking-[0.14em] text-[var(--ink-dim)]"
                      style={{ fontFamily: MONO_FONT }}
                    >
                      ▸ Por que importa
                    </div>
                    <p
                      className="mt-1 text-[13.5px] italic leading-[1.55] text-[var(--ink-2)]"
                      style={{ fontFamily: SERIF_FONT }}
                    >
                      {q.whyItMatters}
                    </p>
                  </div>
                )}
                {q.nextAction && (
                  <div className="border-l-2 border-[var(--lime-ink)] pl-3">
                    <div
                      className="text-[10px] uppercase tracking-[0.14em] text-[var(--lime-ink)]"
                      style={{ fontFamily: MONO_FONT }}
                    >
                      ▸ Próxima ação
                    </div>
                    <p
                      className="mt-1 text-[13.5px] leading-[1.55] text-[var(--ink)]"
                      style={{ fontFamily: SANS_FONT }}
                    >
                      {q.nextAction}
                    </p>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </LightScrollArea>
  )
}

function PriorityBadge({ priority }: { priority: string }) {
  const norm = priority.toUpperCase()
  const tone =
    norm === "HIGH" || norm === "P1"
      ? "border-[var(--lime-ink)]/40 bg-[var(--lime-ink)]/10 text-[var(--lime-ink)]"
      : norm === "MEDIUM" || norm === "P2"
        ? "border-[var(--warning-ink)]/40 bg-[var(--warning-ink)]/10 text-[var(--warning-ink)]"
        : "border-[var(--rule)] bg-transparent text-[var(--ink-dim)]"
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center border px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.14em]",
        tone,
      )}
      style={{ fontFamily: MONO_FONT }}
    >
      {norm.replace(/^P/, "P")}
    </span>
  )
}

/* ─── Waves Timeline ───
   Padrão visual igual Overview/Matrix: hero meta-line tags + hero-grid
   1.6fr/1fr (texto + decisão-panel lime sólido) + verdict-bar com gradient
   + timeline com cards numerados por fase. */

export function BenchWavesView({ waves }: { waves: BenchWaves }) {
  if (waves.length === 0) {
    return (
      <div className="flex-1 px-4 pt-5 sm:px-6 sm:pt-6 lg:px-10 lg:pt-7">
        <p
          className="text-[14px] italic text-[var(--ink-3)]"
          style={{ fontFamily: SERIF_FONT }}
        >
          Nenhum execution-log.jsonl encontrado neste bench.
        </p>
      </div>
    )
  }

  /* Group by phase for visual rhythm */
  const phases: Array<{ key: string; events: typeof waves }> = []
  for (const event of waves) {
    const last = phases[phases.length - 1]
    if (!last || last.key !== event.phase) phases.push({ key: event.phase, events: [event] })
    else last.events.push(event)
  }

  /* Total elapsed */
  const tsFirst = waves.find((w) => w.ts)?.ts
  const tsLast = [...waves].reverse().find((w) => w.ts)?.ts
  const elapsed = tsFirst && tsLast ? humanizeDelta(tsFirst, tsLast) : ""

  /* Stats for stats-panel + verdict-bar */
  const completions = waves.filter((w) => /complete|completed|saturation|success|done/i.test(w.event)).length
  const corrections = waves.filter((w) => /fail|error|correction|veto|halt/i.test(w.event)).length
  const startedCount = waves.filter((w) => /start|started|begin|opened/i.test(w.event)).length
  const lastEvent = waves[waves.length - 1]
  const phaseLabel = lastEvent?.phase ?? "—"
  const verdictTitle = corrections > 0 ? "EXECUÇÃO COM CORREÇÕES" : "EXECUÇÃO LIMPA"
  const verdictNarrative =
    corrections > 0
      ? `Bench teve ${corrections} correção${corrections === 1 ? "" : "ões"} de rota durante a execução — auditável evento a evento abaixo.`
      : `Bench rodou sem correções entre as ${phases.length} fases. Sequência completa e auditável abaixo.`

  return (
    <LightScrollArea
      className="aiox-report-dark flex-1"
      viewportClassName="px-4 pb-16 pt-8 sm:px-6 sm:pt-12 lg:px-12 lg:pt-16"
    >
      <article className="mx-auto w-full min-w-0 max-w-[1280px]">
        {/* Hero meta-line tags */}
        <div className="mb-9 flex flex-wrap items-center gap-3">
          <span
            className="border border-[var(--lime-ink)]/40 px-3.5 py-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--lime-ink)]"
            style={{ fontFamily: MONO_FONT }}
          >
            ▸ WAVES · {phases.length} FASES
          </span>
          <span
            className={cn(
              "border px-3.5 py-1.5 text-[11px] uppercase tracking-[0.16em]",
              corrections > 0
                ? "border-[var(--warning-ink)]/40 text-[var(--warning-ink)]"
                : "border-[var(--lime-ink)]/40 text-[var(--lime-ink)]",
            )}
            style={{ fontFamily: MONO_FONT }}
          >
            ▸ {waves.length} EVENTOS
          </span>
          {elapsed && (
            <span
              className="border border-[var(--rule-strong)] px-3.5 py-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--ink-2)]"
              style={{ fontFamily: MONO_FONT }}
            >
              ▸ DURAÇÃO {elapsed}
            </span>
          )}
        </div>

        {/* Hero grid: narrative + decisão-panel lime */}
        <section className="grid gap-10 lg:grid-cols-[1.6fr_1fr] lg:items-end">
          <div>
            <div
              className="mb-7 text-[12px] uppercase tracking-[0.22em] text-[var(--lime-ink)]"
              style={{ fontFamily: MONO_FONT }}
            >
              ▸ Timeline de execução
            </div>
            <h1
              className="font-black leading-[0.92] tracking-[-0.05em] text-[var(--ink)]"
              style={{ fontFamily: DISPLAY_FONT, fontSize: "clamp(44px, 5.6vw, 88px)" }}
            >
              Como esse bench
              <br />
              foi <span className="text-[var(--lime-ink)]">construído</span>.
            </h1>
            <p
              className="mt-6 max-w-[640px] text-[17px] leading-[1.65] text-[var(--ink-2)]"
              style={{ fontFamily: SERIF_FONT }}
            >
              Sequência auditável de eventos por fase. Mostra onde houve
              correção de rota, descoberta, validação ou ponto de saturação —
              cada linha é uma decisão registrada com timestamp.
            </p>
          </div>

          {/* decisão-panel lime sólido */}
          <aside
            className="relative flex flex-col gap-4 px-8 py-9"
            style={{ background: "var(--lime-ink)", color: "#1a1502" }}
          >
            <span
              className="text-[11px] font-bold uppercase opacity-70"
              style={{ fontFamily: MONO_FONT, letterSpacing: "0.22em" }}
            >
              ▸ Processo
            </span>
            <h2
              className="font-black uppercase leading-none tracking-[-0.04em]"
              style={{
                fontFamily: DISPLAY_FONT,
                fontSize: "clamp(40px, 4.4vw, 56px)",
                color: "#1a1502",
              }}
            >
              {phases.length} fases
            </h2>
            <p className="text-[14.5px] font-medium leading-[1.55]" style={{ fontFamily: SANS_FONT }}>
              {waves.length} eventos registrados em {elapsed || "execução curta"}.
              Última fase: <strong>{phaseLabel}</strong>.
            </p>
            <div className="mt-auto grid grid-cols-2 gap-x-0 gap-y-0 border-t border-black/15 pt-5">
              <DecisaoMetric label="Eventos" value={String(waves.length)} />
              <DecisaoMetric label="Fases" value={String(phases.length)} last />
              <DecisaoMetric
                label="Conclusões"
                value={String(completions)}
                bottom
              />
              <DecisaoMetric
                label={corrections > 0 ? "Correções" : "Inícios"}
                value={String(corrections > 0 ? corrections : startedCount)}
                last
                bottom
              />
            </div>
          </aside>
        </section>

        {/* Verdict-bar gradient */}
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
                ▸ veredito do processo
              </div>
              <div
                className="mt-2 text-[28px] font-black tracking-[-0.04em] text-[var(--lime-ink)]"
                style={{ fontFamily: DISPLAY_FONT }}
              >
                {verdictTitle}
              </div>
            </div>
            <p
              className="text-[14.5px] leading-[1.55] text-[var(--ink-2)]"
              style={{ fontFamily: SANS_FONT }}
            >
              {verdictNarrative}
            </p>
            <div className="grid gap-2 lg:justify-end lg:text-right">
              <div
                className="text-[10px] uppercase tracking-[0.18em] text-[var(--ink-dim)]"
                style={{ fontFamily: MONO_FONT }}
              >
                ▸ último evento
              </div>
              <div className="text-[14px] font-bold text-[var(--ink)]" style={{ fontFamily: SANS_FONT }}>
                {lastEvent ? shortTime(lastEvent.ts) : "—"}
                {lastEvent && (
                  <span className="ml-2 text-[11px] uppercase tracking-[0.12em] text-[var(--ink-dim)]" style={{ fontFamily: MONO_FONT }}>
                    {lastEvent.event}
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Timeline rica — phases com cards numerados */}
        <section className="mt-12 grid gap-8">
          {phases.map((phase, phaseIdx) => (
            <article
              key={phase.key}
              className="grid gap-4 border border-[var(--rule)] bg-[var(--paper-alt)] p-6"
            >
              <header className="flex flex-wrap items-baseline justify-between gap-3 border-b border-[var(--rule-soft)] pb-4">
                <div className="flex items-baseline gap-3">
                  <span
                    className="text-[11px] tabular-nums text-[var(--lime-ink)]"
                    style={{ fontFamily: MONO_FONT }}
                  >
                    ▸ {String(phaseIdx + 1).padStart(2, "0")}
                  </span>
                  <h3
                    className="text-[22px] font-black tracking-[-0.03em] text-[var(--ink)]"
                    style={{ fontFamily: DISPLAY_FONT }}
                  >
                    {phase.key}
                  </h3>
                </div>
                <span
                  className="text-[10px] uppercase tracking-[0.14em] text-[var(--ink-dim)]"
                  style={{ fontFamily: MONO_FONT }}
                >
                  {phase.events.length} {phase.events.length === 1 ? "evento" : "eventos"}
                </span>
              </header>
              <ol className="grid gap-3">
                {phase.events.map((ev, evIdx) => (
                  <li
                    key={`${phase.key}-${evIdx}-${ev.ts}`}
                    className="grid grid-cols-[20px_72px_92px_minmax(0,1fr)] items-baseline gap-3 border-l-2 border-[var(--rule-soft)] py-1 pl-3 transition-colors hover:border-[var(--lime-ink)]/40"
                  >
                    <span
                      className="text-[10px] tabular-nums text-[var(--ink-dim)]"
                      style={{ fontFamily: MONO_FONT }}
                    >
                      {String(evIdx + 1).padStart(2, "0")}
                    </span>
                    <span
                      className="text-[10.5px] tabular-nums text-[var(--ink-3)]"
                      style={{ fontFamily: MONO_FONT }}
                      title={ev.ts}
                    >
                      {shortTime(ev.ts)}
                    </span>
                    <EventChip event={ev.event} wave={ev.wave} />
                    <span
                      className="text-[14px] leading-[1.55] text-[var(--ink-2)]"
                      style={{ fontFamily: SANS_FONT }}
                    >
                      {ev.summary}
                    </span>
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </section>
      </article>
    </LightScrollArea>
  )
}

/* DecisaoMetric — espelha exatamente o helper de BenchOverviewView pra
   manter consistência visual da decisão-panel lime. */
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

function EventChip({ event, wave }: { event: string; wave: number | null }) {
  const norm = event.toLowerCase()
  const tone =
    /complete|completed|saturation|success|done/.test(norm)
      ? "border-[var(--lime-ink)]/40 text-[var(--lime-ink)]"
      : /fail|error|correction|veto|halt/.test(norm)
        ? "border-[var(--warning-ink)]/40 text-[var(--warning-ink)]"
        : /start|started|begin|opened/.test(norm)
          ? "border-[var(--ink-2)]/40 text-[var(--ink-2)]"
          : "border-[var(--rule)] text-[var(--ink-3)]"
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center border px-1.5 py-0.5 text-[9.5px] uppercase tracking-[0.1em]",
        tone,
      )}
      style={{ fontFamily: MONO_FONT }}
      title={wave !== null ? `Wave ${wave} · ${event}` : event}
    >
      {wave !== null ? `W${wave}` : event.slice(0, 8)}
    </span>
  )
}

function shortTime(iso: string): string {
  if (!iso) return "—"
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso.slice(11, 16)
    return d.toTimeString().slice(0, 5)
  } catch {
    return iso.slice(11, 16) || "—"
  }
}

function humanizeDelta(from: string, to: string): string {
  try {
    const a = new Date(from).getTime()
    const b = new Date(to).getTime()
    if (Number.isNaN(a) || Number.isNaN(b)) return ""
    const diffMs = Math.abs(b - a)
    const min = Math.round(diffMs / 60000)
    if (min < 60) return `${min} min`
    const hrs = Math.floor(min / 60)
    const rem = min % 60
    return rem ? `${hrs}h${String(rem).padStart(2, "0")}` : `${hrs}h`
  } catch {
    return ""
  }
}
