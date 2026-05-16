/**
 * SINKRA Maps compatibility module.
 *
 * Discovers run directories under `outputs/sinkra-squad/` and materializes two
 * forward-compat artifacts mentioned in the dash README:
 *
 *   1. `outputs/sinkra-squad/_index.json` — flat index of run dirs the dash
 *      adapter would otherwise have to discover via filesystem walk. The
 *      adapter does not yet consume this file, but tooling can.
 *
 *   2. `<run-dir>/observatory_payload.json` — pre-aggregated structured
 *      snapshot of the run. Same idea: avoid YAML parsing in runtime.
 *
 * A run directory is any non-reserved sub-tree (max 4 deep) that contains at
 * least one of the canonical KEY_FILES recognized by
 * `apps/dash/src/lib/sinkra-maps-observatory.server.ts`, or a
 * `sinkra-output.yaml` / `mission-output.yaml`.
 *
 * Extraction discipline: when a file is absent the corresponding payload
 * field is `null` and a `gaps[]` array tracks the missing signal. We do not
 * fabricate values.
 */

import { readdir, readFile, stat } from "node:fs/promises"
import path from "node:path"
import YAML from "yaml"

import { GENERATOR_ID, listFiles, writeIfAllowed } from "./shared.mjs"

const KEY_FILES = [
  ["observatory_map.yaml", "Observatory"],
  ["composition_map.yaml", "Composition"],
  ["token_assignments.yaml", "Tokens"],
  ["workflow_definition.yaml", "Workflow"],
  ["task_definitions.yaml", "Tasks"],
  ["quality_gates.yaml", "Gates"],
  ["score_card.yaml", "Score"],
  ["process_map.yaml", "Process"],
  ["domain_map.yaml", "Domain"],
  ["dependency_graph.yaml", "Dependencies"],
  ["executor_matrix.yaml", "Executors"],
  ["automation_specs.yaml", "Automation"],
  ["raci_matrix.yaml", "RACI"],
  ["capability_gaps.yaml", "Gaps"],
  ["compliance_score.yaml", "Compliance"],
  ["sinkra-state.json", "State"],
  ["metrics.jsonl", "Metrics"],
]

const KEY_FILE_NAMES = new Set(KEY_FILES.map(([f]) => f))
const SIGNAL_HINT_FILES = new Set([...KEY_FILE_NAMES, "sinkra-output.yaml", "mission-output.yaml"])

function isReservedDirName(name) {
  return name.startsWith("_") || name.startsWith(".")
}

async function listRunDirs(root, rel = "", depth = 0) {
  if (depth > 4) return []
  const full = path.join(root, rel)
  let entries
  try {
    entries = await readdir(full, { withFileTypes: true })
  } catch {
    return []
  }
  const fileNames = entries.filter((e) => e.isFile()).map((e) => e.name)
  const hasSignal = fileNames.some((name) => SIGNAL_HINT_FILES.has(name))
  const subDirs = entries.filter((e) => e.isDirectory() && !isReservedDirName(e.name))
  const nested = (
    await Promise.all(subDirs.map((entry) => listRunDirs(root, path.join(rel, entry.name), depth + 1)))
  ).flat()
  return hasSignal && rel ? [rel, ...nested] : nested
}

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {}
}

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function asString(value, fallback = "") {
  if (value === null || value === undefined || value === "") return fallback
  return String(value)
}

function asNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

async function readYamlSafe(absPath) {
  try {
    const raw = await readFile(absPath, "utf8")
    return asRecord(YAML.parse(raw))
  } catch {
    return null
  }
}

