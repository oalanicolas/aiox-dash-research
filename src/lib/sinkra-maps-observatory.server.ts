import "server-only"

import { readdir, readFile, stat } from "node:fs/promises"
import path from "node:path"
import YAML from "yaml"
import type { ReaderMode } from "@/components/observatory/foundations/types"
import { EmptyObservatorySourceError } from "./observatory-errors.server"
import { resolveDashPath } from "./workspace-root.server"

export type SinkraMapDocument = {
  id: string
  file: string
  phase: string
  bytes: number
  content: string
  truncated: boolean
}

export type SinkraMapRunSummary = {
  slug: string
  title: string
  date: string
  category: string
  status: string
  score: string
  files: number
  active: boolean
  hasWorkflow: boolean
  hasTasks: boolean
  hasGates: boolean
  hasScore: boolean
  hasProcess: boolean
  hasDeps: boolean
  hasDomain: boolean
  hasObservatory: boolean
  hasAutomation: boolean
  hasRaci: boolean
  hasGaps: boolean
  hasCompliance: boolean
  hasComposition: boolean
  hasTokens: boolean
  hasState: boolean
  hasMetrics: boolean
}

export type SinkraWorkflowStep = {
  id: string
  phase: string
  task: string
  name: string
  executor: string
  outputCount: number
  guardrailCount: number
}

export type SinkraWorkflow = {
  id: string
  name: string
  layer: string
  trigger: string
  frequency: string
  description: string
  steps: SinkraWorkflowStep[]
}

export type SinkraTask = {
  id: string
  layer: string
  executor: string
  inputCount: number
  outputCount: number
  preconditions: number
  postconditions: number
}

export type SinkraGate = {
  id: string
  name: string
  position: string
  type: string
  executor: string
  threshold: string
  veto: boolean
  criteriaCount: number
}

export type SinkraScore = {
  score: number | null
  result: string
  structuralIntegrity: number | null
  qualityGate: string
}

export type SinkraProcessPhase = {
  id: string
  name: string
  executor: string
  drift: string
  observed: string
  painPoints: string[]
  hasDrift: boolean
}

export type SinkraDomainGroup = {
  domain: string
  total: number
  gapClosed: number
  samples: Array<{
    id: string
    name: string
    level: string
    type: string
    gap: string
  }>
}

export type SinkraDependencyNode = {
  id: string
  dependsOn: string[]
  feedsInto: string[]
  loop: boolean
}

export type SinkraDependencyGraph = {
  type: string
  validated: boolean
  roots: string[]
  leaves: string[]
  nodes: SinkraDependencyNode[]
  strictDag: string
  guardedLoops: boolean
}

export type SinkraObservatoryMap = {
  displayName: string
  shortName: string
  kind: string
  headline: string
  narrative: string
  decision: string
  readiness: string
  healthLabel: string
  healthTone: string
  metrics: Array<{ label: string; value: string }>
  lanes: Array<{
    id: string
    title: string
    domain: string
    owner: string
    summary: string
    signal: string
    risk: string
    taskCount: number
  }>
  risks: Array<{
    id: string
    severity: string
    title: string
    evidence: string
    action: string
  }>
  nextActions: Array<{
    priority: string
    title: string
    owner: string
    targetArtifact: string
  }>
  readinessBars: Array<{ label: string; value: number; status: string; note: string }>
  executorMix: Array<{ executor: string; tasks: number; tone: string; role: string; insight: string }>
  gateBoard: Array<{
    id: string
    title: string
    status: string
    severity: string
    veto: boolean
    threshold: string
    owner: string
    blocks: string
  }>
  criticalPath: Array<{ step: string; task: string; executor: string; state: string; note: string }>
  decisionMatrix: Array<{ question: string; answer: string; signal: string }>
}

export type SinkraAutomationSpec = {
  taskId: string
  taskName: string
  executorType: string
  automationType: string
  frequency: string
  impact: string
  automatability: number | null
  standardization: number | null
  checkpointStatus: string
  guardrailsPresent: string[]
  guardrailsMissing: string[]
  dependsOnGaps: string[]
  justification: string
}

export type SinkraAccountabilityRow = {
  taskId: string
  taskName: string
  responsible: string
  responsibleType: string
  accountable: string
  consulted: string[]
  informed: string[]
}

export type SinkraGap = {
  id: string
  title: string
  severity: string
  category: string
  blockers: string[]
  executorTypes: string[]
  impact: string
  resolution: string
  fallback: string
}

export type SinkraComplianceDimension = {
  id: string
  name: string
  score: number | null
  threshold: number | null
  status: string
  rationale: string
}

export type SinkraBlockingIssue = {
  id: string
  title: string
  severity: string
  linkedGate: string
  impact: string
}

export type SinkraExecutionPhase = {
  id: string
  status: string
  agent: string
  durationSeconds: number | null
  artifactCount: number
}

export type SinkraRuntimeMetric = {
  phase: string
  model: string
  costUsd: number | null
  durationSeconds: number | null
  status: string
  outputTokens: number | null
}

export type SinkraScoreBreakdownItem = {
  id: string
  label: string
  score: number | null
  max: number | null
  weight: number | null
  status: string
  findings: string[]
}

export type SinkraCompositionNode = {
  id: string
  name: string
  level: "template" | "organism" | "molecule" | "atom"
  parentId: string
  count: number
}

export type SinkraHandoffPacket = {
  from: string
  to: string
  packet: string
}

export type SinkraTokenFlow = {
  tokenName: string
  tokenValue: string
  type: string
  domain: string
  producedBy: string
  consumedBy: string[]
}

export type SinkraMapStructured = {
  processName: string
  version: string
  mode: string
  workflows: SinkraWorkflow[]
  tasks: SinkraTask[]
  gates: SinkraGate[]
  score: SinkraScore
  processPhases: SinkraProcessPhase[]
  domains: SinkraDomainGroup[]
  dependencies: SinkraDependencyGraph
  observatoryMap: SinkraObservatoryMap | null
  automation: SinkraAutomationSpec[]
  accountability: SinkraAccountabilityRow[]
  gaps: SinkraGap[]
  compliance: {
    status: string
    handoffBlocked: boolean
    currentScore: number | null
    dimensions: SinkraComplianceDimension[]
    blockingIssues: SinkraBlockingIssue[]
    scoreBreakdown: SinkraScoreBreakdownItem[]
    remediationItems: Array<{ priority: string; dimension: string; finding: string; action: string }>
  }
  composition: {
    nodes: SinkraCompositionNode[]
    organismSequence: string[]
    handoffPackets: SinkraHandoffPacket[]
    adjacencyValidation: string
  }
  tokenFlow: {
    tokens: SinkraTokenFlow[]
    finalOutputs: string[]
    taskCountCovered: number
  }
  execution: {
    phases: SinkraExecutionPhase[]
    metrics: SinkraRuntimeMetric[]
  }
  artifactCoverage: Array<{ key: string; label: string; present: boolean }>
}

export type SinkraMapsObservatoryData = {
  stats: {
    totalRuns: number
    withWorkflow: number
    withTasks: number
    withGates: number
    withScore: number
  }
  runs: SinkraMapRunSummary[]
  selectedRun: SinkraMapRunSummary
  documents: SinkraMapDocument[]
  selectedDocument: SinkraMapDocument
  structured: SinkraMapStructured
}

