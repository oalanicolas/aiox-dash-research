import type { Metadata } from "next"
import { ResearchKnowledgeGraphExplorer } from "@/components/research-graph/research-knowledge-graph"
import { getAvailableObservatorySources } from "@/lib/observatory.server"
import { getResearchKnowledgeGraph } from "@/lib/research-knowledge-graph.server"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Research Graph · AIOX Research",
  description: "Grafo operacional conectando pesquisas, benches, artefatos, tópicos e players.",
}

export default async function ResearchGraphPage() {
  const [graph, availableSources] = await Promise.all([
    getResearchKnowledgeGraph(),
    Promise.resolve(getAvailableObservatorySources()),
  ])

  return <ResearchKnowledgeGraphExplorer graph={graph} availableSources={availableSources} />
}
