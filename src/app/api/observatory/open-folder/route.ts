import { execFile } from "node:child_process"
import { stat } from "node:fs/promises"
import path from "node:path"
import { NextRequest, NextResponse } from "next/server"
import { resolveDashPath } from "@/lib/workspace-root.server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const SOURCE_ROOTS = {
  research: ["docs", "research"],
  bench: ["docs", "bench"],
  "sinkra-maps": ["outputs", "sinkra-squad"],
} as const

type OpenableSource = keyof typeof SOURCE_ROOTS

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const source = typeof body?.source === "string" ? body.source : ""
  const slug = typeof body?.slug === "string" ? body.slug : ""
  const file = typeof body?.file === "string" ? body.file : ""

  if (!isOpenableSource(source)) {
    return NextResponse.json({ error: "Fonte sem pasta local abrível." }, { status: 400 })
  }
  const safeSlug = safeRunSlug(slug)
  if (!safeSlug) {
    return NextResponse.json({ error: "Slug inválido." }, { status: 400 })
  }
  const safeFile = file ? safeRelativePath(file) : ""
  if (file && !safeFile) {
    return NextResponse.json({ error: "Arquivo inválido." }, { status: 400 })
  }

  const basePath = resolveDashPath(...SOURCE_ROOTS[source])
  const runPath = path.resolve(basePath, safeSlug)
  if (!isInside(runPath, basePath)) {
    return NextResponse.json({ error: "Pasta fora do workspace." }, { status: 400 })
  }
  const targetPath = safeFile ? path.resolve(runPath, safeFile) : runPath
  if (!isInside(targetPath, runPath)) {
    return NextResponse.json({ error: "Arquivo fora do run." }, { status: 400 })
  }

  try {
    const info = await stat(targetPath)
    if (safeFile ? !info.isFile() : !info.isDirectory()) {
      return NextResponse.json({ error: safeFile ? "Arquivo não encontrado." : "Pasta não encontrada." }, { status: 404 })
    }
    await openLocalPath(targetPath)
    return NextResponse.json({ ok: true, path: targetPath, kind: safeFile ? "file" : "folder" })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao abrir item local."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function isOpenableSource(source: string): source is OpenableSource {
  return source === "research" || source === "bench" || source === "sinkra-maps"
}

function isInside(targetPath: string, basePath: string) {
  const relative = path.relative(basePath, targetPath)
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))
}

function safeRunSlug(value: string) {
  if (!value || value.includes("\0")) return ""
  if (value === "." || value === ".." || value.startsWith(".")) return ""
  if (path.isAbsolute(value) || value.includes("/") || value.includes("\\")) return ""
  return value
}

function safeRelativePath(value: string) {
  if (!value || value.includes("\0")) return ""
  const normalized = path.normalize(value)
  if (normalized === "." || normalized === ".." || path.isAbsolute(normalized) || normalized.startsWith(`..${path.sep}`)) {
    return ""
  }
  return normalized
}

function openLocalPath(targetPath: string) {
  const [command, args] =
    process.platform === "darwin"
      ? ["open", [targetPath]]
      : process.platform === "win32"
        ? ["explorer", [targetPath]]
        : ["xdg-open", [targetPath]]

  return new Promise<void>((resolve, reject) => {
    execFile(command, args, { timeout: 3000 }, (error) => {
      if (error) reject(error)
      else resolve()
    })
  })
}