const CONTENT_LIMIT = 50000
// Dev: short TTL so YAML edits show up fast. Prod: 5min to keep filesystem walk cheap.
const LONG_CACHE_TTL_MS = process.env.NODE_ENV === "production" ? 5 * 60_000 : 5_000
const INDEX_CACHE_TTL_MS = LONG_CACHE_TTL_MS
const RUN_CACHE_TTL_MS = LONG_CACHE_TTL_MS
const INDEX_BUILD_CONCURRENCY = 24
const RUN_SCAN_CONCURRENCY = 16
const MAX_RUN_SCAN_DEPTH = 4
const MAX_RUN_FILE_DEPTH = 2
const CURRENT_RUN_ALIASES = new Set(["current", "latest"])
const ARTIFACT_SPECS = [
  { key: "observatory_map.yaml", label: "Observatory", aliases: ["observatory_map.yaml", "observatory-map.yaml"], pattern: /(?:^|[-_])observatory[-_]map\.ya?ml$/i },
  { key: "composition_map.yaml", label: "Composition", aliases: ["composition_map.yaml", "composition-map.yaml"], pattern: /(?:^|[-_])composition[-_]map\.ya?ml$/i },
  { key: "token_assignments.yaml", label: "Tokens", aliases: ["token_assignments.yaml", "token-assignments.yaml"], pattern: /(?:^|[-_])token[-_]assignments\.ya?ml$/i },
  { key: "workflow_definition.yaml", label: "Workflow", aliases: ["workflow_definition.yaml", "workflow-definition.yaml", "workflow.yaml"], pattern: /(?:^|[-_])workflow(?:[-_]definition)?\.ya?ml$/i },
  { key: "task_definitions.yaml", label: "Tasks", aliases: ["task_definitions.yaml", "task-definitions.yaml"], pattern: /(?:^|[-_])task[-_]definitions\.ya?ml$/i },
  { key: "quality_gates.yaml", label: "Gates", aliases: ["quality_gates.yaml", "quality-gates.yaml"], pattern: /(?:^|[-_])quality[-_]gates\.ya?ml$/i },
  { key: "score_card.yaml", label: "Score", aliases: ["score_card.yaml", "score-card.yaml", "deterministic-scores.yaml"], pattern: /(?:^|[-_])(?:score[-_]card|deterministic[-_]scores)\.ya?ml$/i },
  { key: "process_map.yaml", label: "Process", aliases: ["process_map.yaml", "process-map.yaml", "process-mapping.yaml"], pattern: /(?:^|[-_])process[-_](?:map|mapping)\.ya?ml$/i },
  { key: "domain_map.yaml", label: "Domain", aliases: ["domain_map.yaml", "domain-map.yaml"], pattern: /(?:^|[-_])domain[-_]map\.ya?ml$/i },
  { key: "dependency_graph.yaml", label: "Dependencies", aliases: ["dependency_graph.yaml", "dependency-graph.yaml"], pattern: /(?:^|[-_])dependency[-_]graph\.ya?ml$/i },
  { key: "executor_matrix.yaml", label: "Executors", aliases: ["executor_matrix.yaml", "executor-matrix.yaml"], pattern: /(?:^|[-_])executor[-_]matrix\.ya?ml$/i },
  { key: "automation_specs.yaml", label: "Automation", aliases: ["automation_specs.yaml", "automation-specs.yaml"], pattern: /(?:^|[-_])automation[-_]specs\.ya?ml$/i },
  { key: "raci_matrix.yaml", label: "RACI", aliases: ["raci_matrix.yaml", "raci-matrix.yaml"], pattern: /(?:^|[-_])raci[-_]matrix\.ya?ml$/i },
  { key: "capability_gaps.yaml", label: "Gaps", aliases: ["capability_gaps.yaml", "capability-gaps.yaml", "gap-analysis.yaml"], pattern: /(?:^|[-_])(?:capability[-_]gaps|gap[-_]analysis)\.ya?ml$/i },
  { key: "compliance_score.yaml", label: "Compliance", aliases: ["compliance_score.yaml", "compliance-score.yaml", "sinkra-compliance-report.yaml"], pattern: /(?:^|[-_])(?:compliance[-_]score|sinkra[-_]compliance[-_]report)\.ya?ml$/i },
  { key: "sinkra-state.json", label: "State", aliases: ["sinkra-state.json", "pipeline-state.json"], pattern: /(?:^|[-_])(?:sinkra[-_]state|pipeline[-_]state)\.json$/i },
  { key: "metrics.jsonl", label: "Metrics", aliases: ["metrics.jsonl", "events.jsonl"], pattern: /(?:^|[-_])(?:metrics|events)\.jsonl$/i },
] as const
type ArtifactKey = typeof ARTIFACT_SPECS[number]["key"]
const KEY_FILES = ARTIFACT_SPECS.map(({ key, label }) => [key, label] as const)

let indexCache:
  | {
      root: string
      expiresAt: number
      slugs: string[]
      summaries: Omit<SinkraMapRunSummary, "active">[]
    }
  | null = null

const runCache = new Map<
  string,
  {
    expiresAt: number
    files: string[]
    documentsMeta: SinkraMapDocument[]
    structured: SinkraMapStructured
  }
>()

const VIEW_FILE_SETS: Partial<Record<ReaderMode, string[]>> = {
  map: [
    "observatory_map.yaml",
    "workflow_definition.yaml",
    "task_definitions.yaml",
    "quality_gates.yaml",
    "score_card.yaml",
    "process_map.yaml",
    "domain_map.yaml",
    "dependency_graph.yaml",
  ],
  flow: [
    "observatory_map.yaml",
    "workflow_definition.yaml",
    "dependency_graph.yaml",
    "composition_map.yaml",
    "token_assignments.yaml",
  ],
  automation: [
    "observatory_map.yaml",
    "task_definitions.yaml",
    "automation_specs.yaml",
    "capability_gaps.yaml",
  ],
  governance: [
    "observatory_map.yaml",
    "quality_gates.yaml",
    "score_card.yaml",
    "compliance_score.yaml",
  ],
  accountability: [
    "observatory_map.yaml",
    "task_definitions.yaml",
    "raci_matrix.yaml",
  ],
  gaps: [
    "observatory_map.yaml",
    "capability_gaps.yaml",
    "compliance_score.yaml",
    "score_card.yaml",
  ],
  evidence: [
    "observatory_map.yaml",
    "sinkra-state.json",
    "metrics.jsonl",
    "score_card.yaml",
  ],
  score: [
    "score_card.yaml",
    "compliance_score.yaml",
  ],
  document: [],
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>,
) {
  const results = new Array<R>(items.length)
  let cursor = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      results[index] = await mapper(items[index], index)
    }
  })
  await Promise.all(workers)
  return results
}

function isReservedDirName(name: string) {
  // Skip metadata/archive dirs: `_smoke-fixture`, `_archived`, `_baseline`,
  // `_v1-pre-*`, `.cache`, etc. Only artifact-bearing run dirs should surface.
  return name.startsWith("_") || name.startsWith(".")
}

function artifactSpecForFile(file: string) {
  const name = path.basename(file)
  return ARTIFACT_SPECS.find((spec) => spec.aliases.some((alias) => alias === name) || spec.pattern.test(name))
}

function resolveArtifactFile(files: string[], key: ArtifactKey) {
  return resolveArtifactFiles(files, key)[0]
}

function resolveArtifactFiles(files: string[], key: ArtifactKey) {
  const spec = ARTIFACT_SPECS.find((item) => item.key === key)
  if (!spec) return []
  return files.filter((file) => {
    const name = path.basename(file)
    return spec.aliases.some((alias) => alias === name) || spec.pattern.test(name)
  })
}

function hasArtifact(files: string[], key: ArtifactKey) {
  return Boolean(resolveArtifactFile(files, key))
}

function hasRunSignal(files: string[]) {
  return files.some((file) => {
    const name = path.basename(file)
    return Boolean(artifactSpecForFile(name)) || /^sinkra-output(?:[-_].*)?\.(?:md|ya?ml)$/i.test(name) || /^mission-output(?:[-_].*)?\.ya?ml$/i.test(name)
  })
}

async function listFiles(dir: string, rel = "", depth = 0): Promise<string[]> {
  const full = path.join(dir, rel)
  const entries = await readdir(full, { withFileTypes: true })
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(rel, entry.name))
    .filter((file) => /\.(md|ya?ml|json|jsonl|mmd|svg)$/i.test(file))

  if (depth >= MAX_RUN_FILE_DEPTH) {
    return files.sort((a, b) => priority(a) - priority(b) || a.localeCompare(b))
  }

  const dirs = entries.filter((entry) => entry.isDirectory() && !isReservedDirName(entry.name))
  const nested = (await Promise.all(dirs.map((entry) => listFiles(dir, path.join(rel, entry.name), depth + 1)))).flat()
  return [...files, ...nested].sort((a, b) => priority(a) - priority(b) || a.localeCompare(b))
}

function isCurrentRunAlias(name: string) {
  return CURRENT_RUN_ALIASES.has(name)
}

