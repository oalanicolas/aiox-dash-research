import { type ReactNode, type RefObject } from "react"
import dynamic from "next/dynamic"
import { ExternalLink } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import YAML from "yaml"
import { cn } from "@/lib/utils"
import { LightScrollArea } from "../molecules/light-scroll-area"
import { PlayerCard } from "../molecules/player-card"
import { ScatterChart, type ScatterPoint } from "../molecules/scatter-chart"
import { TaxonomyList, type TaxonomyItem } from "../molecules/taxonomy-list"
import { TimelineChart, type TimelinePoint } from "../molecules/timeline-chart"
import { markdownComponents } from "../foundations/markdown-components"
import type {
  ObservatoryCliff,
  ObservatoryCategoricalWinner,
  ObservatoryDecisionNode,
  ObservatoryDocument,
  ObservatoryEditorsNote,
  ObservatoryMatrix,
  ObservatoryPersona,
  ObservatoryPlayer,
  ObservatoryPlayerProfile,
  ObservatoryRunSummary,
  ObservatoryScoreDimension,
  ObservatoryMetric,
  ObservatorySource_Entry,
  ObservatoryTco,
  ObservatoryTiebreaker,
  ObservatoryTypeSpecific,
} from "../foundations/types"
import type { ObservatorySource, ReaderMode } from "../foundations/constants"
import { coverageNumeric, formatBytes, statusKeyFromRaw } from "../foundations/utils"
import { DISPLAY_FONT, MONO_FONT, SERIF_FONT, observatoryDarkThemeVars } from "../foundations/theme"

const MatrixView = dynamic(() => import("./matrix-view").then((mod) => mod.MatrixView), {
  loading: () => <ReportLoader label="Matrix" />,
})
const DuelView = dynamic(() => import("./duel-view").then((mod) => mod.DuelView), {
  loading: () => <ReportLoader label="Duel" />,
})
const PersonasView = dynamic(() => import("./personas-view").then((mod) => mod.PersonasView), {
  loading: () => <ReportLoader label="Personas" />,
})
const TcoView = dynamic(() => import("./tco-view").then((mod) => mod.TcoView), {
  loading: () => <ReportLoader label="TCO" />,
})
const CoverageView = dynamic(() => import("./coverage-view").then((mod) => mod.CoverageView), {
  loading: () => <ReportLoader label="Coverage" />,
})
const DecisionView = dynamic(() => import("./decision-view").then((mod) => mod.DecisionView), {
  loading: () => <ReportLoader label="Decision" />,
})
const WeightsView = dynamic(() => import("./weights-view").then((mod) => mod.WeightsView), {
  loading: () => <ReportLoader label="Weights" />,
})
const SinkraMapReport = dynamic(() => import("./sinkra-map-report").then((mod) => mod.SinkraMapReport), {
  loading: () => <ReportLoader label="SINKRA Map" dark />,
})
const SinkraFlowReport = dynamic(() => import("./sinkra-map-report").then((mod) => mod.SinkraFlowReport), {
  loading: () => <ReportLoader label="Fluxo" dark />,
})
const SinkraAutomationReport = dynamic(() => import("./sinkra-map-report").then((mod) => mod.SinkraAutomationReport), {
  loading: () => <ReportLoader label="Automação" dark />,
})
const SinkraGovernanceReport = dynamic(() => import("./sinkra-map-report").then((mod) => mod.SinkraGovernanceReport), {
  loading: () => <ReportLoader label="Governança" dark />,
})
const SinkraAccountabilityReport = dynamic(() => import("./sinkra-map-report").then((mod) => mod.SinkraAccountabilityReport), {
  loading: () => <ReportLoader label="RACI" dark />,
})
const SinkraGapsReport = dynamic(() => import("./sinkra-map-report").then((mod) => mod.SinkraGapsReport), {
  loading: () => <ReportLoader label="Gaps" dark />,
})
const SinkraEvidenceReport = dynamic(() => import("./sinkra-map-report").then((mod) => mod.SinkraEvidenceReport), {
  loading: () => <ReportLoader label="Evidências" dark />,
})

/* Organism — reader body. Routes between modes:
 *   - document  → markdown (default for all sources)
 *   - matrix    → grid of ScoreCells (bench)
 *   - personas  → grid of PersonaCards (bench)
 *   - tco       → TCO scenarios table (bench/product)
 *   - decision  → decision tree + tiebreakers + cliffs (bench) */
export function ReaderBody({
  source = "research",
  mode = "document",
  content,
  file,
  bodyRef,
  documents,
  matrix,
  scoreDimensions,
  scoreMetrics,
  runs,
  personas,
  tco,
  tiebreakers,
  cliffs,
  decisionTree,
  categorical,
  editorsNote,
  playerProfiles,
  topSources,
  researchPlayers,
  sourceSummary,
  typeSpecific,
}: {
  source?: ObservatorySource
  mode?: ReaderMode
  content: string
  file?: string
  bodyRef: RefObject<HTMLDivElement | null>
  documents?: ObservatoryDocument[]
  matrix?: ObservatoryMatrix | null
  scoreDimensions?: ObservatoryScoreDimension[]
  scoreMetrics?: ObservatoryMetric[]
  runs?: ObservatoryRunSummary[]
  personas?: ObservatoryPersona[]
  tco?: ObservatoryTco | null
  tiebreakers?: ObservatoryTiebreaker[]
  cliffs?: ObservatoryCliff[]
  decisionTree?: ObservatoryDecisionNode[]
  categorical?: ObservatoryCategoricalWinner[]
  editorsNote?: ObservatoryEditorsNote | null
  playerProfiles?: ObservatoryPlayerProfile[]
  topSources?: ObservatorySource_Entry[]
  researchPlayers?: ObservatoryPlayer[]
  sourceSummary?: string[]
  typeSpecific?: ObservatoryTypeSpecific
}) {
  const benchReport = (children: ReactNode) =>
    source === "bench" ? <BenchReportShell>{children}</BenchReportShell> : children

  if (mode === "overview") {
    return <OverviewView runs={runs ?? []} />
  }
  if (mode === "map") {
    if (source === "research") {
      return (
        <ResearchMapReport
          runs={runs ?? []}
          documents={documents ?? []}
          sources={topSources ?? []}
          players={researchPlayers ?? []}
          sourceSummary={sourceSummary ?? []}
        />
      )
    }
    return <SinkraMapReport sinkra={typeSpecific?.sinkra} />
  }
  if (mode === "curiosity" && source === "research") {
    return <ResearchCuriosityReport documents={documents ?? []} />
  }
  if (mode === "waves" && source === "research") {
    return <ResearchWavesReport runs={runs ?? []} documents={documents ?? []} />
  }
  if (mode === "flow") {
    return <SinkraFlowReport sinkra={typeSpecific?.sinkra} />
  }
  if (mode === "automation") {
    return <SinkraAutomationReport sinkra={typeSpecific?.sinkra} />
  }
  if (mode === "governance") {
    return <SinkraGovernanceReport sinkra={typeSpecific?.sinkra} />
  }
  if (mode === "accountability") {
    return <SinkraAccountabilityReport sinkra={typeSpecific?.sinkra} />
  }
  if (mode === "gaps") {
    return <SinkraGapsReport sinkra={typeSpecific?.sinkra} />
  }
  if (mode === "evidence") {
    return <SinkraEvidenceReport sinkra={typeSpecific?.sinkra} />
  }
  if (mode === "sources") {
    return <SourcesView sources={topSources ?? []} sourceSummary={sourceSummary ?? []} />
  }
  if (mode === "players") {
    return <ResearchPlayersView players={researchPlayers ?? []} />
  }
  if (mode === "score") {
    return benchReport(<ScoreView dimensions={scoreDimensions ?? []} scoreMetrics={scoreMetrics ?? []} />)
  }
  if (mode === "matrix" && matrix) {
    return benchReport(<MatrixView matrix={matrix} playerProfiles={playerProfiles ?? []} />)
  }
  if (mode === "duel" && matrix) {
    return benchReport(<DuelView matrix={matrix} playerProfiles={playerProfiles ?? []} />)
  }
  if (mode === "personas") {
    return benchReport(<PersonasView personas={personas ?? []} playerProfiles={playerProfiles ?? []} />)
  }
  if (mode === "tco" && tco) {
    return benchReport(<TcoView tco={tco} />)
  }
  if (mode === "coverage") {
    return benchReport(
      <CoverageView
        typeSpecific={typeSpecific ?? {}}
        playerProfiles={playerProfiles ?? []}
      />,
    )
  }
  if (mode === "decision") {
    return benchReport(
      <DecisionView
        decisionTree={decisionTree ?? []}
        tiebreakers={tiebreakers ?? []}
        cliffs={cliffs ?? []}
        categorical={categorical ?? []}
        editorsNote={editorsNote ?? null}
      />,
    )
  }
  if (mode === "weights" && matrix) {
    return benchReport(
      <WeightsView
        matrix={matrix}
        personas={personas ?? []}
        playerProfiles={playerProfiles ?? []}
      />,
    )
  }
  if (mode === "workflow") {
    return <SinkraWorkflowView sinkra={typeSpecific?.sinkra} />
  }
  if (mode === "tasks") {
    return <SinkraTasksView sinkra={typeSpecific?.sinkra} />
  }
  if (mode === "gates") {
    return <SinkraGatesView sinkra={typeSpecific?.sinkra} />
  }

  /* Default: document (markdown) */
  if (file && isStructuredArtifact(file)) {
    return <StructuredArtifactView file={file} content={content} bodyRef={bodyRef} />
  }

  return (
    <LightScrollArea ref={bodyRef} className="flex-1" viewportClassName="px-4 pb-12 pt-5 sm:px-6 sm:pb-14 sm:pt-6 lg:px-10 lg:pb-16 lg:pt-7">
      <article className="mx-auto w-full min-w-0 max-w-[720px]">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {content}
        </ReactMarkdown>
      </article>
    </LightScrollArea>
  )
}

function BenchReportShell({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex min-h-0 flex-1 bg-[var(--paper)] text-[var(--ink)]"
      style={observatoryDarkThemeVars}
    >
      {children}
    </div>
  )
}

function ReportLoader({ label, dark = false }: { label: string; dark?: boolean }) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 items-center justify-center border-t border-[var(--rule-soft)]",
        dark && "bg-[var(--aiox-dark,#050505)] text-[var(--aiox-cream-alt,#f5f4e7)]",
      )}
    >
      <div className="grid gap-2 text-center">
        <div
          className={cn(
            "mx-auto h-1.5 w-20 overflow-hidden bg-[var(--ink-faint)]",
            dark && "bg-white/10",
          )}
        >
          <div className="h-full w-1/2 animate-pulse bg-[var(--lime-ink)]" />
        </div>
        <div
          className={cn(
            "text-[10px] uppercase tracking-[0.16em] text-[var(--ink-3)]",
            dark && "text-white/45",
          )}
          style={{ fontFamily: MONO_FONT }}
        >
          Carregando {label}
        </div>
      </div>
    </div>
  )
}