async function readJsonSafe(absPath) {
  try {
    const raw = await readFile(absPath, "utf8")
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function structuredProcessName(...yamls) {
  for (const yaml of yamls) {
    if (!yaml) continue
    const identity = asRecord(yaml.identity)
    const slugCandidate = asString(
      yaml.process_slug ?? yaml.squad_slug ?? identity.slug ?? asRecord(yaml.meta).process_slug,
      "",
    )
    if (slugCandidate) return slugCandidate
    const candidate = asString(
      identity.display_name ?? identity.short_name ?? yaml.display_name ?? yaml.process_name ?? yaml.name,
      "",
    )
    if (candidate) return candidate
  }
  return ""
}

function titleFromSlug(slug) {
  const parts = slug.split(path.sep).filter(Boolean)
  const mapIndex = parts.findIndex((part) => part === "map" || part === "validate")
  if (mapIndex > 0) {
    return parts
      .slice(0, mapIndex)
      .join(" ")
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (m) => m.toUpperCase())
  }
  return (parts[0] ?? slug).replace(/[-_]/g, " ").replace(/\b\w/g, (m) => m.toUpperCase())
}

function categoryFromSlug(slug) {
  if (slug.includes(`${path.sep}map${path.sep}`) || slug.endsWith(`${path.sep}map`)) return "map"
  if (slug.includes(`${path.sep}validate${path.sep}`)) return "validate"
  if (slug.includes("mission")) return "mission"
  return "process"
}

function deriveStableDate(slug, files, fileStats) {
  /* Idempotency-safe date source:
       1. timestamp prefix in slug components (e.g. "20260328-045852-...")
       2. mtime of the oldest non-generated artifact in the run dir
       3. "undated"
     We deliberately avoid the run-dir mtime — it shifts every time we write
     observatory_payload.json into the dir, breaking idempotency. */
  const stampRe = /^(\d{4})(\d{2})(\d{2})[-_]/
  for (const part of slug.split(path.sep).reverse()) {
    const match = part.match(stampRe)
    if (match) return `${match[1]}-${match[2]}-${match[3]}`
  }
  const stableFiles = files
    .filter((file) => file !== "observatory_payload.json" && file !== "_index.json")
    .map((file) => fileStats.get(file))
    .filter(Boolean)
  if (stableFiles.length > 0) {
    const oldest = stableFiles.reduce((a, b) => (a.mtime < b.mtime ? a : b))
    return oldest.mtime.toISOString().slice(0, 10)
  }
  return "undated"
}

async function buildRunSummary(root, slug) {
  const runPath = path.join(root, slug)
  const files = await listFiles(runPath)
  const fileStats = new Map()
  await Promise.all(files.map(async (file) => {
    try {
      const st = await stat(path.join(runPath, file))
      fileStats.set(file, st)
    } catch {
      // ignore — file disappeared mid-walk
    }
  }))

  const flags = {
    hasWorkflow: files.includes("workflow_definition.yaml"),
    hasTasks: files.includes("task_definitions.yaml"),
    hasGates: files.includes("quality_gates.yaml"),
    hasScore: files.includes("score_card.yaml"),
    hasProcess: files.includes("process_map.yaml"),
    hasDeps: files.includes("dependency_graph.yaml"),
    hasDomain: files.includes("domain_map.yaml"),
    hasObservatory: files.includes("observatory_map.yaml"),
    hasAutomation: files.includes("automation_specs.yaml"),
    hasRaci: files.includes("raci_matrix.yaml"),
    hasGaps: files.includes("capability_gaps.yaml"),
    hasCompliance: files.includes("compliance_score.yaml"),
    hasComposition: files.includes("composition_map.yaml"),
    hasTokens: files.includes("token_assignments.yaml"),
    hasState: files.includes("sinkra-state.json"),
    hasMetrics: files.includes("metrics.jsonl"),
  }

  const observatoryYaml = flags.hasObservatory ? await readYamlSafe(path.join(runPath, "observatory_map.yaml")) : null
  const processYaml = flags.hasProcess ? await readYamlSafe(path.join(runPath, "process_map.yaml")) : null
  const workflowYaml = flags.hasWorkflow ? await readYamlSafe(path.join(runPath, "workflow_definition.yaml")) : null
  const tasksYaml = flags.hasTasks ? await readYamlSafe(path.join(runPath, "task_definitions.yaml")) : null

  const derivedTitle = structuredProcessName(observatoryYaml, processYaml, workflowYaml, tasksYaml)
  const title = derivedTitle || titleFromSlug(slug)

  const scoreYaml = flags.hasScore ? await readYamlSafe(path.join(runPath, "score_card.yaml")) : null
  const score = scoreYaml
    ? asString(asRecord(scoreYaml.overall).score ?? scoreYaml.compliance_score, "")
    : ""

  const complete = flags.hasWorkflow && flags.hasTasks && flags.hasGates
  const status = complete ? "completed" : flags.hasWorkflow || flags.hasTasks || flags.hasGates ? "partial" : "legacy"

  return {
    slug,
    title,
    date: deriveStableDate(slug, files, fileStats),
    category: categoryFromSlug(slug),
    status,
    score,
    files: files.length,
    ...flags,
  }
}

function indexJson(entries) {
  return `${JSON.stringify({
    generator: GENERATOR_ID,
    schema_version: "1.0",
    inferred: true,
    entries,
  }, null, 2)}\n`
}

async function buildObservatoryPayload(runPath, files) {
  const wantedFiles = [
    "observatory_map.yaml",
    "workflow_definition.yaml",
    "task_definitions.yaml",
    "quality_gates.yaml",
    "score_card.yaml",
    "process_map.yaml",
    "domain_map.yaml",
    "dependency_graph.yaml",
    "automation_specs.yaml",
    "raci_matrix.yaml",
    "capability_gaps.yaml",
    "compliance_score.yaml",
    "composition_map.yaml",
    "token_assignments.yaml",
  ]
  const yamls = {}
  for (const name of wantedFiles) {
    if (files.includes(name)) {
      yamls[name] = await readYamlSafe(path.join(runPath, name))
    }
  }

  const state = files.includes("sinkra-state.json") ? await readJsonSafe(path.join(runPath, "sinkra-state.json")) : null
  let metrics = []
  if (files.includes("metrics.jsonl")) {
    try {
      const raw = await readFile(path.join(runPath, "metrics.jsonl"), "utf8")
      metrics = raw
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          try {
            return JSON.parse(line)
          } catch {
            return null
          }
        })
        .filter(Boolean)
    } catch {
      metrics = []
    }
  }

  const observatory = asRecord(yamls["observatory_map.yaml"])
  const workflow = asRecord(yamls["workflow_definition.yaml"])
  const tasks = asRecord(yamls["task_definitions.yaml"])
  const gates = asRecord(yamls["quality_gates.yaml"])
  const score = asRecord(yamls["score_card.yaml"])

  const overall = asRecord(score.overall)
  const summary = {
    workflows_count: asArray(workflow.workflows).length,
    tasks_count: asArray(tasks.tasks).length,
    gates_count: asArray(gates.quality_gates).length,
    score: asNumber(overall.score ?? score.compliance_score),
    result: asString(overall.result ?? score.result ?? score.quality_gate, ""),
    structural_integrity: asNumber(overall.structural_integrity),
  }

  const artifactCoverage = KEY_FILES.map(([key, label]) => ({
    key,
    label,
    present: files.includes(key),
  }))

  const gaps = artifactCoverage
    .filter((entry) => !entry.present)
    .map((entry) => `missing:${entry.key}`)

  return {
    generator: GENERATOR_ID,
    schema_version: "1.0",
    inferred: true,
    summary,
    artifact_coverage: artifactCoverage,
    observatory_map_present: Object.keys(observatory).length > 0,
    has_state: state !== null,
    metrics_count: metrics.length,
    gaps,
  }
}

