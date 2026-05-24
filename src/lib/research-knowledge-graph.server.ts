import "server-only"

import { readdir, readFile, stat } from "node:fs/promises"
import path from "node:path"
import type {
  ResearchGraphEdge,
  ResearchGraphEdgeKind,
  ResearchGraphNode,
  ResearchKnowledgeGraph,
} from "@/components/research-graph/types"
import { CURATED_SEED_CONNECTIONS } from "./research-graph-curated-seeds"
import { manualResearchGraphConnections, manualResearchGraphNodes } from "./research-graph-manual-connections"
import { resolveDashPath } from "./workspace-root.server"

type JsonRecord = Record<string, unknown>

type MutableGraph = {
  nodes: Map<string, ResearchGraphNode>
  edges: Map<string, ResearchGraphEdge>
  researchSlugs: Set<string>
  benchSlugs: Set<string>
  graphTexts: Map<string, string>
  formalCrossLinks: number
  manualEdges: number
  researchGraphs: number
}

type RunIndex = {
  id: string
  slug: string
  type: "research" | "bench"
  title: string
  topics: string[]
  textFingerprint: Set<string>
}

type GraphVisibilityMode = "local" | "remote"

const CACHE_TTL_MS = 5_000
const MAX_PAIR_EDGES = 180
const MAX_PLAYER_NODES = 120
const LEGACY_PARALLEL_SUFFIX = /-(claude|codex|gemini|opencode|byok|consolidado)$/
const RESEARCH_CORE_FILES = ["README.md", "00-query-original.md", "01-deep-research-prompt.md", "02-research-report.md", "03-recommendations.md"]

let graphCache:
  | {
      root: string
      visibilityMode: GraphVisibilityMode
      expiresAt: number
      graph: ResearchKnowledgeGraph
    }
  | null = null

const TOPIC_RULES: Array<{ id: string; label: string; terms: string[] }> = [
  { id: "research-core", label: "Research Core", terms: ["research", "deep-research", "open-research", "collector", "citation", "evidence"] },
  { id: "bench", label: "Bench & Scorecards", terms: ["bench", "benchmark", "scorecard", "matrix", "rubric", "evaluation"] },
  { id: "agents", label: "Agentes & Orquestração", terms: ["agent", "agents", "multi-agent", "orchestration", "claude-code", "codex", "runner", "skill"] },
  { id: "design-system", label: "Design System", terms: ["design", "design-md", "brandbook", "component", "tailwind", "shadcn", "ui"] },
  { id: "frontend", label: "Frontend Stack", terms: ["frontend", "react", "nextjs", "vite", "astro", "dashboard", "playwright"] },
  { id: "slides", label: "Slides & Apresentações", terms: ["slide", "slides", "presentation", "presenton", "gamma", "deck"] },
  { id: "content", label: "Conteúdo & Vídeo", terms: ["content", "shortform", "video", "submagic", "descript", "eddie", "marketing"] },
  { id: "support", label: "Helpdesk & Omnichannel", terms: ["helpdesk", "omnichannel", "zendesk", "chatwoot", "intercom", "octadesk"] },
  { id: "process", label: "Processos & Workflows", terms: ["process", "processos", "workflow", "tasks", "pipeline", "sinkra", "sop"] },
  { id: "devops", label: "Infra & Deploy", terms: ["deploy", "infra", "cicd", "ci-cd", "vercel", "github", "governance"] },
  { id: "growth", label: "Growth & GTM", terms: ["growth", "gtm", "pricing", "copy", "landing", "acquisition", "competitor"] },
  { id: "knowledge", label: "Knowledge Ops", terms: ["knowledge", "kb", "graph", "memory", "taxonomy", "ontology"] },
]

