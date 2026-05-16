#!/usr/bin/env node
/**
 * init-observatory — materialize derived observatory artifacts for legacy
 * AIOX workspaces.
 *
 * Discovery rules (matching apps/research/src/lib/workspace-root.server.ts):
 *   1. honor AIOX_RESEARCH_ROOT env when set, with legacy AIOX_DASH_ROOT fallback
 *   2. otherwise walk up from cwd looking for `docs/` / `outputs/` / `apps/`
 *
 * Sources processed when present:
 *   - <root>/docs/research/   → research.mjs
 *   - <root>/docs/bench/      → bench.mjs
 *   - <root>/outputs/sinkra-squad/ → sinkra-maps.mjs
 *
 * Exit codes:
 *   0 — success (including zero-signal slugs being silently skipped)
 *   1 — runtime error (fs / parse failures bubbling out)
 *   2 — no observatory source detected in the resolved workspace root
 *
 * For AIOX Pro / AIOX Enterprise workspaces. Visitor tier (Demo only) does
 * not need this script — exit 2 with a clear message is the expected outcome.
 */

import { existsSync } from "node:fs"
import path from "node:path"

import { processBenchRoot } from "./compat/bench.mjs"
import { processResearchRoot } from "./compat/research.mjs"
import { resolveWorkspaceRoot } from "./compat/shared.mjs"
import { processSinkraMapsRoot } from "./compat/sinkra-maps.mjs"

function log(...args) {
  // eslint-disable-next-line no-console
  console.log(...args)
}

function logErr(...args) {
  // eslint-disable-next-line no-console
  console.error(...args)
}

function summarizeReport(label, report) {
  const written = report.touched.reduce((total, item) => total + item.written.length, 0)
  log(`  ${label}: scanned=${report.scanned} touched=${report.touched.length} files_written=${written}`)
  for (const item of report.touched.slice(0, 12)) {
    log(`    - ${item.slug}: ${item.written.join(", ")}`)
  }
  if (report.touched.length > 12) {
    log(`    ... and ${report.touched.length - 12} more`)
  }
}

async function main() {
  const start = Date.now()
  const root = resolveWorkspaceRoot()
  log(`init-observatory: workspace root = ${root}`)

  const researchRoot = path.join(root, "docs", "research")
  const benchRoot = path.join(root, "docs", "bench")
  const sinkraSquadRoot = path.join(root, "outputs", "sinkra-squad")

  const hasResearch = existsSync(researchRoot)
  const hasBench = existsSync(benchRoot)
  const hasSinkraMaps = existsSync(sinkraSquadRoot)

  if (!hasResearch && !hasBench && !hasSinkraMaps) {
    logErr("init-observatory: no observatory source detected.")
    logErr("  Looked for:")
    logErr(`    - ${researchRoot}`)
    logErr(`    - ${benchRoot}`)
    logErr(`    - ${sinkraSquadRoot}`)
    logErr("  Set AIOX_RESEARCH_ROOT to a workspace populated by AIOX Pro/Enterprise pipelines,")
    logErr("  or run this command from inside such a workspace.")
    logErr("  Visitor tier (Demo only) does not require init-observatory.")
    process.exit(2)
  }

  const reports = {}

  if (hasResearch) {
    log("init-observatory: processing docs/research/")
    reports.research = await processResearchRoot(researchRoot)
    summarizeReport("research", reports.research)
  } else {
    log("init-observatory: skip docs/research/ (not present)")
  }

  if (hasBench) {
    log("init-observatory: processing docs/bench/")
    reports.bench = await processBenchRoot(benchRoot)
    summarizeReport("bench", reports.bench)
  } else {
    log("init-observatory: skip docs/bench/ (not present)")
  }

  if (hasSinkraMaps) {
    log("init-observatory: processing outputs/sinkra-squad/")
    reports.sinkraMaps = await processSinkraMapsRoot(sinkraSquadRoot)
    summarizeReport("sinkra-maps", reports.sinkraMaps)
  } else {
    log("init-observatory: skip outputs/sinkra-squad/ (not present)")
  }

  const elapsed = Date.now() - start
  log(`init-observatory: done in ${elapsed}ms`)
}

main().catch((err) => {
  logErr("init-observatory: runtime error")
  logErr(err && err.stack ? err.stack : String(err))
  process.exit(1)
})
