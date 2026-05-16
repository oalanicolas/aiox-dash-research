import { NextRequest, NextResponse } from "next/server"
import { startResearchConsolidationRun } from "@/lib/research-cli.server"
import type { ResearchConsolidationRunRequest } from "@/lib/research-workbench-contract"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<ResearchConsolidationRunRequest>
    const state = await startResearchConsolidationRun(body)
    return NextResponse.json(state)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao iniciar consolidação." },
      { status: 400 },
    )
  }
}