const ARTIFACT_TYPES: Array<{ id: string; label: string; files: string[]; group: "research" | "bench" | "shared" }> = [
  { id: "research-graph", label: "research-graph.json", files: ["research-graph.json"], group: "research" },
  { id: "bench-output", label: "bench-output-dash.json", files: ["bench-output-dash.json"], group: "bench" },
  { id: "sources", label: "sources", files: ["sources.yaml", "sources.json"], group: "shared" },
  { id: "metrics", label: "metrics", files: ["metrics.yaml", "metrics.json"], group: "shared" },
  { id: "players", label: "players", files: ["players.yaml", "players.json", "inventory-players.json"], group: "shared" },
  { id: "matrix", label: "matrices", files: ["matrices.yaml", "comparison-matrix.json", "comparison-matrix.md"], group: "shared" },
  { id: "claims", label: "claims", files: ["claims.yaml", "claims.json"], group: "shared" },
  { id: "decision-ledger", label: "decision-ledger", files: ["decision-ledger.yaml", "decision-ledger.json"], group: "shared" },
  { id: "risk-register", label: "risk-register", files: ["risk-register.yaml", "risk-register.json", "risk-register.md"], group: "shared" },
  { id: "scorecard", label: "scorecard", files: ["scorecard.json", "scorecard.md"], group: "bench" },
  { id: "dashboard-manifest", label: "dashboard-manifest", files: ["dashboard-manifest.yaml", "dashboard-manifest.json"], group: "shared" },
  { id: "pipeline-state", label: "pipeline-state", files: ["pipeline-state.yaml"], group: "research" },
]

const STOPWORDS = new Set([
  "para",
  "com",
  "uma",
  "das",
  "dos",
  "que",
  "por",
  "the",
  "and",
  "with",
  "from",
  "sobre",
  "como",
  "vs",
  "v2",
  "v3",
  "2026",
])

export async function getResearchKnowledgeGraph(): Promise<ResearchKnowledgeGraph> {
  const root = resolveDashPath()
  const visibilityMode = getGraphVisibilityMode()
  const now = Date.now()
  if (graphCache && graphCache.root === root && graphCache.visibilityMode === visibilityMode && graphCache.expiresAt > now) return graphCache.graph

  const graph = await buildResearchKnowledgeGraph(visibilityMode)
  graphCache = {
    root,
    visibilityMode,
    expiresAt: now + CACHE_TTL_MS,
    graph,
  }
  return graph
}