function ResearchMapReport({
  runs,
  documents,
  sources,
  players,
  sourceSummary,
}: {
  runs: ObservatoryRunSummary[]
  documents: ObservatoryDocument[]
  sources: ObservatorySource_Entry[]
  players: ObservatoryPlayer[]
  sourceSummary: string[]
}) {
  const activeRun = runs.find((run) => run.active) ?? runs[0]
  const docMap = new Map(documents.map((doc) => [doc.file, doc]))
  const metrics = asDisplayRecord(parseOptionalArtifact(docMap.get("metrics.yaml")))
  const pipeline = asDisplayRecord(parseOptionalArtifact(docMap.get("pipeline-state.yaml")))
  const graph = asDisplayRecord(parseOptionalArtifact(docMap.get("research-graph.json")))
  const matrices = asDisplayRecord(parseOptionalArtifact(docMap.get("matrices.yaml")))
  const curiosity = asDisplayRecord(parseOptionalArtifact(docMap.get("curiosity_queue.yaml")))
  const uxPatterns = asDisplayRecord(parseOptionalArtifact(docMap.get("ux-patterns.yaml")))
  const events = parseJsonl(docMap.get("execution-log.jsonl")?.content ?? "")

  const breakdown = asDisplayRecord(recordValue(metrics, "coverage_breakdown"))
  const phases = asDisplayRecord(recordValue(pipeline, "phases"))
  const questions = arrayValue(curiosity, "questions").map((item) => asDisplayRecord(item))
  const matrixItems = arrayValue(matrices, "matrices").map((item) => asDisplayRecord(item))
  const patterns = arrayValue(uxPatterns, "patterns").map((item) => asDisplayRecord(item))
  const graphNodes = arrayValue(graph, "nodes").map((item) => asDisplayRecord(item))
  const graphEdges = arrayValue(graph, "edges").map((item) => asDisplayRecord(item))
  const highPriorityQuestions = questions.filter((q) => stringValue(q, "priority", "").toUpperCase() === "HIGH")
  const highCredibilitySources = sources.filter((source) => source.credibility === "HIGH")
  const coverage = numberValue(metrics, "coverage_score") ?? coverageNumeric(activeRun?.coverage) ?? 0
  const integrity = numberValue(metrics, "integrity_score") ?? coverageNumeric(activeRun?.integrity) ?? 0
  const decision = stringValue(metrics, "decision", activeRun?.status ?? "—")
  const stopReason = stringValue(metrics, "stop_reason", "Sem stop reason estruturado.")

  return (
    <LightScrollArea className="flex-1 bg-[#050505]" viewportClassName="bg-[#050505] px-4 pb-12 pt-5 sm:px-6 lg:px-8" fadeColor="#050505">
      <article className="mx-auto w-full min-w-0 max-w-[1440px]" style={observatoryDarkThemeVars}>
        <section className="grid min-w-0 overflow-hidden border border-[#f5f4e7]/16 bg-[#050505] lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 bg-[#10110d] p-6 text-[#f5f4e7] sm:p-8">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#d1ff00]" style={{ fontFamily: MONO_FONT }}>
              Research map
            </p>
            <h2 className="aiox-safe-text mt-3 max-w-[960px] text-[34px] font-black leading-[0.98] tracking-[-0.05em] sm:text-[48px] lg:text-[58px]" style={{ fontFamily: DISPLAY_FONT }}>
              {activeRun?.displayTitle ?? "Pesquisa"}
            </h2>
            <p className="mt-5 max-w-[840px] text-[16px] leading-[1.62] text-[#f5f4e7]/76">
              Painel visual da pesquisa selecionada: score, fases, evidências, perguntas abertas e artefatos que sustentam a decisão.
            </p>
            <div className="mt-6 grid gap-px bg-[#f5f4e7]/10 sm:grid-cols-4">
              <ResearchDarkMetric label="Coverage" value={String(coverage || activeRun?.coverage || "—")} />
              <ResearchDarkMetric label="Integrity" value={String(integrity || activeRun?.integrity || "—")} />
              <ResearchDarkMetric label="Sources" value={String(sources.length || activeRun?.sources || "—")} />
              <ResearchDarkMetric label="Waves" value={String(activeRun?.waves ?? "—")} />
            </div>
          </div>
          <aside className="grid min-w-0 content-between gap-5 bg-[#d1ff00] p-6 text-[#050505] sm:p-8">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] opacity-65" style={{ fontFamily: MONO_FONT }}>
                decisão
              </p>
              <div className="aiox-safe-text mt-2 text-[42px] font-black leading-none tracking-[-0.055em]" style={{ fontFamily: DISPLAY_FONT }}>
                {decision}
              </div>
              <p className="mt-4 text-[15px] font-black leading-[1.46]">{stopReason}</p>
            </div>
            <div className="grid grid-cols-2 gap-px bg-[#050505]/18">
              <ResearchLightMetric label="Artefatos" value={String(documents.length)} />
              <ResearchLightMetric label="Matrizes" value={String(matrixItems.length)} />
              <ResearchLightMetric label="Questões P1" value={String(highPriorityQuestions.length)} />
              <ResearchLightMetric label="Players" value={String(players.length)} />
            </div>
          </aside>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          <section className="aiox-panel bg-[#0f0f11]">
            <ResearchPanelHead eyebrow="pipeline" title="Fases e execução" meta={`${events.length} eventos`} />
            <div className="grid gap-px bg-[#f5f4e7]/10 md:grid-cols-2">
              {Object.entries(phases).map(([phase, status], index) => (
                <div key={phase} className="grid grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-3 bg-[#050505] p-4">
                  <span className="text-[24px] font-black leading-none text-[#f5f4e7]/25" style={{ fontFamily: DISPLAY_FONT }}>{String(index + 1).padStart(2, "0")}</span>
                  <div className="min-w-0">
                    <div className="aiox-safe-text text-[15px] font-black text-[#f5f4e7]">{humanizeResearchLabel(phase)}</div>
                    <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-[#f5f4e7]/38" style={{ fontFamily: MONO_FONT }}>{phase}</div>
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.12em] text-[#d1ff00]" style={{ fontFamily: MONO_FONT }}>{String(status)}</span>
                </div>
              ))}
            </div>
            <div className="grid gap-3 p-4">
              {events.slice(0, 8).map((event, index) => (
                <div key={`${stringValue(event, "ts", String(index))}-${index}`} className="grid gap-3 border border-[#f5f4e7]/10 bg-[#050505] p-3 md:grid-cols-[150px_minmax(0,1fr)_110px]">
                  <div className="text-[10px] uppercase tracking-[0.12em] text-[#f5f4e7]/45" style={{ fontFamily: MONO_FONT }}>{stringValue(event, "ts", "—").replace("T", " ").replace("Z", "")}</div>
                  <div className="min-w-0">
                    <div className="aiox-safe-text text-[14px] font-black text-[#f5f4e7]">{humanizeResearchLabel(stringValue(event, "phase", "evento"))}</div>
                    <p className="mt-1 line-clamp-2 text-[12.5px] leading-[1.45] text-[#f5f4e7]/58">{stringValue(event, "notes", stringValue(event, "action", ""))}</p>
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.12em] text-[#d1ff00]" style={{ fontFamily: MONO_FONT }}>{stringValue(event, "status", "—")}</span>
                </div>
              ))}
            </div>
          </section>

          <aside className="grid content-start gap-6">
            <section className="aiox-panel bg-[#0f0f11]">
              <ResearchPanelHead eyebrow="coverage" title="Breakdown" meta={`${coverage}/100`} />
              <div className="grid gap-3 p-4">
                {Object.entries(breakdown).map(([key, value]) => (
                  <ResearchBar key={key} label={humanizeResearchLabel(key)} value={Number(value) || 0} />
                ))}
              </div>
            </section>
            <section className="aiox-panel bg-[#0f0f11]">
              <ResearchPanelHead eyebrow="evidence" title="Fonte e confiança" meta={`${highCredibilitySources.length}/${sources.length} high`} />
              <div className="grid gap-px bg-[#f5f4e7]/10 sm:grid-cols-2">
                <ResearchDarkMetric label="High credibility" value={String(highCredibilitySources.length)} />
                <ResearchDarkMetric label="Date coverage" value={stringValue(asDisplayRecord(recordValue(metrics, "sources")), "freshness_ratio", activeRun?.extras?.freshness ? String(activeRun.extras.freshness) : "—")} />
                <ResearchDarkMetric label="Graph nodes" value={String(graphNodes.length)} />
                <ResearchDarkMetric label="Graph edges" value={String(graphEdges.length)} />
              </div>
            </section>
          </aside>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="aiox-panel bg-[#0f0f11]">
            <ResearchPanelHead eyebrow="knowledge graph" title="Mapa de sinais" meta={`${graphNodes.length} nós · ${graphEdges.length} links`} />
            <div className="grid gap-px bg-[#f5f4e7]/10 p-px md:grid-cols-3">
              {graphNodes.slice(0, 9).map((node, index) => (
                <article key={`${stringValue(node, "id", "node")}-${index}`} className="min-w-0 bg-[#050505] p-4">
                  <div className="text-[10px] uppercase tracking-[0.12em] text-[#d1ff00]" style={{ fontFamily: MONO_FONT }}>
                    {stringValue(node, "type", `sinal ${index + 1}`)}
                  </div>
                  <h3 className="aiox-safe-text mt-2 text-[18px] font-black leading-tight text-[#f5f4e7]" style={{ fontFamily: DISPLAY_FONT }}>
                    {stringValue(node, "label", stringValue(node, "id", "Sinal"))}
                  </h3>
                  <p className="mt-3 line-clamp-3 text-[13px] leading-[1.5] text-[#f5f4e7]/58">
                    {shortPreview(recordValue(node, "summary") ?? recordValue(node, "description") ?? recordValue(node, "evidence"), 180)}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <aside className="grid content-start gap-6">
            <section className="aiox-panel bg-[#0f0f11]">
              <ResearchPanelHead eyebrow="matrices" title="Quadros extraídos" meta={`${matrixItems.length}`} />
              <div className="grid gap-2 p-4">
                {matrixItems.slice(0, 6).map((matrix) => (
                  <div key={stringValue(matrix, "id", stringValue(matrix, "title"))} className="border border-[#f5f4e7]/10 bg-[#050505] p-3">
                    <div className="text-[10px] uppercase tracking-[0.12em] text-[#f5f4e7]/40" style={{ fontFamily: MONO_FONT }}>{stringValue(matrix, "row_count", "0")} linhas</div>
                    <div className="aiox-safe-text mt-1 text-[14px] font-black text-[#f5f4e7]">{stringValue(matrix, "title")}</div>
                  </div>
                ))}
              </div>
            </section>
            <section className="aiox-panel bg-[#0f0f11]">
              <ResearchPanelHead eyebrow="patterns" title="Padrões UX" meta={`${patterns.length}`} />
              <div className="grid gap-2 p-4">
                {patterns.slice(0, 5).map((pattern) => (
                  <div key={stringValue(pattern, "id", stringValue(pattern, "name"))} className="border border-[#f5f4e7]/10 bg-[#050505] p-3">
                    <div className="aiox-safe-text text-[14px] font-black text-[#f5f4e7]">{stringValue(pattern, "name")}</div>
                    <p className="mt-1 line-clamp-2 text-[12px] leading-[1.45] text-[#f5f4e7]/55">{stringValue(pattern, "description")}</p>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>

        {sourceSummary.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {sourceSummary.map((item) => (
              <span key={item} className="border border-[#f5f4e7]/12 bg-[#0f0f11] px-3 py-2 text-[11px] uppercase tracking-[0.1em] text-[#f5f4e7]/50" style={{ fontFamily: MONO_FONT }}>
                {item}
              </span>
            ))}
          </div>
        )}
      </article>
    </LightScrollArea>
  )
}

function ResearchCuriosityReport({ documents }: { documents: ObservatoryDocument[] }) {
  const docMap = new Map(documents.map((doc) => [doc.file, doc]))
  const curiosity = asDisplayRecord(parseOptionalArtifact(docMap.get("curiosity_queue.yaml")))
  const questions = arrayValue(curiosity, "questions").map((item) => asDisplayRecord(item))
  const high = questions.filter((q) => stringValue(q, "priority", "").toUpperCase() === "HIGH")
  const medium = questions.filter((q) => stringValue(q, "priority", "").toUpperCase() === "MEDIUM")
  const low = questions.filter((q) => stringValue(q, "priority", "").toUpperCase() === "LOW")
  const groups = [
    { key: "HIGH", label: "Alta prioridade", items: high, color: "#d1ff00" },
    { key: "MEDIUM", label: "Boa aposta", items: medium, color: "#f5b340" },
    { key: "LOW", label: "Explorar depois", items: low, color: "#f5f4e7" },
  ]

  return (
    <LightScrollArea className="flex-1 bg-[#050505]" viewportClassName="bg-[#050505] px-4 pb-12 pt-5 sm:px-6 lg:px-8" fadeColor="#050505">
      <article className="mx-auto w-full min-w-0 max-w-[1440px]" style={observatoryDarkThemeVars}>
        <section className="grid overflow-hidden border border-[#f5f4e7]/16 bg-[#10110d] lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="p-6 sm:p-8">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#d1ff00]" style={{ fontFamily: MONO_FONT }}>
              curiosity backlog
            </p>
            <h2 className="aiox-safe-text mt-3 max-w-[900px] text-[38px] font-black leading-[0.98] tracking-[-0.05em] text-[#f5f4e7] sm:text-[56px]" style={{ fontFamily: DISPLAY_FONT }}>
              Perguntas que ainda podem mudar a decisão
            </h2>
            <p className="mt-5 max-w-[780px] text-[16px] leading-[1.62] text-[#f5f4e7]/70">
              Esta aba separa hipóteses, dúvidas e próximos testes. O objetivo é deixar claro o que vale investigar antes da próxima wave.
            </p>
          </div>
          <aside className="grid content-end gap-px bg-[#d1ff00] p-6 text-[#050505] sm:p-8">
            <div className="text-[72px] font-black leading-none tracking-[-0.06em]" style={{ fontFamily: DISPLAY_FONT }}>{questions.length}</div>
            <div className="text-[12px] uppercase tracking-[0.14em]" style={{ fontFamily: MONO_FONT }}>perguntas abertas</div>
            <div className="mt-5 grid grid-cols-3 gap-px bg-[#050505]/16">
              <ResearchLightMetric label="Alta" value={String(high.length)} />
              <ResearchLightMetric label="Média" value={String(medium.length)} />
              <ResearchLightMetric label="Baixa" value={String(low.length)} />
            </div>
          </aside>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-3">
          {groups.map((group) => (
            <section key={group.key} className="aiox-panel bg-[#0f0f11]">
              <ResearchPanelHead eyebrow={group.key} title={group.label} meta={`${group.items.length} itens`} />
              <div className="grid gap-3 p-4">
                {group.items.length === 0 && (
                  <div className="border border-[#f5f4e7]/10 bg-[#050505] p-5 text-[14px] text-[#f5f4e7]/50">
                    Nenhuma pergunta nesta faixa.
                  </div>
                )}
                {group.items.map((question, index) => (
                  <article key={`${stringValue(question, "id", "q")}-${index}`} className="border border-[#f5f4e7]/10 bg-[#050505] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-[10px] uppercase tracking-[0.12em]" style={{ fontFamily: MONO_FONT, color: group.color }}>
                        {stringValue(question, "id", `Q${index + 1}`)}
                      </span>
                      <span className="text-[10px] uppercase tracking-[0.12em] text-[#f5f4e7]/38" style={{ fontFamily: MONO_FONT }}>
                        {stringValue(question, "category", "investigação")}
                      </span>
                    </div>
                    <h3 className="aiox-safe-text mt-3 text-[22px] font-black leading-[1.05] tracking-[-0.035em] text-[#f5f4e7]" style={{ fontFamily: DISPLAY_FONT }}>
                      {stringValue(question, "question")}
                    </h3>
                    <p className="mt-3 text-[14px] leading-[1.55] text-[#f5f4e7]/62">
                      {stringValue(question, "why_it_matters", "Sem justificativa estruturada.")}
                    </p>
                    <div className="mt-4 border-t border-[#f5f4e7]/10 pt-3">
                      <div className="text-[10px] uppercase tracking-[0.12em] text-[#f5f4e7]/35" style={{ fontFamily: MONO_FONT }}>
                        próximo movimento
                      </div>
                      <p className="mt-1 text-[13px] leading-[1.45] text-[#f5f4e7]/72">
                        {stringValue(question, "next_action", "Definir teste ou fonte para a próxima wave.")}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </article>
    </LightScrollArea>
  )
}

function ResearchWavesReport({ runs, documents }: { runs: ObservatoryRunSummary[]; documents: ObservatoryDocument[] }) {
  const activeRun = runs.find((run) => run.active) ?? runs[0]
  const waveDocs = documents.filter((doc) => doc.phase === "wave" || /wave/i.test(doc.file))
  const events = parseJsonl(documents.find((doc) => doc.file === "execution-log.jsonl")?.content ?? "")
  const waveEvents = events.filter((event) => /wave|follow|deep|aprofund/i.test(`${stringValue(event, "phase", "")} ${stringValue(event, "action", "")} ${stringValue(event, "notes", "")}`))
  const timeline = waveDocs.map((doc, index) => ({
    index,
    file: doc.file,
    title: markdownTitle(doc.content) || humanizeResearchLabel(doc.file.replace(/\.[^.]+$/, "")),
    summary: markdownSummary(doc.content),
    bytes: doc.bytes,
  }))

  return (
    <LightScrollArea className="flex-1 bg-[#050505]" viewportClassName="bg-[#050505] px-4 pb-12 pt-5 sm:px-6 lg:px-8" fadeColor="#050505">
      <article className="mx-auto w-full min-w-0 max-w-[1440px]" style={observatoryDarkThemeVars}>
        <section className="grid overflow-hidden border border-[#f5f4e7]/16 bg-[#10110d] lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="p-6 sm:p-8">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#d1ff00]" style={{ fontFamily: MONO_FONT }}>
              deepening waves
            </p>
            <h2 className="aiox-safe-text mt-3 max-w-[900px] text-[38px] font-black leading-[0.98] tracking-[-0.05em] text-[#f5f4e7] sm:text-[56px]" style={{ fontFamily: DISPLAY_FONT }}>
              Como a pesquisa evoluiu
            </h2>
            <p className="mt-5 max-w-[780px] text-[16px] leading-[1.62] text-[#f5f4e7]/70">
              A leitura aqui é temporal: quais ondas de aprofundamento existem, que evidência cada uma acrescentou e onde ainda falta uma nova rodada.
            </p>
          </div>
          <aside className="grid content-end gap-px bg-[#d1ff00] p-6 text-[#050505] sm:p-8">
            <div className="text-[72px] font-black leading-none tracking-[-0.06em]" style={{ fontFamily: DISPLAY_FONT }}>{activeRun?.waves ?? waveDocs.length}</div>
            <div className="text-[12px] uppercase tracking-[0.14em]" style={{ fontFamily: MONO_FONT }}>waves detectadas</div>
            <div className="mt-5 grid grid-cols-2 gap-px bg-[#050505]/16">
              <ResearchLightMetric label="Docs" value={String(waveDocs.length)} />
              <ResearchLightMetric label="Eventos" value={String(waveEvents.length || events.length)} />
            </div>
          </aside>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="aiox-panel bg-[#0f0f11]">
            <ResearchPanelHead eyebrow="timeline" title="Ondas de aprofundamento" meta={`${timeline.length} documentos`} />
            <div className="relative grid gap-4 p-5">
              <div className="absolute bottom-5 left-[34px] top-5 w-px bg-[#f5f4e7]/12" />
              {timeline.length === 0 && (
                <div className="border border-[#f5f4e7]/10 bg-[#050505] p-5 text-[14px] text-[#f5f4e7]/55">
                  Nenhum documento de wave foi encontrado neste run.
                </div>
              )}
              {timeline.map((wave) => (
                <article key={wave.file} className="relative grid gap-3 pl-12">
                  <div className="absolute left-[21px] top-1.5 h-7 w-7 border border-[#d1ff00] bg-[#050505] text-center text-[11px] font-black leading-7 text-[#d1ff00]" style={{ fontFamily: MONO_FONT }}>
                    {String(wave.index + 1).padStart(2, "0")}
                  </div>
                  <div className="border border-[#f5f4e7]/10 bg-[#050505] p-5">
                    <div className="text-[10px] uppercase tracking-[0.12em] text-[#f5f4e7]/38" style={{ fontFamily: MONO_FONT }}>{wave.file}</div>
                    <h3 className="aiox-safe-text mt-2 text-[28px] font-black leading-[1.02] tracking-[-0.04em] text-[#f5f4e7]" style={{ fontFamily: DISPLAY_FONT }}>
                      {wave.title}
                    </h3>
                    <p className="mt-3 max-w-[900px] text-[15px] leading-[1.58] text-[#f5f4e7]/66">{wave.summary}</p>
                    <div className="mt-4 text-[10px] uppercase tracking-[0.12em] text-[#f5f4e7]/35" style={{ fontFamily: MONO_FONT }}>
                      {formatBytes(wave.bytes)}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <aside className="aiox-panel bg-[#0f0f11]">
            <ResearchPanelHead eyebrow="execution log" title="Sinais de execução" meta={`${waveEvents.length || events.length} eventos`} />
            <div className="grid gap-3 p-4">
              {(waveEvents.length > 0 ? waveEvents : events).slice(0, 12).map((event, index) => (
                <div key={`${stringValue(event, "ts", String(index))}-${index}`} className="border border-[#f5f4e7]/10 bg-[#050505] p-4">
                  <div className="text-[10px] uppercase tracking-[0.12em] text-[#d1ff00]" style={{ fontFamily: MONO_FONT }}>
                    {stringValue(event, "phase", `evento ${index + 1}`)}
                  </div>
                  <p className="mt-2 text-[14px] leading-[1.48] text-[#f5f4e7]/70">
                    {stringValue(event, "notes", stringValue(event, "action", "Evento registrado."))}
                  </p>
                  <div className="mt-3 text-[10px] uppercase tracking-[0.12em] text-[#f5f4e7]/35" style={{ fontFamily: MONO_FONT }}>
                    {stringValue(event, "ts", "sem timestamp")} · {stringValue(event, "status", "—")}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </article>
    </LightScrollArea>
  )
}

function parseOptionalArtifact(doc?: ObservatoryDocument): unknown {
  if (!doc) return {}
  if (/\.jsonl$/i.test(doc.file)) return parseJsonl(doc.content)
  return parseStructured(doc.file, doc.content) ?? {}
}

function parseJsonl(content: string): Array<Record<string, unknown>> {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        const parsed = JSON.parse(line)
        return isRecord(parsed) ? parsed : {}
      } catch {
        return {}
      }
    })
    .filter((item) => Object.keys(item).length > 0)
}

function ResearchPanelHead({ eyebrow, title, meta }: { eyebrow: string; title: string; meta?: string }) {
  return (
    <header className="flex min-w-0 flex-wrap items-end justify-between gap-3 border-b border-[#f5f4e7]/10 bg-[#10110d] p-5">
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[0.16em] text-[#d1ff00]" style={{ fontFamily: MONO_FONT }}>{eyebrow}</p>
        <h3 className="aiox-safe-text mt-1 text-[26px] font-black leading-none tracking-[-0.045em] text-[#f5f4e7]" style={{ fontFamily: DISPLAY_FONT }}>
          {title}
        </h3>
      </div>
      {meta && <span className="text-[10px] uppercase tracking-[0.12em] text-[#f5f4e7]/42" style={{ fontFamily: MONO_FONT }}>{meta}</span>}
    </header>
  )
}

function ResearchDarkMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 bg-[#050505] p-4">
      <div className="text-[10px] uppercase tracking-[0.12em] text-[#f5f4e7]/40" style={{ fontFamily: MONO_FONT }}>{label}</div>
      <div className="aiox-safe-text mt-1 text-[28px] font-black leading-none tracking-[-0.045em] text-[#f5f4e7]" style={{ fontFamily: DISPLAY_FONT }}>{value}</div>
    </div>
  )
}

function ResearchLightMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 bg-[#d1ff00] p-3">
      <div className="text-[9px] uppercase tracking-[0.12em] text-[#050505]/55" style={{ fontFamily: MONO_FONT }}>{label}</div>
      <div className="aiox-safe-text mt-1 text-[22px] font-black leading-none text-[#050505]" style={{ fontFamily: DISPLAY_FONT }}>{value}</div>
    </div>
  )
}

function ResearchBar({ label, value }: { label: string; value: number }) {
  const width = Math.max(3, Math.min(100, value))
  return (
    <div>
      <div className="mb-1 flex justify-between gap-3 text-[10px] uppercase tracking-[0.11em] text-[#f5f4e7]/45" style={{ fontFamily: MONO_FONT }}>
        <span className="truncate">{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-2.5 bg-[#f5f4e7]/10">
        <div className="h-full bg-[#d1ff00]" style={{ width: `${width}%` }} />
      </div>
    </div>
  )
}

function humanizeResearchLabel(raw: string) {
  return raw.replace(/[_-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
}

function markdownTitle(content: string) {
  return content.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? ""
}

function markdownSummary(content: string) {
  const text = content
    .split("\n")
    .filter((line) => !/^#/.test(line.trim()))
    .join(" ")
    .replace(/[`*_>#-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  return text.length > 280 ? `${text.slice(0, 280).trim()}…` : text || "Sem resumo textual estruturado neste artefato."
}

function isStructuredArtifact(file: string) {
  return /\.(ya?ml|json)$/i.test(file)
}

function parseStructured(file: string, content: string): unknown {
  try {
    if (/\.json$/i.test(file)) return JSON.parse(content)
    return YAML.parse(content)
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function scalarPreview(value: unknown): string {
  if (value === null) return "null"
  if (value === undefined) return "—"
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  if (Array.isArray(value)) return `${value.length} items`
  if (isRecord(value)) return `${Object.keys(value).length} fields`
  return String(value)
}

function shortPreview(value: unknown, max = 96): string {
  const text = scalarPreview(value).replace(/\s+/g, " ").trim()
  return text.length > max ? `${text.slice(0, max).trim()}…` : text
}

function topLevelEntries(value: unknown): Array<[string, unknown]> {
  if (Array.isArray(value)) return value.map((item, index) => [String(index + 1).padStart(2, "0"), item])
  if (isRecord(value)) return Object.entries(value)
  return [["value", value]]
}

type StructuredShape = { fields: number; arrays: number; objects: number; scalars: number }

function countShape(value: unknown): StructuredShape {
  if (Array.isArray(value)) {
    return value.reduce(
      (acc: StructuredShape, item) => {
        const c = countShape(item)
        return {
          fields: acc.fields + c.fields,
          arrays: acc.arrays + c.arrays,
          objects: acc.objects + c.objects,
          scalars: acc.scalars + c.scalars,
        }
      },
      { fields: 0, arrays: 1, objects: 0, scalars: 0 } satisfies StructuredShape,
    )
  }
  if (isRecord(value)) {
    return Object.values(value).reduce(
      (acc: StructuredShape, item) => {
        const c = countShape(item)
        return {
          fields: acc.fields + c.fields,
          arrays: acc.arrays + c.arrays,
          objects: acc.objects + c.objects,
          scalars: acc.scalars + c.scalars,
        }
      },
      { fields: Object.keys(value).length, arrays: 0, objects: 1, scalars: 0 } satisfies StructuredShape,
    )
  }
  return { fields: 0, arrays: 0, objects: 0, scalars: 1 }
}

function StructuredArtifactView({
  file,
  content,
  bodyRef,
}: {
  file: string
  content: string
  bodyRef: RefObject<HTMLDivElement | null>
}) {
  const parsed = parseStructured(file, content)
  const parseFailed = parsed === null && content.trim() !== "null"
  const entries = topLevelEntries(parsed)
  const shape = countShape(parsed)
  const format = /\.json$/i.test(file) ? "JSON" : "YAML"
  const semanticReport = renderStructuredArtifactReport(file, parsed)

  if (parseFailed) {
    return (
      <LightScrollArea ref={bodyRef} className="flex-1" viewportClassName="px-4 pb-12 pt-5 sm:px-6 lg:px-10">
        <article className="mx-auto w-full min-w-0 max-w-[960px]">
          <SinkraHeader eyebrow={`${format} artifact`} title={file} meta={["parse warning", `${content.length} chars`]} />
          <pre className="overflow-x-auto border border-[var(--rule)] bg-[var(--ink)] p-5 text-[12px] leading-[1.6] text-[var(--paper)]" style={{ fontFamily: MONO_FONT }}>
            {content}
          </pre>
        </article>
      </LightScrollArea>
    )
  }

  return (
    <LightScrollArea ref={bodyRef} className="flex-1" viewportClassName="px-4 pb-12 pt-5 sm:px-6 lg:px-8">
      <article className="mx-auto w-full min-w-0 max-w-[1280px]">
        <SinkraHeader
          eyebrow={`${format} artifact`}
          title={file}
          meta={[`${entries.length} top-level`, `${shape.fields} fields`, `${shape.arrays} arrays`, `${shape.objects} objects`]}
        />

        <div className="mb-5 grid gap-px bg-[var(--rule)] sm:grid-cols-4">
          <MetricTile label="Fields" value={String(shape.fields)} />
          <MetricTile label="Arrays" value={String(shape.arrays)} />
          <MetricTile label="Objects" value={String(shape.objects)} />
          <MetricTile label="Scalars" value={String(shape.scalars)} />
        </div>

        {semanticReport ?? (
          <div className="grid gap-4">
            {entries.map(([key, value]) => (
              <StructuredSection key={key} name={key} value={value} />
            ))}
          </div>
        )}
      </article>
    </LightScrollArea>
  )
}

function recordValue(value: unknown, key: string): unknown {
  return isRecord(value) ? value[key] : undefined
}

function arrayValue(value: unknown, key: string): unknown[] {
  const next = recordValue(value, key)
  return Array.isArray(next) ? next : []
}

function stringValue(value: unknown, key: string, fallback = "—") {
  const next = recordValue(value, key)
  if (next === null || next === undefined || next === "") return fallback
  return String(next)
}

function booleanValue(value: unknown, key: string) {
  return Boolean(recordValue(value, key))
}

function numberValue(value: unknown, key: string): number | null {
  const next = Number(recordValue(value, key))
  return Number.isFinite(next) ? next : null
}

function renderStructuredArtifactReport(file: string, parsed: unknown): ReactNode | null {
  if (!isRecord(parsed)) return null
  if (/workflow_definition\.ya?ml$/i.test(file)) return <WorkflowArtifactReport data={parsed} />
  if (/task_definitions\.ya?ml$/i.test(file)) return <TasksArtifactReport data={parsed} />
  if (/quality_gates\.ya?ml$/i.test(file)) return <QualityGatesArtifactReport data={parsed} />
  if (/score_card\.ya?ml$/i.test(file)) return <ScoreCardArtifactReport data={parsed} />
  if (/(process_map|domain_map|dependency_graph)\.ya?ml$/i.test(file)) return <MapArtifactReport file={file} data={parsed} />
  return null
}

function WorkflowArtifactReport({ data }: { data: Record<string, unknown> }) {
  const workflows = arrayValue(data, "workflows").map((item, index) => ({ item: asDisplayRecord(item), index }))
  const stepCount = workflows.reduce((total, { item }) => total + arrayValue(item, "steps").length, 0)

  return (
    <div className="grid gap-5">
      <StructuredSummaryStrip
        items={[
          ["Process", stringValue(data, "process_name")],
          ["Version", stringValue(data, "version")],
          ["Workflows", String(workflows.length)],
          ["Steps", String(stepCount)],
        ]}
      />
      {workflows.map(({ item, index }) => {
        const steps = arrayValue(item, "steps")
        return (
          <section key={`${stringValue(item, "workflow_id", "workflow")}-${index}`} className="border border-[var(--rule)] bg-[var(--paper)]">
            <header className="grid gap-4 border-b border-[var(--rule)] bg-[var(--paper-alt)] p-4 lg:grid-cols-[minmax(0,1fr)_240px]">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--ink-3)]" style={{ fontFamily: MONO_FONT }}>
                  {stringValue(item, "workflow_id")} · {stringValue(item, "layer", "layer")}
                </div>
                <h3 className="mt-1 text-[24px] font-black leading-tight tracking-[-0.035em] text-[var(--ink)]" style={{ fontFamily: DISPLAY_FONT }}>
                  {stringValue(item, "name", `Workflow ${index + 1}`)}
                </h3>
                <p className="mt-2 max-w-[900px] whitespace-pre-line text-[14px] leading-[1.55] text-[var(--ink-2)]">
                  {shortPreview(recordValue(item, "description"), 420)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-px bg-[var(--rule)]">
                <MetricTile label="Trigger" value={stringValue(item, "trigger")} />
                <MetricTile label="Steps" value={String(steps.length)} />
                <MetricTile label="Frequency" value={stringValue(item, "frequency")} wide />
              </div>
            </header>
            <div className="divide-y divide-[var(--rule-soft)]">
              {steps.slice(0, 18).map((raw, stepIndex) => {
                const step = asDisplayRecord(raw)
                return (
                  <div key={`${stringValue(step, "step_id", "step")}-${stepIndex}`} className="grid gap-3 px-4 py-3 md:grid-cols-[52px_minmax(0,1fr)_132px]">
                    <div className="text-[12px] tabular-nums text-[var(--ink-3)]" style={{ fontFamily: MONO_FONT }}>
                      {String(stepIndex + 1).padStart(2, "0")}
                    </div>
                    <div className="min-w-0">
                      <strong className="block truncate text-[14px] text-[var(--ink)]">{stringValue(step, "name", stringValue(step, "task_id", "Step"))}</strong>
                      <span className="text-[10px] uppercase tracking-[0.1em] text-[var(--ink-3)]" style={{ fontFamily: MONO_FONT }}>
                        {stringValue(step, "phase_id", "phase")} · {stringValue(step, "task_id", "task")}
                      </span>
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.1em] text-[var(--ink-3)] md:text-right" style={{ fontFamily: MONO_FONT }}>
                      {stringValue(step, "executor_type")}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function TasksArtifactReport({ data }: { data: Record<string, unknown> }) {
  const tasks = arrayValue(data, "tasks").map((item) => asDisplayRecord(item))
  return (
    <div className="grid gap-5">
      <StructuredSummaryStrip
        items={[
          ["Process", stringValue(data, "process_name")],
          ["Tasks", String(tasks.length)],
          ["Contract", stringValue(asDisplayRecord(recordValue(data, "task_anatomy_contract")), "validation_result")],
          ["Version", stringValue(data, "version")],
        ]}
      />
      <div className="overflow-x-auto border border-[var(--rule)] bg-[var(--paper)]">
        <div className="min-w-[920px]">
          <div className="grid grid-cols-[minmax(260px,1.7fr)_110px_110px_80px_80px_minmax(180px,1fr)] border-b border-[var(--rule)] bg-[var(--paper-alt)] px-4 py-3 text-[10px] uppercase tracking-[0.13em] text-[var(--ink-3)]" style={{ fontFamily: MONO_FONT }}>
            <span>Task</span><span>Layer</span><span>Executor</span><span>Inputs</span><span>Outputs</span><span>Checks</span>
          </div>
          {tasks.slice(0, 40).map((task) => {
            const post = asDisplayRecord(recordValue(task, "post_conditions"))
            return (
              <div key={stringValue(task, "task")} className="grid grid-cols-[minmax(260px,1.7fr)_110px_110px_80px_80px_minmax(180px,1fr)] items-center border-b border-[var(--rule-soft)] px-4 py-3 last:border-b-0">
                <strong className="min-w-0 truncate text-[13px] text-[var(--ink)]">{stringValue(task, "task")}</strong>
                <span className="text-[12px] text-[var(--ink-2)]">{stringValue(task, "atomic_layer")}</span>
                <span className="text-[12px] text-[var(--ink-2)]">{stringValue(task, "responsavel_type")}</span>
                <span className="text-[18px] font-black text-[var(--ink)]" style={{ fontFamily: DISPLAY_FONT }}>{arrayValue(task, "entrada").length}</span>
                <span className="text-[18px] font-black text-[var(--ink)]" style={{ fontFamily: DISPLAY_FONT }}>{arrayValue(task, "saida").length}</span>
                <span className="truncate text-[12px] text-[var(--ink-2)]">
                  {arrayValue(task, "pre_conditions").length + arrayValue(post, "conditions").length} conditions
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function QualityGatesArtifactReport({ data }: { data: Record<string, unknown> }) {
  const gates = arrayValue(data, "quality_gates").map((item) => asDisplayRecord(item))
  const axiomas = asDisplayRecord(recordValue(data, "meta_axiomas"))
  const dimensions = arrayValue(axiomas, "dimensions").map((item) => asDisplayRecord(item))
  const vetoCount = gates.filter((gate) => booleanValue(gate, "veto_power")).length

  return (
    <div className="grid gap-5">
      <StructuredSummaryStrip
        items={[
          ["Gates", String(gates.length)],
          ["Veto", String(vetoCount)],
          ["Compliance", stringValue(axiomas, "compliance_score")],
          ["Result", stringValue(axiomas, "result")],
        ]}
      />
      {dimensions.length > 0 && (
        <section className="border border-[var(--rule)] bg-[var(--paper)] p-4">
          <h3 className="text-[20px] font-black tracking-[-0.03em] text-[var(--ink)]" style={{ fontFamily: DISPLAY_FONT }}>Meta axiomas</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {dimensions.map((dimension) => {
              const score = numberValue(dimension, "score") ?? 0
              const threshold = numberValue(dimension, "threshold") ?? 0
              return (
                <div key={stringValue(dimension, "id")} className="border border-[var(--rule-soft)] bg-[var(--paper-alt)] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <strong className="truncate text-[13px] text-[var(--ink)]">{stringValue(dimension, "name")}</strong>
                    <span className="text-[12px] font-black tabular-nums text-[var(--ink)]">{score.toFixed(1)}</span>
                  </div>
                  <div className="mt-2 h-1.5 bg-[var(--paper-deep)]">
                    <div className={cn("h-full", score >= threshold ? "bg-[var(--lime-fill)]" : "bg-[var(--warning-ink)]")} style={{ width: `${Math.max(0, Math.min(100, score * 10))}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}
      <div className="grid gap-3 lg:grid-cols-2">
        {gates.map((gate) => (
          <section key={stringValue(gate, "gate_id")} className="border border-[var(--rule)] bg-[var(--paper)] p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--ink-3)]" style={{ fontFamily: MONO_FONT }}>
                  {stringValue(gate, "gate_id")} · {stringValue(gate, "type", "gate")}
                </div>
                <h3 className="mt-1 text-[18px] font-black leading-tight tracking-[-0.025em] text-[var(--ink)]" style={{ fontFamily: DISPLAY_FONT }}>
                  {stringValue(gate, "name")}
                </h3>
              </div>
              {booleanValue(gate, "veto_power") && (
                <span className="border border-[var(--lime-ink)] px-2 py-1 text-[9px] uppercase tracking-[0.12em] text-[var(--lime-ink)]" style={{ fontFamily: MONO_FONT }}>
                  veto
                </span>
              )}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-px bg-[var(--rule)]">
              <MetricTile label="Executor" value={stringValue(gate, "executor")} />
              <MetricTile label="Threshold" value={stringValue(gate, "threshold")} />
              <MetricTile label="Criteria" value={String(arrayValue(gate, "criteria").length)} />
            </div>
            <p className="mt-3 text-[13px] leading-[1.5] text-[var(--ink-2)]">{stringValue(gate, "position")}</p>
          </section>
        ))}
      </div>
    </div>
  )
}

function ScoreCardArtifactReport({ data }: { data: Record<string, unknown> }) {
  const overall = asDisplayRecord(recordValue(data, "overall"))
  const dimensions = arrayValue(asDisplayRecord(recordValue(data, "meta_axiomas")), "dimensions")
    .concat(arrayValue(data, "dimensions"))
    .map((item) => asDisplayRecord(item))
  return (
    <div className="grid gap-5">
      <StructuredSummaryStrip
        items={[
          ["Score", stringValue(overall, "score", stringValue(data, "compliance_score"))],
          ["Result", stringValue(overall, "result", stringValue(data, "result"))],
          ["Gate", stringValue(data, "quality_gate")],
          ["Dimensions", String(dimensions.length)],
        ]}
      />
      {dimensions.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {dimensions.map((dimension, index) => {
            const score = numberValue(dimension, "score")
            const threshold = numberValue(dimension, "threshold")
            return (
              <section key={`${stringValue(dimension, "name", "dimension")}-${index}`} className="border border-[var(--rule)] bg-[var(--paper)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="truncate text-[17px] font-black tracking-[-0.025em] text-[var(--ink)]" style={{ fontFamily: DISPLAY_FONT }}>
                    {stringValue(dimension, "name", stringValue(dimension, "id", "Dimension"))}
                  </h3>
                  <span className="text-[18px] font-black tabular-nums text-[var(--ink)]">{score === null ? "—" : score}</span>
                </div>
                {score !== null && (
                  <div className="mt-3 h-2 bg-[var(--paper-deep)]">
                    <div className={cn("h-full", threshold === null || score >= threshold ? "bg-[var(--lime-fill)]" : "bg-[var(--warning-ink)]")} style={{ width: `${Math.max(0, Math.min(100, score > 10 ? score : score * 10))}%` }} />
                  </div>
                )}
                <div className="mt-3 text-[10px] uppercase tracking-[0.12em] text-[var(--ink-3)]" style={{ fontFamily: MONO_FONT }}>
                  threshold {threshold ?? "—"} · {stringValue(dimension, "status")}
                </div>
              </section>
            )
          })}
        </div>
      ) : (
        <StructuredSection name="score_card" value={data} />
      )}
    </div>
  )
}

function MapArtifactReport({ file, data }: { file: string; data: Record<string, unknown> }) {
  if (/process_map\.ya?ml$/i.test(file)) return <ProcessMapArtifactReport data={data} />
  if (/domain_map\.ya?ml$/i.test(file)) return <DomainMapArtifactReport data={data} />
  if (/dependency_graph\.ya?ml$/i.test(file)) return <DependencyGraphArtifactReport data={data} />

  const mainEntries = Object.entries(data).filter(([, value]) => Array.isArray(value) || isRecord(value))
  return (
    <div className="grid gap-5">
      <StructuredSummaryStrip
        items={[
          ["Process", stringValue(data, "process_name", stringValue(data, "domain", "—"))],
          ["Version", stringValue(data, "version")],
          ["Artifact", file.replace(/\.ya?ml$/i, "")],
          ["Sections", String(mainEntries.length)],
        ]}
      />
      <div className="grid gap-4">
        {mainEntries.slice(0, 10).map(([key, value]) => (
          <StructuredSection key={key} name={key} value={value} />
        ))}
      </div>
    </div>
  )
}

function ProcessMapArtifactReport({ data }: { data: Record<string, unknown> }) {
  const phases = arrayValue(data, "phases").map((item) => asDisplayRecord(item))
  const totalPainPoints = phases.reduce((total, phase) => total + arrayValue(phase, "pain_points").length, 0)
  const driftCount = phases.filter((phase) => {
    const drift = stringValue(phase, "drift_delta", "")
    return /drift|major|gap|inconsist/i.test(drift)
  }).length

  return (
    <div className="grid gap-5">
      <StructuredSummaryStrip
        items={[
          ["Process", stringValue(data, "process_name")],
          ["Type", stringValue(data, "type")],
          ["Phases", String(phases.length)],
          ["Pain points", String(totalPainPoints)],
        ]}
      />
      <section className="grid gap-px border border-[var(--rule)] bg-[var(--rule)] lg:grid-cols-3">
        <ReportCallout label="Evidence base" value={shortPreview(recordValue(data, "evidence_base"), 260)} />
        <ReportCallout label="Mapped by" value={stringValue(data, "mapped_by")} />
        <ReportCallout label="Drift phases" value={`${driftCount} de ${phases.length}`} />
      </section>
      <div className="grid gap-4">
        {phases.map((phase, index) => {
          const painPoints = arrayValue(phase, "pain_points")
          const drift = stringValue(phase, "drift_delta", "")
          const hasDrift = /drift|major|gap|inconsist/i.test(drift)
          return (
            <section key={stringValue(phase, "phase_id", `phase-${index}`)} className="border border-[var(--rule)] bg-[var(--paper)]">
              <header className="grid gap-4 border-b border-[var(--rule)] bg-[var(--paper-alt)] p-4 lg:grid-cols-[76px_minmax(0,1fr)_120px]">
                <div className="text-[22px] font-black tabular-nums text-[var(--ink)]" style={{ fontFamily: DISPLAY_FONT }}>
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--ink-3)]" style={{ fontFamily: MONO_FONT }}>
                    {stringValue(phase, "phase_id")} · {stringValue(phase, "executor_type")}
                  </div>
                  <h3 className="mt-1 text-[22px] font-black leading-tight tracking-[-0.035em] text-[var(--ink)]" style={{ fontFamily: DISPLAY_FONT }}>
                    {stringValue(phase, "name")}
                  </h3>
                </div>
                <span className={cn("h-fit border px-2 py-1 text-center text-[9px] uppercase tracking-[0.12em]", hasDrift ? "border-[var(--warning-ink)] text-[var(--warning-ink)]" : "border-[var(--lime-ink)] text-[var(--lime-ink)]")} style={{ fontFamily: MONO_FONT }}>
                  {hasDrift ? "drift" : "stable"}
                </span>
              </header>
              <div className="grid gap-px bg-[var(--rule-soft)] lg:grid-cols-3">
                <ReportTextBlock label="Declared" value={recordValue(phase, "declared_protocol")} />
                <ReportTextBlock label="Observed" value={recordValue(phase, "observed_behavior")} />
                <ReportTextBlock label="Delta" value={recordValue(phase, "drift_delta")} />
              </div>
              {painPoints.length > 0 && (
                <div className="border-t border-[var(--rule)] p-4">
                  <div className="mb-2 text-[10px] uppercase tracking-[0.14em] text-[var(--ink-3)]" style={{ fontFamily: MONO_FONT }}>
                    Pain points
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {painPoints.map((point, pointIndex) => (
                      <div key={`${pointIndex}-${shortPreview(point, 24)}`} className="border border-[var(--rule-soft)] bg-[var(--paper-alt)] px-3 py-2 text-[13px] leading-[1.45] text-[var(--ink-2)]">
                        {shortPreview(point, 180)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}

function DomainMapArtifactReport({ data }: { data: Record<string, unknown> }) {
  const entries = arrayValue(data, "domain_mapping").map((item) => asDisplayRecord(item))
  const byDomain = entries.reduce((map, entry) => {
    const domain = stringValue(entry, "domain", "Unclassified")
    const current = map.get(domain) ?? []
    current.push(entry)
    map.set(domain, current)
    return map
  }, new Map<string, Record<string, unknown>[]>())
  const gapCount = entries.filter((entry) => stringValue(entry, "gap_closed", "") !== "").length
  const typeCount = new Set(entries.map((entry) => stringValue(entry, "type", "standard"))).size

  return (
    <div className="grid gap-5">
      <StructuredSummaryStrip
        items={[
          ["Mapping", stringValue(data, "domain_mapping_name")],
          ["Items", String(entries.length)],
          ["Domains", String(byDomain.size)],
          ["Gaps closed", String(gapCount)],
        ]}
      />
      <section className="grid gap-px border border-[var(--rule)] bg-[var(--rule)] lg:grid-cols-3">
        <ReportCallout label="Type" value={stringValue(data, "type")} />
        <ReportCallout label="Designed by" value={stringValue(data, "designed_by")} />
        <ReportCallout label="Item types" value={String(typeCount)} />
      </section>
      <div className="grid gap-5">
        {Array.from(byDomain.entries()).map(([domain, items]) => (
          <section key={domain} className="border border-[var(--rule)] bg-[var(--paper)]">
            <header className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--rule)] bg-[var(--paper-alt)] p-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--ink-3)]" style={{ fontFamily: MONO_FONT }}>
                  SINKRA domain
                </p>
                <h3 className="mt-1 text-[24px] font-black tracking-[-0.035em] text-[var(--ink)]" style={{ fontFamily: DISPLAY_FONT }}>
                  {domain}
                </h3>
              </div>
              <span className="text-[11px] uppercase tracking-[0.12em] text-[var(--ink-3)]" style={{ fontFamily: MONO_FONT }}>
                {items.length} items
              </span>
            </header>
            <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
              {items.slice(0, 18).map((entry) => (
                <article key={stringValue(entry, "task_id")} className="border border-[var(--rule-soft)] bg-[var(--paper-alt)] p-3">
                  <div className="text-[9px] uppercase tracking-[0.12em] text-[var(--ink-3)]" style={{ fontFamily: MONO_FONT }}>
                    {stringValue(entry, "task_id")} · {stringValue(entry, "hierarchy_level", "level")}
                  </div>
                  <h4 className="mt-1 line-clamp-2 text-[15px] font-black leading-tight text-[var(--ink)]">
                    {stringValue(entry, "task_name")}
                  </h4>
                  <p className="mt-2 line-clamp-3 text-[12px] leading-[1.45] text-[var(--ink-2)]">
                    {shortPreview(recordValue(entry, "justification"), 220)}
                  </p>
                  {stringValue(entry, "gap_closed", "") && (
                    <div className="mt-3 inline-flex border border-[var(--lime-ink)] px-2 py-1 text-[9px] uppercase tracking-[0.12em] text-[var(--lime-ink)]" style={{ fontFamily: MONO_FONT }}>
                      {stringValue(entry, "gap_closed")}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

function DependencyGraphArtifactReport({ data }: { data: Record<string, unknown> }) {
  const graph = asDisplayRecord(recordValue(data, "graph"))
  const nodes = arrayValue(graph, "nodes").map((item) => asDisplayRecord(item))
  const roots = arrayValue(graph, "roots")
  const leaves = arrayValue(graph, "leaves")
  const loops = nodes.filter((node) => booleanValue(node, "loop_edge"))
  const validation = asDisplayRecord(recordValue(data, "dag_validation"))

  return (
    <div className="grid gap-5">
      <StructuredSummaryStrip
        items={[
          ["Graph", stringValue(graph, "type", stringValue(data, "type"))],
          ["Nodes", String(nodes.length)],
          ["Roots", String(roots.length)],
          ["Leaves", String(leaves.length)],
        ]}
      />
      <section className="grid gap-px border border-[var(--rule)] bg-[var(--rule)] lg:grid-cols-4">
        <ReportCallout label="Validated" value={stringValue(data, "validated")} />
        <ReportCallout label="Strict DAG" value={stringValue(validation, "strict_dag_without_runtime_loop_edges")} />
        <ReportCallout label="Guarded loops" value={stringValue(validation, "runtime_loop_edges_are_guarded")} />
        <ReportCallout label="Loop edges" value={String(loops.length)} />
      </section>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="border border-[var(--rule)] bg-[var(--paper)]">
          <header className="border-b border-[var(--rule)] bg-[var(--paper-alt)] p-4">
            <h3 className="text-[22px] font-black tracking-[-0.03em] text-[var(--ink)]" style={{ fontFamily: DISPLAY_FONT }}>
              Dependency lanes
            </h3>
          </header>
          <div className="divide-y divide-[var(--rule-soft)]">
            {nodes.slice(0, 42).map((node, index) => {
              const depends = arrayValue(node, "depends_on")
              const feeds = arrayValue(node, "feeds_into")
              return (
                <div key={stringValue(node, "task_id", `node-${index}`)} className="grid gap-3 px-4 py-3 lg:grid-cols-[minmax(220px,0.8fr)_minmax(0,1fr)_minmax(0,1fr)]">
                  <div className="min-w-0">
                    <strong className="block truncate text-[13px] text-[var(--ink)]">{stringValue(node, "task_id")}</strong>
                    {booleanValue(node, "loop_edge") && (
                      <span className="mt-1 inline-flex border border-[var(--warning-ink)] px-1.5 py-0.5 text-[8px] uppercase tracking-[0.1em] text-[var(--warning-ink)]" style={{ fontFamily: MONO_FONT }}>
                        loop
                      </span>
                    )}
                  </div>
                  <DependencyPills label="Depends on" values={depends} />
                  <DependencyPills label="Feeds into" values={feeds} />
                </div>
              )
            })}
          </div>
        </section>
        <aside className="grid gap-4 content-start">
          <DependencyList title="Roots" values={roots} />
          <DependencyList title="Leaves" values={leaves} />
          <StructuredSection name="validation_notes" value={recordValue(validation, "notes")} />
        </aside>
      </div>
    </div>
  )
}

function ReportCallout({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--paper)] p-4">
      <div className="text-[9px] uppercase tracking-[0.13em] text-[var(--ink-3)]" style={{ fontFamily: MONO_FONT }}>
        {label}
      </div>
      <div className="mt-1 text-[13px] font-bold leading-[1.45] text-[var(--ink)]">
        {value || "—"}
      </div>
    </div>
  )
}

function ReportTextBlock({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="bg-[var(--paper)] p-4">
      <div className="mb-2 text-[9px] uppercase tracking-[0.13em] text-[var(--ink-3)]" style={{ fontFamily: MONO_FONT }}>
        {label}
      </div>
      <p className="whitespace-pre-line text-[13px] leading-[1.5] text-[var(--ink-2)]">
        {shortPreview(value, 520)}
      </p>
    </div>
  )
}

function DependencyPills({ label, values }: { label: string; values: unknown[] }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 text-[9px] uppercase tracking-[0.12em] text-[var(--ink-3)]" style={{ fontFamily: MONO_FONT }}>
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {values.length > 0 ? values.slice(0, 6).map((value) => (
          <span key={String(value)} className="max-w-full truncate border border-[var(--rule-soft)] bg-[var(--paper-alt)] px-2 py-1 text-[11px] text-[var(--ink-2)]">
            {String(value)}
          </span>
        )) : (
          <span className="text-[12px] text-[var(--ink-3)]">—</span>
        )}
      </div>
    </div>
  )
}

function DependencyList({ title, values }: { title: string; values: unknown[] }) {
  return (
    <section className="border border-[var(--rule)] bg-[var(--paper)] p-4">
      <h3 className="text-[18px] font-black tracking-[-0.025em] text-[var(--ink)]" style={{ fontFamily: DISPLAY_FONT }}>
        {title}
      </h3>
      <div className="mt-3 grid gap-1.5">
        {values.map((value) => (
          <div key={String(value)} className="border border-[var(--rule-soft)] bg-[var(--paper-alt)] px-2 py-1.5 text-[12px] text-[var(--ink-2)]">
            {String(value)}
          </div>
        ))}
      </div>
    </section>
  )
}

function StructuredSummaryStrip({ items }: { items: Array<[string, string]> }) {
  return (
    <div className="grid gap-px bg-[var(--rule)] sm:grid-cols-2 lg:grid-cols-4">
      {items.map(([label, value]) => (
        <MetricTile key={label} label={label} value={value || "—"} />
      ))}
    </div>
  )
}

function asDisplayRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {}
}

function StructuredSection({ name, value }: { name: string; value: unknown }) {
  const rows = Array.isArray(value)
    ? value.slice(0, 12).map((item, index) => [String(index + 1).padStart(2, "0"), item] as [string, unknown])
    : isRecord(value)
      ? Object.entries(value).slice(0, 18)
      : [["value", value] as [string, unknown]]
  const total = Array.isArray(value) ? value.length : isRecord(value) ? Object.keys(value).length : 1

  return (
    <section className="border border-[var(--rule)] bg-[var(--paper)]">
      <header className="grid gap-3 border-b border-[var(--rule)] bg-[var(--paper-alt)] px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--ink-3)]" style={{ fontFamily: MONO_FONT }}>
            {Array.isArray(value) ? "array" : isRecord(value) ? "object" : typeof value}
          </div>
          <h3 className="mt-1 truncate text-[20px] font-black tracking-[-0.035em] text-[var(--ink)]" style={{ fontFamily: DISPLAY_FONT }}>
            {name}
          </h3>
        </div>
        <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--ink-3)]" style={{ fontFamily: MONO_FONT }}>
          {total} item{total === 1 ? "" : "s"}
        </div>
      </header>
      <div className="divide-y divide-[var(--rule-soft)]">
        {rows.map(([key, rowValue]) => (
          <div key={key} className="grid gap-3 px-4 py-3 sm:grid-cols-[180px_minmax(0,1fr)]">
            <div className="truncate text-[11px] uppercase tracking-[0.12em] text-[var(--ink-3)]" style={{ fontFamily: MONO_FONT }}>
              {key}
            </div>
            <ValuePreview value={rowValue} />
          </div>
        ))}
      </div>
      {total > rows.length && (
        <footer className="border-t border-[var(--rule-soft)] px-4 py-2 text-[11px] uppercase tracking-[0.12em] text-[var(--ink-3)]" style={{ fontFamily: MONO_FONT }}>
          + {total - rows.length} itens ocultos
        </footer>
      )}
    </section>
  )
}

function ValuePreview({ value }: { value: unknown }) {
  if (Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {value.slice(0, 8).map((item, index) => (
          <span key={`${index}-${shortPreview(item, 24)}`} className="border border-[var(--rule-soft)] bg-[var(--paper-alt)] px-2 py-1 text-[12px] text-[var(--ink-2)]">
            {shortPreview(item, 42)}
          </span>
        ))}
        {value.length > 8 && <span className="px-2 py-1 text-[12px] text-[var(--ink-3)]">+{value.length - 8}</span>}
      </div>
    )
  }

  if (isRecord(value)) {
    const entries = Object.entries(value).slice(0, 8)
    return (
      <div className="grid gap-1.5 md:grid-cols-2">
        {entries.map(([key, item]) => (
          <div key={key} className="min-w-0 border border-[var(--rule-soft)] bg-[var(--paper-alt)] px-2 py-1.5">
            <div className="truncate text-[9px] uppercase tracking-[0.1em] text-[var(--ink-3)]" style={{ fontFamily: MONO_FONT }}>{key}</div>
            <div className="truncate text-[12px] text-[var(--ink)]">{shortPreview(item, 72)}</div>
          </div>
        ))}
      </div>
    )
  }

  return <div className="text-[14px] leading-[1.55] text-[var(--ink)]">{shortPreview(value, 220)}</div>
}

function SinkraWorkflowView({ sinkra }: { sinkra?: ObservatoryTypeSpecific["sinkra"] }) {
  const workflows = sinkra?.workflows ?? []
  return (
    <LightScrollArea className="flex-1" viewportClassName="px-4 pb-12 pt-5 sm:px-6 lg:px-8">
      <article className="mx-auto w-full min-w-0 max-w-[1320px]">
        <SinkraHeader eyebrow="SINKRA workflow" title={sinkra?.processName || "Workflow"} meta={[`${workflows.length} workflows`, `${workflows.reduce((total, wf) => total + wf.steps.length, 0)} steps`, sinkra?.mode || "structured"]} />
        <div className="grid gap-5">
          {workflows.map((workflow) => (
            <section key={workflow.id} className="border border-[var(--rule)] bg-[var(--paper)]">
              <div className="grid gap-4 border-b border-[var(--rule)] bg-[var(--paper-alt)] p-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--ink-3)]" style={{ fontFamily: MONO_FONT }}>
                    {workflow.id} · {workflow.layer || "layer"}
                  </div>
                  <h3 className="mt-1 text-[24px] font-black leading-tight tracking-[-0.035em] text-[var(--ink)]" style={{ fontFamily: DISPLAY_FONT }}>
                    {workflow.name}
                  </h3>
                  {workflow.description && (
                    <p className="mt-2 max-w-[900px] text-[14px] leading-[1.55] text-[var(--ink-2)]">
                      {workflow.description}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-px bg-[var(--rule)] text-[10px] uppercase tracking-[0.12em]" style={{ fontFamily: MONO_FONT }}>
                  <MetricTile label="Trigger" value={workflow.trigger || "—"} />
                  <MetricTile label="Steps" value={String(workflow.steps.length)} />
                  <MetricTile label="Freq." value={workflow.frequency || "—"} wide />
                </div>
              </div>
              <div className="grid">
                {workflow.steps.map((step, index) => (
                  <div key={step.id} className="grid grid-cols-[46px_minmax(0,1fr)_96px] gap-4 border-b border-[var(--rule-soft)] px-4 py-3 last:border-b-0">
                    <div className="text-[12px] tabular-nums text-[var(--ink-3)]" style={{ fontFamily: MONO_FONT }}>
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <strong className="text-[14px] text-[var(--ink)]">{step.name}</strong>
                        <span className="text-[10px] uppercase tracking-[0.1em] text-[var(--ink-3)]" style={{ fontFamily: MONO_FONT }}>
                          {step.phase || "phase"} · {step.task || "task"}
                        </span>
                      </div>
                    </div>
                    <div className="text-right text-[10px] uppercase tracking-[0.1em] text-[var(--ink-3)]" style={{ fontFamily: MONO_FONT }}>
                      {step.executor || "—"}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </article>
    </LightScrollArea>
  )
}

function SinkraTasksView({ sinkra }: { sinkra?: ObservatoryTypeSpecific["sinkra"] }) {
  const tasks = sinkra?.tasks ?? []
  return (
    <LightScrollArea className="flex-1" viewportClassName="px-4 pb-12 pt-5 sm:px-6 lg:px-8">
      <article className="mx-auto w-full min-w-0 max-w-[1280px]">
        <SinkraHeader eyebrow="SINKRA task anatomy" title="Tasks" meta={[`${tasks.length} tasks`, sinkra?.version ? `v${sinkra.version}` : "version —"]} />
        <div className="overflow-x-auto border border-[var(--rule)] bg-[var(--paper)]">
          <div className="min-w-[720px]">
            <div className="grid grid-cols-[minmax(180px,1.5fr)_110px_100px_80px_80px_90px] border-b border-[var(--rule)] bg-[var(--paper-alt)] px-4 py-3 text-[10px] uppercase tracking-[0.13em] text-[var(--ink-3)]" style={{ fontFamily: MONO_FONT }}>
              <span>Task</span><span>Layer</span><span>Executor</span><span>Inputs</span><span>Outputs</span><span>Checks</span>
            </div>
            {tasks.map((task) => (
              <div key={task.id} className="grid grid-cols-[minmax(180px,1.5fr)_110px_100px_80px_80px_90px] items-center border-b border-[var(--rule-soft)] px-4 py-3 last:border-b-0">
                <strong className="min-w-0 truncate text-[13px] text-[var(--ink)]">{task.id}</strong>
                <span className="text-[12px] text-[var(--ink-2)]">{task.layer || "—"}</span>
                <span className="text-[12px] text-[var(--ink-2)]">{task.executor || "—"}</span>
                <span className="text-[18px] font-black text-[var(--ink)]" style={{ fontFamily: DISPLAY_FONT }}>{task.inputCount}</span>
                <span className="text-[18px] font-black text-[var(--ink)]" style={{ fontFamily: DISPLAY_FONT }}>{task.outputCount}</span>
                <span className="text-[12px] text-[var(--ink-2)]">{task.preconditions + task.postconditions}</span>
              </div>
            ))}
          </div>
        </div>
      </article>
    </LightScrollArea>
  )
}

function SinkraGatesView({ sinkra }: { sinkra?: ObservatoryTypeSpecific["sinkra"] }) {
  const gates = sinkra?.gates ?? []
  return (
    <LightScrollArea className="flex-1" viewportClassName="px-4 pb-12 pt-5 sm:px-6 lg:px-8">
      <article className="mx-auto w-full min-w-0 max-w-[1280px]">
        <SinkraHeader eyebrow="SINKRA quality gates" title="Gates" meta={[`${gates.length} gates`, sinkra?.score.result || "result —", sinkra?.score.score === null ? "score —" : `score ${sinkra?.score.score}`]} />
        <div className="grid gap-3 lg:grid-cols-2">
          {gates.map((gate) => (
            <section key={gate.id} className="border border-[var(--rule)] bg-[var(--paper)] p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--ink-3)]" style={{ fontFamily: MONO_FONT }}>
                    {gate.id} · {gate.type || "gate"}
                  </div>
                  <h3 className="mt-1 text-[18px] font-black leading-tight tracking-[-0.025em] text-[var(--ink)]" style={{ fontFamily: DISPLAY_FONT }}>
                    {gate.name}
                  </h3>
                </div>
                {gate.veto && (
                  <span className="border border-[var(--lime-ink)] px-2 py-1 text-[9px] uppercase tracking-[0.12em] text-[var(--lime-ink)]" style={{ fontFamily: MONO_FONT }}>
                    veto
                  </span>
                )}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-px bg-[var(--rule)]">
                <MetricTile label="Executor" value={gate.executor || "—"} />
                <MetricTile label="Threshold" value={gate.threshold} />
                <MetricTile label="Criteria" value={String(gate.criteriaCount)} />
              </div>
              {gate.position && (
                <p className="mt-3 text-[13px] leading-[1.5] text-[var(--ink-2)]">{gate.position}</p>
              )}
            </section>
          ))}
        </div>
      </article>
    </LightScrollArea>
  )
}

function SinkraHeader({ eyebrow, title, meta }: { eyebrow: string; title: string; meta: string[] }) {
  return (
    <header className="mb-6 border-b border-[var(--rule)] pb-5">
      <p className="mb-2 text-[10.5px] uppercase tracking-[0.16em] text-[var(--ink-3)]" style={{ fontFamily: MONO_FONT }}>
        {eyebrow}
      </p>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-[28px] font-black leading-none tracking-[-0.04em] text-[var(--ink)]" style={{ fontFamily: DISPLAY_FONT }}>
          {title}
        </h2>
        <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.12em] text-[var(--ink-3)]" style={{ fontFamily: MONO_FONT }}>
          {meta.filter(Boolean).map((item) => <span key={item}>{item}</span>)}
        </div>
      </div>
    </header>
  )
}

function MetricTile({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={cn("bg-[var(--paper)] px-3 py-2", wide && "col-span-2")}>
      <div className="text-[9px] uppercase tracking-[0.12em] text-[var(--ink-3)]">{label}</div>
      <div className="mt-0.5 truncate text-[12px] font-bold normal-case tracking-[0] text-[var(--ink)]">{value}</div>
    </div>
  )
}

function ScoreView({
  dimensions,
  scoreMetrics,
}: {
  dimensions: ObservatoryScoreDimension[]
  scoreMetrics: Array<{ label: string; value: string }>
}) {
  const compactWeight = (weight: string, index: number) => {
    const numeric = Number(weight)
    if (Number.isFinite(numeric)) {
      return numeric > 1 ? `${Math.round(numeric)}%` : `${Math.round(numeric * 100)}%`
    }
    return weight || `D${index + 1}`
  }

  return (
    <LightScrollArea className="flex-1" viewportClassName="px-4 pb-12 pt-5 sm:px-6 sm:pb-14 sm:pt-6 lg:px-8 lg:pb-16">
      <article className="mx-auto w-full min-w-0 max-w-[1280px]">
        <header className="mb-6 border-b border-[var(--rule)] pb-5">
          <p
            className="mb-2 text-[10.5px] uppercase tracking-[0.16em] text-[var(--ink-3)]"
            style={{ fontFamily: MONO_FONT }}
          >
            Bench scorecard
          </p>
          <h2
            className="text-[22px] font-black leading-none tracking-[-0.04em] text-[var(--ink)] sm:text-[26px] lg:text-[30px]"
            style={{ fontFamily: DISPLAY_FONT }}
          >
            Scorecard
          </h2>
        </header>

        {dimensions.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {dimensions.map((dimension, index) => {
              const scores = dimension.scores
                .map((score) => ({ ...score, numeric: Number(score.value) }))
                .filter((score) => Number.isFinite(score.numeric))
                .sort((a, b) => b.numeric - a.numeric)
              const winner = dimension.winner && dimension.winner !== "--" ? dimension.winner : scores[0]?.label
              return (
                <section key={`${dimension.name}-${index}`} className="min-w-0 border border-[var(--rule)] bg-[var(--paper)] p-4">
                  <div
                    className="mb-3 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 text-[10px] uppercase tracking-[0.14em] text-[var(--ink-3)]"
                    style={{ fontFamily: MONO_FONT }}
                  >
                    <span>{compactWeight(dimension.weight, index)}</span>
                    <span className="truncate text-right">
                      {winner ? `winner · ${winner}` : dimension.delta}
                    </span>
                  </div>
                  <h3 className="text-[19px] font-black leading-tight tracking-[-0.035em] text-[var(--ink)]" style={{ fontFamily: DISPLAY_FONT }}>
                    {dimension.name}
                  </h3>
                  {dimension.evidence && (
                    <p className="mt-2 line-clamp-2 text-[14px] italic leading-[1.45] text-[var(--ink-2)]" style={{ fontFamily: SERIF_FONT }}>
                      {dimension.evidence}
                    </p>
                  )}
                  <div className="mt-4 space-y-2.5">
                    {scores.length > 0 ? (
                      scores.map((score, scoreIndex) => (
                        <div
                          key={`${dimension.name}-${score.label}`}
                          className="grid grid-cols-[88px_minmax(0,1fr)_40px] items-center gap-2 sm:grid-cols-[110px_minmax(0,1fr)_42px] sm:gap-3"
                        >
                          <span className="truncate text-[12px] font-bold text-[var(--ink)]">
                            {score.label}
                          </span>
                          <span className="h-2 bg-[var(--paper-deep)]">
                            <span
                              className={cn(
                                "block h-full",
                                scoreIndex === 0 ? "bg-[var(--lime-fill)]" : "bg-[var(--ink)]",
                              )}
                              style={{ width: `${Math.max(0, Math.min(100, score.numeric))}%` }}
                            />
                          </span>
                          <span className="text-right text-[15px] font-black text-[var(--ink)]">
                            {score.numeric}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div
                        className="border-t border-[var(--rule-soft)] pt-3 text-[13px] italic leading-[1.45] text-[var(--ink-3)]"
                        style={{ fontFamily: SERIF_FONT }}
                      >
                        Sem scores numéricos estruturados nesta dimensão.
                      </div>
                    )}
                  </div>
                </section>
              )
            })}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {scoreMetrics.map((metric) => (
              <div key={metric.label} className="border border-[var(--rule-soft)] bg-[var(--paper-alt)] p-4">
                <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--ink-3)]" style={{ fontFamily: MONO_FONT }}>
                  {metric.label}
                </div>
                <div className="mt-1 text-[22px] font-black text-[var(--ink)]" style={{ fontFamily: DISPLAY_FONT }}>
                  {metric.value}
                </div>
              </div>
            ))}
          </div>
        )}
      </article>
    </LightScrollArea>
  )
}

function OverviewView({ runs }: { runs: ObservatoryRunSummary[] }) {
  const statusCounts = countBy(runs, (run) => run.status || "unknown")
  const schemaCounts = countBy(runs, (run) => run.schema || "unknown")
  const readinessRows = runs.slice(0, 18).map((run) => {
    const extras = run.extras ?? {}
    return {
      slug: run.slug,
      title: run.displayTitle,
      cells: [
        Boolean(extras.hasCore),
        Boolean(extras.hasMetrics),
        Boolean(extras.hasState),
        Boolean(extras.hasLog),
        Boolean(extras.hasSources),
      ],
    }
  })
  const datedRuns = [...runs].sort((a, b) => a.date.localeCompare(b.date))
  const maxSources = Math.max(1, ...runs.map((run) => Number(run.sources) || 0))
  const maxFiles = Math.max(1, ...runs.map((run) => run.files || 0))
  const completed = runs.filter((run) => /complete|completed/i.test(run.status)).length
  const rich = runs.filter((run) => {
    const extras = run.extras ?? {}
    return extras.hasCore && extras.hasMetrics && extras.hasState && extras.hasSources
  }).length

  /* Cut 06 — Trust: coverage × integrity */
  const scatterPoints: ScatterPoint[] = runs
    .map((run) => {
      const cov = coverageNumeric(run.coverage)
      const integ = coverageNumeric(run.integrity)
      if (cov == null || integ == null) return null
      return {
        x: cov,
        y: integ,
        label: run.displayTitle.slice(0, 14),
        highlight: integ >= 0.85,
      }
    })
    .filter((p): p is ScatterPoint => p !== null)
  const aboveThreshold = scatterPoints.filter((p) => p.highlight).length

  /* Cut 07 — Cadence: timeline. Filter runs without parseable dates
   * (bench corpus can emit `date: ""` when metadata is missing). */
  const timelinePoints: TimelinePoint[] = runs
    .filter((run) => run.date && !Number.isNaN(new Date(run.date).getTime()))
    .map((run) => ({
      date: run.date,
      label: run.displayTitle.slice(0, 14),
      statusKey: statusKeyFromRaw(run.status),
    }))

  /* Cut 08 — Stop-reason taxonomy */
  const stopReasonCategories: Array<{ cat: string; it: string; desc: string; pattern: RegExp }> = [
    {
      cat: "Halted before report",
      it: "pipeline stalled",
      desc: "Query and prompt were generated, then the run stalled. No synthesis ever happened.",
      pattern: /apenas prompt|sem report|parou após prompt|prompt prontos/i,
    },
    {
      cat: "Synthesis without metrics",
      it: "unverified",
      desc: "Report exists on disk but the integrity score was never computed. Citations cannot be vouched for.",
      pattern: /métricas não escritas|métricas ausentes|state ausente|missing metric/i,
    },
    {
      cat: "Complete & consolidated",
      it: "validated",
      desc: "Core artifacts present, metrics computed, readiness flags green. Citeable in production.",
      pattern: /core completo|métricas consolidadas|validados|deep research consolidado|métricas validadas|sem follow-up necessário|recommendations entregues|pronto para revisão/i,
    },
    {
      cat: "Schema-legacy",
      it: "pre-v2",
      desc: "Written under the old contract. Migration is mechanical but unscheduled.",
      pattern: /schema legado|legacy|migração para v2/i,
    },
  ]
  /* Classify each run into EXACTLY ONE category (first pattern that matches wins).
   * Then count occurrences per category — guarantees Σ counts ≤ total. */
  function classifyRun(run: ObservatoryRunSummary): number {
    const reason = String(run.extras?.stopReason ?? run.status ?? "")
    for (let i = 0; i < stopReasonCategories.length; i += 1) {
      if (stopReasonCategories[i].pattern.test(reason)) return i
    }
    /* Fallback by status key when no pattern matches */
    const sk = statusKeyFromRaw(run.status)
    if (sk === "completed") return 2 /* Complete & consolidated */
    if (sk === "partial") return 0   /* Halted before report */
    if (sk === "legacy") return 3    /* Schema-legacy */
    if (sk === "missing") return 1   /* Synthesis without metrics */
    return -1                         /* Unclassified */
  }
  const taxonomyCounts = new Array(stopReasonCategories.length).fill(0)
  for (const run of runs) {
    const idx = classifyRun(run)
    if (idx >= 0) taxonomyCounts[idx] += 1
  }
  const taxonomyItems: TaxonomyItem[] = stopReasonCategories.map((c, i) => ({
    cat: c.cat,
    it: c.it,
    count: taxonomyCounts[i],
    desc: c.desc,
  }))

  return (
    <LightScrollArea className="flex-1" viewportClassName="px-4 pb-12 pt-5 sm:px-6 sm:pb-14 sm:pt-6 lg:px-10 lg:pb-16 lg:pt-7">
      <article className="mx-auto w-full min-w-0 max-w-[1260px]">
        <header className="mb-6 grid gap-4 border-b border-[var(--rule)] pb-5 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div>
            <p
              className="mb-2 text-[10.5px] uppercase tracking-[0.16em] text-[var(--ink-3)]"
              style={{ fontFamily: MONO_FONT }}
            >
              Research corpus
            </p>
            <h2
              className="text-[24px] font-black leading-none tracking-[-0.045em] text-[var(--ink)] sm:text-[28px] lg:text-[34px]"
              style={{ fontFamily: DISPLAY_FONT }}
            >
              Visão geral das pesquisas
            </h2>
            <p
              className="mt-3 max-w-3xl text-[16px] italic leading-[1.55] text-[var(--ink-3)]"
              style={{ fontFamily: SERIF_FONT }}
            >
              Um mapa rápido de status, profundidade, contrato de saída e densidade de evidência do corpus em
              `docs/research`.
            </p>
          </div>
          <div
            className="grid grid-cols-2 gap-px border border-[var(--rule)] bg-[var(--rule)] text-[10px] uppercase tracking-[0.12em]"
            style={{ fontFamily: MONO_FONT }}
          >
            {[
              ["runs", runs.length],
              ["complete", completed],
              ["rich", rich],
              ["span", `${datedRuns[0]?.date ?? "--"} → ${datedRuns.at(-1)?.date ?? "--"}`],
            ].map(([label, value]) => (
              <div key={label} className="bg-[var(--paper-alt)] p-3">
                <div className="text-[var(--ink-3)]">{label}</div>
                <div className="mt-1 text-[16px] font-black text-[var(--ink)]">{value}</div>
              </div>
            ))}
          </div>
        </header>

        <div className="grid grid-cols-12 gap-4">
          <OverviewPanel className="col-span-12 lg:col-span-4" eyebrow="Cut 01" title="Status">
            <Bars data={statusCounts} total={runs.length} />
          </OverviewPanel>
          <OverviewPanel className="col-span-12 lg:col-span-4" eyebrow="Cut 02" title="Schemas">
            <Bars data={schemaCounts} total={runs.length} />
          </OverviewPanel>
          <OverviewPanel className="col-span-12 lg:col-span-4" eyebrow="Cut 03" title="Wave depth">
            <Bars
              data={countBy(runs, (run) => (run.waves >= 3 ? "3+ waves" : `${run.waves || 0} waves`))}
              total={runs.length}
            />
          </OverviewPanel>

          <OverviewPanel className="col-span-12 xl:col-span-7" eyebrow="Cut 04" title="Readiness">
            <div className="space-y-1">
              <div
                className="grid grid-cols-[minmax(0,1fr)_repeat(5,34px)] gap-1 text-[9px] uppercase tracking-[0.1em] text-[var(--ink-3)]"
                style={{ fontFamily: MONO_FONT }}
              >
                <span>run</span>
                {["core", "met", "state", "log", "src"].map((label) => (
                  <span key={label} className="text-center">{label}</span>
                ))}
              </div>
              {readinessRows.map((row) => (
                <div
                  key={row.slug}
                  className="grid grid-cols-[minmax(0,1fr)_repeat(5,34px)] gap-1"
                >
                  <span
                    className="truncate text-[11px] text-[var(--ink-2)]"
                    style={{ fontFamily: MONO_FONT }}
                    title={row.title}
                  >
                    {row.title}
                  </span>
                  {row.cells.map((on, index) => (
                    <span
                      key={`${row.slug}-${index}`}
                      className={cn("h-5 border border-[var(--rule-soft)]", on ? "bg-[var(--ink)]" : "bg-[var(--paper-deep)]")}
                    />
                  ))}
                </div>
              ))}
            </div>
          </OverviewPanel>

          <OverviewPanel className="col-span-12 xl:col-span-5" eyebrow="Cut 05" title="Sources × files">
            <div className="relative h-[250px] border border-[var(--rule-soft)] bg-[var(--paper-alt)]">
              {runs.map((run) => {
                const x = ((Number(run.sources) || 0) / maxSources) * 88 + 4
                const y = 92 - ((run.files || 0) / maxFiles) * 84
                const size = Math.max(6, Math.min(18, 6 + run.waves * 3))
                return (
                  <span
                    key={run.slug}
                    className="absolute rounded-full border border-[var(--ink)] bg-[var(--lime-ink)]"
                    title={`${run.displayTitle}: ${run.sources} fontes, ${run.files} arquivos`}
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      width: size,
                      height: size,
                      opacity: /complete|completed/i.test(run.status) ? 0.9 : 0.45,
                    }}
                  />
                )
              })}
              <span
                className="absolute bottom-2 left-3 text-[9px] uppercase tracking-[0.12em] text-[var(--ink-3)]"
                style={{ fontFamily: MONO_FONT }}
              >
                fontes →
              </span>
              <span
                className="absolute left-3 top-2 text-[9px] uppercase tracking-[0.12em] text-[var(--ink-3)]"
                style={{ fontFamily: MONO_FONT }}
              >
                arquivos ↑
              </span>
            </div>
          </OverviewPanel>

          <OverviewPanel className="col-span-12 xl:col-span-8" eyebrow="Cut 06" title="Trust · coverage × integrity">
            {scatterPoints.length > 0 ? (
              <div className="h-[260px]">
                <ScatterChart points={scatterPoints} threshold={0.85} thresholdLabel="trust threshold · 0.85" />
              </div>
            ) : (
              <p
                className="px-2 py-4 text-[12.5px] italic text-[var(--ink-3)]"
                style={{ fontFamily: SERIF_FONT }}
              >
                Nenhuma run tem ambos coverage e integrity numéricos.
              </p>
            )}
            <div
              className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] tracking-[0.08em] text-[var(--ink-3)]"
              style={{ fontFamily: MONO_FONT }}
            >
              <span>
                <strong className="text-[var(--ink)]">{scatterPoints.length}</strong>/{runs.length} reportáveis
              </span>
              <span>
                <strong className="text-[var(--ink)]">{aboveThreshold}</strong> acima do threshold
              </span>
            </div>
          </OverviewPanel>

          <OverviewPanel className="col-span-12 xl:col-span-4" eyebrow="Cut 07" title="Stop reasons">
            <TaxonomyList items={taxonomyItems} total={runs.length} />
          </OverviewPanel>

          <OverviewPanel className="col-span-12" eyebrow="Cut 08" title="Cadence · timeline">
            <div className="h-[220px]">
              <TimelineChart points={timelinePoints} />
            </div>
            <div
              className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] tracking-[0.08em] text-[var(--ink-3)]"
              style={{ fontFamily: MONO_FONT }}
            >
              <span>
                span <strong className="text-[var(--ink)]">{datedRuns[0]?.date ?? "—"}</strong> →{" "}
                <strong className="text-[var(--ink)]">{datedRuns.at(-1)?.date ?? "—"}</strong>
              </span>
              <span>
                <strong className="text-[var(--ink)]">{runs.length}</strong> runs
              </span>
            </div>
          </OverviewPanel>
        </div>
      </article>
    </LightScrollArea>
  )
}

function OverviewPanel({
  eyebrow,
  title,
  className,
  children,
}: {
  eyebrow: string
  title: string
  className?: string
  children: ReactNode
}) {
  return (
    <section className={cn("border border-[var(--rule)] bg-[var(--paper)] p-4", className)}>
      <div
        className="mb-3 flex items-baseline justify-between border-b border-[var(--rule-soft)] pb-2 text-[10px] uppercase tracking-[0.15em] text-[var(--ink-3)]"
        style={{ fontFamily: MONO_FONT }}
      >
        <span>{eyebrow}</span>
        <span>{title}</span>
      </div>
      {children}
    </section>
  )
}

function Bars({ data, total }: { data: Array<[string, number]>; total: number }) {
  return (
    <div className="space-y-3">
      {data.map(([label, value]) => (
        <div key={label}>
          <div
            className="mb-1 flex justify-between gap-3 text-[10px] uppercase tracking-[0.1em] text-[var(--ink-3)]"
            style={{ fontFamily: MONO_FONT }}
          >
            <span className="truncate">{label}</span>
            <span>{value}</span>
          </div>
          <div className="h-2 bg-[var(--paper-deep)]">
            <div
              className="h-full bg-[var(--ink)]"
              style={{ width: `${total === 0 ? 0 : Math.max(4, (value / total) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function countBy<T>(items: T[], keyFor: (item: T) => string): Array<[string, number]> {
  const map = new Map<string, number>()
  for (const item of items) {
    const key = keyFor(item)
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}

function SourcesView({
  sources,
  sourceSummary,
}: {
  sources: ObservatorySource_Entry[]
  sourceSummary: string[]
}) {
  const high = sources.filter((source) => source.credibility === "HIGH")
  const dated = sources.filter((source) => source.date && source.date !== "—")
  const flagged = sources.filter((source) => source.flags.length > 0)
  const hosts = countBy(sources, (source) => sourceHost(source.url)).slice(0, 8)

  return (
    <LightScrollArea className="flex-1 bg-[#050505]" viewportClassName="bg-[#050505] px-4 pb-12 pt-5 sm:px-6 lg:px-8" fadeColor="#050505">
      <article className="mx-auto w-full min-w-0 max-w-[1440px]" style={observatoryDarkThemeVars}>
        <section className="grid overflow-hidden border border-[#f5f4e7]/16 bg-[#10110d] lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="p-6 sm:p-8">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#d1ff00]" style={{ fontFamily: MONO_FONT }}>
              evidence system
            </p>
            <h2 className="aiox-safe-text mt-3 max-w-[900px] text-[38px] font-black leading-[0.98] tracking-[-0.05em] text-[#f5f4e7] sm:text-[56px]" style={{ fontFamily: DISPLAY_FONT }}>
              Fontes que sustentam a pesquisa
            </h2>
            <p className="mt-5 max-w-[760px] text-[16px] leading-[1.62] text-[#f5f4e7]/70">
              Visão de confiabilidade, variedade e recência das evidências. A lista deixa de ser só referência e passa a mostrar risco de base empírica.
            </p>
          </div>
          <aside className="grid content-end gap-px bg-[#d1ff00] p-6 text-[#050505] sm:p-8">
            <div className="text-[72px] font-black leading-none tracking-[-0.06em]" style={{ fontFamily: DISPLAY_FONT }}>{sources.length}</div>
            <div className="text-[12px] uppercase tracking-[0.14em]" style={{ fontFamily: MONO_FONT }}>fontes indexadas</div>
            <div className="mt-5 grid grid-cols-3 gap-px bg-[#050505]/16">
              <ResearchLightMetric label="High" value={String(high.length)} />
              <ResearchLightMetric label="Com data" value={String(dated.length)} />
              <ResearchLightMetric label="Flags" value={String(flagged.length)} />
            </div>
          </aside>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="aiox-panel bg-[#0f0f11]">
            <ResearchPanelHead eyebrow="source register" title="Registro de evidências" meta={`${high.length}/${sources.length} high`} />
            <div className="grid gap-px bg-[#f5f4e7]/10 p-px">
              {sources.map((source, index) => (
                <article key={source.id || source.url || `${source.title}-${index}`} className="grid gap-4 bg-[#050505] p-4 md:grid-cols-[44px_minmax(0,1fr)_160px]">
                  <div className="text-[22px] font-black leading-none text-[#f5f4e7]/25" style={{ fontFamily: DISPLAY_FONT }}>
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] uppercase tracking-[0.12em] text-[#d1ff00]" style={{ fontFamily: MONO_FONT }}>{source.credibility || "—"}</span>
                      <span className="text-[10px] uppercase tracking-[0.12em] text-[#f5f4e7]/35" style={{ fontFamily: MONO_FONT }}>{sourceHost(source.url)}</span>
                    </div>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="group mt-2 block cursor-pointer text-[#f5f4e7] transition-colors hover:text-[#d1ff00]"
                    >
                      <h3 className="aiox-safe-text text-[20px] font-black leading-[1.08] tracking-[-0.035em]" style={{ fontFamily: DISPLAY_FONT }}>
                        {source.title || source.url}
                      </h3>
                      <span className="mt-2 block truncate text-[12px] text-[#f5f4e7]/45 transition-colors group-hover:text-[#d1ff00]/70">
                        {source.url}
                      </span>
                    </a>
                    {source.flags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {source.flags.slice(0, 4).map((flag) => (
                          <span key={flag} className="border border-[#f5f4e7]/12 px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-[#f5f4e7]/55" style={{ fontFamily: MONO_FONT }}>
                            {flag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="grid content-start gap-2 md:justify-items-end">
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-9 w-9 cursor-pointer items-center justify-center border border-[#f5f4e7]/16 text-[#f5f4e7]/64 transition-colors hover:border-[#d1ff00] hover:text-[#d1ff00]"
                      title="Abrir fonte"
                      aria-label={`Abrir fonte: ${source.title || source.url}`}
                    >
                      <ExternalLink size={15} strokeWidth={1.8} />
                    </a>
                    {typeof source.multiplier === "number" && (
                      <span className="text-[26px] font-black leading-none text-[#f5f4e7]" style={{ fontFamily: DISPLAY_FONT }}>{source.multiplier}x</span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <aside className="grid content-start gap-6">
            <section className="aiox-panel bg-[#0f0f11]">
              <ResearchPanelHead eyebrow="domains" title="Mix de fontes" meta={`${hosts.length} domínios`} />
              <div className="grid gap-3 p-4">
                {hosts.map(([host, count]) => (
                  <ResearchBar key={host} label={host} value={Math.round((count / Math.max(1, sources.length)) * 100)} />
                ))}
              </div>
            </section>
            {sourceSummary.length > 0 && (
              <section className="aiox-panel bg-[#0f0f11]">
                <ResearchPanelHead eyebrow="summary" title="Leitura rápida" meta={`${sourceSummary.length} sinais`} />
                <div className="grid gap-2 p-4">
                  {sourceSummary.slice(0, 8).map((item) => (
                    <div key={item} className="border border-[#f5f4e7]/10 bg-[#050505] p-3 text-[13px] leading-[1.5] text-[#f5f4e7]/68">
                      {item}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </aside>
        </div>
      </article>
    </LightScrollArea>
  )
}

function ResearchPlayersView({ players }: { players: ObservatoryPlayer[] }) {
  const tiers = [1, 2, 3] as const
  const included = players.filter((player) => !player.excluded)
  const excluded = players.filter((player) => player.excluded)
  const categories = countBy(players, (player) => player.category ?? "sem categoria").slice(0, 8)

  return (
    <LightScrollArea className="flex-1 bg-[#050505]" viewportClassName="bg-[#050505] px-4 pb-12 pt-5 sm:px-6 lg:px-8" fadeColor="#050505">
      <article className="mx-auto w-full min-w-0 max-w-[1440px]" style={observatoryDarkThemeVars}>
        <section className="grid overflow-hidden border border-[#f5f4e7]/16 bg-[#10110d] lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="p-6 sm:p-8">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#d1ff00]" style={{ fontFamily: MONO_FONT }}>
              market map
            </p>
            <h2 className="aiox-safe-text mt-3 max-w-[900px] text-[38px] font-black leading-[0.98] tracking-[-0.05em] text-[#f5f4e7] sm:text-[56px]" style={{ fontFamily: DISPLAY_FONT }}>
              Players, categorias e exclusões
            </h2>
            <p className="mt-5 max-w-[760px] text-[16px] leading-[1.62] text-[#f5f4e7]/70">
              A aba organiza quem realmente entrou na análise, quem foi descartado e quais categorias estão dominando a pesquisa.
            </p>
          </div>
          <aside className="grid content-end gap-px bg-[#d1ff00] p-6 text-[#050505] sm:p-8">
            <div className="text-[72px] font-black leading-none tracking-[-0.06em]" style={{ fontFamily: DISPLAY_FONT }}>{players.length}</div>
            <div className="text-[12px] uppercase tracking-[0.14em]" style={{ fontFamily: MONO_FONT }}>players detectados</div>
            <div className="mt-5 grid grid-cols-3 gap-px bg-[#050505]/16">
              <ResearchLightMetric label="Incluídos" value={String(included.length)} />
              <ResearchLightMetric label="Excluídos" value={String(excluded.length)} />
              <ResearchLightMetric label="Categorias" value={String(categories.length)} />
            </div>
          </aside>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="aiox-panel bg-[#0f0f11]">
            <ResearchPanelHead eyebrow="tiers" title="Mapa competitivo" meta={`${included.length} incluídos`} />
            <div className="grid gap-px bg-[#f5f4e7]/10 p-px lg:grid-cols-3">
          {tiers.map((tier) => {
            const tierPlayers = players.filter((player) => player.tier === tier)
            return (
              <section key={tier} className="min-w-0 bg-[#050505]">
                <div
                  className="flex items-center justify-between border-b border-[#f5f4e7]/10 px-4 py-3 text-[10.5px] uppercase tracking-[0.16em] text-[#f5f4e7]/42"
                  style={{ fontFamily: MONO_FONT }}
                >
                  <span>Tier {tier}</span>
                  <span>{tierPlayers.length}</span>
                </div>
                <div className="grid gap-3 p-4">
                  {tierPlayers.length === 0 && (
                    <div className="text-[13px] text-[#f5f4e7]/45">Sem players neste tier.</div>
                  )}
                  {tierPlayers.map((player, index) => (
                    <ResearchPlayerCard key={player.id || player.name} player={player} index={index} />
                  ))}
                </div>
              </section>
            )
          })}
            </div>
          </section>

          <aside className="grid content-start gap-6">
            <section className="aiox-panel bg-[#0f0f11]">
              <ResearchPanelHead eyebrow="categories" title="Categorias" meta={`${categories.length}`} />
              <div className="grid gap-3 p-4">
                {categories.map(([category, count]) => (
                  <ResearchBar key={category} label={category} value={Math.round((count / Math.max(1, players.length)) * 100)} />
                ))}
              </div>
            </section>
          {players.some((player) => player.tier == null) && (
              <section className="aiox-panel bg-[#0f0f11]">
                <ResearchPanelHead eyebrow="untiered" title="Sem tier" meta={`${players.filter((player) => player.tier == null).length}`} />
                <div className="grid gap-3 p-4">
                {players
                  .filter((player) => player.tier == null)
                  .map((player) => (
                      <ResearchPlayerCard key={player.id || player.name} player={player} />
                  ))}
              </div>
            </section>
          )}
          {excluded.length > 0 && (
            <section className="aiox-panel bg-[#0f0f11]">
              <ResearchPanelHead eyebrow="excluded" title="Descartados" meta={`${excluded.length}`} />
              <div className="grid gap-2 p-4">
                {excluded.slice(0, 8).map((player) => (
                  <div key={player.id || player.name} className="border border-[#f5f4e7]/10 bg-[#050505] p-3">
                    <div className="aiox-safe-text text-[15px] font-black text-[#f5f4e7]">{player.name}</div>
                    <p className="mt-1 line-clamp-2 text-[12px] leading-[1.45] text-[#f5f4e7]/55">{player.exclusionReason ?? "Sem motivo estruturado."}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
          </aside>
        </div>
      </article>
    </LightScrollArea>
  )
}

function ResearchPlayerCard({ player, index = 0 }: { player: ObservatoryPlayer; index?: number }) {
  return (
    <article className={cn("min-w-0 border bg-[#050505] p-4", player.excluded ? "border-[#f5f4e7]/10 opacity-55" : "border-[#f5f4e7]/14")}>
      <div className="flex items-start justify-between gap-3">
        <span className="text-[10px] uppercase tracking-[0.12em] text-[#d1ff00]" style={{ fontFamily: MONO_FONT }}>
          {player.number || String(index + 1).padStart(2, "0")}
        </span>
        <span className="max-w-[160px] truncate text-right text-[10px] uppercase tracking-[0.12em] text-[#f5f4e7]/38" style={{ fontFamily: MONO_FONT }}>
          {player.category ?? "sem categoria"}
        </span>
      </div>
      <h3 className="aiox-safe-text mt-3 text-[22px] font-black leading-[1.05] tracking-[-0.035em] text-[#f5f4e7]" style={{ fontFamily: DISPLAY_FONT }}>
        {player.name}
      </h3>
      {player.whatItDoes && (
        <p className="mt-3 line-clamp-3 text-[13px] leading-[1.5] text-[#f5f4e7]/64">{player.whatItDoes}</p>
      )}
      {player.insight && (
        <p className="mt-3 border-t border-[#f5f4e7]/10 pt-3 text-[13px] leading-[1.5] text-[#d1ff00]/82">{player.insight}</p>
      )}
      {player.sourceTitle && (
        <div className="mt-4 text-[10px] uppercase tracking-[0.12em] text-[#f5f4e7]/34" style={{ fontFamily: MONO_FONT }}>
          {player.sourceTitle}
        </div>
      )}
    </article>
  )
}

function sourceHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url || "sem domínio"
  }
}
