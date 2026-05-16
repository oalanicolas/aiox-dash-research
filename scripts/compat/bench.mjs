/**
 * Bench compatibility module.
 *
 * For each `docs/bench/<slug>/` we materialize `bench-output-dash.json` when
 * (a) it is missing AND (b) we have enough real signal to derive a dashboard
 * payload without inventing data.
 *
 * Signal sources, in priority order:
 *   1. metadata.json (`benchmark`, `subject_a/b`, `subjects[]`)
 *   2. scorecard.json (`dimensions[]`, `weighted_totals`, `personas`, `matrix`)
 *   3. consolidated-scorecard.json (richer `matrix`, `dimension_labels`)
 *   4. comparison-matrix.json (`categories[].items`)
 *   5. gap-analysis.json (`*_gaps[]`)
 *
 * If none of these carry signal we skip silently — extraction-no-fallbacks.
 *
 * The emitted JSON matches the schema consumed by
 * `apps/dash/src/lib/bench-dashboard.server.ts`.
 */

import path from "node:path"

import {
  GENERATOR_ID,
  fileExists,
  listChildDirs,
  safeRead,
  writeIfAllowed,
} from "./shared.mjs"

const OUTPUT_FILE = "bench-output-dash.json"

async function readJsonSafe(absPath) {
  const raw = await safeRead(absPath)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
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

function prettifySlug(slug) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => {
      const upper = part.toUpperCase()
      if (["AIOX", "OSS", "URL", "AI", "UX", "UI"].includes(upper)) return upper
      return part.charAt(0).toUpperCase() + part.slice(1)
    })
    .join(" ")
}

function extractBenchmarkBlock(metadata, scorecard, slug) {
  const md = asRecord(metadata).benchmark
  if (md && typeof md === "object") {
    const block = {
      title: asString(md.title, prettifySlug(slug)),
      short_title: asString(md.short_title, ""),
      date: asString(md.date, ""),
      type: asString(md.type, ""),
      depth: asString(md.depth, ""),
      variant: asString(md.variant, ""),
      analyst: asString(md.analyst, ""),
      method: asString(md.method, ""),
      confidence_breakdown: asString(md.confidence_breakdown, ""),
    }
    return Object.fromEntries(Object.entries(block).filter(([, v]) => v !== ""))
  }
  // No metadata benchmark signal; try the scorecard root.
  const sc = asRecord(scorecard)
  const fromScore = asString(sc.title ?? sc.short_title, "")
  if (fromScore) {
    return { title: fromScore }
  }
  return { title: prettifySlug(slug) }
}

function extractSubjects(metadata) {
  const md = asRecord(metadata)
  const canonical = md.subjects
  if (Array.isArray(canonical)) {
    return canonical
      .filter((s) => s && typeof s === "object")
      .map((s) => ({
        name: asString(s.name, ""),
        category: asString(s.category, ""),
        type: asString(s.type, ""),
      }))
      .filter((s) => s.name)
  }
  const legacy = [md.subject_a, md.subject_b, md.subject_c, md.subject_d]
    .filter((s) => s && typeof s === "object")
    .map((s) => ({
      name: asString(s.name, ""),
      category: asString(s.category, ""),
      type: asString(s.type, ""),
    }))
    .filter((s) => s.name)
  return legacy
}

function extractDimensionLabels(scorecard) {
  const root = asRecord(asRecord(scorecard).scorecard)
  const explicit = asRecord(root.dimension_labels)
  if (Object.keys(explicit).length > 0) return explicit

  // Derive labels from dimensions[] when present.
  const dims = asArray(root.dimensions)
  const out = {}
  dims.forEach((dim, idx) => {
    const record = asRecord(dim)
    const id = asString(record.id, `D${idx + 1}`)
    out[id] = asString(record.name, id)
  })
  return out
}