async function buildResearchKnowledgeGraph(visibilityMode: GraphVisibilityMode): Promise<ResearchKnowledgeGraph> {
  const mutable: MutableGraph = {
    nodes: new Map(),
    edges: new Map(),
    researchSlugs: new Set(),
    benchSlugs: new Set(),
    graphTexts: new Map(),
    formalCrossLinks: 0,
    manualEdges: 0,
    researchGraphs: 0,
  }
  const runs: RunIndex[] = []

  addNode(mutable, {
    id: "corpus:research",
    type: "corpus",
    label: "Pesquisas",
    subtitle: "docs/research",
    group: "corpus",
    path: "docs/research",
  })
  addNode(mutable, {
    id: "corpus:bench",
    type: "corpus",
    label: "Benchs",
    subtitle: "docs/bench",
    group: "corpus",
    path: "docs/bench",
  })

  await collectResearchRuns(mutable, runs, visibilityMode)
  await collectBenchRuns(mutable, runs, visibilityMode)
  addNode(mutable, {
    id: "corpus:research",
    type: "corpus",
    label: "Pesquisas",
    subtitle: "docs/research",
    group: "corpus",
    path: "docs/research",
    count: mutable.researchSlugs.size,
  })
  addNode(mutable, {
    id: "corpus:bench",
    type: "corpus",
    label: "Benchs",
    subtitle: "docs/bench",
    group: "corpus",
    path: "docs/bench",
    count: mutable.benchSlugs.size,
  })
  connectFormalCrossReferences(mutable)
  connectManualConnections(mutable)
  addSeedConnections(mutable)
  connectTopicOverlap(mutable, runs)

  const nodes = Array.from(mutable.nodes.values()).sort((a, b) => a.id.localeCompare(b.id))
  const edges = Array.from(mutable.edges.values()).sort((a, b) => a.id.localeCompare(b.id))
  const stats = {
    researchRuns: nodes.filter((n) => n.type === "research").length,
    benchRuns: nodes.filter((n) => n.type === "bench").length,
    topics: nodes.filter((n) => n.type === "topic").length,
    artifacts: nodes.filter((n) => n.type === "artifact").length,
    players: nodes.filter((n) => n.type === "player").length,
    formalEdges: edges.filter((e) => e.kind === "formal").length,
    formalCrossLinks: mutable.formalCrossLinks,
    inferredEdges: edges.filter((e) => e.kind === "inferred").length,
    seedEdges: edges.filter((e) => e.kind === "seed").length,
    structuralEdges: edges.filter((e) => e.kind === "structural").length,
    manualEdges: mutable.manualEdges,
    researchGraphs: mutable.researchGraphs,
  }

  const notes = [
    "Conexões estruturais vêm da presença real de artefatos nos diretórios.",
    "Conexões inferidas usam sobreposição de tópicos e tokens entre slugs, títulos e players.",
  ]
  if (stats.formalCrossLinks === 0) {
    notes.push("Nenhuma conexão formal cross-run foi encontrada em research-graph.json; exemplos seed foram adicionados e marcados como seed.")
  }
  if (stats.seedEdges > 0) {
    notes.push("Exemplos seed curatoriais trazem relação, evidência e utilidade decisória para orientar a formalização manual.")
  }
  if (stats.manualEdges > 0) {
    notes.push("Conexões manuais usam evidência textual de arquivos do run e preservam kind formal/inferred/seed conforme força da relação.")
  }

  return {
    generatedAt: new Date().toISOString(),
    nodes,
    edges,
    stats,
    notes,
  }
}

async function collectResearchRuns(mutable: MutableGraph, runs: RunIndex[], visibilityMode: GraphVisibilityMode) {
  const root = resolveDashPath("docs", "research")
  const entries = visibleResearchRunSlugs(await readDirectoryNames(root))
  for (const slug of entries) {
    const dir = path.join(root, slug)
    const files = await readFileNames(dir)
    const fileSet = new Set(files)
    if (visibilityMode === "remote" && !shouldExposeRemoteResearchRun(fileSet)) continue
    const graphText = await readOptionalText(path.join(dir, "research-graph.json"))
    const graphRecord = parseJsonRecord(graphText)
    const title = await resolveRunTitle(dir, graphRecord, slug)
    const semanticText = `${slug} ${title}`
    const topics = inferTopics(semanticText)
    const status = fileSet.has("research-graph.json") && fileSet.has("metrics.yaml") ? "graph-ready" : "partial"
    const graphEdgeCount = numberFromRecord(graphRecord, "edge_count") ?? countGraphEdges(graphRecord)
    const graphNodeCount = numberFromRecord(graphRecord, "node_count") ?? countGraphNodes(graphRecord)

    mutable.researchSlugs.add(slug)
    if (graphText) {
      mutable.graphTexts.set(`research:${slug}`, graphText)
      mutable.researchGraphs += 1
    }

    const nodeId = `research:${slug}`
    addNode(mutable, {
      id: nodeId,
      type: "research",
      label: title,
      subtitle: slug,
      group: primaryTopic(topics),
      slug,
      path: `docs/research/${slug}`,
      date: extractDate(slug),
      status,
      confidence: stringFromRecord(graphRecord, "confidence") ?? (graphRecord ? "inferred" : "missing"),
      count: files.length,
      metrics: {
        files: files.length,
        graphNodes: graphNodeCount,
        graphEdges: graphEdgeCount,
      },
      topics,
    })
    addEdge(mutable, "corpus:research", nodeId, "structural", "contains", "contém", 0.35, "docs/research")
    connectArtifacts(mutable, nodeId, fileSet, "research")
    connectTopics(mutable, nodeId, topics, graphRecord ? "formal" : "inferred")

    runs.push({
      id: nodeId,
      slug,
      type: "research",
      title,
      topics,
      textFingerprint: tokenSet(semanticText),
    })
  }
}

