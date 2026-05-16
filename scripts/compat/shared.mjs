/**
 * Shared utilities for the init-observatory compatibility pipeline.
 *
 * Extraction-only discipline (see .claude/rules/extraction-no-fallbacks.md):
 *   - emit values derived from real signal in the input artifacts, or
 *   - emit an "extraction_gap" marker / skip the file silently.
 *   - never emit universal defaults that would create false positive coverage.
 *
 * Generator-overwrite policy (KNOWN_GENERATORS):
 *   - Files containing a KNOWN_GENERATORS marker on their first ~20 lines are
 *     treated as machine-generated and safe to overwrite.
 *   - Files without a marker are treated as human-authored and never touched.
 *   - Files not present yet are written.
 *
 * The legacy shim `scripts/research-observatory-compat.mjs` (Hub-level) is
 * recognized so the new init can adopt artifacts produced by that shim and
 * keep updates idempotent across migrations.
 */

import { existsSync } from "node:fs"
import { readFile, readdir, stat, writeFile } from "node:fs/promises"
import path from "node:path"

export const GENERATOR_ID = "scripts/init-observatory.mjs"

export const KNOWN_GENERATORS = [
  "scripts/init-observatory.mjs",
  "scripts/research-observatory-compat.mjs",
]

const MARKER_SCAN_LINES = 20

/**
 * Decide whether a target path is safe to (over)write.
 *  - returns true when the file does not exist yet
 *  - returns true when the file exists AND contains a KNOWN_GENERATORS marker
 *    within the first MARKER_SCAN_LINES lines
 *  - returns false when the file exists but no marker is found (human-authored)
 */
export async function canOverwriteGenerated(absPath) {
  try {
    const raw = await readFile(absPath, "utf8")
    const head = raw.split(/\r?\n/, MARKER_SCAN_LINES).join("\n")
    return KNOWN_GENERATORS.some((marker) => head.includes(marker))
  } catch (err) {
    if (err && err.code === "ENOENT") return true
    // surface unexpected errors (permission, IO) to the caller; do not silently
    // pretend the file is writable.
    throw err
  }
}

/**
 * Write `content` to `absPath` only when allowed by canOverwriteGenerated.
 * Returns one of: "created" | "updated" | "skipped".
 */
export async function writeIfAllowed(absPath, content) {
  const existed = await fileExists(absPath)
  const allowed = await canOverwriteGenerated(absPath)
  if (!allowed) return "skipped"
  await writeFile(absPath, content, "utf8")
  return existed ? "updated" : "created"
}

export async function fileExists(absPath) {
  try {
    const st = await stat(absPath)
    return st.isFile()
  } catch {
    return false
  }
}

export async function dirExists(absPath) {
  try {
    const st = await stat(absPath)
    return st.isDirectory()
  } catch {
    return false
  }
}

/**
 * List immediate sub-directories that are not reserved (no leading `_` or `.`).
 */
export async function listChildDirs(absPath) {
  try {
    const entries = await readdir(absPath, { withFileTypes: true })
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((name) => !name.startsWith("_") && !name.startsWith("."))
      .sort()
  } catch {
    return []
  }
}

export async function listFiles(absPath) {
  try {
    const entries = await readdir(absPath, { withFileTypes: true })
    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .sort()
  } catch {
    return []
  }
}

export function jsonQuote(value) {
  return JSON.stringify(String(value ?? ""))
}

export function slugDate(slug) {
  return slug.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? "undated"
}

export function safeRead(absPath) {
  return readFile(absPath, "utf8").catch(() => "")
}

/**
 * Resolve the workspace root the same way the Next.js adapter does — env var
 * AIOX_RESEARCH_ROOT wins, then legacy AIOX_DASH_ROOT, otherwise walk up from
 * `start` looking for one of the
 * marker directories.
 */
export function resolveWorkspaceRoot(start = process.cwd()) {
  const configured = process.env.AIOX_RESEARCH_ROOT?.trim() || process.env.AIOX_DASH_ROOT?.trim()
  if (configured) return path.resolve(configured)

  const markers = ["docs", "outputs", "apps"]
  let cursor = path.resolve(start)
  for (let i = 0; i < 8; i += 1) {
    if (markers.some((marker) => existsSync(path.join(cursor, marker)))) {
      return cursor
    }
    const parent = path.dirname(cursor)
    if (parent === cursor) break
    cursor = parent
  }
  return path.resolve(start)
}