function isDatedRunDirName(name: string) {
  return /^\d{8}(?:-\d{6})?(?:[-_].*)?$/.test(name) || /^\d{4}-\d{2}-\d{2}(?:[-_].*)?$/.test(name)
}

function splitRunSlug(slug: string) {
  return slug.split(/[\\/]+/).filter(Boolean)
}

function currentGroupKey(slug: string) {
  const parts = splitRunSlug(slug)
  const aliasIndex = parts.findIndex((part, index) => index > 0 && isCurrentRunAlias(part))
  if (aliasIndex > 0) return parts.slice(0, aliasIndex).join(path.sep)

  const datedIndex = parts.findIndex((part, index) => index > 0 && isDatedRunDirName(part))
  if (datedIndex > 0) return parts.slice(0, datedIndex).join(path.sep)

  return slug
}

function isCurrentRunSlug(slug: string) {
  return splitRunSlug(slug).some(isCurrentRunAlias)
}

async function safeDirectoryStat(dir: string) {
  try {
    const st = await stat(dir)
    return st.isDirectory() ? st : null
  } catch {
    return null
  }
}

async function listRunDirs(root: string, rel = "", depth = 0): Promise<string[]> {
  if (depth > MAX_RUN_SCAN_DEPTH) return []
  const full = path.join(root, rel)
  const entries = await readdir(full, { withFileTypes: true })
  const fileNames = entries.filter((entry) => entry.isFile()).map((entry) => entry.name)
  const hasSignal = hasRunSignal(fileNames)
  const hasRunCollectionChild = entries.some((entry) => entry.isDirectory() && /^(map|validate)$/i.test(entry.name))
  if (hasSignal && rel && !hasRunCollectionChild) return [rel]
  const childDirs = await mapWithConcurrency(
    entries.filter((entry) =>
      !isReservedDirName(entry.name) && (entry.isDirectory() || (entry.isSymbolicLink() && isCurrentRunAlias(entry.name))),
    ),
    RUN_SCAN_CONCURRENCY,
    async (entry) => {
      if (entry.isDirectory()) return entry.name
      const st = await safeDirectoryStat(path.join(full, entry.name))
      return st ? entry.name : ""
    },
  )
  const dirs = childDirs.filter(Boolean)
  const aliases = dirs.filter(isCurrentRunAlias)
  const scanDirs = aliases.length > 0 ? aliases : dirs
  const nested = (await Promise.all(scanDirs.map((entry) => listRunDirs(root, path.join(rel, entry), depth + 1)))).flat()
  return nested
}

async function selectCurrentRunDirs(root: string, slugs: string[]) {
  const grouped = new Map<string, string[]>()
  for (const slug of slugs) {
    const group = currentGroupKey(slug)
    grouped.set(group, [...(grouped.get(group) ?? []), slug])
  }

  const selected = await mapWithConcurrency(
    [...grouped.values()],
    INDEX_BUILD_CONCURRENCY,
    async (groupSlugs) => {
      const current = groupSlugs.filter(isCurrentRunSlug).sort((a, b) => a.localeCompare(b))[0]
      if (current) return current

      const ranked = await mapWithConcurrency(groupSlugs, RUN_SCAN_CONCURRENCY, async (slug) => {
        const st = await safeDirectoryStat(path.join(root, slug))
        return { slug, mtimeMs: st?.mtimeMs ?? 0 }
      })
      return ranked.sort((a, b) => b.mtimeMs - a.mtimeMs || b.slug.localeCompare(a.slug))[0]?.slug
    },
  )

  return selected.filter(Boolean).sort((a, b) => a.localeCompare(b))
}

function priority(file: string) {
  const name = path.basename(file)
  const artifactIndex = ARTIFACT_SPECS.findIndex((spec) => spec.aliases.some((alias) => alias === name) || spec.pattern.test(name))
  if (artifactIndex >= 0) return artifactIndex + 2
  if (/^sinkra-output(?:[-_].*)?\.md$/i.test(name)) return 0
  if (/^sinkra-output(?:[-_].*)?\.ya?ml$/i.test(name)) return 1
  return 20
}

function phaseForFile(file: string) {
  if (/workflow/i.test(file)) return "workflow"
  if (/task/i.test(file)) return "tasks"
  if (/quality|gate/i.test(file)) return "gates"
  if (/score|compliance/i.test(file)) return "score"
  if (/process|as_is/i.test(file)) return "process"
  if (/domain/i.test(file)) return "domain"
  if (/dependency|dag/i.test(file)) return "dependencies"
  if (/executor|raci/i.test(file)) return "executors"
  if (/handoff/i.test(file)) return "handoff"
  return "artifact"
}

function humanizeSlug(value: string) {
  return value
    .replace(/^\d{8}-\d{6}-/, "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase())
}

function compactTitle(value: string) {
  const title = humanizeSlug(value).trim()
  if (title.length <= 64) return title

  return title
    .replace(/\s+—\s+.+$/, "")
    .replace(/\s+-\s+.+$/, "")
    .replace(/\s+Baseado Em.+$/i, "")
    .replace(/\s+Que\s+.+$/i, "")
    .replace(/\s*,\s+.+$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 64)
    .trim()
}

function titleFromSlug(slug: string) {
  const parts = slug.split(path.sep).filter(Boolean)
  const mapIndex = parts.findIndex((part) => part === "map" || part === "validate")
  if (mapIndex > 0) return compactTitle(parts.slice(0, mapIndex).join(" "))
  if (parts[0] === "skill-validations" && parts[1]) return compactTitle(parts[1])
  return compactTitle(parts[0] ?? slug)
}

function categoryFromSlug(slug: string) {
  if (slug.includes(`${path.sep}map${path.sep}`)) return "map"
  if (slug.includes(`${path.sep}validate${path.sep}`)) return "validate"
  if (slug.includes("mission")) return "mission"
  return "process"
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function asString(value: unknown, fallback = "") {
  if (value === null || value === undefined || value === "") return fallback
  if (typeof value === "object") return fallback
  return String(value)
}

function asNumber(value: unknown): number | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>
    for (const key of ["value", "score", "current", "numeric", "overall", "compliance_score", "final_score", "weighted_average"]) {
      const parsed = asNumber(record[key])
      if (parsed !== null) return parsed
    }
    return null
  }
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function scoreLabel(value: unknown, fallback = "--") {
  const n = asNumber(value)
  if (n !== null) {
    return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10)
  }
  return asString(value, fallback)
}

async function readYaml(runPath: string, file: string): Promise<Record<string, unknown>> {
  try {
    const raw = await readFile(path.join(runPath, file), "utf8")
    return asRecord(YAML.parse(raw))
  } catch {
    return {}
  }
}

async function readYamlArtifact(runPath: string, files: string[], key: ArtifactKey, view?: ReaderMode) {
  if (!shouldLoadStructuredFile(view, key)) return {}
  for (const file of resolveArtifactFiles(files, key)) {
    const parsed = await readYaml(runPath, file)
    if (Object.keys(parsed).length > 0) return parsed
  }
  return {}
}

async function readJsonArtifact(runPath: string, files: string[], key: ArtifactKey, view?: ReaderMode) {
  if (!shouldLoadStructuredFile(view, key)) return {}
  for (const file of resolveArtifactFiles(files, key)) {
    const parsed = await readJson(runPath, file)
    if (Object.keys(parsed).length > 0) return parsed
  }
  return {}
}

async function readJsonlArtifact(runPath: string, files: string[], key: ArtifactKey, view?: ReaderMode) {
  if (!shouldLoadStructuredFile(view, key)) return []
  for (const file of resolveArtifactFiles(files, key)) {
    const parsed = await readJsonl(runPath, file)
    if (parsed.length > 0) return parsed
  }
  return []
}

async function readJson(runPath: string, file: string): Promise<Record<string, unknown>> {
  try {
    const raw = await readFile(path.join(runPath, file), "utf8")
    return asRecord(JSON.parse(raw))
  } catch {
    return {}
  }
}

async function readJsonl(runPath: string, file: string): Promise<unknown[]> {
  try {
    const raw = await readFile(path.join(runPath, file), "utf8")
    return raw
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line))
  } catch {
    return []
  }
}