async function collectBenchRuns(mutable: MutableGraph, runs: RunIndex[], visibilityMode: GraphVisibilityMode) {
  const root = resolveDashPath("docs", "bench")
  const entries = visibleBenchRunSlugs(await readDirectoryNames(root))
  let playerNodes = 0

  for (const slug of entries) {
    const dir = path.join(root, slug)
    const files = await readFileNames(dir)
    const fileSet = new Set(files)
    if (visibilityMode === "remote" && !shouldExposeRemoteBenchRun(fileSet)) continue
    const dashText = await readOptionalText(path.join(dir, "bench-output-dash.json"))
    const metadataText = await readOptionalText(path.join(dir, "metadata.canonical.json")) ?? await readOptionalText(path.join(dir, "metadata.json"))
    const dash = parseJsonRecord(dashText)
    const metadata = parseJsonRecord(metadataText)
    const benchmark = recordFrom(dash?.benchmark)
    const title = firstText([
      stringFromRecord(benchmark, "title"),
      stringFromRecord(metadata, "title"),
      await resolveRunTitle(dir, dash, slug),
    ]) ?? prettifySlug(slug)
    const players = readPlayersFromBench(dash, metadata)
    const semanticText = `${slug} ${title} ${players.map((p) => `${p.name} ${p.category}`).join(" ")}`
    const topics = inferTopics(semanticText)

    mutable.benchSlugs.add(slug)
    if (dashText) mutable.graphTexts.set(`bench:${slug}`, dashText)
    if (metadataText) mutable.graphTexts.set(`bench-meta:${slug}`, metadataText)

    const nodeId = `bench:${slug}`
    addNode(mutable, {
      id: nodeId,
      type: "bench",
      label: title,
      subtitle: slug,
      group: stringFromRecord(benchmark, "type") ?? primaryTopic(topics),
      slug,
      path: `docs/bench/${slug}`,
      date: stringFromRecord(benchmark, "date") ?? extractDate(slug),
      status: fileSet.has("bench-output-dash.json") ? "dash-ready" : "partial",
      count: files.length,
      metrics: {
        files: files.length,
        players: players.length,
        dimensions: numberFromPath(dash, ["summary", "dimensions"]) ?? 0,
        score: numberFromPath(dash, ["summary", "score"]) ?? 0,
      },
      topics,
    })
    addEdge(mutable, "corpus:bench", nodeId, "structural", "contains", "contém", 0.35, "docs/bench")
    connectArtifacts(mutable, nodeId, fileSet, "bench")
    connectTopics(mutable, nodeId, topics, dash ? "formal" : "inferred")

    for (const player of players) {
      const playerId = `player:${slugify(player.name)}`
      const alreadyKnown = mutable.nodes.has(playerId)
      if (!alreadyKnown && playerNodes >= MAX_PLAYER_NODES) continue
      addNode(mutable, {
        id: playerId,
        type: "player",
        label: player.name,
        subtitle: player.category || "player",
        group: player.category || "players",
        count: 1,
        topics: inferTopics(`${player.name} ${player.category}`),
      })
      if (!alreadyKnown) playerNodes += 1
      addEdge(mutable, nodeId, playerId, "formal", "evaluates", "avalia", 0.68, "bench-output-dash.json")
    }

    runs.push({
      id: nodeId,
      slug,
      type: "bench",
      title,
      topics,
      textFingerprint: tokenSet(semanticText),
    })
  }
}

