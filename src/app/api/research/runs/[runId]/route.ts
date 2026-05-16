import { NextRequest, NextResponse } from "next/server"
import { getResearchRunState } from "@/lib/research-cli.server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type RunStatusRouteProps = {
  params: Promise<{ runId: string }>
}

export async function GET(_request: NextRequest, { params }: RunStatusRouteProps) {
  const { runId } = await params
  const state = await getResearchRunState(runId)
  if (!state) {
    return NextResponse.json({ error: "Run não encontrado." }, { status: 404 })
  }
  return NextResponse.json(state)
}
