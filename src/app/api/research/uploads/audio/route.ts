import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { NextRequest, NextResponse } from "next/server"
import { getDashWorkspaceRoot } from "@/lib/workspace-root.server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const MAX_AUDIO_UPLOAD_BYTES = 50 * 1024 * 1024

type AudioTranscriptionResult = {
  status: "completed" | "failed" | "unavailable"
  transcript?: string
  provider?: string
  message?: string
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file")
    const slug = sanitizePathSegment(String(formData.get("slug") || "audio-research"))
    const shouldTranscribe = String(formData.get("transcribe") || "") === "true"

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Arquivo de áudio não enviado." }, { status: 400 })
    }
    if (!file.type.startsWith("audio/")) {
      return NextResponse.json({ error: "Envie apenas arquivos de áudio." }, { status: 400 })
    }
    if (file.size > MAX_AUDIO_UPLOAD_BYTES) {
      return NextResponse.json({ error: "Áudio acima do limite de 50 MB." }, { status: 400 })
    }

    const workspaceRoot = getDashWorkspaceRoot()
    const uploadDir = path.join(workspaceRoot, "docs", "research", "_uploads", "audio", slug)
    await mkdir(uploadDir, { recursive: true })

    const safeName = sanitizeFileName(file.name || "audio")
    const absolutePath = path.join(uploadDir, `${Date.now()}-${safeName}`)
    await writeFile(absolutePath, Buffer.from(await file.arrayBuffer()))

    const transcription = shouldTranscribe ? await transcribeAudio(file) : null
    const relativePath = path.relative(workspaceRoot, absolutePath).split(path.sep).join("/")
    return NextResponse.json({
      name: file.name || safeName,
      type: file.type,
      size: file.size,
      path: relativePath,
      kind: "audio",
      transcriptionStatus: shouldTranscribe ? transcription?.status ?? "unavailable" : "skipped",
      ...(transcription?.transcript ? { transcript: transcription.transcript } : {}),
      ...(transcription?.provider ? { transcriptionProvider: transcription.provider } : {}),
      ...(transcription?.message ? { transcriptionMessage: transcription.message } : {}),
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao salvar áudio." },
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
    .slice(0, 80) || "audio-research"
}

function sanitizeFileName(value: string) {
  const parsed = path.parse(value)
  const name = sanitizePathSegment(parsed.name || "audio")
  const ext = parsed.ext.toLowerCase().replace(/[^a-z0-9.]/g, "").slice(0, 12)
  return `${name}${ext || ".audio"}`
}

async function transcribeAudio(file: File): Promise<AudioTranscriptionResult> {
  const apiKey = await resolveEnvValue("AIOX_RESEARCH_TRANSCRIBE_API_KEY") || await resolveEnvValue("OPENAI_API_KEY")
  if (!apiKey) {
    return {
      status: "unavailable",
      message: "Áudio anexado. Para transcrição server-side, configure OPENAI_API_KEY ou AIOX_RESEARCH_TRANSCRIBE_API_KEY.",
    }
  }

  const baseUrl = await resolveEnvValue("AIOX_RESEARCH_TRANSCRIBE_BASE_URL") || "https://api.openai.com/v1"
  const model = await resolveEnvValue("AIOX_RESEARCH_TRANSCRIBE_MODEL") || "whisper-1"
  const upload = new FormData()
  upload.append("file", file, file.name || "audio.webm")
  upload.append("model", model)
  upload.append("response_format", "json")

  try {
    const response = await fetch(`${baseUrl.replace(/\/+$/g, "")}/audio/transcriptions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
      },
      body: upload,
    })
    const rawBody = await response.text()
    if (!response.ok) {
      return {
        status: "failed",
        provider: "openai-audio",
        message: `Áudio anexado, mas a transcrição falhou (${response.status}).`,
      }
    }
    const parsed = JSON.parse(rawBody) as unknown
    const transcript = extractTranscript(parsed)
    if (!transcript) {
      return {
        status: "failed",
        provider: "openai-audio",
        message: "Áudio anexado, mas a transcrição veio vazia.",
      }
    }
    return {
      status: "completed",
      provider: "openai-audio",
      transcript,
    }
  } catch {
    return {
      status: "failed",
      provider: "openai-audio",
      message: "Áudio anexado, mas não foi possível completar a transcrição.",
    }
  }
}

function extractTranscript(value: unknown) {
  if (!value || typeof value !== "object") return ""
  const record = value as Record<string, unknown>
  const text = record.text
  if (typeof text === "string") return text.trim()
  const transcript = record.transcript
  if (typeof transcript === "string") return transcript.trim()
  return ""
}

async function resolveEnvValue(name: string) {
  const direct = process.env[name]?.trim()
  if (direct) return direct

  const workspaceRoot = getDashWorkspaceRoot()
  const candidates = [
    path.join(process.cwd(), ".env.local"),
    path.join(process.cwd(), ".env"),
    path.join(workspaceRoot, ".env.local"),
    path.join(workspaceRoot, ".env"),
  ]

  for (const candidate of candidates) {
    try {
      const value = parseEnvValue(await readFile(candidate, "utf8"), name)
      if (value) return value
    } catch {
      // Missing env files are expected in local installs.
    }
  }
  return ""
}

function parseEnvValue(content: string, name: string) {
  const line = content
    .split(/\r?\n/)
    .find((entry) => entry.trim().startsWith(`${name}=`))
  if (!line) return ""
  const rawValue = line.slice(line.indexOf("=") + 1).trim()
  return rawValue.replace(/^['"]|['"]$/g, "").trim()
}