function extractMatrix(scorecard, subjects) {
  const root = asRecord(asRecord(scorecard).scorecard)
  const explicit = asRecord(root.matrix)
  const labels = extractDimensionLabels(scorecard)
  const dimensionIds = Object.keys(labels)
  if (dimensionIds.length === 0) return null

  // Players: from explicit matrix keys when present, else subjects.
  const players = Object.keys(explicit).length > 0
    ? Object.keys(explicit)
    : subjects.map((s) => s.name).filter(Boolean)
  if (players.length === 0) return null

  const rows = dimensionIds.map((id) => {
    const cells = players.map((player) => {
      const playerMatrix = asRecord(explicit[player])
      const cell = asRecord(playerMatrix[id])
      return {
        player,
        score: asNumber(cell.score),
        confidence: asString(cell.confidence, ""),
        notes: asString(cell.notes, ""),
        source: asString(cell.source, ""),
      }
    })
    return {
      id,
      label: asString(labels[id], id),
      weight: asString(asRecord(root.weights_neutral)[id] ?? asRecord(root.weights)[id], ""),
      cells,
    }
  })

  // Filter rows where every score is null — pure noise.
  const filtered = rows.filter((row) => row.cells.some((cell) => cell.score !== null))
  if (filtered.length === 0) return null

  // Totals from explicit totals_neutral / weighted_totals if present.
  const totalsSource = asRecord(root.totals_neutral ?? root.weighted_totals)
  const totals = Object.entries(totalsSource).map(([player, score]) => ({
    player,
    score: asNumber(score),
  }))

  return {
    players,
    rows: filtered,
    totals,
    method: asString(root.method, ""),
  }
}

function extractGaps(gapAnalysis) {
  const record = asRecord(gapAnalysis)
  const items = []
  for (const [group, value] of Object.entries(record)) {
    if (!Array.isArray(value) || !/gap/i.test(group)) continue
    for (const item of value) {
      const r = asRecord(item)
      const title = asString(r.description ?? r.title ?? r.gap, "")
      if (!title) continue
      items.push({
        id: asString(r.id, group),
        title,
        priority: asString(r.priority, ""),
        complexity: asString(r.absorption_complexity ?? r.complexity, ""),
        rationale: asString(r.rationale ?? r.estimated_effort ?? r.recommendation, ""),
      })
    }
  }
  return items
}

function extractPersonas(scorecard) {
  const root = asRecord(asRecord(scorecard).scorecard)
  const personas = asRecord(root.personas)
  return Object.entries(personas).map(([id, value]) => {
    const record = asRecord(value)
    const totalsSource = asRecord(record.totals)
    const totals = Object.entries(totalsSource).map(([player, score]) => ({ player, score: asNumber(score) }))
    const ranking = asArray(record.ranking)
      .map((entry, idx) => {
        const r = asRecord(entry)
        return {
          rank: asNumber(r.rank) ?? idx + 1,
          player: asString(r.player, ""),
          score: asNumber(r.score),
          delta_to_leader: asString(r.delta_to_leader ?? r.delta_to_next ?? r.delta, ""),
        }
      })
      .filter((r) => r.player)
    return {
      id,
      label: asString(record.label, id),
      sub: asString(record.sub, ""),
      weights: record.weights,
      totals,
      ranking,
      winner: asString(record.winner ?? ranking[0]?.player, ""),
      verdict: asString(record.verdict, ""),
      tiebreaker: asString(record.tiebreaker, ""),
    }
  })
}

function extractPlayers(metadata, subjects, scorecard) {
  const md = asRecord(metadata)
  const root = asRecord(asRecord(scorecard).scorecard)
  const playersFromMd = asArray(md.players)
  if (playersFromMd.length > 0) {
    return playersFromMd
      .filter((p) => p && typeof p === "object")
      .map((p) => ({
        key: asString(p.key ?? p.name, ""),
        name: asString(p.name, ""),
        category: asString(p.category, ""),
        type: asString(p.type, ""),
      }))
      .filter((p) => p.name)
  }
  // Derive minimal players block from subjects + scorecard totals.
  const totalsSource = asRecord(root.totals_neutral ?? root.weighted_totals)
  return subjects.map((s) => ({
    key: s.name,
    name: s.name,
    category: s.category,
    type: s.type,
    neutral_score: asNumber(totalsSource[s.name]),
  }))
}

