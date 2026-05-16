import { cp, mkdir, readFile, readdir, rename, stat, writeFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const WORKSPACE_ROOT = path.resolve(SCRIPT_DIR, "../../..")
const RESEARCH_ROOT = path.join(WORKSPACE_ROOT, "docs", "research")
const RUNS_DIR = path.join(WORKSPACE_ROOT, ".tmp", "aiox-research-runs")
const RUNTIME_SUFFIX = /-(claude|codex|gemini|opencode|byok)$/
const CONSOLIDATED_SUFFIX = /-consolidado$/
const CORE_FILES = [
  "README.md",
  "00-query-original.md",
  "01-deep-research-prompt.md",
  "02-research-report.md",
  "03-recommendations.md",
]
const SUPPORT_FILES = [
  "quick-wins.md",
  "curiosity_queue.yaml",
  "evolving_report.md",
  "metrics.yaml",
  "pipeline-state.yaml",
  "sources.yaml",
  "players.yaml",
  "ux-patterns.yaml",
  "matrices.yaml",
  "research-graph.json",
  "execution-log.jsonl",
]

const report = {
  groups: 0,
  runtimeDirsCopied: 0,
  consolidatedDirsCopied: 0,
  rootFilesCreated: 0,
  runStatesRepaired: 0,
  skipped: 0,
}

await repairLegacyResearchDirs()
await repairRunStateFiles()

console.log(JSON.stringify(report, null, 2))

async function repairLegacyResearchDirs() {
  if (!existsSync(RESEARCH_ROOT)) return

  const entries = await readdir(RESEARCH_ROOT, { withFileTypes: true })
  const groups = new Map()

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".") || entry.name.startsWith("_")) continue

    const runtimeMatch = entry.name.match(RUNTIME_SUFFIX)
    if (runtimeMatch) {
      const baseSlug = entry.name.replace(RUNTIME_SUFFIX, "")
      const group = ensureGroup(groups, baseSlug)
      group.runtimes.push({ cliId: runtimeMatch[1], slug: entry.name })
      continue
    }

    if (CONSOLIDATED_SUFFIX.test(entry.name)) {
      const baseSlug = entry.name.replace(CONSOLIDATED_SUFFIX, "")
      ensureGroup(groups, baseSlug).consolidatedSlug = entry.name
    }
  }

  for (const [baseSlug, group] of groups) {
    if (group.runtimes.length === 0 && !group.consolidatedSlug) continue
    report.groups += 1
    const baseDir = path.join(RESEARCH_ROOT, baseSlug)
    await mkdir(path.join(baseDir, "runtimes"), { recursive: true })

    for (const runtime of group.runtimes) {
      const sourceDir = path.join(RESEARCH_ROOT, runtime.slug)
      const targetDir = path.join(baseDir, "runtimes", runtime.cliId)
      await copyDirNonDestructive(sourceDir, targetDir)
      await writeIfMissing(
        path.join(targetDir, "legacy-source.txt"),
        `Migrado de docs/research/${runtime.slug} em ${new Date().toISOString()}.\n`,
      )
      report.runtimeDirsCopied += 1
    }

    if (group.consolidatedSlug) {
      const sourceDir = path.join(RESEARCH_ROOT, group.consolidatedSlug)
      const targetDir = path.join(baseDir, "consolidation")
      await copyDirNonDestructive(sourceDir, targetDir)
      await promoteConsolidatedRootFiles(sourceDir, baseDir)
      report.consolidatedDirsCopied += 1
    }

    await ensureCanonicalRootFiles(baseDir, baseSlug, group)
  }
}