function connectArtifacts(mutable: MutableGraph, nodeId: string, files: Set<string>, sourceType: "research" | "bench") {
  for (const artifact of ARTIFACT_TYPES) {
    if (artifact.group !== "shared" && artifact.group !== sourceType) continue
    const present = artifact.files.some((file) => files.has(file))
    if (!present) continue
    const artifactId = `artifact:${artifact.id}`
    const previous = mutable.nodes.get(artifactId)
    addNode(mutable, {
      id: artifactId,
      type: "artifact",
      label: artifact.label,
      subtitle: artifact.files.join(", "),
      group: artifact.group,
      count: (previous?.count ?? 0) + 1,
    })
    addEdge(mutable, nodeId, artifactId, "structural", "has_artifact", "usa artefato", 0.45, artifact.files.join(", "))
  }
}

function connectTopics(mutable: MutableGraph, nodeId: string, topics: string[], kind: ResearchGraphEdgeKind) {
  for (const topic of topics) {
    const rule = TOPIC_RULES.find((item) => item.id === topic)
    if (!rule) continue
    const topicId = `topic:${topic}`
    const previous = mutable.nodes.get(topicId)
    addNode(mutable, {
      id: topicId,
      type: "topic",
      label: rule.label,
      subtitle: rule.terms.slice(0, 4).join(", "),
      group: "topic",
      count: (previous?.count ?? 0) + 1,
      topics: [topic],
    })
    addEdge(mutable, nodeId, topicId, kind, "about", "sobre", kind === "formal" ? 0.58 : 0.42, "topic inference")
  }
}

function connectFormalCrossReferences(mutable: MutableGraph) {
  const researchSlugs = new Set(mutable.researchSlugs)
  const benchSlugs = new Set(mutable.benchSlugs)

  const referencePattern = /\bdocs\/(research|bench)\/([a-z0-9][a-z0-9-]+)\b|\b(\d{4}-\d{2}-\d{2}-[a-z0-9][a-z0-9-]+)\b/g
  for (const [owner, text] of mutable.graphTexts.entries()) {
    const ownerParts = owner.split(":")
    const ownerSlug = ownerParts[1]
    const ownerNode = ownerParts[0] === "bench-meta" ? `bench:${ownerSlug}` : `${ownerParts[0]}:${ownerSlug}`
    const matches = text.matchAll(referencePattern)
    for (const match of matches) {
      const corpus = match[1] as "research" | "bench" | undefined
      const slug = match[2] ?? match[3]
      if (!slug) continue
      const targets = resolveFormalReferenceTargets(slug, corpus, researchSlugs, benchSlugs)
      for (const target of targets) {
        if (target === ownerNode) continue
        const added = addEdge(mutable, ownerNode, target, "formal", "references", "referencia", 0.86, "research graph or bench metadata")
        if (added) mutable.formalCrossLinks += 1
      }
    }
  }
}

function resolveFormalReferenceTargets(
  slug: string,
  corpus: "research" | "bench" | undefined,
  researchSlugs: Set<string>,
  benchSlugs: Set<string>,
) {
  if (corpus === "research") return researchSlugs.has(slug) ? [`research:${slug}`] : []
  if (corpus === "bench") return benchSlugs.has(slug) ? [`bench:${slug}`] : []

  const targets: string[] = []
  if (researchSlugs.has(slug)) targets.push(`research:${slug}`)
  if (benchSlugs.has(slug)) targets.push(`bench:${slug}`)
  if (targets.length > 1) return []
  return targets
}

function connectManualConnections(mutable: MutableGraph) {
  for (const node of manualResearchGraphNodes) {
    addNode(mutable, node)
  }

  for (const connection of manualResearchGraphConnections) {
    if (!mutable.nodes.has(connection.source) || !mutable.nodes.has(connection.target)) continue
    const added = addEdge(
      mutable,
      connection.source,
      connection.target,
      connection.kind,
      connection.relation,
      connection.label ?? relationLabel(connection.relation),
      connection.strength,
      connection.evidence,
      connection.whyUseful,
      { manual: true, whyUseful: connection.whyUseful },
    )
    if (!added) continue
    mutable.manualEdges += 1
    if (connection.kind === "formal" && isRunNodeId(connection.source) && isRunNodeId(connection.target)) {
      mutable.formalCrossLinks += 1
    }
  }
}

