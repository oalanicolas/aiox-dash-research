"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { CSSProperties, PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from "react"
import { useRouter } from "next/navigation"
import {
  Braces,
  CircleDot,
  Crosshair,
  Eye,
  Filter,
  GitBranch,
  Maximize2,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Topbar } from "@/components/observatory/organisms/topbar"
import type { ObservatorySource } from "@/components/observatory/foundations/constants"
import type {
  ResearchGraphEdge,
  ResearchGraphEdgeKind,
  ResearchGraphNode,
  ResearchGraphNodeType,
  ResearchKnowledgeGraph,
} from "./types"

type LayoutNode = ResearchGraphNode & { x: number; y: number }
type ReadMode = "overview" | "local" | "research" | "bench" | "gaps"
type FocusConnection = {
  edge: ResearchGraphEdge
  node: LayoutNode
  usefulness: string
}

const TYPE_META: Record<ResearchGraphNodeType, { label: string; color: string; short: string }> = {
  corpus: { label: "Corpus", color: "#d1ff00", short: "CO" },
  research: { label: "Pesquisa", color: "#f4f4e8", short: "RS" },
  bench: { label: "Bench", color: "#0099ff", short: "BE" },
  topic: { label: "Tópico", color: "#22c55e", short: "TP" },
  artifact: { label: "Artefato", color: "#f59e0b", short: "AR" },
  player: { label: "Player", color: "#ed4609", short: "PL" },
}

const EDGE_META: Record<ResearchGraphEdgeKind, { label: string; color: string; dash?: string }> = {
  formal: { label: "Formal", color: "rgba(209,255,0,0.82)" },
  inferred: { label: "Inferida", color: "rgba(0,153,255,0.58)" },
  seed: { label: "Seed", color: "rgba(237,70,9,0.76)", dash: "8 7" },
  structural: { label: "Estrutural", color: "rgba(244,244,232,0.22)", dash: "4 7" },
}

const LENSES: Array<{ key: ReadMode; label: string; summary: string }> = [
  {
    key: "overview",
    label: "Clareza",
    summary: "Mostra só relações decisórias. Selecione um nó para revelar os caminhos úteis.",
  },
  {
    key: "research",
    label: "Pesquisas",
    summary: "Pesquisas no centro, com tópicos e artefatos de suporte.",
  },
  {
    key: "bench",
    label: "Benches",
    summary: "Benches no centro, com players e evidências de comparação.",
  },
  {
    key: "gaps",
    label: "Lacunas",
    summary: "Runs sem validação formal cross-run, bons candidatos a follow-up.",
  },
  {
    key: "local",
    label: "Foco local",
    summary: "Vizinhança direta do nó selecionado.",
  },
]

const TYPE_ORDER: ResearchGraphNodeType[] = ["corpus", "research", "bench", "topic", "artifact", "player"]
const EDGE_ORDER: ResearchGraphEdgeKind[] = ["formal", "inferred", "seed", "structural"]