function collectArrays(...values: unknown[]) {
  return values.flatMap((value) => {
    const direct = asArray(value)
    if (direct.length > 0) return direct
    const record = asRecord(value)
    return Object.values(record).flatMap((nested) => asArray(nested))
  })
}

function firstNonEmptyArray(...values: unknown[]) {
  for (const value of values) {
    const array = asArray(value)
    if (array.length > 0) return array
  }
  return []
}

function asStringList(value: unknown) {
  const array = asArray(value)
  if (array.length > 0) return array.map((item) => asString(item)).filter(Boolean)
  const text = asString(value, "")
  return text ? [text] : []
}

function extractSteps(workflow: Record<string, unknown>) {
  const stateMachine = asRecord(workflow.state_machine)
  const steps = firstNonEmptyArray(
    workflow.steps,
    workflow.phases,
    workflow.stages,
    workflow.nodes,
    stateMachine.transitions,
  )
  return steps.map((raw, index) => {
    const step = asRecord(raw)
    const guardrails = asRecord(step.guardrails)
    const checks = firstNonEmptyArray(step.checks, step.criteria, step.outputs, step.saida)
    return {
      id: asString(step.step_id ?? step.id ?? step.task_id ?? step.source, `s_${String(index + 1).padStart(2, "0")}`),
      phase: asString(step.phase_id ?? step.phase ?? step.source, ""),
      task: asString(step.task_id ?? step.task ?? step.dest, ""),
      name: asString(step.name ?? step.description ?? step.task_id ?? step.dest, "Step"),
      executor: asString(step.executor_type ?? step.executor, "—"),
      outputCount: firstNonEmptyArray(step.outputs, step.saida, step.output).length,
      guardrailCount: Object.keys(guardrails).length + checks.length,
    }
  })
}

function extractAutomationSpecs(automationYaml: Record<string, unknown>): SinkraAutomationSpec[] {
  const specs = collectArrays(automationYaml.automation_specs, automationYaml.automation, automationYaml.specs)
  return specs.map((raw, index) => {
    const spec = asRecord(raw)
    return {
      taskId: asString(spec.task_id ?? spec.id ?? spec.task, `task-${index + 1}`),
      taskName: asString(spec.task_name ?? spec.name ?? spec.task, asString(spec.task_id, `Task ${index + 1}`)),
      executorType: asString(spec.executor_type, "—"),
      automationType: asString(spec.automation_type, "—"),
      frequency: asString(spec.frequency, "—"),
      impact: asString(spec.impact, "—"),
      automatability: asNumber(spec.automatabilidade ?? spec.automatability ?? spec.automation_score),
      standardization: asNumber(spec.standardization_score),
      checkpointStatus: asString(spec.checkpoint_status, "—"),
      guardrailsPresent: asArray(spec.guardrails_present).map((item) => asString(item)).filter(Boolean),
      guardrailsMissing: asArray(spec.guardrails_missing).map((item) => asString(item)).filter(Boolean),
      dependsOnGaps: asArray(spec.depends_on_gap_refs).map((item) => asString(item)).filter(Boolean),
      justification: asString(spec.justification, ""),
    }
  })
}

function extractAccountability(raciYaml: Record<string, unknown>): SinkraAccountabilityRow[] {
  const rows = collectArrays(raciYaml.raci_matrix, raciYaml.assignments, raciYaml.rows, raciYaml.raci)
  return rows.map((raw, index) => {
    const row = asRecord(raw)
    return {
      taskId: asString(row.task_id ?? row.id ?? row.task, `task-${index + 1}`),
      taskName: asString(row.task_name ?? row.name ?? row.task, asString(row.task_id, `Task ${index + 1}`)),
      responsible: asString(row.responsible ?? row.r, "—"),
      responsibleType: asString(row.responsible_executor_type ?? row.responsible_type, "—"),
      accountable: asString(row.accountable, "—"),
      consulted: asArray(row.consulted).map((item) => asString(item)).filter(Boolean),
      informed: asArray(row.informed).map((item) => asString(item)).filter(Boolean),
    }
  })
}

function extractGaps(gapsYaml: Record<string, unknown>): SinkraGap[] {
  const gaps = collectArrays(gapsYaml.capability_gaps, gapsYaml.gaps, gapsYaml.gap_analysis, gapsYaml.findings)
  return gaps.map((raw, index) => {
    const gap = asRecord(raw)
    return {
      id: asString(gap.gap_id ?? gap.id ?? gap.capability_name, `GAP-${String(index + 1).padStart(3, "0")}`),
      title: compactTitle(asString(gap.title ?? gap.finding ?? gap.name ?? gap.description ?? gap.capability_name, "Gap")),
      severity: asString(gap.severity ?? gap.priority ?? gap.blocker_severity, "—"),
      category: asString(gap.category ?? gap.current_state ?? gap.ids_decision ?? gap.spec_ref, "—"),
      blockers: [
        ...asStringList(gap.blocker_for ?? gap.blocks),
        ...asStringList(gap.blocks_phase ?? gap.needed_by),
      ],
      executorTypes: [
        ...asStringList(gap.affects_executor_types ?? gap.executors),
        ...asStringList(gap.resolution_owner ?? gap.assigned_phase),
      ],
      impact: asString(gap.impact ?? gap.rationale ?? gap.description, ""),
      resolution: asString(gap.resolution ?? gap.resolution_path ?? gap.acceptance ?? gap.action ?? gap.target, ""),
      fallback: asString(gap.fallback_until_resolved ?? gap.fallback, ""),
    }
  })
}

function extractCompliance(complianceYaml: Record<string, unknown>, scoreYaml: Record<string, unknown>) {
  const verdict = asRecord(complianceYaml.verdict)
  const overall = asRecord(scoreYaml.overall)
  const complianceScore = asRecord(scoreYaml.compliance_score)
  const scores = asRecord(scoreYaml.scores)
  const scoreSummary = asRecord(scoreYaml.summary)
  const scoreDimensions = collectArrays(scoreYaml.dimensions).map((raw, index) => {
    const dimension = asRecord(raw)
    const id = asString(dimension.dimension ?? dimension.id ?? dimension.name, `dimension-${index + 1}`)
    const score = asNumber(dimension.base_score ?? dimension.score)
    const max = asNumber(dimension.max_base ?? dimension.max) ?? 100
    return {
      id,
      label: id.replace(/_/g, " "),
      score,
      max,
      weight: asNumber(dimension.weight),
      status: asString(dimension.status ?? (score !== null && score >= max * 0.7 ? "PASS" : "REVIEW"), ""),
      findings: asArray(dimension.findings).map((item) => asString(item)).filter(Boolean),
    }
  })
  const scoreBreakdownSource = Object.keys(scores).length > 0
    ? scores
    : asRecord(complianceScore.breakdown ?? scoreYaml.breakdown ?? complianceYaml.scores)
  return {
    status: asString(verdict.status ?? overall.status ?? scoreYaml.status ?? scoreSummary.status, "—"),
    handoffBlocked: Boolean(verdict.handoff_blocked ?? overall.auto_fail),
    currentScore: asNumber(
      verdict.current_compliance_score ??
      overall.score ??
      scoreYaml.compliance_score ??
      complianceYaml.compliance_score ??
      scoreSummary.deterministic_score,
    ),
    dimensions: collectArrays(complianceYaml.dimension_results, complianceYaml.dimensions).map((raw) => {
      const dimension = asRecord(raw)
      return {
        id: asString(dimension.id, ""),
        name: asString(dimension.name, "Dimensão"),
        score: asNumber(dimension.score),
        threshold: asNumber(dimension.threshold),
        status: asString(dimension.status, "—"),
        rationale: asString(dimension.rationale, ""),
      }
    }),
    blockingIssues: collectArrays(complianceYaml.blocking_issues, complianceYaml.issues, complianceYaml.findings).map((raw) => {
      const issue = asRecord(raw)
      return {
        id: asString(issue.id, ""),
        title: asString(issue.title, "Issue"),
        severity: asString(issue.severity, "—"),
        linkedGate: asString(issue.linked_gate, ""),
        impact: asString(issue.impact, ""),
      }
    }),
    scoreBreakdown: scoreDimensions.length > 0 ? scoreDimensions : Object.entries(scoreBreakdownSource).map(([id, raw]) => {
      const score = asRecord(raw)
      return {
        id,
        label: id.replace(/_/g, " "),
        score: asNumber(score.score ?? raw),
        max: asNumber(score.max) ?? 100,
        weight: asNumber(score.weight),
        status: asString(score.status ?? (asNumber(score.score) === asNumber(score.max) ? "PASS" : "REVIEW"), ""),
        findings: asArray(score.findings).map((item) => asString(item)).filter(Boolean),
      }
    }),
    remediationItems: collectArrays(scoreYaml.remediation_items, scoreYaml.recommendations, complianceYaml.remediation_items).map((raw) => {
      const item = asRecord(raw)
      return {
        priority: asString(item.priority, ""),
        dimension: asString(item.dimension, ""),
        finding: asString(item.finding, ""),
        action: asString(item.action, ""),
      }
    }),
  }
}