function extractSummary(metadata, scorecard, matrix, gaps) {
  const md = asRecord(metadata)
  const summary = asRecord(md.summary)
  const root = asRecord(asRecord(scorecard).scorecard)
  const totalsSource = asRecord(root.totals_neutral ?? root.weighted_totals)
  const entries = Object.entries(totalsSource)
    .map(([player, score]) => ({ player, score: asNumber(score) }))
    .filter((entry) => entry.score !== null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  const winner = asString(summary.winner, entries[0]?.player ?? "")
  const sources = asNumber(summary.sources) ?? asNumber(md.sources)
  const dimensions = matrix?.rows.length ?? asArray(root.dimensions).length
  return {
    winner,
    sources: sources ?? "",
    dimensions: dimensions || "",
    coverage: asString(summary.coverage, ""),
    narrative: asString(summary.narrative, ""),
    gap_count: gaps.length,
  }
}

function hasSignal(metadata, scorecard, matrixCanonical, gapAnalysis) {
  if (asRecord(metadata).benchmark) return true
  if (asRecord(asRecord(scorecard).scorecard).dimensions) return true
  if (asRecord(asRecord(scorecard).scorecard).matrix) return true
  if (asArray(asRecord(matrixCanonical).matrix).length > 0) return true
  if (asArray(asRecord(matrixCanonical).categories).length > 0) return true
  const gapRecord = asRecord(gapAnalysis)
  return Object.entries(gapRecord).some(([key, value]) => /gap/i.test(key) && Array.isArray(value) && value.length > 0)
}

function buildDashPayload({ slug, metadata, scorecard, consolidatedScorecard, comparisonMatrix, gapAnalysis }) {
  const benchmark = extractBenchmarkBlock(metadata, scorecard, slug)
  const subjects = extractSubjects(metadata)
  // Prefer consolidated scorecard for matrix when it carries explicit dimension_labels.
  const matrixSource = asRecord(consolidatedScorecard).matrix
    ? { scorecard: consolidatedScorecard }
    : { scorecard: asRecord(scorecard).scorecard ?? scorecard }
  const matrix = extractMatrix(matrixSource, subjects)
  const personas = extractPersonas(scorecard)
  const gaps = extractGaps(gapAnalysis)
  const players = extractPlayers(metadata, subjects, scorecard)
  const summary = extractSummary(metadata, scorecard, matrix, gaps)

  const payload = {
    generator: GENERATOR_ID,
    inferred: true,
    schema_version: "1.0",
    benchmark,
    summary,
    matrix,
    players,
    personas,
    gaps,
    categorical: {},
    tiebreakers: [],
    cliffs: [],
    decision_tree: [],
    tco: null,
    type_specific: {},
    editors_note: null,
    duels: [],
    sidecars: {},
  }

  // Trim noisy empties so consumers can detect "really empty" sections.
  if (!matrix) delete payload.matrix
  if (personas.length === 0) delete payload.personas
  if (gaps.length === 0) delete payload.gaps
  if (players.length === 0) delete payload.players

  return payload
}

/**
 * Walk `docs/bench/` and emit `bench-output-dash.json` for slugs missing it
 * when sufficient signal exists. Returns a small report.
 */
export async function processBenchRoot(benchRoot) {
  const slugs = await listChildDirs(benchRoot)
  const touched = []

  for (const slug of slugs) {
    const dir = path.join(benchRoot, slug)
    const dashPath = path.join(dir, OUTPUT_FILE)

    const [metadata, scorecard, consolidatedScorecard, comparisonMatrix, gapAnalysis] = await Promise.all([
      readJsonSafe(path.join(dir, "metadata.json")),
      readJsonSafe(path.join(dir, "scorecard.json")),
      readJsonSafe(path.join(dir, "consolidated-scorecard.json")),
      readJsonSafe(path.join(dir, "comparison-matrix.json")),
      readJsonSafe(path.join(dir, "gap-analysis.json")),
    ])

    if (!hasSignal(metadata, scorecard, comparisonMatrix, gapAnalysis)) {
      // Silent skip — no real signal to derive from.
      continue
    }

    // If a real `bench-output-dash.json` already exists and was authored by
    // a human (no KNOWN_GENERATORS marker), do nothing.
    const exists = await fileExists(dashPath)
    if (exists) {
      // Inspect first lines for marker before deciding.
      const raw = await safeRead(dashPath)
      const head = raw.split(/\r?\n/, 20).join("\n")
      const isOurs = head.includes(GENERATOR_ID) || head.includes("scripts/research-observatory-compat.mjs")
      if (!isOurs) {
        // Foreign authored — preserve.
        continue
      }
    }

    const payload = buildDashPayload({
      slug,
      metadata,
      scorecard,
      consolidatedScorecard,
      comparisonMatrix,
      gapAnalysis,
    })

    const content = `${JSON.stringify(payload, null, 2)}\n`
    const status = await writeIfAllowed(dashPath, content)
    if (status !== "skipped") {
      touched.push({ slug, written: [`${OUTPUT_FILE}:${status}`] })
    }
  }

  return {
    scanned: slugs.length,
    touched,
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const target = process.argv[2] ?? path.resolve("docs/bench")
  processBenchRoot(target)
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
