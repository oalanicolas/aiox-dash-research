import { NextResponse } from "next/server"
import { getResearchCliDiscovery } from "@/lib/research-cli.server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  const discovery = await getResearchCliDiscovery()
  return NextResponse.json(discovery)
}