export function ResearchKnowledgeGraphExplorer({
  graph,
  availableSources,
}: {
  graph: ResearchKnowledgeGraph
  availableSources: Array<[ObservatorySource, string]>
}) {
  const router = useRouter()
  const svgRef = useRef<SVGSVGElement | null>(null)
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<{ x: number; y: number } | null>(null)

  const [query, setQuery] = useState("")
  const [mode, setMode] = useState<ReadMode>("overview")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [scale, setScale] = useState(0.74)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [size, setSize] = useState({ width: 1280, height: 760 })
  const [nodeSize, setNodeSize] = useState(100)
  const [labelDensity, setLabelDensity] = useState(24)
  const [edgeStrength, setEdgeStrength] = useState(64)
  const [localDepth, setLocalDepth] = useState(1)
  const [copied, setCopied] = useState(false)
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [enabledTypes, setEnabledTypes] = useState<Record<ResearchGraphNodeType, boolean>>({
    corpus: true,
    research: true,
    bench: true,
    topic: true,
    artifact: false,
    player: false,
  })
  const [enabledKinds, setEnabledKinds] = useState<Record<ResearchGraphEdgeKind, boolean>>({
    formal: true,
    inferred: true,
    seed: true,
    structural: false,
  })

  const layoutedNodes = useMemo(() => layoutNodes(graph.nodes), [graph.nodes])
  const nodeById = useMemo(() => new Map(layoutedNodes.map((node) => [node.id, node])), [layoutedNodes])
  const adjacency = useMemo(() => buildAdjacency(graph.edges), [graph.edges])

  const selectedNode = selectedId ? nodeById.get(selectedId) ?? null : null
  const hoveredNode = hoveredId ? nodeById.get(hoveredId) ?? null : null
  const focusNode = hoveredNode ?? selectedNode
  const activeLens = LENSES.find((lens) => lens.key === mode) ?? LENSES[0]

  const formalRunLinkIds = useMemo(() => {
    const ids = new Set<string>()
    for (const edge of graph.edges) {
      if (edge.kind !== "formal") continue
      const source = nodeById.get(edge.source)
      const target = nodeById.get(edge.target)
      if (!source || !target || !isRunNode(source) || !isRunNode(target)) continue
      ids.add(source.id)
      ids.add(target.id)
    }
    return ids
  }, [graph.edges, nodeById])

  const likelyGapCount = useMemo(
    () => layoutedNodes.filter((node) => isRunNode(node) && !formalRunLinkIds.has(node.id)).length,
    [formalRunLinkIds, layoutedNodes],
  )

  const searchedIds = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return null
    const matches = new Set<string>()
    for (const node of layoutedNodes) {
      const haystack = `${node.label} ${node.subtitle} ${node.slug ?? ""} ${node.group} ${(node.topics ?? []).join(" ")}`
        .toLowerCase()
      if (!haystack.includes(trimmed)) continue
      matches.add(node.id)
      for (const neighbor of adjacency.get(node.id) ?? []) matches.add(neighbor)
    }
    return matches
  }, [adjacency, layoutedNodes, query])

  const localIds = useMemo(() => {
    if (mode !== "local" || !selectedId) return null
    return neighborhood(adjacency, selectedId, localDepth)
  }, [adjacency, localDepth, mode, selectedId])

  const visibleNodeIds = useMemo(() => {
    const ids = new Set<string>()
    const lensRevealsSupportingTypes = Boolean(searchedIds) || mode === "research" || mode === "bench" || mode === "local"

    for (const node of layoutedNodes) {
      if (!lensRevealsSupportingTypes && !enabledTypes[node.type]) continue
      if (mode === "overview" && !searchedIds && (node.type === "artifact" || node.type === "player")) continue
      if (mode === "research" && !["corpus", "research", "topic", "artifact"].includes(node.type)) continue
      if (mode === "bench" && !["corpus", "bench", "topic", "artifact", "player"].includes(node.type)) continue
      if (mode === "gaps") {
        if (node.type === "corpus") {
          ids.add(node.id)
          continue
        }
        if (!isRunNode(node) || formalRunLinkIds.has(node.id)) continue
      }
      if (localIds && !localIds.has(node.id)) continue
      if (searchedIds && !searchedIds.has(node.id)) continue
      ids.add(node.id)
    }

    return ids
  }, [enabledTypes, formalRunLinkIds, layoutedNodes, localIds, mode, searchedIds])

  const visibleEdges = useMemo(() => {
    const activeFocusNode = focusNode && visibleNodeIds.has(focusNode.id) ? focusNode : null
    const filtered = graph.edges.filter((edge) => {
      if (!enabledKinds[edge.kind]) return false
      if (!visibleNodeIds.has(edge.source) || !visibleNodeIds.has(edge.target)) return false
      const source = nodeById.get(edge.source)
      const target = nodeById.get(edge.target)
      if (!source || !target) return false
      if (activeFocusNode) {
        const touchesFocus = edge.source === activeFocusNode.id || edge.target === activeFocusNode.id
        const insideLocal = mode === "local" && localIds?.has(edge.source) && localIds.has(edge.target)
        if (!touchesFocus && !insideLocal) return false
      }
      if (mode === "overview" && !activeFocusNode && !searchedIds) {
        return isDecisionEdge(edge, source, target)
      }
      if (mode === "gaps" && !activeFocusNode) return false
      if (mode === "gaps" && edge.kind === "structural") return false
      return true
    })
    if (mode === "overview" && !activeFocusNode && !searchedIds) {
      return [...filtered].sort((a, b) => edgePriority(b) - edgePriority(a)).slice(0, 24)
    }
    return filtered
  }, [enabledKinds, focusNode, graph.edges, localIds, mode, nodeById, searchedIds, visibleNodeIds])

  const visibleNodes = useMemo(
    () => layoutedNodes.filter((node) => visibleNodeIds.has(node.id)),
    [layoutedNodes, visibleNodeIds],
  )

  const selectedConnections = useMemo(() => {
    if (!selectedNode) return []
    return graph.edges
      .filter((edge) => edge.source === selectedNode.id || edge.target === selectedNode.id)
      .map((edge) => {
        const neighborId = edge.source === selectedNode.id ? edge.target : edge.source
        const node = nodeById.get(neighborId)
        if (!node) return null
        if (!isInsightConnection(edge, selectedNode, node)) return null
        return { edge, node, usefulness: describeEdgeUsefulness(edge) }
      })
      .filter((connection): connection is FocusConnection => Boolean(connection))
      .sort((a, b) => edgePriority(b.edge) - edgePriority(a.edge))
      .slice(0, 12)
  }, [graph.edges, nodeById, selectedNode])

  const connectionCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const edge of graph.edges) {
      map.set(edge.source, (map.get(edge.source) ?? 0) + 1)
      map.set(edge.target, (map.get(edge.target) ?? 0) + 1)
    }
    return map
  }, [graph.edges])

  const fitGraph = useCallback(() => {
    const nodes = visibleNodes.length > 0 ? visibleNodes : layoutedNodes
    if (nodes.length === 0) return
    const box = boundsFor(nodes)
    const pad = 160
    const nextScale = clamp(
      Math.min(size.width / Math.max(1, box.width + pad), size.height / Math.max(1, box.height + pad)),
      0.28,
      1.35,
    )
    setScale(nextScale)
    setPan({
      x: -box.cx * nextScale,
      y: -box.cy * nextScale,
    })
  }, [layoutedNodes, size.height, size.width, visibleNodes])

  useEffect(() => {
    const target = viewportRef.current
    if (!target) return
    const observedTarget = target
    function syncSize() {
      const rect = observedTarget.getBoundingClientRect()
      setSize({
        width: Math.max(480, Math.floor(rect.width)),
        height: Math.max(420, Math.floor(rect.height)),
      })
    }
    syncSize()
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      setSize({
        width: Math.max(480, Math.floor(entry.contentRect.width)),
        height: Math.max(420, Math.floor(entry.contentRect.height)),
      })
    })
    observer.observe(observedTarget)
    window.addEventListener("resize", syncSize)
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", syncSize)
    }
  }, [])

  useEffect(() => {
    const id = window.requestAnimationFrame(fitGraph)
    return () => window.cancelAnimationFrame(id)
  }, [fitGraph, mode, query, localDepth])

  const copyVisibleGraph = useCallback(async () => {
    const payload = {
      generatedAt: graph.generatedAt,
      mode,
      nodes: visibleNodes.map(({ x: _x, y: _y, ...node }) => node),
      edges: visibleEdges,
    }
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
  }, [graph.generatedAt, mode, visibleEdges, visibleNodes])

  const navigateSource = useCallback((next: ObservatorySource) => {
    router.push(`/observatory/${next}`)
  }, [router])

  function handleWheel(event: ReactWheelEvent<SVGSVGElement>) {
    event.preventDefault()
    const direction = event.deltaY > 0 ? 0.9 : 1.1
    setScale((value) => clamp(value * direction, 0.18, 2.6))
  }

  function handlePointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    dragRef.current = { x: event.clientX, y: event.clientY }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handlePointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    const drag = dragRef.current
    if (!drag) return
    const dx = event.clientX - drag.x
    const dy = event.clientY - drag.y
    dragRef.current = { x: event.clientX, y: event.clientY }
    setPan((value) => ({ x: value.x + dx, y: value.y + dy }))
  }

  function handlePointerUp(event: ReactPointerEvent<SVGSVGElement>) {
    dragRef.current = null
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      // Pointer may already be released by the browser.
    }
  }

  return (
    <main className="grid h-[100dvh] min-w-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-[var(--dark)] text-[var(--cream)]">
      <Topbar
        source="research"
        activeSurface="graph"
        brandLabel="Research"
        newActionLabel="Nova Pesquisa"
        selectedSlug="research-knowledge-graph"
        selectedTitle="Research Graph"
        selectedDate={graph.generatedAt}
        selectedSchema="knowledge-graph"
        availableSources={availableSources}
        onChangeSource={navigateSource}
        onCopyNew={() => router.push("/research")}
      />

      <section
        className={cn(
          "grid min-h-0 grid-cols-1 overflow-hidden",
          leftCollapsed ? "lg:grid-cols-[44px_minmax(0,1fr)_334px]" : "lg:grid-cols-[282px_minmax(0,1fr)_334px]",
        )}
      >
        <aside
          className={cn(
            "min-h-0 border-b border-[var(--border-soft)] bg-[var(--surface-deep)] lg:border-b-0 lg:border-r",
            leftCollapsed ? "overflow-hidden p-2" : "overflow-y-auto p-4",
          )}
        >
          {leftCollapsed ? (
            <CollapsedGraphRail onExpand={() => setLeftCollapsed(false)} />
          ) : (
            <>
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--lime)]">Mapa de decisão</p>
                  <h1 className="mt-2 text-[20px] font-black uppercase leading-[1.05] tracking-normal">Research Graph</h1>
                  <p className="mt-2 text-[12px] leading-[1.55] text-[var(--fg3)]">
                    {graph.stats.researchRuns} pesquisas, {graph.stats.benchRuns} benches, {graph.stats.manualEdges} conexões manuais.
                  </p>
                </div>
                <button
                  type="button"
                  title="Recolher painel esquerdo"
                  aria-label="Recolher painel esquerdo"
                  aria-expanded="true"
                  onClick={() => setLeftCollapsed(true)}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center border border-[var(--border)] text-[var(--fg2)] hover:border-[var(--lime-25)] hover:text-[var(--lime)]"
                >
                  <PanelLeftClose size={15} />
                </button>
              </div>

              <section className="mb-4 grid grid-cols-3 border border-[var(--border-soft)] bg-[var(--surface)]">
                <Kpi label="Formal" value={String(graph.stats.formalCrossLinks)} />
                <Kpi label="Lacunas" value={String(likelyGapCount)} />
                <Kpi label="Manual" value={String(graph.stats.manualEdges)} />
              </section>

              <section className="mb-4 border border-[var(--lime-25)] bg-[var(--lime-05)] p-3">
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-[var(--lime)]">Caminhos úteis</p>
                <p className="mt-2 text-[12px] leading-[1.5] text-[var(--fg2)]">
                  O mapa abre com poucas linhas: relações formais, referências diretas e exemplos seed curatoriais. Ao selecionar um run, o fluxo revela o que sustenta, compara ou pede validação.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--fg3)]">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-px w-5 bg-[rgba(209,255,0,0.82)]" />
                    Formal
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-px w-5 bg-[rgba(0,153,255,0.58)]" />
                    Inferida
                  </span>
                </div>
              </section>

              <ControlGroup label="Busca">
                <label className="flex h-10 items-center gap-2 border border-[var(--border-input)] bg-[var(--surface)] px-3">
                  <Search size={15} className="text-[var(--lime)]" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="slug, tópico, player..."
                    className="min-w-0 flex-1 bg-transparent font-mono text-[12px] text-[var(--cream)] outline-none placeholder:text-[var(--fg-dim)]"
                  />
                  {query && (
                    <button type="button" onClick={() => setQuery("")} aria-label="Limpar busca" className="text-[var(--fg3)] hover:text-[var(--cream)]">
                      <X size={14} />
                    </button>
                  )}
                </label>
              </ControlGroup>

              <ControlGroup label="Leitura">
                <div className="grid grid-cols-2 gap-1.5">
                  {LENSES.map((lens) => (
                    <LensButton
                      key={lens.key}
                      active={mode === lens.key}
                      disabled={lens.key === "local" && !selectedId}
                      label={lens.label}
                      summary={lens.summary}
                      onClick={() => setMode(lens.key)}
                    />
                  ))}
                </div>
              </ControlGroup>

              <details className="border border-[var(--border-soft)] bg-[rgba(244,244,232,0.018)]">
                <summary className="cursor-pointer px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--fg3)] hover:text-[var(--cream)]">
                  Controles avançados
                </summary>
                <div className="border-t border-[var(--border-soft)] p-3">
                  <ControlGroup label="Display">
                    <Slider label="Nós" min={70} max={150} step={5} value={nodeSize} suffix="%" onChange={setNodeSize} />
                    <Slider label="Labels" min={0} max={100} step={5} value={labelDensity} suffix="%" onChange={setLabelDensity} />
                    <Slider label="Conexões" min={35} max={120} step={5} value={edgeStrength} suffix="%" onChange={setEdgeStrength} />
                    <Slider label="Depth local" min={1} max={3} step={1} value={localDepth} onChange={setLocalDepth} disabled={mode !== "local"} />
                  </ControlGroup>

                  <ControlGroup label="Tipos">
                    <div className="grid grid-cols-2 gap-1.5">
                      {TYPE_ORDER.map((type) => (
                        <ToggleButton
                          key={type}
                          active={enabledTypes[type]}
                          swatch={TYPE_META[type].color}
                          onClick={() => setEnabledTypes((value) => ({ ...value, [type]: !value[type] }))}
                        >
                          {TYPE_META[type].label}
                        </ToggleButton>
                      ))}
                    </div>
                  </ControlGroup>

                  <ControlGroup label="Relações">
                    <div className="grid grid-cols-2 gap-1.5">
                      {EDGE_ORDER.map((kind) => (
                        <ToggleButton
                          key={kind}
                          active={enabledKinds[kind]}
                          swatch={EDGE_META[kind].color}
                          onClick={() => setEnabledKinds((value) => ({ ...value, [kind]: !value[kind] }))}
                        >
                          {EDGE_META[kind].label}
                        </ToggleButton>
                      ))}
                    </div>
                  </ControlGroup>
                </div>
              </details>
            </>
          )}
        </aside>

        <div ref={viewportRef} className="relative min-h-[560px] overflow-hidden bg-[var(--dark)] lg:min-h-0">
          <svg
            ref={svgRef}
            width={size.width}
            height={size.height}
            viewBox={`0 0 ${size.width} ${size.height}`}
            className="block h-full min-h-[560px] w-full cursor-grab touch-none active:cursor-grabbing lg:min-h-0"
            onWheel={handleWheel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            role="img"
            aria-label="Grafo de pesquisas e benchmarks"
          >
            <defs>
              <pattern id="research-grid" width="34" height="34" patternUnits="userSpaceOnUse">
                <path d="M 34 0 L 0 0 0 34" fill="none" stroke="rgba(244,244,232,0.035)" strokeWidth="1" />
              </pattern>
              <radialGradient id="node-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(209,255,0,0.26)" />
                <stop offset="100%" stopColor="rgba(209,255,0,0)" />
              </radialGradient>
              <style>{`
                @keyframes graph-edge-flow {
                  to { stroke-dashoffset: -42; }
                }
                .graph-edge-flow {
                  animation: graph-edge-flow 2.2s linear infinite;
                }
              `}</style>
            </defs>
            <rect width={size.width} height={size.height} fill="url(#research-grid)" />
            <g transform={`translate(${size.width / 2 + pan.x} ${size.height / 2 + pan.y}) scale(${scale})`}>
              <TerritoryLabels />
              {visibleEdges.map((edge) => {
                const source = nodeById.get(edge.source)
                const target = nodeById.get(edge.target)
                if (!source || !target) return null
                const active = Boolean(focusNode && (edge.source === focusNode.id || edge.target === focusNode.id))
                return (
                  <GraphEdge
                    key={edge.id}
                    edge={edge}
                    source={source}
                    target={target}
                    active={active}
                    animated={active || isDecisionEdge(edge, source, target)}
                    strength={edgeStrength}
                  />
                )
              })}
              {visibleNodes.map((node) => {
                const selected = selectedId === node.id
                const hovered = hoveredId === node.id
                const connected = Boolean(focusNode && (focusNode.id === node.id || (adjacency.get(focusNode.id) ?? new Set()).has(node.id)))
                return (
                  <GraphNode
                    key={node.id}
                    node={node}
                    scale={scale}
                    selected={selected}
                    hovered={hovered}
                    muted={Boolean(focusNode && !connected)}
                    connectionCount={connectionCounts.get(node.id) ?? 0}
                    nodeSize={nodeSize}
                    showLabel={shouldShowLabel(node, labelDensity, selected || hovered, query)}
                    onSelect={() => {
                      const clearingSelection = selectedId === node.id
                      if (clearingSelection && mode === "local") setMode("overview")
                      setSelectedId(clearingSelection ? null : node.id)
                    }}
                    onHover={() => setHoveredId(node.id)}
                    onLeave={() => setHoveredId(null)}
                  />
                )
              })}
            </g>
          </svg>

          <div className="pointer-events-none absolute left-4 top-4 flex flex-wrap gap-2">
            <StatusChip icon={<Network size={13} />} label={activeLens.label} />
            <StatusChip icon={<Eye size={13} />} label={`${visibleNodes.length} nós`} />
            <StatusChip icon={<GitBranch size={13} />} label={`${visibleEdges.length} conexões`} />
            <StatusChip icon={<SlidersHorizontal size={13} />} label={`${Math.round(scale * 100)}%`} />
          </div>

          <div className="absolute left-4 top-14 flex gap-1.5">
            <IconButton label="Copiar JSON visível" onClick={copyVisibleGraph} active={copied}>
              <Braces size={14} />
            </IconButton>
            <IconButton label="Ajustar ao mapa" onClick={fitGraph}>
              <Maximize2 size={14} />
            </IconButton>
            <IconButton label="Foco local" disabled={!selectedId} onClick={() => selectedId && setMode("local")}>
              <Crosshair size={14} />
            </IconButton>
            <IconButton
              label="Limpar seleção"
              onClick={() => {
                setSelectedId(null)
                setHoveredId(null)
                setMode("overview")
              }}
            >
              <X size={14} />
            </IconButton>
          </div>

          <div className="pointer-events-none absolute right-4 top-4 hidden max-w-[360px] border border-[var(--border)] bg-[rgba(10,10,12,0.9)] p-3 xl:block">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--lime)]">{activeLens.label}</p>
            <p className="mt-1 text-[12px] leading-[1.45] text-[var(--fg2)]">{activeLens.summary}</p>
          </div>

          <EdgeLegend />

          <div className="absolute bottom-4 left-4 hidden w-[210px] border border-[var(--border)] bg-[rgba(10,10,12,0.92)] p-3 lg:block">
            <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--fg3)]">
              <CircleDot size={12} className="text-[var(--lime)]" />
              Radar
            </div>
            <MiniMap nodes={visibleNodes} selectedId={selectedId} />
          </div>
        </div>

        <aside className="min-h-0 overflow-y-auto border-t border-[var(--border-soft)] bg-[var(--surface-deep)] p-4 lg:border-l lg:border-t-0">
          <Inspector
            node={selectedNode}
            connections={selectedConnections}
            graph={graph}
            onFocus={() => selectedId && setMode("local")}
            onClear={() => setSelectedId(null)}
          />
        </aside>
      </section>
    </main>
  )
}