function extractComposition(compositionYaml: Record<string, unknown>) {
  const roots = [
    asRecord(compositionYaml.hierarchy),
    asRecord(compositionYaml.phase_4_5),
    asRecord(compositionYaml.composition_map),
    asRecord(compositionYaml.composition),
    compositionYaml,
  ]
  const source = roots.find((root) =>
    asArray(root.organisms).length > 0 ||
    asArray(root.molecules).length > 0 ||
    asArray(root.atoms).length > 0 ||
    Object.keys(asRecord(root.template)).length > 0 ||
    asArray(root.templates).length > 0,
  ) ?? {}
  const template = asRecord(asArray(source.templates)[0] ?? source.template ?? {
    template_id: source.template_id,
    name: source.template_name,
  })
  const organisms = asArray(source.organisms).map((raw) => asRecord(raw))
  const molecules = asArray(source.molecules).map((raw) => asRecord(raw))
  const nestedMolecules = organisms.flatMap((organism) =>
    asArray(organism.molecules)
      .map((raw) => {
        const molecule = asRecord(raw)
        if (Object.keys(molecule).length === 0) return null
        return { ...molecule, organism_ref: molecule.organism_ref ?? molecule.organism_id ?? organism.organism_id ?? organism.id }
      })
      .filter(Boolean) as Record<string, unknown>[],
  )
  const allMolecules = [...molecules, ...nestedMolecules]
  const atoms = [
    ...asArray(source.atoms).map((raw) => asRecord(raw)),
    ...allMolecules.flatMap((molecule) =>
      asArray(molecule.atoms)
        .map((raw) => {
          const atom = asRecord(raw)
          if (Object.keys(atom).length === 0) return null
          return { ...atom, molecule_ref: atom.molecule_ref ?? atom.molecule_id ?? molecule.molecule_id ?? molecule.id }
        })
        .filter(Boolean) as Record<string, unknown>[],
    ),
  ]
  const validation = asRecord(compositionYaml.validation ?? source.validation)
  const nodes: SinkraCompositionNode[] = []

  if (Object.keys(template).length > 0) {
    const templateId = asString(template.template_id ?? template.id, "template")
    nodes.push({
      id: templateId,
      name: asString(template.name, "Template"),
      level: "template",
      parentId: "",
      count: organisms.length,
    })
  }
  const templateId = asString(template.template_id ?? template.id, "template")
  nodes.push(...organisms.map((organism) => ({
    id: asString(organism.organism_id ?? organism.id, ""),
    name: asString(organism.name, ""),
    level: "organism" as const,
    parentId: templateId,
    count: asArray(organism.molecules).length,
  })))
  nodes.push(...allMolecules.map((molecule) => ({
    id: asString(molecule.molecule_id ?? molecule.id, ""),
    name: asString(molecule.name, ""),
    level: "molecule" as const,
    parentId: asString(molecule.organism_id ?? molecule.organism_ref, ""),
    count: asArray(molecule.atoms).length,
  })))
  nodes.push(...atoms.map((atom) => ({
    id: asString(atom.atom_id ?? atom.id, ""),
    name: asString(atom.task_name ?? atom.name, asString(atom.task_id, "")),
    level: "atom" as const,
    parentId: asString(atom.molecule_id ?? atom.molecule_ref, ""),
    count: asArray(atom.outputs ?? atom.saida).length,
  })))

  return {
    nodes: nodes.filter((node) => node.id),
    organismSequence: asArray(compositionYaml.organism_sequence ?? source.organism_sequence).map((item) => asString(item)).filter(Boolean),
    handoffPackets: asArray(compositionYaml.handoff_packets ?? source.handoff_packets).map((raw) => {
      const packet = asRecord(raw)
      return {
        from: asString(packet.from, ""),
        to: asString(packet.to, ""),
        packet: asString(packet.packet, ""),
      }
    }),
    adjacencyValidation: asString(validation.adjacency_validation, ""),
  }
}

function extractTokenFlow(tokenYaml: Record<string, unknown>) {
  const coverage = asRecord(tokenYaml.coverage_summary)
  return {
    tokens: asArray(tokenYaml.tokens).map((raw) => {
      const token = asRecord(raw)
      return {
        tokenName: asString(token.token_name, ""),
        tokenValue: asString(token.token_value, ""),
        type: asString(token.token_type, ""),
        domain: asString(token.domain, ""),
        producedBy: asString(token.produced_by, ""),
        consumedBy: asArray(token.consumed_by).map((item) => asString(item)).filter(Boolean),
      }
    }),
    finalOutputs: asArray(tokenYaml.final_output_tokens).map((item) => asString(item)).filter(Boolean),
    taskCountCovered: asNumber(coverage.task_count_covered) ?? 0,
  }
}

function extractExecution(stateJson: Record<string, unknown>, metricsJsonl: unknown[]) {
  const artifacts = asArray(stateJson.artifacts).map((item) => asRecord(item))
  const phases = Object.entries(asRecord(stateJson.phases)).map(([id, raw]) => {
    const phase = asRecord(raw)
    return {
      id,
      status: asString(phase.status, "—"),
      agent: asString(phase.agent, "—"),
      durationSeconds: asNumber(phase.duration_seconds),
      artifactCount: artifacts.filter((artifact) => asString(artifact.phase, "") === id).length,
    }
  })
  const metrics = metricsJsonl.map((raw) => {
    const metric = asRecord(raw)
    return {
      phase: asString(metric.phase, "—"),
      model: asString(metric.model, "—"),
      costUsd: asNumber(metric.cost_usd),
      durationSeconds: asNumber(metric.duration_s),
      status: asString(metric.status, "—"),
      outputTokens: asNumber(metric.output_tokens),
    }
  })
  return { phases, metrics }
}

function hasDriftSignal(raw: string) {
  return /drift|major|gap|inconsist|ausente|missing|skipped|not observed/i.test(raw)
}

function extractProcessPhases(processYaml: Record<string, unknown>): SinkraProcessPhase[] {
  const process = asRecord(processYaml.process)
  const processMap = asRecord(processYaml.process_map)
  const nestedProcesses = [...asArray(process.processes), ...asArray(processMap.processes)].map((item) => asRecord(item))
  const phases = [
    ...firstNonEmptyArray(processYaml.phases, process.phases, processMap.phases),
    ...nestedProcesses.flatMap((item) =>
      asArray(item.phases).map((phase) => ({
        ...asRecord(phase),
        process_name: asString(item.name ?? item.id, ""),
      })),
    ),
  ]
  return phases.map((raw, index) => {
    const phase = asRecord(raw)
    const drift = asString(phase.drift_delta ?? phase.drift ?? phase.gap ?? phase.risk, "")
    const painPoints = asArray(phase.pain_points ?? phase.painpoints ?? phase.risks).map((item) => asString(item)).filter(Boolean)
    return {
      id: asString(phase.phase_id ?? phase.id, `phase_${String(index + 1).padStart(2, "0")}`),
      name: asString(phase.name ?? phase.description ?? phase.process_name, `Phase ${index + 1}`),
      executor: asString(phase.executor_type ?? phase.executor_atual, "—"),
      drift,
      observed: asString(phase.observed_behavior ?? phase.description, ""),
      painPoints,
      hasDrift: hasDriftSignal(drift) || painPoints.length > 0,
    }
  })
}

