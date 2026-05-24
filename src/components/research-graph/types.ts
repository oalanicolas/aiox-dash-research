export type ResearchGraphNodeType =
  | "corpus"
  | "research"
  | "bench"
  | "topic"
  | "artifact"
  | "player"

export type ResearchGraphEdgeKind = "formal" | "inferred" | "seed" | "structural"

export type ResearchGraphNode = {
  id: string
  type: ResearchGraphNodeType
  label: string
  subtitle: string
  group: string
  slug?: string
  path?: string
  date?: string
  status?: string
  confidence?: string
  count?: number
  metrics?: Record<string, string | number | boolean>
  topics?: string[]
}

export type ResearchGraphEdge = {
  id: string
  source: string
  target: string
  kind: ResearchGraphEdgeKind
  relation: string
  label: string
  strength: number
  evidence?: string
  why?: string
  whyUseful?: string
  manual?: boolean
}

export type ResearchKnowledgeGraph = {
  generatedAt: string
  nodes: ResearchGraphNode[]
  edges: ResearchGraphEdge[]
  stats: {
    researchRuns: number
    benchRuns: number
    topics: number
    artifacts: number
    players: number
    formalEdges: number
    formalCrossLinks: number
    inferredEdges: number
    seedEdges: number
    structuralEdges: number
    manualEdges: number
    researchGraphs: number
  }
  notes: string[]
}