function GraphEdge({
  edge,
  source,
  target,
  active,
  animated,
  strength,
}: {
  edge: ResearchGraphEdge
  source: LayoutNode
  target: LayoutNode
  active: boolean
  animated: boolean
  strength: number
}) {
  const meta = EDGE_META[edge.kind]
  const dx = target.x - source.x
  const dy = target.y - source.y
  const dr = Math.sqrt(dx * dx + dy * dy) || 1
  const curve = edge.kind === "structural" ? 0 : edge.kind === "seed" ? 44 : 26
  const mx = (source.x + target.x) / 2 - (dy / dr) * curve
  const my = (source.y + target.y) / 2 + (dx / dr) * curve
  const opacity = active ? 0.95 : clamp((edge.strength * strength) / 100, 0.12, 0.72)
  const pathD = `M ${source.x} ${source.y} Q ${mx} ${my} ${target.x} ${target.y}`
  return (
    <g
      data-graph-edge="true"
      data-edge-id={edge.id}
      data-edge-source={edge.source}
      data-edge-target={edge.target}
      data-edge-relation={edge.relation}
      data-edge-kind={edge.kind}
    >
      <path
        d={pathD}
        fill="none"
        stroke={meta.color}
        strokeWidth={active ? 2.2 : 0.75 + edge.strength * 1.35}
        opacity={opacity}
        vectorEffect="non-scaling-stroke"
      />
      {animated && (
        <>
          <path
            d={pathD}
            className="graph-edge-flow"
            fill="none"
            stroke={meta.color}
            strokeWidth={active ? 2.6 : 1.4}
            strokeDasharray={meta.dash ?? "10 18"}
            opacity={active ? 0.92 : 0.46}
            vectorEffect="non-scaling-stroke"
          />
          <circle r={active ? 3.1 : 2.2} fill={meta.color} opacity={active ? 0.92 : 0.58}>
            <animateMotion dur={`${Math.max(1.8, 3.4 - edge.strength)}s`} repeatCount="indefinite" path={pathD} />
          </circle>
        </>
      )}
    </g>
  )
}