async function repairRunStateFiles() {
  if (!existsSync(RUNS_DIR)) return

  const entries = await readdir(RUNS_DIR, { withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue
    const statePath = path.join(RUNS_DIR, entry.name)
    const raw = await readFile(statePath, "utf8")
    const parsed = parseState(raw)
    if (!parsed) {
      report.skipped += 1
      continue
    }

    const logPath = typeof parsed.logPath === "string" && parsed.logPath
      ? parsed.logPath
      : statePath.replace(/\.json$/, ".log")
    const sidecarLog = existsSync(logPath) ? await readFile(logPath, "utf8").catch(() => "") : ""
    const stateLog = typeof parsed.log === "string" ? parsed.log : ""
    const outputSlug = typeof parsed.outputSlug === "string"
      ? canonicalResearchSlug(parsed.outputSlug)
      : canonicalResearchSlug(entry.name.replace(/\.json$/, ""))

    const repaired = {
      ...parsed,
      outputSlug,
      logPath,
      log: sidecarLog.length >= stateLog.length ? sidecarLog : stateLog,
    }

    await writeJsonAtomic(statePath, repaired)
    report.runStatesRepaired += 1
  }
}

function ensureGroup(groups, baseSlug) {
  const current = groups.get(baseSlug)
  if (current) return current
  const next = { runtimes: [], consolidatedSlug: null }
  groups.set(baseSlug, next)
  return next
}

async function promoteConsolidatedRootFiles(sourceDir, baseDir) {
  for (const file of [...CORE_FILES, ...SUPPORT_FILES]) {
    const source = path.join(sourceDir, file)
    const target = path.join(baseDir, file)
    if (!existsSync(source) || existsSync(target)) continue
    await cp(source, target, { force: false })
    report.rootFilesCreated += 1
  }
}

async function ensureCanonicalRootFiles(baseDir, baseSlug, group) {
  const title = prettifySlug(baseSlug)
  const runtimeLines = group.runtimes
    .map((runtime) => `- ${runtime.cliId}: \`runtimes/${runtime.cliId}/\` (legado: \`${runtime.slug}\`)`)
    .join("\n")
  const consolidatedLine = group.consolidatedSlug
    ? `- Consolidação legada: \`consolidation/\` (origem: \`${group.consolidatedSlug}\`)`
    : "- Consolidação: pendente"

  await writeIfMissing(
    path.join(baseDir, "README.md"),
    [
      `# ${title}`,
      "",
      "> Pesquisa migrada para o layout canônico do AIOX Research.",
      "",
      "## Layout",
      "",
      "Existe uma pasta raiz por pesquisa. Saídas individuais ficam em `runtimes/<runtime>/`.",
      "",
      "## Runtimes",
      "",
      runtimeLines || "- Nenhum runtime legado detectado.",
      consolidatedLine,
      "",
    ].join("\n"),
  )
  await writeIfMissing(path.join(baseDir, "00-query-original.md"), `# Pergunta original\n\n${title}\n`)
  await writeIfMissing(path.join(baseDir, "01-deep-research-prompt.md"), "# Contrato de execução\n\nPesquisa migrada de layout legado.\n")
  await writeIfMissing(
    path.join(baseDir, "02-research-report.md"),
    [
      "# Relatório",
      "",
      "Este relatório foi migrado de execuções paralelas antigas. Consulte `runtimes/*/` para as saídas completas por CLI.",
      "",
    ].join("\n"),
  )
  await writeIfMissing(
    path.join(baseDir, "03-recommendations.md"),
    [
      "# Recomendações",
      "",
      "Recomendações consolidadas pendentes ou disponíveis em `consolidation/` quando houver execução consolidada legada.",
      "",
    ].join("\n"),
  )
  await writeIfMissing(path.join(baseDir, "quick-wins.md"), "# Quick wins\n\nAguardando consolidação final.\n")
  await writeIfMissing(
    path.join(baseDir, "curiosity_queue.yaml"),
    "schema: aiox-research-curiosity-v1\nitems: []\n",
  )
  await writeIfMissing(path.join(baseDir, "evolving_report.md"), "# Evolving report\n\nPesquisa migrada para layout canônico.\n")
  await writeIfMissing(
    path.join(baseDir, "metrics.yaml"),
    [
      "schema: aiox-research-metrics-v1",
      "status: migrated",
      "coverage_score: 50",
      "integrity_score: 0",
      "confidence_score: 0",
      `source_runs: ${group.runtimes.length}`,
      "inferred:",
      "  coverage_score: true",
      "  integrity_score: true",
      "",
    ].join("\n"),
  )
  await writeIfMissing(
    path.join(baseDir, "pipeline-state.yaml"),
    [
      "schema: aiox-research-pipeline-v1",
      "status: migrated",
      `output_dir: ${JSON.stringify(`docs/research/${baseSlug}`)}`,
      "layout: parallel-runtimes-v1",
      "phases:",
      "  - id: prompt",
      "    status: done",
      "  - id: runtimes",
      "    status: done",
      "  - id: consolidation",
      `    status: ${group.consolidatedSlug ? "done" : "pending"}`,
      "",
    ].join("\n"),
  )
  await writeIfMissing(path.join(baseDir, "sources.yaml"), "schema: aiox-research-sources-v1\ntotals:\n  total: 0\nsources: []\n")
  await writeIfMissing(path.join(baseDir, "players.yaml"), "schema: aiox-research-players-v1\nplayers: []\n")
  await writeIfMissing(path.join(baseDir, "ux-patterns.yaml"), "schema: aiox-research-ux-patterns-v1\npatterns: []\n")
  await writeIfMissing(path.join(baseDir, "matrices.yaml"), "schema: aiox-research-matrices-v1\nmatrices: []\n")
  await writeIfMissing(
    path.join(baseDir, "research-graph.json"),
    `${JSON.stringify(
      {
        schema: "aiox-research-graph-v1",
        status: "migrated",
        nodes: [{ id: "query", type: "query", label: title }],
        edges: [],
      },
      null,
      2,
    )}\n`,
  )
  await writeIfMissing(
    path.join(baseDir, "execution-log.jsonl"),
    `${JSON.stringify({
      ts: new Date().toISOString(),
      event: "legacy.migrated",
      runtimes: group.runtimes.map((runtime) => runtime.cliId),
      consolidated: Boolean(group.consolidatedSlug),
    })}\n`,
  )
}

async function copyDirNonDestructive(sourceDir, targetDir) {
  if (!existsSync(sourceDir)) return
  const sourceStat = await stat(sourceDir)
  if (!sourceStat.isDirectory()) return
  await mkdir(targetDir, { recursive: true })
  await cp(sourceDir, targetDir, {
    recursive: true,
    force: false,
    errorOnExist: false,
    filter: (source) => !path.basename(source).startsWith("."),
  })
}

async function writeIfMissing(filePath, content) {
  if (existsSync(filePath)) return
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, content, "utf8")
  report.rootFilesCreated += 1
}