function extractDomains(domainYaml: Record<string, unknown>): SinkraDomainGroup[] {
  const groups = new Map<string, Array<Record<string, unknown>>>()
  const domainMap = asRecord(domainYaml.domain_map)
  const entries = [
    ...asArray(domainYaml.domain_mapping),
    ...asArray(domainMap.domain_mapping),
    ...asArray(domainMap.bounded_contexts),
    ...asArray(domainYaml.bounded_contexts),
    ...asArray(domainYaml.contexts),
  ]
  for (const raw of entries) {
    const item = asRecord(raw)
    const domain = asString(item.domain ?? item.context ?? item.name, "Unclassified")
    groups.set(domain, [...(groups.get(domain) ?? []), item])
  }

  return Array.from(groups.entries()).map(([domain, items]) => ({
    domain,
    total: items.length,
    gapClosed: items.filter((item) => Boolean(asString(item.gap_closed, ""))).length,
    samples: items.slice(0, 6).map((item) => ({
      id: asString(item.task_id ?? item.id, "—"),
      name: asString(item.task_name ?? item.name, "—"),
      level: asString(item.hierarchy_level ?? item.level, "—"),
      type: asString(item.type, "standard"),
      gap: asString(item.gap_closed, ""),
    })),
  }))
}

function extractDependencies(dependencyYaml: Record<string, unknown>): SinkraDependencyGraph {
  const graph = asRecord(dependencyYaml.graph)
  const dependencyGraph = asRecord(dependencyYaml.dependency_graph)
  const source = Object.keys(graph).length > 0 ? graph : dependencyGraph
  const validation = asRecord(dependencyYaml.dag_validation ?? source.validation)
  const nodes = firstNonEmptyArray(source.nodes, source.tasks, dependencyYaml.nodes).map((raw) => {
    const node = asRecord(raw)
    return {
      id: asString(node.task_id ?? node.id ?? node.name, "—"),
      dependsOn: asArray(node.depends_on ?? node.dependencies).map((item) => asString(item)).filter(Boolean),
      feedsInto: asArray(node.feeds_into ?? node.dependents).map((item) => asString(item)).filter(Boolean),
      loop: Boolean(node.loop_edge ?? node.loop),
    }
  })
  const roots = asArray(source.roots).map((item) => asString(item)).filter(Boolean)
  const leaves = asArray(source.leaves).map((item) => asString(item)).filter(Boolean)
  return {
    type: asString(source.type ?? dependencyYaml.type, "DAG"),
    validated: Boolean(source.validated ?? dependencyYaml.validated ?? validation.valid),
    roots: roots.length > 0 ? roots : nodes.filter((node) => node.dependsOn.length === 0).map((node) => node.id),
    leaves: leaves.length > 0 ? leaves : nodes.filter((node) => node.feedsInto.length === 0).map((node) => node.id),
    nodes,
    strictDag: asString(validation.strict_dag_without_runtime_loop_edges, "—"),
    guardedLoops: Boolean(validation.runtime_loop_edges_are_guarded),
  }
}

function extractObservatoryMap(raw: Record<string, unknown>): SinkraObservatoryMap | null {
  if (asString(raw.schema, "") !== "sinkra-observatory-map/v1") return null

  const identity = asRecord(raw.identity)
  const summary = asRecord(raw.executive_summary)
  const health = asRecord(raw.health)
  const metrics = asRecord(raw.metrics)

  return {
    displayName: asString(identity.display_name, "Mapa SINKRA"),
    shortName: asString(identity.short_name, asString(identity.display_name, "Mapa")),
    kind: asString(identity.kind, "mapping"),
    headline: asString(summary.headline, ""),
    narrative: asString(summary.narrative, ""),
    decision: asString(summary.decision, ""),
    readiness: asString(health.readiness, ""),
    healthLabel: asString(health.label, ""),
    healthTone: asString(health.tone, "neutral"),
    metrics: Object.entries(metrics).map(([label, value]) => ({
      label,
      value: asString(value, "—"),
    })),
    lanes: asArray(raw.operational_lanes).map((item) => {
      const lane = asRecord(item)
      return {
        id: asString(lane.id, ""),
        title: asString(lane.title, ""),
        domain: asString(lane.domain, ""),
        owner: asString(lane.owner, ""),
        summary: asString(lane.summary, ""),
        signal: asString(lane.signal, ""),
        risk: asString(lane.risk, ""),
        taskCount: asArray(lane.tasks).length,
      }
    }),
    risks: asArray(raw.risk_register).map((item) => {
      const risk = asRecord(item)
      return {
        id: asString(risk.id, ""),
        severity: asString(risk.severity, ""),
        title: asString(risk.title, ""),
        evidence: asString(risk.evidence, ""),
        action: asString(risk.action, ""),
      }
    }),
    nextActions: asArray(raw.next_actions).map((item) => {
      const action = asRecord(item)
      return {
        priority: asString(action.priority, ""),
        title: asString(action.title, ""),
        owner: asString(action.owner, ""),
        targetArtifact: asString(action.target_artifact, ""),
      }
    }),
    readinessBars: asArray(raw.readiness_bars).map((item) => {
      const bar = asRecord(item)
      return {
        label: asString(bar.label, ""),
        value: asNumber(bar.value) ?? 0,
        status: asString(bar.status, ""),
        note: asString(bar.note, ""),
      }
    }),
    executorMix: asArray(raw.executor_mix).map((item) => {
      const executor = asRecord(item)
      return {
        executor: asString(executor.executor, ""),
        tasks: asNumber(executor.tasks) ?? 0,
        tone: asString(executor.tone, "neutral"),
        role: asString(executor.role, ""),
        insight: asString(executor.insight, ""),
      }
    }),
    gateBoard: asArray(raw.gate_board).map((item) => {
      const gate = asRecord(item)
      return {
        id: asString(gate.id, ""),
        title: asString(gate.title, ""),
        status: asString(gate.status, ""),
        severity: asString(gate.severity, ""),
        veto: Boolean(gate.veto),
        threshold: asString(gate.threshold, ""),
        owner: asString(gate.owner, ""),
        blocks: asString(gate.blocks, ""),
      }
    }),
    criticalPath: asArray(raw.critical_path).map((item) => {
      const step = asRecord(item)
      return {
        step: asString(step.step, ""),
        task: asString(step.task, ""),
        executor: asString(step.executor, ""),
        state: asString(step.state, ""),
        note: asString(step.note, ""),
      }
    }),
    decisionMatrix: asArray(raw.decision_matrix).map((item) => {
      const decision = asRecord(item)
      return {
        question: asString(decision.question, ""),
        answer: asString(decision.answer, ""),
        signal: asString(decision.signal, ""),
      }
    }),
  }
}

function structuredProcessName(...yamls: Array<Record<string, unknown>>) {
  for (const yaml of yamls) {
    const identity = asRecord(yaml.identity)
    const slugCandidate = asString(
      yaml.process_slug ??
        yaml.squad_slug ??
        identity.slug ??
        asRecord(yaml.meta).process_slug ??
        asRecord(yaml.metadata).process_slug,
      "",
    )
    if (slugCandidate) return compactTitle(slugCandidate)

    const candidate = asString(
      identity.display_name ??
        identity.short_name ??
        yaml.display_name ??
        yaml.process_display_name ??
        yaml.short_name ??
        yaml.process_name ??
        yaml.domain_mapping_name ??
        asRecord(yaml.meta).process_name ??
        asRecord(yaml.metadata).process_name ??
        yaml.workflow_name ??
        yaml.name,
      "",
    )
    if (candidate) return compactTitle(candidate)
  }
  return ""
}

async function readStructuredTitle(runPath: string, files: string[], slug: string) {
  const titleSources = [
    "observatory_map.yaml",
    "process_map.yaml",
    "workflow_definition.yaml",
    "task_definitions.yaml",
    "quality_gates.yaml",
    "domain_map.yaml",
    "dependency_graph.yaml",
    "score_card.yaml",
  ]

  for (const key of titleSources) {
    const file = resolveArtifactFile(files, key as ArtifactKey)
    if (!file) continue
    const title = structuredProcessName(await readYaml(runPath, file))
    if (title) return title
  }
  return titleFromSlug(slug)
}

