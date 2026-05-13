"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import type {
  ObservatoryCliff,
  ObservatoryEditorsNote,
  ObservatoryDecisionNode,
  ObservatoryDocument,
  ObservatoryGapItem,
  ObservatoryPersona,
  ObservatoryPlayer,
  ObservatoryPlayerProfile,
  ObservatorySource_Entry,
  ObservatoryTco,
  ObservatoryTiebreaker,
} from "../foundations/types"
import { ArtifactRow } from "../molecules/artifact-row"
import { LightScrollArea } from "../molecules/light-scroll-area"
import { PersonaCard } from "../molecules/persona-card"
import { PlayerCard } from "../molecules/player-card"
import { SourceRow } from "../molecules/source-row"
import { TcoRow } from "../molecules/tco-row"
import { TierFilter } from "../molecules/tier-filter"
import { type InspectorTab, type TierFilterKey } from "../foundations/constants"
import type { ReaderMode } from "../foundations/constants"
import { MONO_FONT, SERIF_FONT } from "../foundations/theme"
import { formatBytes } from "../foundations/utils"

/* Organism — right-side inspector aside, 320px wide.
 * Persistent companion to the reader: 4 tabs Files | Health | Sources | Players.
 *
 * Coexists with bottom CloserStrip:
 *   - InspectorPane = vertical, deep, persistent. 4 contexts.
 *   - CloserStrip   = horizontal, focused, collapsible. Run timeline + flow. */
