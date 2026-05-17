import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { NextRequest, NextResponse } from "next/server"
import { getDashWorkspaceRoot } from "@/lib/workspace-root.server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const MAX_FILE_UPLOAD_BYTES = 50 * 1024 * 1024
const MAX_FILES_PER_REQUEST = 12

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const slug = sanitizePathSegment(String(formData.get("slug") || "research-context"))
    const files = formData
      .getAll("files")
      .filter((file): file is File => file instanceof File)
      .slice(0, MAX_FILES_PER_REQUEST)

    if (files.length === 0) {
      return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 })
    }

    const workspaceRoot = getDashWorkspaceRoot()
    const uploadDir = path.join(workspaceRoot, "docs", "research", "_uploads", "files", slug)
    await mkdir(uploadDir, { recursive: true })

    const uploaded: Array<{ name: string; type: string; size: number; path: string; kind: "file" }> = []
    const failed: string[] = []

    for (const file of files) {
      if (file.size > MAX_FILE_UPLOAD_BYTES) {
        failed.push(`${file.name || "arquivo"} acima de 50 MB`)
        continue
      }

      const safeName = sanitizeFileName(file.name || "context")
      const absolutePath = path.join(uploadDir, `${Date.now()}-${uploaded.length}-${safeName}`)
      await writeFile(absolutePath, Buffer.from(await file.arrayBuffer()))
      uploaded.push({
        name: file.name || safeName,
        type: file.type,
        size: file.size,
        path: path.relative(workspaceRoot, absolutePath).split(path.sep).join("/"),
        kind: "file",
      })
    }

    return NextResponse.json({ uploaded, failed })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao salvar anexos." },
      { status: 400 },
    )
  }
}

function sanitizePathSegment(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "research-context"
}

function sanitizeFileName(value: string) {
  const parsed = path.parse(value)
  const name = sanitizePathSegment(parsed.name || "context")
  const ext = parsed.ext.toLowerCase().replace(/[^a-z0-9.]/g, "").slice(0, 16)
  return `${name}${ext || ".bin"}`
}