function GraphNode({
  node,
  scale,
  selected,
  hovered,
  muted,
  connectionCount,
  nodeSize,
  showLabel,
  onSelect,
  onHover,
  onLeave,
}: {
  node: LayoutNode
  scale: number
  selected: boolean
  hovered: boolean
  muted: boolean
  connectionCount: number
  nodeSize: number
  showLabel: boolean
  onSelect: () => void
  onHover: () => void
  onLeave: () => void
}) {
  const meta = TYPE_META[node.type]
  const radius = nodeRadius(node, connectionCount, nodeSize)
  const labelOffset = radius + 9
  const labelScale = clamp(1 / scale, 0.78, 1.55)
  const drift = nodeDrift(node.id)
  return (
    <g
      transform={`translate(${node.x} ${node.y})`}
      className="cursor-pointer"
      data-graph-node="true"
      data-node-id={node.id}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation()
        onSelect()
      }}
      onPointerEnter={onHover}
      onPointerLeave={onLeave}
    >
      <g>
        <animateTransform
          attributeName="transform"
          type="translate"
          values={`0 0; ${drift.x} ${drift.y}; 0 0`}
          dur={`${drift.duration}s`}
          repeatCount="indefinite"
          additive="sum"
        />
        {(selected || hovered) && <circle r={radius + 14} fill="url(#node-glow)" opacity="0.9" />}
        <circle
          r={radius}
          fill={node.type === "corpus" ? meta.color : "var(--surface)"}
          stroke={meta.color}
          strokeWidth={selected ? 2.8 : hovered ? 2.2 : 1.25}
          opacity={muted ? 0.2 : 1}
          vectorEffect="non-scaling-stroke"
        />
        {node.type !== "corpus" && (
          <circle r={Math.max(2.5, radius * 0.32)} fill={meta.color} opacity={muted ? 0.22 : 0.92} />
        )}
        {showLabel && (
          <g transform={`translate(${labelOffset} ${-labelOffset * 0.5}) scale(${labelScale})`} opacity={muted ? 0.22 : 1}>
            <rect
              x="0"
              y="-13"
              width={Math.min(230, Math.max(58, node.label.length * 6.4 + 18))}
              height="24"
              fill="rgba(10,10,12,0.86)"
              stroke="rgba(244,244,232,0.11)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
            <text x="9" y="3" fill="var(--cream)" fontSize="11" fontFamily="var(--font-mono)" fontWeight="700">
              {trimLabel(node.label, 30)}
            </text>
          </g>
        )}
      </g>
    </g>
  )
}