function extractStructured(
  files: string[],
  workflowYaml: Record<string, unknown>,
  tasksYaml: Record<string, unknown>,
  gatesYaml: Record<string, unknown>,
  scoreYaml: Record<string, unknown>,
  processYaml: Record<string, unknown>,
  domainYaml: Record<string, unknown>,
  dependencyYaml: Record<string, unknown>,
  observatoryYaml: Record<string, unknown>,
  automationYaml: Record<string, unknown>,
  raciYaml: Record<string, unknown>,
  gapsYaml: Record<string, unknown>,
  complianceYaml: Record<string, unknown>,
  compositionYaml: Record<string, unknown>,
  tokenYaml: Record<string, unknown>,
  stateJson: Record<string, unknown>,
  metricsJsonl: unknown[],
): SinkraMapStructured {
  const workflowRoot = asRecord(workflowYaml.workflow)
  const workflowDefinitionRoot = asRecord(workflowYaml.workflow_definition)
  const workflowItems = [
    ...asArray(workflowYaml.workflows),
    ...(Object.keys(workflowRoot).length > 0 ? [workflowRoot] : []),
    ...(Object.keys(workflowDefinitionRoot).length > 0 ? [workflowDefinitionRoot] : []),
  ]
  const workflows = workflowItems.map((raw, index) => {
    const workflow = asRecord(raw)
    return {
      id: asString(workflow.workflow_id ?? workflow.id, `WF-${index + 1}`),
      name: asString(workflow.name, "Workflow"),
      layer: asString(workflow.layer, ""),
      trigger: asString(workflow.trigger, ""),
      frequency: asString(workflow.frequency, ""),
      description: asString(workflow.description, ""),
      steps: extractSteps(workflow),
    }
  })

  const taskRoot = asRecord(tasksYaml.task_definitions)
  const taskItems = collectArrays(tasksYaml.tasks, tasksYaml.new_tasks, tasksYaml.adapted_tasks, tasksYaml.updated_tasks, taskRoot.tasks)
  const tasks = taskItems.map((raw, index) => {
    const task = asRecord(raw)
    const post = asRecord(task.post_conditions)
    return {
      id: asString(task.task ?? task.task_id ?? task.id, `task-${index + 1}`),
      layer: asString(task.atomic_layer, ""),
      executor: asString(task.responsavel_type, ""),
      inputCount: asArray(task.entrada).length,
      outputCount: asArray(task.saida).length,
      preconditions: asArray(task.pre_conditions).length,
      postconditions: asArray(post.conditions).length,
    }
  })

  const gatesRoot = asRecord(gatesYaml.quality_gates)
  const gateItems = collectArrays(gatesYaml.quality_gates, gatesYaml.gates, gatesRoot)
  const gates = gateItems.map((raw, index) => {
    const gate = asRecord(raw)
    const criteria = firstNonEmptyArray(gate.criteria, gate.checks, gate.gate_criteria)
    return {
      id: asString(gate.gate_id ?? gate.id, `QG-${index + 1}`),
      name: asString(gate.name, "Gate"),
      position: asString(gate.position, ""),
      type: asString(gate.type, ""),
      executor: asString(gate.executor, ""),
      threshold: asString(gate.threshold, "—"),
      veto: Boolean(gate.veto_power ?? gate.veto ?? /blocking|veto/i.test(asString(gate.severity, ""))),
      criteriaCount: criteria.length,
    }
  })

  const overall = asRecord(scoreYaml.overall)
  const scoreSummary = asRecord(scoreYaml.summary)
  const complianceScore = scoreYaml.compliance_score
  const score = {
    score: asNumber(overall.score ?? complianceScore ?? scoreYaml.score ?? scoreSummary.deterministic_score),
    result: asString(overall.result ?? overall.status ?? scoreYaml.result ?? scoreYaml.verdict ?? scoreYaml.quality_gate, "—"),
    structuralIntegrity: asNumber(overall.structural_integrity ?? scoreYaml.structural_integrity),
    qualityGate: asString(scoreYaml.quality_gate, ""),
  }

  const processName = structuredProcessName(
    observatoryYaml,
    processYaml,
    workflowYaml,
    tasksYaml,
    gatesYaml,
    domainYaml,
    dependencyYaml,
    scoreYaml,
  )

  return {
    processName: processName || asString(
      workflowYaml.process_name ??
        tasksYaml.process_name ??
        gatesYaml.process_name ??
        scoreYaml.process_name ??
        processYaml.process_name ??
        domainYaml.domain_mapping_name ??
        dependencyYaml.process_name,
      "",
    ),
    version: asString(workflowYaml.version ?? tasksYaml.version ?? gatesYaml.version ?? processYaml.version ?? dependencyYaml.version, ""),
    mode: asString(workflowYaml.type ?? tasksYaml.type ?? gatesYaml.type ?? processYaml.type ?? dependencyYaml.type, ""),
    workflows,
    tasks,
    gates,
    score,
    processPhases: extractProcessPhases(processYaml),
    domains: extractDomains(domainYaml),
    dependencies: extractDependencies(dependencyYaml),
    observatoryMap: extractObservatoryMap(observatoryYaml),
    automation: extractAutomationSpecs(automationYaml),
    accountability: extractAccountability(raciYaml),
    gaps: extractGaps(gapsYaml),
    compliance: extractCompliance(complianceYaml, scoreYaml),
    composition: extractComposition(compositionYaml),
    tokenFlow: extractTokenFlow(tokenYaml),
    execution: extractExecution(stateJson, metricsJsonl),
    artifactCoverage: KEY_FILES.map(([key, label]) => ({ key, label, present: hasArtifact(files, key), file: resolveArtifactFile(files, key) })),
  }
}

async function buildDocumentIndex(runPath: string, slug: string, files: string[]): Promise<SinkraMapDocument[]> {
  return Promise.all(
    files.map(async (file) => {
      const full = path.join(runPath, file)
      const st = await stat(full)
      return {
        id: `${slug}/${file}`,
        file,
        phase: phaseForFile(file),
        bytes: st.size,
        content: "",
        truncated: st.size > CONTENT_LIMIT,
      }
    }),
  )
}

async function loadDocumentContent(runPath: string, slug: string, doc: SinkraMapDocument): Promise<SinkraMapDocument> {
  const raw = await readFile(path.join(runPath, doc.file), "utf8")
  return {
    ...doc,
    id: `${slug}/${doc.file}`,
    content: raw.length > CONTENT_LIMIT ? `${raw.slice(0, CONTENT_LIMIT)}\n\n...` : raw,
    truncated: raw.length > CONTENT_LIMIT,
  }
}

function normalizeStructuredView(view: ReaderMode | undefined): ReaderMode {
  return view && view in VIEW_FILE_SETS ? view : "map"
}

function shouldLoadStructuredFile(view: ReaderMode | undefined, file: string) {
  const filesForView = VIEW_FILE_SETS[normalizeStructuredView(view)] ?? VIEW_FILE_SETS.map
  return filesForView?.includes(file) ?? false
}