/**
 * Process the sinkra-squad outputs root. Emits `_index.json` at the root and
 * `observatory_payload.json` inside each run directory.
 */
export async function processSinkraMapsRoot(sinkraSquadRoot) {
  const slugs = await listRunDirs(sinkraSquadRoot)
  if (slugs.length === 0) {
    return { scanned: 0, touched: [], indexEntries: 0 }
  }

  const summaries = []
  const touched = []

  for (const slug of slugs) {
    const summary = await buildRunSummary(sinkraSquadRoot, slug)
    summaries.push(summary)

    // Per-run observatory_payload.json
    const runPath = path.join(sinkraSquadRoot, slug)
    const files = await listFiles(runPath)
    const payload = await buildObservatoryPayload(runPath, files)
    const status = await writeIfAllowed(
      path.join(runPath, "observatory_payload.json"),
      `${JSON.stringify(payload, null, 2)}\n`,
    )
    if (status !== "skipped") {
      touched.push({ slug, written: [`observatory_payload.json:${status}`] })
    }
  }

  // Root _index.json
  const status = await writeIfAllowed(
    path.join(sinkraSquadRoot, "_index.json"),
    indexJson(summaries),
  )
  if (status !== "skipped") {
    touched.push({ slug: "_index.json", written: [`_index.json:${status}`] })
  }

  return {
    scanned: slugs.length,
    touched,
    indexEntries: summaries.length,
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const target = process.argv[2] ?? path.resolve("outputs/sinkra-squad")
  processSinkraMapsRoot(target)
    .then((result) => {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(result, null, 2))
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error(err)
      process.exit(1)
    })
}
