#!/usr/bin/env node
/**
 * Minimal test runner for init-observatory.
 *
 * Sets up a temporary workspace from `scripts/__fixtures__/`, points
 * AIOX_DASH_ROOT at it, runs each compat module, and asserts on the
 * artifacts produced. No external test framework — kept honest with the
 * "no new dependencies" constraint.
 */

import { existsSync } from "node:fs"
import { cp, mkdtemp, readdir, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { processBenchRoot } from "../compat/bench.mjs"
import { processResearchRoot } from "../compat/research.mjs"
import {
  canOverwriteGenerated,
  KNOWN_GENERATORS,
} from "../compat/shared.mjs"
import { processSinkraMapsRoot } from "../compat/sinkra-maps.mjs"

const HERE = path.dirname(fileURLToPath(import.meta.url))
const FIXTURES_ROOT = path.resolve(HERE, "..", "__fixtures__")

let passed = 0
let failed = 0
const failures = []

function assert(condition, message) {
  if (condition) {
    passed += 1
    return
  }
  failed += 1
  failures.push(message)
  // eslint-disable-next-line no-console
  console.error(`  FAIL: ${message}`)
}

async function withTempFixture(name, fn) {
  const src = path.join(FIXTURES_ROOT, name)
  if (!existsSync(src)) {
    throw new Error(`fixture not found: ${src}`)
  }
  const tmp = await mkdtemp(path.join(tmpdir(), `init-observatory-${name}-`))
  await cp(src, tmp, { recursive: true })
  try {
    await fn(tmp)
  } finally {
    await rm(tmp, { recursive: true, force: true })
  }
}

async function testSharedKnownGenerators() {
  // eslint-disable-next-line no-console
  console.log("[shared] KNOWN_GENERATORS policy")
  const tmp = await mkdtemp(path.join(tmpdir(), "init-observatory-shared-"))
  try {
    const generatedPath = path.join(tmp, "generated.yaml")
    const humanPath = path.join(tmp, "human.yaml")
    const legacyPath = path.join(tmp, "legacy.yaml")
    const missingPath = path.join(tmp, "missing.yaml")

    const { writeFile } = await import("node:fs/promises")
    await writeFile(generatedPath, "# generator: scripts/init-observatory.mjs\nfoo: 1\n", "utf8")
    await writeFile(humanPath, "# hand-authored\nfoo: 2\n", "utf8")
    await writeFile(legacyPath, "# generator: scripts/research-observatory-compat.mjs\nfoo: 3\n", "utf8")

    assert(await canOverwriteGenerated(generatedPath), "marker init-observatory should be overwritable")
    assert(!(await canOverwriteGenerated(humanPath)), "human-authored should NOT be overwritable")
    assert(await canOverwriteGenerated(legacyPath), "legacy research-observatory-compat marker should be overwritable")
    assert(await canOverwriteGenerated(missingPath), "non-existent path should be overwritable")
    assert(
      Array.isArray(KNOWN_GENERATORS)
        && KNOWN_GENERATORS.includes("scripts/init-observatory.mjs")
        && KNOWN_GENERATORS.includes("scripts/research-observatory-compat.mjs"),
      "KNOWN_GENERATORS exports both expected entries",
    )
  } finally {
    await rm(tmp, { recursive: true, force: true })
  }
}

async function testResearchRich() {
  // eslint-disable-next-line no-console
  console.log("[research] research-rich fixture")
  await withTempFixture("research-rich", async (tmp) => {
    const result = await processResearchRoot(tmp)
    assert(result.scanned > 0, "research scanned > 0")
    assert(result.touched.length > 0, "research touched > 0")
    assert(result.indexEntries > 0, "research indexEntries > 0")

    const slugDir = path.join(tmp, "2026-05-01-test-rich")
    assert(existsSync(path.join(slugDir, "metrics.yaml")), "metrics.yaml created")
    assert(existsSync(path.join(slugDir, "pipeline-state.yaml")), "pipeline-state.yaml created")
    assert(existsSync(path.join(slugDir, "execution-log.jsonl")), "execution-log.jsonl created")
    assert(existsSync(path.join(slugDir, "research-graph.json")), "research-graph.json created")
    assert(existsSync(path.join(slugDir, "curiosity_queue.yaml")), "curiosity_queue.yaml created")
    assert(existsSync(path.join(slugDir, "quick-wins.md")), "quick-wins.md created")
    assert(existsSync(path.join(tmp, "_index.json")), "_index.json created at research root")

    const indexRaw = await readFile(path.join(tmp, "_index.json"), "utf8")
    const indexParsed = JSON.parse(indexRaw)
    assert(indexParsed.generator === "scripts/init-observatory.mjs", "_index.json carries generator marker")
    assert(Array.isArray(indexParsed.entries), "_index.json has entries[]")

    const metrics = await readFile(path.join(slugDir, "metrics.yaml"), "utf8")
    assert(metrics.includes("scripts/init-observatory.mjs"), "metrics.yaml carries generator marker")

    // Idempotency: running twice must not flip a human-authored file.
    const humanPath = path.join(slugDir, "README.md")
    const beforeHuman = await readFile(humanPath, "utf8")
    await processResearchRoot(tmp)
    const afterHuman = await readFile(humanPath, "utf8")
    assert(beforeHuman === afterHuman, "human README.md untouched across runs")

    // Idempotency: generator file content stable byte-for-byte across two runs
    // (timestamps in execution-log.jsonl are slug-date based, not now()).
    const beforeMetrics = await readFile(path.join(slugDir, "metrics.yaml"), "utf8")
    await processResearchRoot(tmp)
    const afterMetrics = await readFile(path.join(slugDir, "metrics.yaml"), "utf8")
    assert(beforeMetrics === afterMetrics, "metrics.yaml byte-identical across runs")
  })
}

async function testBenchPartial() {
  // eslint-disable-next-line no-console
  console.log("[bench] bench-partial fixture")
  await withTempFixture("bench-partial", async (tmp) => {
    const result = await processBenchRoot(tmp)
    assert(result.scanned > 0, "bench scanned > 0")
    assert(result.touched.length > 0, "bench touched > 0")

    const slugDir = path.join(tmp, "test-bench-partial")
    const dashPath = path.join(slugDir, "bench-output-dash.json")
    assert(existsSync(dashPath), "bench-output-dash.json created")

    const raw = await readFile(dashPath, "utf8")
    const parsed = JSON.parse(raw)
    assert(parsed.generator === "scripts/init-observatory.mjs", "bench JSON carries generator marker")
    assert(parsed.benchmark && parsed.benchmark.title, "bench JSON benchmark.title set")
    assert(parsed.summary && typeof parsed.summary === "object", "bench JSON summary present")
    assert(parsed.inferred === true, "bench JSON marked inferred")

    // Idempotency
    const before = await readFile(dashPath, "utf8")
    await processBenchRoot(tmp)
    const after = await readFile(dashPath, "utf8")
    assert(before === after, "bench-output-dash.json byte-identical across runs")
  })
}

async function testSinkraMapsMinimal() {
  // eslint-disable-next-line no-console
  console.log("[sinkra-maps] sinkra-maps-minimal fixture")
  await withTempFixture("sinkra-maps-minimal", async (tmp) => {
    const result = await processSinkraMapsRoot(tmp)
    assert(result.scanned > 0, "sinkra-maps scanned > 0")
    assert(result.indexEntries > 0, "sinkra-maps indexEntries > 0")

    const runDir = path.join(tmp, "test-group", "map", "2026-05-01-test-map")
    const payloadPath = path.join(runDir, "observatory_payload.json")
    assert(existsSync(payloadPath), "observatory_payload.json created in run dir")

    const indexPath = path.join(tmp, "_index.json")
    assert(existsSync(indexPath), "_index.json created at sinkra-squad root")

    const indexRaw = await readFile(indexPath, "utf8")
    const indexParsed = JSON.parse(indexRaw)
    assert(indexParsed.generator === "scripts/init-observatory.mjs", "sinkra _index.json carries generator marker")
    assert(Array.isArray(indexParsed.entries) && indexParsed.entries.length > 0, "sinkra _index.json has entries")

    const payloadRaw = await readFile(payloadPath, "utf8")
    const payloadParsed = JSON.parse(payloadRaw)
    assert(payloadParsed.generator === "scripts/init-observatory.mjs", "observatory_payload.json carries generator marker")
    assert(Array.isArray(payloadParsed.artifact_coverage), "observatory_payload.json has artifact_coverage[]")

    // Idempotency
    const before = await readFile(payloadPath, "utf8")
    await processSinkraMapsRoot(tmp)
    const after = await readFile(payloadPath, "utf8")
    assert(before === after, "observatory_payload.json byte-identical across runs")
  })
}

async function testNoSignalSkip() {
  // eslint-disable-next-line no-console
  console.log("[silence] no-signal directories must be skipped silently")
  const tmp = await mkdtemp(path.join(tmpdir(), "init-observatory-empty-"))
  try {
    const { mkdir, writeFile } = await import("node:fs/promises")
    // Empty research dir (no markdown) — should produce no artifacts.
    await mkdir(path.join(tmp, "research-empty", "2026-05-01-empty"), { recursive: true })
    await writeFile(path.join(tmp, "research-empty", "2026-05-01-empty", "placeholder.txt"), "noise", "utf8")
    const result = await processResearchRoot(path.join(tmp, "research-empty"))
    assert(result.scanned === 1, "scanned the empty slug")
    assert(result.touched.length === 0, "no artifacts emitted when no markdown signal")

    // Empty bench dir — no metadata/scorecard → silent skip.
    await mkdir(path.join(tmp, "bench-empty", "no-signal-slug"), { recursive: true })
    await writeFile(path.join(tmp, "bench-empty", "no-signal-slug", "README.md"), "# no signal", "utf8")
    const benchResult = await processBenchRoot(path.join(tmp, "bench-empty"))
    assert(benchResult.touched.length === 0, "bench silent skip when no JSON signal")

    // Empty sinkra-squad — directories without KEY_FILES never get listed.
    await mkdir(path.join(tmp, "sinkra-empty", "no-signal-squad"), { recursive: true })
    await writeFile(path.join(tmp, "sinkra-empty", "no-signal-squad", "README.md"), "# no signal", "utf8")
    const sinkraResult = await processSinkraMapsRoot(path.join(tmp, "sinkra-empty"))
    assert(sinkraResult.scanned === 0, "sinkra silent skip when no signal files")
  } finally {
    await rm(tmp, { recursive: true, force: true })
  }
}

async function fixturesExist() {
  // eslint-disable-next-line no-console
  console.log("[fixtures] presence")
  const expected = ["research-rich", "bench-partial", "sinkra-maps-minimal"]
  for (const name of expected) {
    const fixture = path.join(FIXTURES_ROOT, name)
    assert(existsSync(fixture), `fixture exists: ${name}`)
    if (existsSync(fixture)) {
      const contents = await readdir(fixture)
      assert(contents.length > 0, `fixture has contents: ${name}`)
    }
  }
}

async function run() {
  // eslint-disable-next-line no-console
  console.log("init-observatory: test suite")
  await fixturesExist()
  await testSharedKnownGenerators()
  await testResearchRich()
  await testBenchPartial()
  await testSinkraMapsMinimal()
  await testNoSignalSkip()

  // eslint-disable-next-line no-console
  console.log(`\nResult: ${passed} passed, ${failed} failed`)
  if (failed > 0) {
    // eslint-disable-next-line no-console
    console.error("Failures:")
    for (const f of failures) {
      // eslint-disable-next-line no-console
      console.error(`  - ${f}`)
    }
    process.exit(1)
  }
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("test runner crashed:", err)
  process.exit(1)
})