function Inspector({
  node,
  connections,
  graph,
  onFocus,
  onClear,
}: {
  node: LayoutNode | null
  connections: FocusConnection[]
  graph: ResearchKnowledgeGraph
  onFocus: () => void
  onClear: () => void
}) {
  if (!node) {
    return (
      <div>
        <div className="mb-4 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--lime)]">
          <Filter size={13} />
          Inspector
        </div>
        <div className="border border-[var(--border-soft)] bg-[var(--surface)] p-4">
          <p className="text-[13px] leading-[1.6] text-[var(--fg2)]">
            As linhas aparecem quando ajudam a explicar uma decisão. Selecione uma pesquisa ou bench para ver o motivo de cada conexão.
          </p>
        </div>
        <StatsPanel graph={graph} />
      </div>
    )
  }

  const meta = TYPE_META[node.type]
  const originHref = node.type === "research" && node.slug
    ? `/observatory/research?slug=${encodeURIComponent(node.slug)}`
    : node.type === "bench" && node.slug
      ? `/observatory/bench?slug=${encodeURIComponent(node.slug)}`
      : null

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--lime)]">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: meta.color }} />
          {meta.label}
        </div>
        <button type="button" onClick={onClear} aria-label="Limpar seleção" className="text-[var(--fg3)] hover:text-[var(--cream)]">
          <X size={15} />
        </button>
      </div>

      <section className="border border-[var(--border-soft)] bg-[var(--surface)] p-4">
        <h2 className="text-[18px] font-black leading-[1.15] tracking-normal">{node.label}</h2>
        <p className="mt-2 break-words font-mono text-[11px] leading-[1.5] text-[var(--fg3)]">{node.subtitle}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <InfoCell label="Grupo" value={node.group} />
          <InfoCell label="Status" value={node.status ?? "n/a"} />
          <InfoCell label="Data" value={node.date ?? "n/a"} />
          <InfoCell label="Itens" value={String(node.count ?? 0)} />
        </div>
        {originHref && (
          <a
            href={originHref}
            className="mt-4 inline-flex h-8 items-center justify-center gap-2 bg-[var(--lime)] px-3 font-mono text-[10px] font-black uppercase tracking-[0.14em] text-[var(--dark)] hover:opacity-90"
          >
            <Eye size={13} />
            Abrir origem
          </a>
        )}
      </section>

      {node.metrics && Object.keys(node.metrics).length > 0 && (
        <section className="mt-3 border border-[var(--border-soft)] bg-[var(--surface)] p-4">
          <h3 className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--fg3)]">Métricas</h3>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(node.metrics).map(([key, value]) => (
              <InfoCell key={key} label={key} value={String(value)} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-3 border border-[var(--border-soft)] bg-[var(--surface)] p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--fg3)]">Por que conecta</h3>
          <button
            type="button"
            onClick={onFocus}
            className="inline-flex h-7 items-center gap-1.5 border border-[var(--border)] px-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--cream)] hover:border-[var(--lime-25)]"
          >
            <Crosshair size={12} />
            Local
          </button>
        </div>
        <div className="flex flex-col gap-1.5">
          {connections.length === 0 ? (
            <p className="text-[12px] leading-[1.5] text-[var(--fg3)]">
              Este nó orienta o território. Para utilidade decisória, selecione uma pesquisa ou bench.
            </p>
          ) : (
            connections.map((connection) => <ConnectionRow key={connection.edge.id} connection={connection} />)
          )}
        </div>
      </section>

      <StatsPanel graph={graph} />
    </div>
  )
}