function connectTopicOverlap(mutable: MutableGraph, runs: RunIndex[]) {
  const researchRuns = runs.filter((run) => run.type === "research")
  const benchRuns = runs.filter((run) => run.type === "bench")
  const candidates: Array<{ source: RunIndex; target: RunIndex; score: number; evidence: string }> = []

  for (const research of researchRuns) {
    for (const bench of benchRuns) {
      const sharedTopics = research.topics.filter((topic) => topic !== "knowledge" && bench.topics.includes(topic))
      const sharedTokens = intersectionSize(research.textFingerprint, bench.textFingerprint)
      const score = sharedTopics.length * 3 + Math.min(3, sharedTokens)
      if (score < 3) continue
      candidates.push({
        source: research,
        target: bench,
        score,
        evidence: sharedTopics.length > 0 ? sharedTopics.join(", ") : `${sharedTokens} shared tokens`,
      })
    }
  }

  const selected = candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_PAIR_EDGES)

  for (const candidate of selected) {
    addEdge(
      mutable,
      candidate.source.id,
      candidate.target.id,
      "inferred",
      "topic_overlap",
      "sobreposição",
      Math.min(0.82, 0.36 + candidate.score * 0.055),
      candidate.evidence,
    )
  }
}

function addSeedConnections(mutable: MutableGraph) {
  for (const seed of CURATED_SEED_CONNECTIONS) {
    if (!mutable.nodes.has(seed.source) || !mutable.nodes.has(seed.target)) continue
    addEdge(mutable, seed.source, seed.target, "seed", seed.relation, seed.label, seed.strength, seed.evidence, seed.why)
  }
}

function addNode(mutable: MutableGraph, node: ResearchGraphNode) {
  const existing = mutable.nodes.get(node.id)
  if (!existing) {
    mutable.nodes.set(node.id, node)
    return
  }
  mutable.nodes.set(node.id, {
    ...existing,
    ...node,
    count: Math.max(existing.count ?? 0, node.count ?? 0),
    topics: Array.from(new Set([...(existing.topics ?? []), ...(node.topics ?? [])])),
    metrics: {
      ...(existing.metrics ?? {}),
      ...(node.metrics ?? {}),
    },
  })
}

function addEdge(
  mutable: MutableGraph,
  source: string,
  target: string,
  kind: ResearchGraphEdgeKind,
  relation: string,
  label: string,
  strength: number,
  evidence?: string,
  why?: string,
  options?: { manual?: boolean; whyUseful?: string },
) {
  if (source === target) return false
  const id = `${kind}:${relation}:${source}->${target}`
  const existing = mutable.edges.get(id)
  if (existing) {
    mutable.edges.set(id, {
      ...existing,
      strength: Math.max(existing.strength, strength),
      evidence: existing.evidence ?? evidence,
      why: existing.why ?? why,
      whyUseful: existing.whyUseful ?? options?.whyUseful,
      manual: existing.manual ?? options?.manual,
    })
    return false
  }
  mutable.edges.set(id, {
    id,
    source,
    target,
    kind,
    relation,
    label,
    strength,
    evidence,
    why,
    whyUseful: options?.whyUseful,
    manual: options?.manual,
  })
  return true
}

function relationLabel(relation: string) {
  const labels: Record<string, string> = {
    references: "referencia",
    supports: "sustenta",
    evaluates: "avalia",
    compares: "compara",
    extends: "aprofunda",
    contradicts: "tensiona",
    fills_gap: "fecha lacuna",
    uses_artifact: "usa evidência",
    same_decision_area: "mesma decisão",
    example_link: "exemplo",
  }
  return labels[relation] ?? relation.replaceAll("_", " ")
}

