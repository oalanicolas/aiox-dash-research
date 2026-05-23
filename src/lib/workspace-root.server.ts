import "server-only"

import { existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

/**
 * Workspace root resolver — Day-1 (local snapshot) / Day-N (remote API) split.
 *
 * Default (local): resolves to `apps/research/src/data/snapshot/`, a
 *   self-contained mirror of `docs/research/`, `docs/bench/`, and
 *   `outputs/sinkra-squad/` materialized by `scripts/build-research-snapshot.mjs`
 *   at predev/prebuild. Mirrors the ADR-049 Tier B pattern used by apps/design.
 *
 * Remote (`RESEARCH_DATA_SOURCE=api`): filesystem-backed loaders will throw on
 *   first call. They must be migrated to fetch-based clients pointing at
 *   `${RESEARCH_API_URL}` (planned: research.aioxsquad.ai) before flipping
 *   this flag in any environment.
 *
 * Override for local dev (`AIOX_RESEARCH_ROOT`): points the resolver back at
 *   the live monorepo root so iteration on `docs/research/` does not require
 *   rebuilding the snapshot. Never set in production.
 *
 * Path resolution is multi-candidate because `import.meta.url` after the
 * Next.js webpack bundle no longer reflects `src/lib/` — it points into
 * `.next/server/`. So we probe a list of plausible roots and use whichever
 * carries the `snapshot.manifest.json` sentinel.
 */

const LIB_DIR = path.dirname(fileURLToPath(import.meta.url))
const MANIFEST_FILE = "snapshot.manifest.json"

function normalizeRoot(candidate: string) {
  return path.resolve(candidate.replace(/^~(?=$|\/|\\)/, process.env.HOME ?? "~"))
}

function pickSnapshotRoot(): string {
  const candidates = [
    // 1. Local dev: lib-relative
    path.resolve(LIB_DIR, "..", "data", "snapshot"),
    // 2. Vercel/Next.js standalone — outputFileTracingIncludes places files
    //    relative to the function root (process.cwd() = /var/task in Vercel).
    path.resolve(process.cwd(), "src", "data", "snapshot"),
    // 3. Vercel with apps/* layout retained (sanity fallback)
    path.resolve(process.cwd(), "apps", "research", "src", "data", "snapshot"),
    // 4. Compiled Next.js output dir relative
    path.resolve(LIB_DIR, "..", "..", "src", "data", "snapshot"),
  ]

  for (const candidate of candidates) {
    if (existsSync(path.join(candidate, MANIFEST_FILE))) return candidate
  }

  // Last-resort: directory exists even if manifest missing (allows surface for ENOENT in loaders).
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }

  // Fallback to lib-relative; loaders will throw ENOENT readable errors.
  return candidates[0]
}

const SNAPSHOT_ROOT = pickSnapshotRoot()

export type DataSourceMode = "local" | "api"

export function getDataSourceMode(): DataSourceMode {
  return process.env.RESEARCH_DATA_SOURCE?.trim().toLowerCase() === "api" ? "api" : "local"
}

function envOverrideRoot(): string | null {
  const configured = process.env.AIOX_RESEARCH_ROOT?.trim() || process.env.AIOX_DASH_ROOT?.trim()
  if (!configured) return null
  const normalized = normalizeRoot(configured)
  return existsSync(normalized) ? normalized : null
}

export function getDashWorkspaceRoot(_startPath?: string): string {
  if (getDataSourceMode() === "api") {
    throw new Error(
      "workspace-root: RESEARCH_DATA_SOURCE=api is set but filesystem-based loaders are still active. " +
        "Migrate the affected loader to a fetch-based API client before enabling api mode.",
    )
  }

  const override = envOverrideRoot()
  if (override) return override

  return SNAPSHOT_ROOT
}

export function resolveDashPath(...segments: string[]): string {
  return path.join(getDashWorkspaceRoot(), ...segments)
}

export function snapshotExists(): boolean {
  return existsSync(SNAPSHOT_ROOT)
}

export function debugResolvedRoot(): { root: string; manifestPresent: boolean; cwd: string; libDir: string } {
  return {
    root: SNAPSHOT_ROOT,
    manifestPresent: existsSync(path.join(SNAPSHOT_ROOT, MANIFEST_FILE)),
    cwd: process.cwd(),
    libDir: LIB_DIR,
  }
}