function StatsPanel({ graph }: { graph: ResearchKnowledgeGraph }) {
  return (
    <section className="mt-3 border border-[var(--border-soft)] bg-[var(--surface)] p-4">
      <h3 className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--fg3)]">Cobertura</h3>
      <div className="grid grid-cols-2 gap-2">
        <InfoCell label="Research" value={String(graph.stats.researchRuns)} />
        <InfoCell label="Bench" value={String(graph.stats.benchRuns)} />
        <InfoCell label="Formal" value={String(graph.stats.formalEdges)} />
        <InfoCell label="Seed" value={String(graph.stats.seedEdges)} />
        <InfoCell label="Manual" value={String(graph.stats.manualEdges)} />
        <InfoCell label="Inferidas" value={String(graph.stats.inferredEdges)} />
        <InfoCell label="Players" value={String(graph.stats.players)} />
      </div>
    </section>
  )
}

function ConnectionRow({ connection }: { connection: FocusConnection }) {
  const meta = EDGE_META[connection.edge.kind]
  return (
    <div className="border border-[var(--border-soft)] bg-[rgba(244,244,232,0.018)] px-2.5 py-2">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: TYPE_META[connection.node.type].color }} />
        <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-[var(--cream)]">{connection.node.label}</span>
        <span className="font-mono text-[9px] uppercase tracking-[0.12em]" style={{ color: meta.color }}>
          {meta.label}
        </span>
        {connection.edge.manual && (
          <span className="border border-[var(--border-soft)] px-1.5 font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--fg3)]">
            Manual
          </span>
        )}
      </div>
      <p className="mt-1 text-[11px] leading-[1.45] text-[var(--fg3)]">{connection.usefulness}</p>
      <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--fg-dim)]">{connection.edge.label}</p>
      {connection.edge.evidence && (
        <p className="mt-1 truncate font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--fg-dim)]">
          {connection.edge.evidence}
        </p>
      )}
    </div>
  )
}

function MiniMap({ nodes, selectedId }: { nodes: LayoutNode[]; selectedId: string | null }) {
  const box = boundsFor(nodes)
  const w = 184
  const h = 92
  const sx = w / Math.max(1, box.width + 140)
  const sy = h / Math.max(1, box.height + 120)
  const s = Math.min(sx, sy)
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block bg-[rgba(244,244,232,0.025)]">
      {nodes.map((node) => (
        <circle
          key={node.id}
          cx={w / 2 + (node.x - box.cx) * s}
          cy={h / 2 + (node.y - box.cy) * s}
          r={selectedId === node.id ? 3.2 : 1.8}
          fill={TYPE_META[node.type].color}
          opacity={selectedId === node.id ? 1 : 0.62}
        />
      ))}
    </svg>
  )
}

function EdgeLegend() {
  return (
    <div className="pointer-events-none absolute bottom-4 right-4 hidden border border-[var(--border)] bg-[rgba(10,10,12,0.9)] p-3 xl:block">
      <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--fg3)]">Relações</div>
      <div className="grid gap-2">
        {EDGE_ORDER.map((kind) => (
          <div key={kind} className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--fg2)]">
            <span
              className="h-px w-8"
              style={{
                background: EDGE_META[kind].color,
                borderTop: EDGE_META[kind].dash ? `1px dashed ${EDGE_META[kind].color}` : undefined,
              }}
            />
            {EDGE_META[kind].label}
          </div>
        ))}
      </div>
    </div>
  )
}

function TerritoryLabels() {
  return (
    <g opacity="0.78" pointerEvents="none">
      <TerritoryLabel x={-890} y={-430} label="Pesquisas" color={TYPE_META.research.color} />
      <TerritoryLabel x={-240} y={-690} label="Tópicos" color={TYPE_META.topic.color} />
      <TerritoryLabel x={420} y={-430} label="Benches" color={TYPE_META.bench.color} />
      <TerritoryLabel x={-250} y={230} label="Artefatos" color={TYPE_META.artifact.color} />
    </g>
  )
}

function TerritoryLabel({ x, y, label, color }: { x: number; y: number; label: string; color: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="0" y="-18" width={label.length * 9 + 34} height="34" fill="rgba(10,10,12,0.58)" stroke="rgba(244,244,232,0.08)" />
      <circle cx="14" cy="-1" r="3.5" fill={color} />
      <text x="27" y="3" fill="var(--fg3)" fontFamily="var(--font-mono)" fontSize="11" fontWeight="800" letterSpacing="0.16em">
        {label.toUpperCase()}
      </text>
    </g>
  )
}

function ControlGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mb-4">
      <div className="mb-2 flex items-center gap-2 border-b border-[var(--border-soft)] pb-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--fg3)]">
        <span className="h-2.5 w-px bg-[var(--lime)]" />
        {label}
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  )
}

