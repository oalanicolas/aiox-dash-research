import type { Metadata } from "next"
import { ResearchWorkbench } from "@/components/research/research-workbench"
import { getResearchCliDiscovery } from "@/lib/research-cli.server"
import { getRecentResearchRunSummaries } from "@/lib/research-observatory.server"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Open Research · AIOX Research",
  description: "Interactive local-first research workbench with automatic CLI detection.",
}

type ResearchPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function ResearchPage({ searchParams }: ResearchPageProps) {
  const [discovery, recentRuns] = await Promise.all([
    getResearchCliDiscovery(),
    getRecentResearchRunSummaries(8),
  ])
  const params = searchParams ? await searchParams : {}
  return (
    <ResearchWorkbench
      initialDiscovery={discovery}
      recentRuns={recentRuns.map((run) => ({
        slug: run.slug,
        title: run.title,
        displayTitle: run.displayTitle,
        date: run.date,
        status: run.status,
        category: run.category,
        coverage: run.coverage,
        sources: run.sources,
        files: run.files,
        sampleFiles: run.sampleFiles,
        waves: run.waves,
      }))}
      initialRunIds={splitParam(params.runs)}
      initialConsolidationRunId={firstParam(params.consolidation)}
    />
  )
}

function splitParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value.join(",") : value ?? ""
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}
