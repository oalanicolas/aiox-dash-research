import "server-only"

import type {
  ResearchObservatoryData,
  ResearchRunSummary,
} from "@/lib/research-observatory.server"
import { CATEGORY_LABELS, CATEGORY_ORDER, type CategorySlug } from "@/lib/research-observatory.server"
import type {
  ObservatoryAdapterMeta,
  ObservatoryData,
  ObservatoryRunSummary,
} from "../foundations/types"

/* ──────────────────────────────────────────────────────────────────────
   Research adapter — maps ResearchObservatoryData → ObservatoryData.
   Pure mapping. No I/O.
   ────────────────────────────────────────────────────────────────────── */

export const researchAdapterMeta: ObservatoryAdapterMeta = {
  source: "research",
  label: "Research",
  sourceRoot: "docs/research",
  group: {
    groupKey: (run) => (run.category ?? "other") as CategorySlug,
    groupLabel: (key) => CATEGORY_LABELS[key as CategorySlug] ?? key,
    groupOrder: CATEGORY_ORDER as unknown as string[],
  },
  formatCoverage: (run) => run.coverage,
  buildDeepenCommand: (run) =>
    `claude && /tech-research "${run.slug}" "Aprofunde esta pesquisa: valide lacunas, atualize fontes críticas, detalhe recomendações acionáveis e gere um novo follow-up em docs/research."`,
}

function mapRun(run: ResearchRunSummary): ObservatoryRunSummary {
  return {
    slug: run.slug,
    title: run.title,
    displayTitle: run.displayTitle,
    date: run.date,
    category: run.category,
    schema: run.schema,
    status: run.status,
    coverage: run.coverage,
    integrity: run.integrity,
    files: run.files,
    waves: run.waves,
    sources: Number(run.sources) || 0,
    active: run.active,
    inferred: run.inferred ?? undefined,
    extras: {
      freshness: run.freshness,
      hasCore: run.hasCore,
      hasMetrics: run.hasMetrics,
      hasState: run.hasState,
      hasLog: run.hasLog,
      hasSources: run.hasSources,
    },
  }
}

export function mapResearchToObservatory(
  data: ResearchObservatoryData,
): ObservatoryData {
  const runs = data.runs.map(mapRun)
  const selectedRun = mapRun(data.selectedRun)
  const availableModes: ObservatoryData["availableModes"] = ["map"]
  if (data.documents.some((doc) => doc.phase === "recommend" || /recommend|quick-win|followup|follow-up/i.test(doc.file))) {
    availableModes.push("recommendations")
  }
  if (data.topSources.length > 0 || data.documents.some((doc) => doc.file === "research-graph.json")) {
    availableModes.push("evidence")
  }
  if (selectedRun.waves > 0 || data.documents.some((doc) => doc.phase === "wave" || /wave/i.test(doc.file))) {
    availableModes.push("waves")
  }
  if (data.topSources.length > 0) availableModes.push("sources")
  if (data.players.length > 0) availableModes.push("players")
  if (data.documents.some((doc) => doc.file === "curiosity_queue.yaml")) availableModes.push("curiosity")
  availableModes.push("document")

  return {
    source: "research",
    sourceRoot: "docs/research",
    sourceLabel: researchAdapterMeta.label,
    newActionLabel: "Nova Pesquisa",
    deepenCommand: researchAdapterMeta.buildDeepenCommand(selectedRun),
    groupBuckets: buildGroupBuckets(runs),
    stats: {
      totalRuns: data.stats.totalRuns,
      completeCore: data.stats.completeCore,
      withMetrics: data.stats.withMetrics,
      withState: data.stats.withState,
      withLog: data.stats.withLog,
      withSources: data.stats.withSources,
    },
    runs,
    selectedRun,
    documents: data.documents,
    selectedDocument: data.selectedDocument,
    sourceSummary: data.sourceSummary,
    topSources: data.topSources.map((s) => ({
      id: s.id,
      url: s.url,
      title: s.title,
      date: s.date,
      credibility: s.credibility,
      multiplier: s.multiplier,
      flags: s.flags,
    })),
    players: data.players,

    /* Research doesn't produce bench-rich blocks */
    matrix: null,
    scoreDimensions: [],
    personas: [],
    tco: null,
    tiebreakers: [],
    cliffs: [],
    decisionTree: [],
    categorical: [],
    gapItems: [],
    metadataMetrics: [],
    scoreMetrics: [],
    editorsNote: null,
    playerProfiles: [],
    benchmarkMethod: "",
    benchmarkConfidence: "",
    benchmarkNarrative: "",
    benchmarkShortTitle: "",
    typeSpecific: {},

    availableModes,
  }
}

function buildGroupBuckets(
  runs: ObservatoryRunSummary[],
): Array<{ key: string; label: string; slugs: string[] }> {
  const map = new Map<string, string[]>()
  for (const run of runs) {
    const key = researchAdapterMeta.group.groupKey(run)
    const list = map.get(key) ?? []
    list.push(run.slug)
    map.set(key, list)
  }
  return researchAdapterMeta.group.groupOrder
    .filter((k) => map.has(k))
    .map((k) => ({
      key: k,
      label: researchAdapterMeta.group.groupLabel(k),
      slugs: map.get(k) ?? [],
    }))
}
