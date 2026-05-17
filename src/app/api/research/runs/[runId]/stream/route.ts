import { NextRequest } from "next/server"
import { getResearchRunState } from "@/lib/research-cli.server"
import type { ResearchRunState } from "@/lib/research-workbench-contract"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type RunStreamRouteProps = {
  params: Promise<{ runId: string }>
}

const STREAM_INTERVAL_MS = 900
const MAX_STREAM_MS = 60 * 60 * 1000

export async function GET(request: NextRequest, { params }: RunStreamRouteProps) {
  const { runId } = await params
  const initialState = await getResearchRunState(runId)

  if (!initialState) {
    return new Response("Run não encontrado.", { status: 404 })
  }

  const encoder = new TextEncoder()
  let interval: ReturnType<typeof setInterval> | null = null
  let timeout: ReturnType<typeof setTimeout> | null = null
  let closed = false
  let lastSignature = ""

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const cleanup = () => {
        if (interval) clearInterval(interval)
        if (timeout) clearTimeout(timeout)
        interval = null
        timeout = null
      }

      const close = () => {
        if (closed) return
        closed = true
        cleanup()
        try {
          controller.close()
        } catch {
          // The browser can close the EventSource before the server does.
        }
      }

      const send = (state: ResearchRunState) => {
        const filesystemSignature = state.filesystem
          ? `${state.filesystem.checkedAt}:${state.filesystem.latestActivityAt ?? ""}:${state.filesystem.fileCount}:${state.filesystem.totalBytes}`
          : ""
        const signature = `${state.updatedAt}:${state.status}:${state.exitCode ?? ""}:${state.log.length}:${filesystemSignature}`
        if (signature === lastSignature) return
        lastSignature = signature
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(state)}\n\n`))
      }

      const tick = async () => {
        if (closed) return
        const state = await getResearchRunState(runId)
        if (!state) {
          close()
          return
        }
        send(state)
        if (shouldCloseStream(state)) close()
      }

      request.signal.addEventListener("abort", close)
      send(initialState)
      if (shouldCloseStream(initialState)) {
        close()
        return
      }

      interval = setInterval(() => {
        void tick()
      }, STREAM_INTERVAL_MS)
      timeout = setTimeout(close, MAX_STREAM_MS)
    },
    cancel() {
      closed = true
      if (interval) clearInterval(interval)
      if (timeout) clearTimeout(timeout)
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}

function shouldCloseStream(state: ResearchRunState) {
  if (state.status === "failed") return true
  if (state.filesystem?.progress.status === "failed") return true
  return state.status === "completed" && state.filesystem?.progress.status === "completed"
}