function LensButton({
  active,
  disabled,
  label,
  summary,
  onClick,
}: {
  active: boolean
  disabled?: boolean
  label: string
  summary: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={summary}
      className={cn(
        "h-9 border px-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-35",
        active
          ? "border-[var(--lime-25)] bg-[var(--lime-10)] text-[var(--lime)]"
          : "border-[var(--border-soft)] bg-[rgba(244,244,232,0.018)] text-[var(--fg3)] hover:border-[var(--border-strong)] hover:text-[var(--cream)]",
      )}
    >
      <span className="block truncate font-mono text-[10px] font-black uppercase tracking-[0.13em]">{label}</span>
    </button>
  )
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r border-[var(--border-soft)] px-2.5 py-2 last:border-r-0">
      <div className="font-mono text-[8px] uppercase tracking-[0.14em] text-[var(--fg-dim)]">{label}</div>
      <div className="mt-1 text-[15px] font-black leading-none text-[var(--cream)]">{value}</div>
    </div>
  )
}

function CollapsedGraphRail({ onExpand }: { onExpand: () => void }) {
  return (
    <div className="flex h-full min-h-[220px] flex-col items-center gap-3">
      <button
        type="button"
        title="Expandir painel esquerdo"
        aria-label="Expandir painel esquerdo"
        aria-expanded="false"
        onClick={onExpand}
        className="inline-flex h-8 w-8 items-center justify-center border border-[var(--border)] text-[var(--fg2)] hover:border-[var(--lime-25)] hover:text-[var(--lime)]"
      >
        <PanelLeftOpen size={15} />
      </button>
      <div className="h-px w-6 bg-[var(--border-soft)]" />
      <div
        className="select-none font-mono text-[9px] font-black uppercase tracking-[0.18em] text-[var(--lime)]"
        style={{ writingMode: "vertical-rl" }}
      >
        Mapa
      </div>
    </div>
  )
}

function ToggleButton({
  active,
  swatch,
  onClick,
  children,
}: {
  active: boolean
  swatch: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-8 items-center gap-2 border px-2 text-left font-mono text-[10px] font-bold uppercase tracking-[0.1em]",
        active
          ? "border-[var(--border-strong)] text-[var(--cream)]"
          : "border-[var(--border-soft)] text-[var(--fg-dim)] opacity-65",
      )}
    >
      <span className="h-2 w-2 rounded-full" style={{ background: swatch }} />
      <span className="min-w-0 truncate">{children}</span>
    </button>
  )
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  suffix = "",
  disabled,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  suffix?: string
  disabled?: boolean
  onChange: (value: number) => void
}) {
  const pct = ((value - min) / (max - min)) * 100
  const rangeStyle = {
    "--range-fill": `${pct}%`,
    accentColor: "var(--lime)",
  } as CSSProperties
  return (
    <label className={cn("block", disabled && "opacity-45")}>
      <span className="mb-1 flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--fg3)]">
        <span>{label}</span>
        <b className="text-[var(--cream)]">{value}{suffix}</b>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-4 w-full"
        style={rangeStyle}
      />
    </label>
  )
}

function IconButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center border border-[var(--border)] bg-[rgba(10,10,12,0.84)] text-[var(--fg2)] hover:border-[var(--lime-25)] hover:text-[var(--lime)] disabled:cursor-not-allowed disabled:opacity-35",
        active && "border-[var(--lime-25)] text-[var(--lime)]",
      )}
    >
      {children}
    </button>
  )
}

function StatusChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex h-7 items-center gap-2 border border-[var(--border)] bg-[rgba(10,10,12,0.82)] px-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--fg2)]">
      {icon}
      {label}
    </span>
  )
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[var(--border-soft)] bg-[rgba(244,244,232,0.018)] px-2.5 py-2">
      <div className="font-mono text-[9px] uppercase tracking-[0.13em] text-[var(--fg-dim)]">{label}</div>
      <div className="mt-1 truncate text-[12px] font-semibold text-[var(--cream)]">{value}</div>
    </div>
  )
}

function layoutNodes(nodes: ResearchGraphNode[]): LayoutNode[] {
  const buckets = new Map<ResearchGraphNodeType, ResearchGraphNode[]>()
  for (const node of nodes) {
    const bucket = buckets.get(node.type) ?? []
    bucket.push(node)
    buckets.set(node.type, bucket)
  }

  const placed: LayoutNode[] = []
  placeGrid(placed, buckets.get("corpus") ?? [], { x: 0, y: 0 }, 2, 220, 90)
  placeGrid(placed, buckets.get("topic") ?? [], { x: 0, y: -360 }, 4, 176, 78)
  placeGrid(placed, buckets.get("artifact") ?? [], { x: 0, y: 350 }, 5, 158, 72)
  placeGrid(placed, buckets.get("research") ?? [], { x: -560, y: 0 }, 6, 132, 58)
  placeGrid(placed, buckets.get("bench") ?? [], { x: 510, y: -20 }, 4, 168, 68)
  placeGrid(placed, buckets.get("player") ?? [], { x: 850, y: 250 }, 4, 148, 50)
  return placed
}

function placeGrid(
  placed: LayoutNode[],
  nodes: ResearchGraphNode[],
  center: { x: number; y: number },
  columns: number,
  gapX: number,
  gapY: number,
) {
  const sorted = [...nodes].sort((a, b) => {
    const countDelta = (b.count ?? 0) - (a.count ?? 0)
    return countDelta !== 0 ? countDelta : a.label.localeCompare(b.label)
  })
  const rows = Math.ceil(sorted.length / columns)
  sorted.forEach((node, index) => {
    const col = index % columns
    const row = Math.floor(index / columns)
    const jitter = deterministicOffset(node.id)
    placed.push({
      ...node,
      x: center.x + (col - (columns - 1) / 2) * gapX + jitter.x,
      y: center.y + (row - (rows - 1) / 2) * gapY + jitter.y,
    })
  })
}

function deterministicOffset(id: string) {
  let hash = 0
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) % 9973
  }
  return {
    x: ((hash % 17) - 8) * 1.8,
    y: (((hash >> 3) % 13) - 6) * 1.8,
  }
}