async function writeJsonAtomic(filePath, value) {
  const tmpPath = `${filePath}.${process.pid}.tmp`
  await writeFile(tmpPath, `${JSON.stringify(value, null, 2)}\n`, "utf8")
  await rename(tmpPath, filePath)
}

function canonicalResearchSlug(slug) {
  return slug.replace(RUNTIME_SUFFIX, "").replace(CONSOLIDATED_SUFFIX, "")
}

function prettifySlug(slug) {
  return slug
    .replace(/^\d{4}-\d{2}-\d{2}-/, "")
    .split("-")
    .filter(Boolean)
    .map((part) => (part.toUpperCase() === "AIOX" ? "AIOX" : `${part.charAt(0).toUpperCase()}${part.slice(1)}`))
    .join(" ")
}

function parseState(raw) {
  try {
    return JSON.parse(raw)
  } catch {
    const firstObject = extractFirstJsonObject(raw)
    if (!firstObject) return null
    try {
      return JSON.parse(firstObject)
    } catch {
      return null
    }
  }
}

function extractFirstJsonObject(raw) {
  let start = -1
  let depth = 0
  let inString = false
  let escaped = false

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index]
    if (start === -1) {
      if (char === "{") {
        start = index
        depth = 1
      }
      continue
    }

    if (inString) {
      if (escaped) {
        escaped = false
      } else if (char === "\\") {
        escaped = true
      } else if (char === "\"") {
        inString = false
      }
      continue
    }

    if (char === "\"") {
      inString = true
    } else if (char === "{") {
      depth += 1
    } else if (char === "}") {
      depth -= 1
      if (depth === 0) return raw.slice(start, index + 1)
    }
  }

  return null
}