export function InspectorPane({
  artifactDocs,
  selectedFile,
  onSelectFile,
  topSources,
  players,
  personas = [],
  tco = null,
  tiebreakers = [],
  cliffs = [],
  decisionTree = [],
  categorical = [],
  gapItems = [],
  editorsNote = null,
  playerProfiles = [],
  availableModes = [],
}: {
  artifactDocs: ObservatoryDocument[]
  selectedFile: string
  onSelectFile: (file: string) => void
  topSources: ObservatorySource_Entry[]
  players: ObservatoryPlayer[]
  personas?: ObservatoryPersona[]
  tco?: ObservatoryTco | null
  tiebreakers?: ObservatoryTiebreaker[]
  cliffs?: ObservatoryCliff[]
  decisionTree?: ObservatoryDecisionNode[]
  categorical?: Array<{ dimension: string; winner: string; loser: string; note: string }>
  gapItems?: ObservatoryGapItem[]
  editorsNote?: ObservatoryEditorsNote | null
  playerProfiles?: ObservatoryPlayerProfile[]
  availableModes?: ReaderMode[]
}) {
  const [tab, setTab] = useState<InspectorTab>("files")
  const [tierFilter, setTierFilter] = useState<TierFilterKey>("all")

  const filteredPlayers = players.filter((p) => tierFilter === "all" || p.tier === tierFilter)

  const hasCenterMode = (mode: ReaderMode) => availableModes.includes(mode)

  /* Sidebar is complementary to the center reader. If a rich block already has
     a full-width center mode, keep it out of the inspector to avoid duplicated
     information competing for attention. */
  const tabs: Array<[InspectorTab, string, number]> = [
    ["files", "Files", artifactDocs.length],
  ]
  if (topSources.length > 0 && !hasCenterMode("sources")) tabs.push(["sources", "Sources", topSources.length])
  if (players.length > 0 && !hasCenterMode("players")) tabs.push(["players", "Players", players.length])
  if (personas.length > 0 && !hasCenterMode("personas")) tabs.push(["personas", "Personas", personas.length])
  if (tco && !hasCenterMode("tco")) tabs.push(["tco", "TCO", tco.scenarios.length])
  const hasDecision = categorical.length > 0 || decisionTree.length > 0 || tiebreakers.length > 0 || cliffs.length > 0 || Boolean(editorsNote)
  if (hasDecision && !hasCenterMode("decision")) tabs.push(["decision", "Decision", categorical.length + tiebreakers.length + cliffs.length])
  if (gapItems.length > 0) tabs.push(["gaps", "Gaps", gapItems.length])

  /* Auto-pick first available tab when current goes away after data change */
  useEffect(() => {
    if (tabs.some(([k]) => k === tab)) return
    setTab(tabs[0]?.[0] ?? "files")
  }, [tab, tabs])

  return (
    <aside className="flex min-h-0 flex-col overflow-hidden border-l border-[var(--rule)] bg-[var(--paper-alt)]">
      {/* Tabs header */}
      <div
        className="flex shrink-0 overflow-x-auto border-b border-[var(--rule)] [scrollbar-width:thin]"
        role="tablist"
        aria-label="Inspector"
      >
        {tabs.map(([k, label, count]) => {
          const active = tab === k
          return (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(k)}
              className={cn(
                "flex h-11 min-w-[70px] flex-1 items-center justify-center gap-1 border-r border-[var(--rule)] px-2 transition-colors last:border-r-0",
                active ? "bg-[var(--paper)] text-[var(--ink)]" : "text-[var(--ink-3)] hover:bg-[var(--paper)]",
              )}
              style={{ fontFamily: MONO_FONT }}
            >
              <span className="truncate text-[10px] uppercase tracking-[0.1em]">{label}</span>
              <span className={cn("text-[10px]", active ? "text-[var(--ink-dim)]" : "text-[var(--ink-dim)]")}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div className="min-h-0 flex-1">
        {tab === "files" && (
          <LightScrollArea className="h-full" fadeColor="var(--paper-alt)">
            <FilesPane artifactDocs={artifactDocs} selectedFile={selectedFile} onSelectFile={onSelectFile} />
          </LightScrollArea>
        )}
        {tab === "sources" && (
          <LightScrollArea className="h-full" fadeColor="var(--paper-alt)">
            <SourcesPane sources={topSources} />
          </LightScrollArea>
        )}
        {tab === "players" && (
          <PlayersPane
            players={filteredPlayers}
            totalPlayers={players.length}
            tierFilter={tierFilter}
            onTierChange={setTierFilter}
          />
        )}
        {tab === "personas" && (
          <LightScrollArea className="h-full" fadeColor="var(--paper-alt)">
            <PersonasInspectorPane personas={personas} playerProfiles={playerProfiles} />
          </LightScrollArea>
        )}
        {tab === "tco" && tco && (
          <LightScrollArea className="h-full" fadeColor="var(--paper-alt)">
            <TcoInspectorPane tco={tco} />
          </LightScrollArea>
        )}
        {tab === "decision" && (
          <LightScrollArea className="h-full" fadeColor="var(--paper-alt)">
            <DecisionInspectorPane
              decisionTree={decisionTree}
              tiebreakers={tiebreakers}
              cliffs={cliffs}
              categorical={categorical}
            />
          </LightScrollArea>
        )}
        {tab === "gaps" && (
          <LightScrollArea className="h-full" fadeColor="var(--paper-alt)">
            <GapsPane gaps={gapItems} />
          </LightScrollArea>
        )}
      </div>
    </aside>
  )
}

/* ── Personas pane (inspector — compact) ────────────────────────────── */

function PersonasInspectorPane({
  personas,
  playerProfiles,
}: {
  personas: ObservatoryPersona[]
  playerProfiles: ObservatoryPlayerProfile[]
}) {
  if (personas.length === 0) {
    return (
      <div
        className="px-4 py-5 text-[14px] italic leading-[1.5] text-[var(--ink-3)]"
        style={{ fontFamily: SERIF_FONT }}
      >
        Nenhuma persona estruturada.
      </div>
    )
  }
  const colorByKey = new Map<string, string>()
  for (const p of playerProfiles) if (p.color) colorByKey.set(p.key, p.color)
  const palette = ["#7C9F3F", "#4F7CAC", "#C97A4A", "#8B6FB0", "#10B981"]
  const playerColor = (player: string, idx: number) =>
    colorByKey.get(player) ?? palette[idx % palette.length]

  return (
    <div className="space-y-3 p-3">
      {personas.map((p) => (
        <PersonaCard key={p.id} persona={p} playerColor={playerColor} />
      ))}
    </div>
  )
}

/* ── TCO pane (inspector — compact) ─────────────────────────────────── */

function TcoInspectorPane({ tco }: { tco: ObservatoryTco }) {
  return (
    <div className="space-y-5 p-3">
      {tco.scenarios.map((scenario) => (
        <section key={scenario.id} className="border-t border-[var(--rule)] pt-3">
          <h4
            className="text-[11px] uppercase tracking-[0.16em] text-[var(--ink-3)]"
            style={{ fontFamily: MONO_FONT }}
          >
            {scenario.id.toUpperCase()}
          </h4>
          {scenario.label && (
            <span
              className="mt-1 block text-[11px] italic text-[var(--ink-3)]"
              style={{ fontFamily: SERIF_FONT }}
            >
              {scenario.label}
            </span>
          )}
          <div className="mt-2">
            {scenario.rows.map((row, idx) => (
              <TcoRow
                key={`${scenario.id}-${row.player}-${idx}`}
                player={row.player}
                setup={row.setup}
                low={row.low}
                high={row.high}
                baseline={row.baseline}
                currency={tco.currency}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

/* ── Decision pane (inspector — compact) ────────────────────────────── */

function DecisionInspectorPane({
  decisionTree,
  tiebreakers,
  cliffs,
  categorical,
}: {
  decisionTree: ObservatoryDecisionNode[]
  tiebreakers: ObservatoryTiebreaker[]
  cliffs: ObservatoryCliff[]
  categorical: Array<{ dimension: string; winner: string; loser: string; note: string }>
}) {
  if (categorical.length === 0 && decisionTree.length === 0 && tiebreakers.length === 0 && cliffs.length === 0) {
    return (
      <div
        className="px-4 py-5 text-[14px] italic leading-[1.5] text-[var(--ink-3)]"
        style={{ fontFamily: SERIF_FONT }}
      >
        Nenhum dado de decisão.
      </div>
    )
  }
  return (
    <div className="space-y-5 p-3">
      {categorical.length > 0 && (
        <section>
          <h4
            className="text-[11px] uppercase tracking-[0.16em] text-[var(--ink-3)]"
            style={{ fontFamily: MONO_FONT }}
          >
            Winners · {categorical.length}
          </h4>
          <div className="mt-2 space-y-2">
            {categorical.map((item, index) => (
              <div key={`${item.dimension}-${index}`} className="border-l-2 border-[var(--lime-ink)] pl-3">
                <span
                  className="block text-[11px] uppercase tracking-[0.12em] text-[var(--ink-3)]"
                  style={{ fontFamily: MONO_FONT }}
                >
                  {item.dimension}
                </span>
                <span className="block text-[12px] font-bold text-[var(--ink)]">
                  {item.winner}
                  {item.loser ? ` > ${item.loser}` : ""}
                </span>
                {item.note && (
                  <span
                    className="block text-[11px] italic leading-[1.45] text-[var(--ink-2)]"
                    style={{ fontFamily: SERIF_FONT }}
                  >
                    {item.note}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
      {decisionTree.length > 0 && (
        <section>
          <h4
            className="text-[11px] uppercase tracking-[0.16em] text-[var(--ink-3)]"
            style={{ fontFamily: MONO_FONT }}
          >
            Tree
          </h4>
          <div className="mt-2 space-y-2">
            {decisionTree.map((n, i) => (
              <div key={i} className="border-l-2 border-[var(--ink-faint)] pl-3">
                <span
                  className="block text-[12px] font-bold text-[var(--ink)]"
                  style={{ fontFamily: MONO_FONT }}
                >
                  {n.q}
                </span>
                <span
                  className="mt-0.5 block text-[11px] text-[var(--lime-ink)]"
                  style={{ fontFamily: MONO_FONT }}
                >
                  yes → {n.yes || "—"}
                </span>
                <span
                  className="block text-[11px] text-[var(--ink-3)]"
                  style={{ fontFamily: MONO_FONT }}
                >
                  no → {n.no || "—"}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
      {tiebreakers.length > 0 && (
        <section>
          <h4
            className="text-[11px] uppercase tracking-[0.16em] text-[var(--ink-3)]"
            style={{ fontFamily: MONO_FONT }}
          >
            Tiebreakers · {tiebreakers.length}
          </h4>
          <div className="mt-2 space-y-2">
            {tiebreakers.map((tb) => (
              <div key={tb.id} className="border-l-2 border-[var(--ink-faint)] pl-3">
                <span
                  className="block text-[12px] text-[var(--ink)]"
                  style={{ fontFamily: MONO_FONT }}
                >
                  <strong>{tb.id}.</strong> {tb.q}
                </span>
                {tb.yes && (
                  <span
                    className="mt-0.5 block text-[11px] text-[var(--lime-ink)]"
                    style={{ fontFamily: MONO_FONT }}
                  >
                    yes → {tb.yes}
                  </span>
                )}
                {tb.no && (
                  <span
                    className="block text-[11px] text-[var(--ink-3)]"
                    style={{ fontFamily: MONO_FONT }}
                  >
                    no → {tb.no}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
      {cliffs.length > 0 && (
        <section>
          <h4
            className="text-[11px] uppercase tracking-[0.16em] text-[var(--ink-3)]"
            style={{ fontFamily: MONO_FONT }}
          >
            Cliffs · {cliffs.length}
          </h4>
          <div className="mt-2 space-y-2">
            {cliffs.map((c, i) => (
              <div key={i} className="border-l-2 border-[var(--warning-ink)] pl-3">
                <span
                  className="block text-[11px] uppercase tracking-[0.12em] text-[var(--warning-ink)]"
                  style={{ fontFamily: MONO_FONT }}
                >
                  {c.player}
                </span>
                <span
                  className="mt-0.5 block text-[12px] font-bold text-[var(--ink)]"
                  style={{ fontFamily: "var(--font-bb-sans), system-ui" }}
                >
                  {c.trigger}
                </span>
                <span
                  className="block text-[11px] italic leading-[1.45] text-[var(--ink-2)]"
                  style={{ fontFamily: SERIF_FONT }}
                >
                  {c.impact}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function GapsPane({ gaps }: { gaps: ObservatoryGapItem[] }) {
  return (
    <div className="space-y-3 p-3">
      {gaps.map((gap) => (
        <section key={gap.id} className="border border-[var(--rule-soft)] bg-[var(--paper)] p-3">
          <div
            className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.14em] text-[var(--ink-3)]"
            style={{ fontFamily: MONO_FONT }}
          >
            <span>{gap.id}</span>
            <span>{gap.priority || "—"}</span>
          </div>
          <h4 className="mt-2 text-[13px] font-bold leading-tight text-[var(--ink)]">
            {gap.title}
          </h4>
          {gap.complexity && (
            <div
              className="mt-2 text-[10px] uppercase tracking-[0.12em] text-[var(--ink-dim)]"
              style={{ fontFamily: MONO_FONT }}
            >
              complexity · {gap.complexity}
            </div>
          )}
          {gap.rationale && (
            <p
              className="mt-2 text-[12px] italic leading-[1.5] text-[var(--ink-2)]"
              style={{ fontFamily: SERIF_FONT }}
            >
              {gap.rationale}
            </p>
          )}
        </section>
      ))}
    </div>
  )
}

/* ── Files pane ─────────────────────────────────────────────────────── */

function FilesPane({
  artifactDocs,
  selectedFile,
  onSelectFile,
}: {
  artifactDocs: ObservatoryDocument[]
  selectedFile: string
  onSelectFile: (file: string) => void
}) {
  return (
    <ol className="m-0 list-none p-0">
      {artifactDocs.map((doc, i) => (
        <ArtifactRow
          key={doc.file}
          index={i}
          title={artifactTitle(doc)}
          subtitle={artifactSubtitle(doc)}
          file={doc.file}
          bytes={doc.bytes}
          isActive={doc.file === selectedFile}
          onSelect={() => onSelectFile(doc.file)}
        />
      ))}
    </ol>
  )
}

function artifactTitle(doc: ObservatoryDocument): string {
  const byPhase: Record<string, string> = {
    artifact: "Observatory Map",
    workflow: "Workflow Report",
    tasks: "Tasks Report",
    gates: "Gates Report",
    score: "Score Report",
    process: "Process Report",
    domain: "Domain Report",
    dependencies: "Dependency Report",
    executors: "Executor Report",
    query: "Query Original",
    prompt: "Research Prompt",
    report: "Research Report",
    recommend: "Recommendations",
    overview: "Visão Geral",
    metrics: "Metrics",
    state: "Pipeline State",
    log: "Execution Log",
  }
  if (byPhase[doc.phase]) return byPhase[doc.phase]
  const cleaned = doc.file
    .replace(/\.[^.]+$/, "")
    .replace(/^\d+-/, "")
    .replace(/_/g, "-")
    .split("-")
    .filter(Boolean)
    .map((part) => {
      if (/^(ai|llm|api|ui|ux|yaml|json|md)$/i.test(part)) return part.toUpperCase()
      if (/^followup$/i.test(part)) return "Follow-up"
      return part.charAt(0).toUpperCase() + part.slice(1)
    })
    .join(" ")
  return cleaned || doc.file
}

function artifactSubtitle(doc: ObservatoryDocument): string {
  const heading = extractFirstHeading(doc.content)
  if (heading) return `${heading} · ${formatBytes(doc.bytes)}`
  return `${doc.file} · ${formatBytes(doc.bytes)}`
}

function extractFirstHeading(content: string): string {
  const match = content.match(/^#\s+(.+)$/m)
  if (!match) return ""
  return match[1]
    .replace(/\s+/g, " ")
    .replace(/^research:\s*/i, "")
    .trim()
}

/* ── Sources pane ───────────────────────────────────────────────────── */

function SourcesPane({ sources }: { sources: ObservatorySource_Entry[] }) {
  if (sources.length === 0) {
    return (
      <div
        className="px-4 py-5 text-[14px] italic leading-[1.5] text-[var(--ink-3)]"
        style={{ fontFamily: SERIF_FONT }}
      >
        Nenhum <code className="rounded bg-[var(--paper-deep)] px-1 not-italic text-[12px]">sources.yaml</code>{" "}
        normalizado encontrado para esta pesquisa.
      </div>
    )
  }
  return (
    <div className="m-0 p-0">
      {sources.map((s, i) => (
        <SourceRow
          key={s.id}
          index={i}
          title={s.title}
          url={s.url}
          credibility={s.credibility}
          date={s.date}
          flags={s.flags}
        />
      ))}
    </div>
  )
}

/* ── Players pane ───────────────────────────────────────────────────── */

function PlayersPane({
  players,
  totalPlayers,
  tierFilter,
  onTierChange,
}: {
  players: ObservatoryPlayer[]
  totalPlayers: number
  tierFilter: TierFilterKey
  onTierChange: (v: TierFilterKey) => void
}) {
  if (totalPlayers === 0) {
    return (
      <div
        className="px-4 py-5 text-[14px] italic leading-[1.5] text-[var(--ink-3)]"
        style={{ fontFamily: SERIF_FONT }}
      >
        Nenhum <code className="rounded bg-[var(--paper-deep)] px-1 not-italic text-[12px]">players.yaml</code>{" "}
        extraído para esta pesquisa.
      </div>
    )
  }
  return (
    <div className="flex h-full flex-col">
      <TierFilter
        value={tierFilter}
        onChange={onTierChange}
        filteredCount={players.length}
        totalCount={totalPlayers}
      />
      <LightScrollArea className="min-h-0 flex-1" fadeColor="var(--paper-alt)">
        <div className="m-0 p-0">
          {players.map((p) => (
            <PlayerCard
              key={p.id}
              number={p.number}
              name={p.name}
              tier={p.tier}
              category={p.category}
              whatItDoes={p.whatItDoes}
              whatItDoesNot={p.whatItDoesNot}
              insight={p.insight}
              sourceTitle={p.sourceTitle}
              sourceUrl={p.sourceUrl}
              sourceDate={p.sourceDate}
              excluded={p.excluded}
              exclusionReason={p.exclusionReason}
            />
          ))}
        </div>
      </LightScrollArea>
    </div>
  )
}
