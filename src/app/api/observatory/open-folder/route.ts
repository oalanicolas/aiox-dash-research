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

  if (!isOpenableSource(source)) {
    return NextResponse.json({ error: "Fonte sem pasta local abrível." }, { status: 400 })
  }
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,180}$/.test(slug)) {
    return NextResponse.json({ error: "Slug inválido." }, { status: 400 })
  }

  const basePath = resolveDashPath(...SOURCE_ROOTS[source])
  const targetPath = path.resolve(basePath, slug)
  if (!isInside(targetPath, basePath)) {
    return NextResponse.json({ error: "Pasta fora do workspace." }, { status: 400 })
  }

  try {
    const info = await stat(targetPath)
    if (!info.isDirectory()) {
      return NextResponse.json({ error: "Pasta não encontrada." }, { status: 404 })
    }
    await openFolder(targetPath)
    return NextResponse.json({ ok: true, path: targetPath })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao abrir pasta."
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

function openFolder(targetPath: string) {
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