function buildAdjacency(edges: ResearchGraphEdge[]) {
  const map = new Map<string, Set<string>>()
  for (const edge of edges) {
    const a = map.get(edge.source) ?? new Set<string>()
    const b = map.get(edge.target) ?? new Set<string>()
    a.add(edge.target)
    b.add(edge.source)
    map.set(edge.source, a)
    map.set(edge.target, b)
  }
  return map
}

function neighborhood(adjacency: Map<string, Set<string>>, start: string, depth: number) {
  const visited = new Set([start])
  let frontier = [start]
  for (let level = 0; level < depth; level += 1) {
    const next: string[] = []
    for (const id of frontier) {
      for (const neighbor of adjacency.get(id) ?? []) {
        if (visited.has(neighbor)) continue
        visited.add(neighbor)
        next.push(neighbor)
      }
    }
    frontier = next
  }
  return visited
}

function boundsFor(nodes: LayoutNode[]) {
  if (nodes.length === 0) return { minX: -1, maxX: 1, minY: -1, maxY: 1, width: 2, height: 2, cx: 0, cy: 0 }
  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  for (const node of nodes) {
    minX = Math.min(minX, node.x)
    maxX = Math.max(maxX, node.x)
    minY = Math.min(minY, node.y)
    maxY = Math.max(maxY, node.y)
  }
  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
  }
}

function isRunNode(node: Pick<ResearchGraphNode, "type">) {
  return node.type === "research" || node.type === "bench"
}

function isDecisionEdge(edge: ResearchGraphEdge, source: ResearchGraphNode, target: ResearchGraphNode) {
  if (!isRunNode(source) || !isRunNode(target)) return false
  if (edge.manual && edge.strength >= 0.62) return true
  return edge.kind === "formal" || edge.kind === "seed" || edge.relation === "references" || edge.relation === "example_link"
}

function isInsightConnection(edge: ResearchGraphEdge, selected: ResearchGraphNode, neighbor: ResearchGraphNode) {
  if (selected.type === "corpus" && edge.kind === "structural") return false
  if (isRunNode(selected)) return edge.kind !== "structural"
  if (neighbor.type === "corpus") return false
  return edge.kind !== "structural" || edge.relation === "about" || edge.relation === "evaluates"
}

function edgePriority(edge: ResearchGraphEdge) {
  const kindWeight: Record<ResearchGraphEdgeKind, number> = {
    formal: 40,
    seed: 30,
    inferred: 20,
    structural: 5,
  }
  const relationWeight: Record<string, number> = {
    contradicts: 38,
    fills_gap: 36,
    supports: 34,
    uses_artifact: 32,
    references: 30,
    extends: 28,
    compares: 24,
    same_decision_area: 14,
    topic_overlap: 18,
  }
  return kindWeight[edge.kind] + (relationWeight[edge.relation] ?? 0) + (edge.manual ? 14 : 0) + edge.strength * 10
}

function describeEdgeUsefulness(edge: ResearchGraphEdge) {
  if (edge.whyUseful) return edge.whyUseful
  if (edge.why) return edge.why
  if (edge.relation === "references") return "Referência direta detectada em grafo ou metadata. Útil para rastrear linhagem real entre runs."
  if (edge.relation === "supports") return "Conexão de suporte. Útil para ver qual pesquisa sustenta qual bench ou decisão."
  if (edge.relation === "uses_artifact") return "O run consome evidência de outro run ou artefato. Útil para auditar a base da decisão."
  if (edge.relation === "extends") return "Um run aprofunda o outro. Útil para separar pesquisa-base de aprofundamento posterior."
  if (edge.relation === "contradicts") return "Relação de tensão explícita. Útil para evitar tratar dois verdicts divergentes como equivalentes."
  if (edge.relation === "fills_gap") return "Um run fecha ou corrige lacuna aberta por outro. Útil para priorizar follow-up real."
  if (edge.relation === "same_decision_area") return "Conexão temática forte, marcada como inferida. Útil para descoberta, não para auditoria formal sozinha."
  if (edge.relation === "topic_overlap") return "Hipótese por sobreposição de tópicos e tokens. Útil para encontrar pesquisas que podem sustentar ou pedir bench."
  if (edge.relation === "example_link") return "Exemplo seed, criado para visualizar como a relação formal deveria aparecer quando for materializada."
  if (edge.relation === "about") return "Classificação temática. Útil para navegar por território, não para tomar decisão sozinha."
  if (edge.relation === "evaluates") return "Bench avaliou este player. Útil para entender quem foi comparado e onde há evidência competitiva."
  if (edge.relation === "has_artifact") return "Compartilha tipo de artefato. Útil para verificar maturidade e render tier do run."
  if (edge.relation === "contains") return "Relação estrutural de corpus. Útil para orientação, não representa evidência."
  if (edge.kind === "formal") return "Conexão formal, já materializada no corpus."
  if (edge.kind === "inferred") return "Conexão inferida, boa para descoberta mas ainda pede validação."
  if (edge.kind === "seed") return "Conexão exemplo, útil apenas para demonstrar o modelo visual."
  return "Conexão estrutural, usada para organizar o mapa."
}

function nodeDrift(id: string) {
  let hash = 0
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 33 + id.charCodeAt(index)) % 7919
  }
  return {
    x: ((hash % 9) - 4) * 0.9,
    y: (((hash >> 2) % 9) - 4) * 0.9,
    duration: 5.5 + (hash % 7) * 0.45,
  }
}

function nodeRadius(node: ResearchGraphNode, connections: number, nodeSize: number) {
  const base: Record<ResearchGraphNodeType, number> = {
    corpus: 18,
    research: 7.5,
    bench: 9,
    topic: 10,
    artifact: 8,
    player: 6.5,
  }
  return (base[node.type] + Math.min(7, Math.sqrt(Math.max(0, connections)))) * (nodeSize / 100)
}

function shouldShowLabel(node: ResearchGraphNode, density: number, active: boolean, query: string) {
  if (active) return true
  if (query.trim()) return true
  if (node.type === "corpus" || node.type === "topic") return density >= 10
  if (node.type === "bench") return density >= 45
  if (node.type === "research") return density >= 62
  if (node.type === "artifact") return density >= 56
  return density >= 82
}

function trimLabel(label: string, max: number) {
  if (label.length <= max) return label
  return `${label.slice(0, max - 1)}…`
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
