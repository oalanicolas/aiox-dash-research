import { NextRequest, NextResponse } from "next/server"
import { startResearchRun } from "@/lib/research-cli.server"
import type { ResearchRunRequest } from "@/lib/research-workbench-contract"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<ResearchRunRequest>
    const state = await startResearchRun(body)
    return NextResponse.json(state)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao iniciar pesquisa." },
      { status: 400 },
    )
  }
}