function isRunNodeId(id: string) {
  return id.startsWith("research:") || id.startsWith("bench:")
}

function getGraphVisibilityMode(): GraphVisibilityMode {
  return isRemoteDeployMode() ? "remote" : "local"
}

function isRemoteDeployMode(): boolean {
  return process.env.DEPLOY_MODE?.trim().toLowerCase() === "remote" || process.env.VERCEL === "1"
}

function shouldExposeRemoteResearchRun(files: Set<string>) {
  const hasCore = RESEARCH_CORE_FILES.every((file) => files.has(file))
  return hasCore && files.has("metrics.yaml") && files.has("pipeline-state.yaml")
}

function shouldExposeRemoteBenchRun(files: Set<string>) {
  return files.has("comparison-matrix.json")
}

function visibleResearchRunSlugs(slugs: string[]) {
  const visible = slugs.filter(isVisibleRunDirectoryName)
  const slugSet = new Set(visible)
  return visible
    .filter((slug) => !shouldHideLegacyParallelSlug(slug, slugSet))
    .filter((slug) => !shouldHideInternalResearchRun(slug))
}

function visibleBenchRunSlugs(slugs: string[]) {
  return slugs
    .filter(isVisibleRunDirectoryName)
    .filter((slug) => !shouldHideInternalBenchRun(slug))
}

function isVisibleRunDirectoryName(slug: string) {
  return !slug.startsWith("_") && !slug.startsWith(".")
}

function canonicalParallelSlug(slug: string) {
  return slug.replace(LEGACY_PARALLEL_SUFFIX, "")
}

function shouldHideLegacyParallelSlug(slug: string, slugs: Set<string>) {
  const canonical = canonicalParallelSlug(slug)
  return canonical !== slug && slugs.has(canonical)
}

function shouldHideInternalResearchRun(slug: string) {
  return /(?:^|-)gold-[a-z0-9-]+-profile-fixture$/.test(slug) || /(?:^|-)research-core-launcher-smoke$/.test(slug)
}

function shouldHideInternalBenchRun(slug: string) {
  return /(?:^|-)gold-[a-z0-9-]+-fixture$/.test(slug) ||
    /(?:^|-)smoke(?:-|$)/.test(slug) ||
    /(?:^|-)rescore-post-adr\d+$/.test(slug)
}

async function readDirectoryNames(root: string): Promise<string[]> {
  try {
    const entries = await readdir(root, { withFileTypes: true })
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b))
  } catch {
    return []
  }
}

async function readFileNames(root: string): Promise<string[]> {
  try {
    const entries = await readdir(root, { withFileTypes: true })
    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b))
  } catch {
    return []
  }
}

async function readOptionalText(filePath: string): Promise<string | null> {
  try {
    const info = await stat(filePath)
    if (!info.isFile()) return null
    return await readFile(filePath, "utf8")
  } catch {
    return null
  }
}