async function buildRunPayload(root: string, slug: string, view?: ReaderMode) {
  const viewKey = normalizeStructuredView(view)
  const cacheKey = `${root}:${slug}:${viewKey}`
  const now = Date.now()
  const cached = runCache.get(cacheKey)
  if (cached && cached.expiresAt > now) return cached

  const runPath = path.join(root, slug)
  const files = await listFiles(runPath)
  const documentsMeta = await buildDocumentIndex(runPath, slug, files)
  const [
    workflowYaml,
    tasksYaml,
    gatesYaml,
    scoreYaml,
    processYaml,
    domainYaml,
    dependencyYaml,
    observatoryYaml,
    automationYaml,
    raciYaml,
    gapsYaml,
    complianceYaml,
    compositionYaml,
    tokenYaml,
    stateJson,
    metricsJsonl,
  ] = await Promise.all([
    readYamlArtifact(runPath, files, "workflow_definition.yaml", view),
    readYamlArtifact(runPath, files, "task_definitions.yaml", view),
    readYamlArtifact(runPath, files, "quality_gates.yaml", view),
    readYamlArtifact(runPath, files, "score_card.yaml", view),
    readYamlArtifact(runPath, files, "process_map.yaml", view),
    readYamlArtifact(runPath, files, "domain_map.yaml", view),
    readYamlArtifact(runPath, files, "dependency_graph.yaml", view),
    readYamlArtifact(runPath, files, "observatory_map.yaml", view),
    readYamlArtifact(runPath, files, "automation_specs.yaml", view),
    readYamlArtifact(runPath, files, "raci_matrix.yaml", view),
    readYamlArtifact(runPath, files, "capability_gaps.yaml", view),
    readYamlArtifact(runPath, files, "compliance_score.yaml", view),
    readYamlArtifact(runPath, files, "composition_map.yaml", view),
    readYamlArtifact(runPath, files, "token_assignments.yaml", view),
    readJsonArtifact(runPath, files, "sinkra-state.json", view),
    readJsonlArtifact(runPath, files, "metrics.jsonl", view),
  ])

  const payload = {
    expiresAt: now + RUN_CACHE_TTL_MS,
    files,
    documentsMeta,
    structured: extractStructured(
      files,
      workflowYaml,
      tasksYaml,
      gatesYaml,
      scoreYaml,
      processYaml,
      domainYaml,
      dependencyYaml,
      observatoryYaml,
      automationYaml,
      raciYaml,
      gapsYaml,
      complianceYaml,
      compositionYaml,
      tokenYaml,
      stateJson,
      metricsJsonl,
    ),
  }
  runCache.set(cacheKey, payload)
  return payload
}

async function buildSummary(root: string, slug: string): Promise<Omit<SinkraMapRunSummary, "active">> {
  const runPath = path.join(root, slug)
  const files = await listFiles(runPath)
  const st = await stat(runPath)
  const hasWorkflow = hasArtifact(files, "workflow_definition.yaml")
  const hasTasks = hasArtifact(files, "task_definitions.yaml")
  const hasGates = hasArtifact(files, "quality_gates.yaml")
  const hasScore = hasArtifact(files, "score_card.yaml")
  const hasProcess = hasArtifact(files, "process_map.yaml")
  const hasDeps = hasArtifact(files, "dependency_graph.yaml")
  const hasDomain = hasArtifact(files, "domain_map.yaml")
  const hasObservatory = hasArtifact(files, "observatory_map.yaml")
  const hasAutomation = hasArtifact(files, "automation_specs.yaml")
  const hasRaci = hasArtifact(files, "raci_matrix.yaml")
  const hasGaps = hasArtifact(files, "capability_gaps.yaml")
  const hasCompliance = hasArtifact(files, "compliance_score.yaml")
  const hasComposition = hasArtifact(files, "composition_map.yaml")
  const hasTokens = hasArtifact(files, "token_assignments.yaml")
  const hasState = hasArtifact(files, "sinkra-state.json")
  const hasMetrics = hasArtifact(files, "metrics.jsonl")
  const scoreFile = resolveArtifactFile(files, "score_card.yaml")
  const scoreYaml = scoreFile ? await readYaml(runPath, scoreFile) : {}
  const overall = asRecord(scoreYaml.overall)
  const scoreSummary = asRecord(scoreYaml.summary)
  const score = scoreLabel(overall.score ?? scoreYaml.compliance_score ?? scoreYaml.score ?? scoreSummary.deterministic_score, "--")
  const complete = hasWorkflow && hasTasks && hasGates
  const title = await readStructuredTitle(runPath, files, slug)
  return {
    slug,
    title,
    date: st.mtime.toISOString().slice(0, 10),
    category: categoryFromSlug(slug),
    status: complete ? "completed" : hasWorkflow || hasTasks || hasGates ? "partial" : "legacy",
    score,
    files: files.length,
    hasWorkflow,
    hasTasks,
    hasGates,
    hasScore,
    hasProcess,
    hasDeps,
    hasDomain,
    hasObservatory,
    hasAutomation,
    hasRaci,
    hasGaps,
    hasCompliance,
    hasComposition,
    hasTokens,
    hasState,
    hasMetrics,
  }
}

function mapCompletenessScore(summary: Omit<SinkraMapRunSummary, "active">) {
  return [
    summary.hasWorkflow ? 4 : 0,
    summary.hasTasks ? 4 : 0,
    summary.hasGates ? 4 : 0,
    summary.hasProcess ? 3 : 0,
    summary.hasDomain ? 3 : 0,
    summary.hasDeps ? 3 : 0,
    summary.hasScore ? 1 : 0,
    Math.min(summary.files, 12) / 12,
  ].reduce((total, value) => total + value, 0)
}

function chooseDefaultSlug(summaries: Omit<SinkraMapRunSummary, "active">[]) {
  return [...summaries]
    .sort((a, b) => {
      const qualityDelta = mapCompletenessScore(b) - mapCompletenessScore(a)
      if (qualityDelta !== 0) return qualityDelta
      return b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug)
    })[0]?.slug
}

function chooseSelectedSlug(
  requestedSlug: string | undefined,
  slugs: string[],
  summaries: Omit<SinkraMapRunSummary, "active">[],
) {
  if (requestedSlug && slugs.includes(requestedSlug)) return requestedSlug
  if (requestedSlug) {
    const requestedGroup = currentGroupKey(requestedSlug)
    const groupSummaries = summaries.filter((summary) => currentGroupKey(summary.slug) === requestedGroup)
    const currentSlug = groupSummaries.find((summary) => isCurrentRunSlug(summary.slug))?.slug
    return currentSlug ?? chooseDefaultSlug(groupSummaries)
  }
  return chooseDefaultSlug(summaries)
}

async function getSinkraMapIndex(root: string): Promise<{
  slugs: string[]
  summaries: Omit<SinkraMapRunSummary, "active">[]
}> {
  const now = Date.now()
  if (indexCache && indexCache.root === root && indexCache.expiresAt > now) {
    return {
      slugs: indexCache.slugs,
      summaries: indexCache.summaries,
    }
  }

  const slugs = await selectCurrentRunDirs(root, await listRunDirs(root))
  const summaries = await mapWithConcurrency(slugs, INDEX_BUILD_CONCURRENCY, (s) => buildSummary(root, s))
  indexCache = {
    root,
    expiresAt: now + INDEX_CACHE_TTL_MS,
    slugs,
    summaries,
  }
  return { slugs, summaries }
}

export async function getSinkraMapsObservatoryData(slug?: string, file?: string, view?: ReaderMode): Promise<SinkraMapsObservatoryData> {
  const root = resolveDashPath("outputs", "sinkra-squad")
  const { slugs, summaries } = await getSinkraMapIndex(root)
  if (summaries.length === 0) throw new EmptyObservatorySourceError("sinkra-maps")
  const selectedSlug = chooseSelectedSlug(slug, slugs, summaries)
  if (!selectedSlug) throw new EmptyObservatorySourceError("sinkra-maps")

  const runs = summaries
    .map((summary) => ({ ...summary, active: summary.slug === selectedSlug }))
    .sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug))
  const selectedRun = runs.find((run) => run.slug === selectedSlug) ?? runs[0]
  const runPath = path.join(root, selectedRun.slug)
  const runPayload = await buildRunPayload(root, selectedRun.slug, view)
  const selectedDocumentMeta = runPayload.documentsMeta.find((doc) => doc.file === file) ?? runPayload.documentsMeta[0]
  const selectedDocument = selectedDocumentMeta
    ? await loadDocumentContent(runPath, selectedRun.slug, selectedDocumentMeta)
    : {
        id: selectedRun.slug,
        file: "sinkra-output.md",
        phase: "artifact",
        bytes: 0,
        content: "",
        truncated: false,
      }
  const documents = runPayload.documentsMeta.map((doc) =>
    doc.file === selectedDocument.file ? selectedDocument : doc,
  )

  return {
    stats: {
      totalRuns: runs.length,
      withWorkflow: runs.filter((run) => run.hasWorkflow).length,
      withTasks: runs.filter((run) => run.hasTasks).length,
      withGates: runs.filter((run) => run.hasGates).length,
      withScore: runs.filter((run) => run.hasScore).length,
    },
    runs,
    selectedRun,
    documents,
    selectedDocument,
    structured: runPayload.structured,
  }
}