async function resolveRunTitle(dir: string, record: JsonRecord | null, slug: string): Promise<string> {
  const recordTitle = firstText([
    stringFromRecord(record, "title"),
    stringFromPath(record, ["metadata", "title"]),
    stringFromPath(record, ["benchmark", "title"]),
    stringFromPath(record, ["root", "title"]),
  ])
  if (recordTitle) return recordTitle

  for (const file of ["README.md", "02-research-report.md", "executive-report.md", "battle-card.md"]) {
    const text = await readOptionalText(path.join(dir, file))
    const heading = text?.match(/^#\s+(.+)$/m)?.[1]?.trim()
    if (heading) return heading.replace(/^Research:\s*/i, "")
  }

  return prettifySlug(slug)
}

function parseJsonRecord(text: string | null): JsonRecord | null {
  if (!text) return null
  try {
    return recordFrom(JSON.parse(text))
  } catch {
    return null
  }
}

function readPlayersFromBench(dash: JsonRecord | null, metadata: JsonRecord | null) {
  const dashPlayers = arrayFrom(dash?.players)
  const metadataPlayers = arrayFrom(metadata?.players)
  const source = dashPlayers.length > 0 ? dashPlayers : metadataPlayers
  return source
    .map((entry) => {
      const record = recordFrom(entry)
      if (!record) return null
      const name = firstText([stringFromRecord(record, "name"), stringFromRecord(record, "key"), stringFromRecord(record, "id")])
      if (!name) return null
      return {
        name,
        category: stringFromRecord(record, "category") ?? stringFromRecord(record, "role") ?? "",
      }
    })
    .filter((entry): entry is { name: string; category: string } => Boolean(entry))
}

function inferTopics(input: string): string[] {
  const haystack = normalizedText(input)
  const tokens = tokenSet(input)
  const topics = TOPIC_RULES
    .filter((rule) => rule.terms.some((term) => termMatchesSemanticText(term, haystack, tokens)))
    .map((rule) => rule.id)
  return topics.length > 0 ? topics : ["knowledge"]
}

function primaryTopic(topics: string[]) {
  return topics[0] ?? "knowledge"
}

function tokenSet(input: string): Set<string> {
  const tokens = normalizedText(input)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4 && !STOPWORDS.has(token))
  return new Set(tokens)
}

function normalizedText(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

function termMatchesSemanticText(term: string, haystack: string, tokens: Set<string>) {
  const normalizedTerm = normalizedText(term).replace(/[^a-z0-9]+/g, " ").trim()
  if (!normalizedTerm) return false
  if (!normalizedTerm.includes(" ")) return tokens.has(normalizedTerm)
  return new RegExp(`(^|[^a-z0-9])${escapeRegExp(normalizedTerm)}([^a-z0-9]|$)`).test(haystack.replace(/[^a-z0-9]+/g, " "))
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function intersectionSize(a: Set<string>, b: Set<string>) {
  let count = 0
  for (const value of a) {
    if (b.has(value)) count += 1
  }
  return count
}

function prettifySlug(slug: string) {
  return slug
    .replace(/^\d{4}-\d{2}-\d{2}-/, "")
    .split("-")
    .filter(Boolean)
    .map((part) => (part.toUpperCase() === "AIOX" ? "AIOX" : part.charAt(0).toUpperCase() + part.slice(1)))
    .join(" ")
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72)
}

function extractDate(slug: string) {
  return slug.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? "undated"
}

function firstText(values: Array<string | null | undefined>) {
  return values.find((value) => value && value.trim().length > 0)?.trim() ?? null
}

function recordFrom(value: unknown): JsonRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as JsonRecord
}

function arrayFrom(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function stringFromRecord(record: JsonRecord | null | undefined, key: string) {
  const value = record?.[key]
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function numberFromRecord(record: JsonRecord | null | undefined, key: string) {
  const value = record?.[key]
  if (typeof value === "number") return value
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value)
  return null
}

function valueFromPath(record: JsonRecord | null | undefined, segments: string[]): unknown {
  let current: unknown = record
  for (const segment of segments) {
    const currentRecord = recordFrom(current)
    if (!currentRecord) return null
    current = currentRecord[segment]
  }
  return current
}

function stringFromPath(record: JsonRecord | null | undefined, segments: string[]) {
  const value = valueFromPath(record, segments)
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function numberFromPath(record: JsonRecord | null | undefined, segments: string[]) {
  const value = valueFromPath(record, segments)
  if (typeof value === "number") return value
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value)
  return null
}

function countGraphEdges(record: JsonRecord | null) {
  const edges = arrayFrom(record?.edges)
  const links = arrayFrom(record?.links)
  return Math.max(edges.length, links.length)
}

function countGraphNodes(record: JsonRecord | null) {
  return arrayFrom(record?.nodes).length
}
