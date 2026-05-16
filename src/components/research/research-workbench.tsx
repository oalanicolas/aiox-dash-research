"use client"

import { useEffect, useMemo, useState, type CSSProperties, type KeyboardEvent } from "react"
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Circle,
  ExternalLink,
  FileText,
  Loader2,
  Play,
  Radar,
  RefreshCcw,
  Search,
  Settings,
  Terminal,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  normalizeResearchRunRequest,
  RESEARCH_METHODS,
  slugifyResearchTopic,
  type ResearchByokConfig,
  type ResearchCliDiscovery,
  type ResearchCliId,
  type ResearchCliStatus,
  type ResearchMethodId,
  type ResearchRunRequest,
  type ResearchRunState,
} from "@/lib/research-workbench-contract"
import { DISPLAY_FONT, MONO_FONT, SANS_FONT } from "@/components/observatory/foundations/theme"

type ResearchWorkbenchProps = {
  initialDiscovery: ResearchCliDiscovery
  initialRunIds?: string[]
  initialConsolidationRunId?: string | null
}

const DEPTH_OPTIONS = [
  { id: "standard", label: "Padrão", description: "Pesquisa objetiva com artefatos suficientes para o AIOX Research." },
  { id: "deep", label: "Profunda", description: "Força mais ondas, mais fontes e matriz de evidências." },
] as const

type ResearchExecutionMode = "local" | "byok"

const BYOK_STORAGE_KEY = "aiox-research:research-byok"
const RUNTIME_STEP_TOTAL = 7

const DEFAULT_BYOK_CONFIG: ResearchByokConfig = {
  providerLabel: "OpenAI compatible",
  baseUrl: "https://api.openai.com/v1",
  apiKey: "",
  model: "gpt-4o",
}

const BYOK_PROVIDER_PRESETS = [
  { label: "OpenAI", baseUrl: "https://api.openai.com/v1", model: "gpt-4o" },
  { label: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", model: "openai/gpt-4o" },
  { label: "DeepSeek", baseUrl: "https://api.deepseek.com", model: "deepseek-chat" },
  { label: "Groq", baseUrl: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile" },
] as const

const AIOX_RESEARCH_THEME = {
  "--paper": "#050505",
  "--paper-alt": "#0F0F11",
  "--paper-deep": "#0A0A0C",
  "--surface": "#0F0F11",
  "--surface-alt": "#1C1E19",
  "--surface-hover": "#1E1F22",
  "--surface-console": "#1A1C14",
  "--ink": "rgb(244, 244, 232)",
  "--ink-2": "rgba(244, 244, 232, 0.70)",
  "--ink-3": "rgba(244, 244, 232, 0.55)",
  "--ink-dim": "rgba(245, 244, 231, 0.40)",
  "--ink-faint": "rgba(245, 244, 231, 0.07)",
  "--rule": "rgba(156, 156, 156, 0.15)",
  "--rule-soft": "rgba(156, 156, 156, 0.10)",
  "--rule-strong": "rgba(156, 156, 156, 0.25)",
  "--lime-ink": "#D1FF00",
  "--blue-ink": "#0099FF",
  "--danger-ink": "#EF4444",
  "--warning-ink": "#F59E0B",
} as CSSProperties

export function ResearchWorkbench({
  initialDiscovery,
  initialRunIds = [],
  initialConsolidationRunId = null,
}: ResearchWorkbenchProps) {
  const router = useRouter()
  const [discovery, setDiscovery] = useState(initialDiscovery)
  const [query, setQuery] = useState("")
  const [methodId, setMethodId] = useState<ResearchMethodId>("landscape")
  const [depth, setDepth] = useState<ResearchRunRequest["depth"]>("standard")
  const [selectedCliIds, setSelectedCliIds] = useState<ResearchCliId[]>(() => [preferredCli(initialDiscovery.clis)?.id ?? "claude"])
  const [runs, setRuns] = useState<ResearchRunState[]>([])
  const [consolidationRun, setConsolidationRun] = useState<ResearchRunState | null>(null)
  const [focusedRunId, setFocusedRunId] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [isConsolidating, setIsConsolidating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [runtimePickerOpen, setRuntimePickerOpen] = useState(false)
  const [executionMode, setExecutionMode] = useState<ResearchExecutionMode>("local")
  const [byokConfig, setByokConfig] = useState<ResearchByokConfig>(DEFAULT_BYOK_CONFIG)

  const selectedClis = useMemo(
    () => selectedCliIds.map((cliId) => discovery.clis.find((cli) => cli.id === cliId)).filter((cli): cli is ResearchCliStatus => Boolean(cli)),
    [discovery.clis, selectedCliIds],
  )

  const baseOutputSlug = useMemo(() => slugifyResearchTopic(query), [query])
  const researchOutputSlug = useMemo(() => datedResearchSlug(baseOutputSlug), [baseOutputSlug])

  const normalizedRequests = useMemo(
    () =>
      executionMode === "byok"
        ? [
            normalizeResearchRunRequest({
              query,
              cliId: "byok",
              methodId,
              depth,
              outputSlug: researchOutputSlug,
              byok: byokConfig,
            }),
          ]
        : selectedCliIds.map((cliId) =>
            normalizeResearchRunRequest({
              query,
              cliId,
              methodId,
              depth,
              outputSlug: researchOutputSlug,
            }),
          ),
    [byokConfig, depth, executionMode, methodId, query, researchOutputSlug, selectedCliIds],
  )

  const runnableSelectedClis = selectedClis.filter((cli) => cli.available && cli.launchSupported)
  const byokReady = Boolean(byokConfig.apiKey.trim() && byokConfig.baseUrl.trim() && byokConfig.model.trim())
  const completedRuns = runs.filter((run) => run.status === "completed")
  const canConsolidate = completedRuns.length >= 2 && !isConsolidating && consolidationRun?.status !== "running"
  const initialRunIdsKey = initialRunIds.join(",")
  const hasUrlScopedSession = initialRunIds.length > 0 || Boolean(initialConsolidationRunId)
  const hasResearchSession = hasUrlScopedSession || runs.length > 0 || Boolean(consolidationRun)
  const canStart =
    !hasResearchSession &&
    query.trim().length >= 8 &&
    (executionMode === "byok" ? byokReady : runnableSelectedClis.length > 0)
  const activeStreamRunIdsKey = useMemo(() => {
    const runQueue = consolidationRun ? [...runs, consolidationRun] : runs
    return runQueue
      .filter((run) => run.status !== "completed" && run.status !== "failed")
      .map((run) => run.runId)
      .sort()
      .join(",")
  }, [consolidationRun, runs])

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(BYOK_STORAGE_KEY)
      if (!stored) return
      const parsed = JSON.parse(stored) as Partial<ResearchByokConfig>
      setByokConfig({
        providerLabel: typeof parsed.providerLabel === "string" ? parsed.providerLabel : DEFAULT_BYOK_CONFIG.providerLabel,
        baseUrl: typeof parsed.baseUrl === "string" ? parsed.baseUrl : DEFAULT_BYOK_CONFIG.baseUrl,
        apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey : "",
        model: typeof parsed.model === "string" ? parsed.model : DEFAULT_BYOK_CONFIG.model,
      })
    } catch {
      window.localStorage.removeItem(BYOK_STORAGE_KEY)
    }
  }, [])

  useEffect(() => {
    if (hasResearchSession) return
    window.localStorage.setItem(BYOK_STORAGE_KEY, JSON.stringify(byokConfig))
  }, [byokConfig, hasResearchSession])

  useEffect(() => {
    const runIds = uniqueIds(initialRunIds)
    const consolidationRunId = initialConsolidationRunId?.trim() || null
    if (runIds.length === 0 && !consolidationRunId) return

    let cancelled = false
    async function hydrateRunsFromUrl() {
      const [nextRuns, nextConsolidationRun] = await Promise.all([
        Promise.all(runIds.map(fetchRunState)),
        consolidationRunId ? fetchRunState(consolidationRunId) : Promise.resolve(null),
      ])

      if (cancelled) return
      const restoredRuns = nextRuns.filter((run): run is ResearchRunState => Boolean(run))
      const firstRun = restoredRuns[0] ?? nextConsolidationRun

      if (restoredRuns.length > 0) setRuns(restoredRuns)
      if (nextConsolidationRun) setConsolidationRun(nextConsolidationRun)
      if (firstRun) setFocusedRunId(firstRun.runId)
      if (firstRun) {
        setQuery(firstRun.query)
        setMethodId(firstRun.methodId)
        setSelectedCliIds(uniqueCliIds(restoredRuns.length > 0 ? restoredRuns.map((run) => run.cliId) : [firstRun.cliId]))
      }

      const missingCount = runIds.length - restoredRuns.length + (consolidationRunId && !nextConsolidationRun ? 1 : 0)
      setError(missingCount > 0 ? `${missingCount} execução(ões) da URL não foram encontradas.` : null)
    }

    void hydrateRunsFromUrl()
    return () => {
      cancelled = true
    }
  }, [initialConsolidationRunId, initialRunIdsKey])

  useEffect(() => {
    const visibleRuns = consolidationRun ? [...runs, consolidationRun] : runs
    if (visibleRuns.length === 0) {
      if (focusedRunId !== null) setFocusedRunId(null)
      return
    }
    if (focusedRunId && visibleRuns.some((run) => run.runId === focusedRunId)) return
    setFocusedRunId(visibleRuns[0]?.runId ?? null)
  }, [consolidationRun, focusedRunId, runs])

  useEffect(() => {
    const activeRunIds = activeStreamRunIdsKey.split(",").filter(Boolean)
    if (activeRunIds.length === 0) return

    const sources = activeRunIds.map((runId) => {
      const source = new EventSource(`/api/research/runs/${encodeURIComponent(runId)}/stream`)
      source.onmessage = (message) => {
        try {
          applyRunState(JSON.parse(message.data) as ResearchRunState)
        } catch {
          void refreshRun(runId)
        }
      }
      source.onerror = () => {
        source.close()
        void refreshRun(runId)
      }
      return source
    })

    return () => {
      sources.forEach((source) => source.close())
    }
  }, [activeStreamRunIdsKey])

  async function refreshClis() {
    setIsRefreshing(true)
    setError(null)
    try {
      const response = await fetch("/api/research/clis", { cache: "no-store" })
      if (!response.ok) throw new Error("Não foi possível detectar os CLIs.")
      const next = (await response.json()) as ResearchCliDiscovery
      setDiscovery(next)
      const nextPreferred = preferredCli(next.clis)
      if (nextPreferred && selectedCliIds.length === 0) setSelectedCliIds([nextPreferred.id])
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Falha ao detectar CLIs.")
    } finally {
      setIsRefreshing(false)
    }
  }

  async function startRuns() {
    setIsStarting(true)
    setError(null)
    setRuns([])
    setConsolidationRun(null)
    try {
      const runnableIds = new Set(runnableSelectedClis.map((cli) => cli.id))
      const requests =
        executionMode === "byok"
          ? normalizedRequests
          : normalizedRequests.filter((request) => runnableIds.has(request.cliId))
      const results = await Promise.allSettled(
        requests.map(async (request) => {
          const response = await fetch("/api/research/runs", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(request),
          })
          const body = (await response.json()) as ResearchRunState | { error?: string }
          if (!response.ok || "error" in body) {
            throw new Error("error" in body && body.error ? body.error : `Falha ao iniciar ${request.cliId}.`)
          }
          return body as ResearchRunState
        }),
      )
      const successfulRuns = results
        .filter((result): result is PromiseFulfilledResult<ResearchRunState> => result.status === "fulfilled")
        .map((result) => result.value)
      const failedMessages = results
        .filter((result): result is PromiseRejectedResult => result.status === "rejected")
        .map((result) => result.reason instanceof Error ? result.reason.message : "Falha ao iniciar uma pesquisa.")

      if (successfulRuns.length === 0) {
        throw new Error(failedMessages[0] ?? "Falha ao iniciar pesquisas.")
      }
      setRuns(successfulRuns)
      setFocusedRunId(successfulRuns[0]?.runId ?? null)
      syncResearchUrl(successfulRuns, null)
      if (failedMessages.length > 0) setError(failedMessages.join(" "))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Falha ao iniciar pesquisas.")
    } finally {
      setIsStarting(false)
    }
  }

  async function startConsolidationRun() {
    const consolidationCli = runnableSelectedClis[0] ?? discovery.clis.find((cli) => cli.available && cli.launchSupported)
    if (!consolidationCli) {
      setError("Nenhum CLI disponível para consolidar.")
      return
    }

    setIsConsolidating(true)
    setError(null)
    try {
      const response = await fetch("/api/research/consolidations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          query,
          cliId: consolidationCli.id,
          methodId,
          depth,
          sourceOutputSlugs: uniqueIds(completedRuns.map((run) => run.outputSlug)),
          sourceCliIds: completedRuns.map((run) => run.cliId),
          outputSlug: completedRuns[0]?.outputSlug ?? researchOutputSlug,
        }),
      })
      const body = (await response.json()) as ResearchRunState | { error?: string }
      if (!response.ok || "error" in body) {
        throw new Error("error" in body && body.error ? body.error : "Falha ao iniciar consolidação.")
      }
      const nextConsolidationRun = body as ResearchRunState
      setConsolidationRun(nextConsolidationRun)
      setFocusedRunId(nextConsolidationRun.runId)
      syncResearchUrl(runs, nextConsolidationRun)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Falha ao iniciar consolidação.")
    } finally {
      setIsConsolidating(false)
    }
  }

  async function refreshRun(runId: string) {
    const response = await fetch(`/api/research/runs/${encodeURIComponent(runId)}`, { cache: "no-store" })
    if (!response.ok) return
    const next = (await response.json()) as ResearchRunState
    applyRunState(next)
  }

  function applyRunState(next: ResearchRunState) {
    setRuns((current) => current.map((run) => (run.runId === next.runId ? next : run)))
    setConsolidationRun((current) => (current?.runId === next.runId ? next : current))
  }

  function submitResearch() {
    if (hasResearchSession || !canStart || isStarting) return
    void startRuns()
  }

  function syncResearchUrl(nextRuns: ResearchRunState[], nextConsolidationRun: ResearchRunState | null) {
    const params = new URLSearchParams()
    if (nextRuns.length > 0) params.set("runs", nextRuns.map((run) => run.runId).join(","))
    if (nextConsolidationRun) params.set("consolidation", nextConsolidationRun.runId)
    const queryString = params.toString()
    router.replace(queryString ? `/research?${queryString}` : "/research", { scroll: false })
  }

  function toggleCli(cliId: ResearchCliId) {
    setSelectedCliIds((current) => {
      if (current.includes(cliId)) {
        return current.length === 1 ? current : current.filter((selectedCliId) => selectedCliId !== cliId)
      }
      return [...current, cliId]
    })
  }

  function selectAllRunnableClis() {
    const runnableIds = discovery.clis
      .filter((cli) => cli.available && cli.launchSupported)
      .map((cli) => cli.id)
    if (runnableIds.length > 0) setSelectedCliIds(runnableIds)
  }

  function updateByokConfig(patch: Partial<ResearchByokConfig>) {
    setByokConfig((current) => ({ ...current, ...patch }))
  }

  function handlePromptKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return
    event.preventDefault()
    submitResearch()
  }

  return (
    <main
      className="min-h-screen overflow-x-hidden bg-[var(--paper)] text-[var(--ink)]"
      style={{ ...AIOX_RESEARCH_THEME, fontFamily: SANS_FONT }}
    >
      <header className="sticky top-0 z-50 border-b border-[var(--rule)] bg-[rgba(5,5,5,0.85)] backdrop-blur">
        <div className="mx-auto flex min-h-[60px] max-w-[1280px] flex-wrap items-center justify-between gap-3 px-5 py-2 lg:px-10 lg:py-0">
          <button
            type="button"
            onClick={() => router.push("/observatory/research")}
            className="flex min-w-0 items-center gap-4 text-left"
            title="Abrir Observatory"
          >
            <img src="/logo/AIOX-White.svg" alt="AIOX" className="h-[14px] w-auto shrink-0" />
            <span className="hidden h-4 w-px bg-[var(--rule)] sm:block" />
            <span
              className="hidden text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--ink)] sm:block"
              style={{ fontFamily: MONO_FONT }}
            >
              Open Research
            </span>
          </button>

          <div className="flex min-w-0 items-center gap-2">
            {hasResearchSession ? (
              <SessionRuntimeChip runs={runs} consolidationRun={consolidationRun} />
            ) : (
              <RuntimePicker
                clis={discovery.clis}
                selectedCliIds={selectedCliIds}
                mode={executionMode}
                byokConfig={byokConfig}
                open={runtimePickerOpen}
                onOpenChange={setRuntimePickerOpen}
                onModeChange={setExecutionMode}
                onToggle={toggleCli}
                onSelectAll={selectAllRunnableClis}
                onByokConfigChange={updateByokConfig}
              />
            )}
            <button
              type="button"
              onClick={refreshClis}
              className="grid h-10 w-10 place-items-center border border-[var(--rule)] text-[var(--ink-3)] transition-colors hover:border-[var(--lime-ink)] hover:text-[var(--ink)]"
              disabled={isRefreshing}
              title="Detectar CLIs"
            >
              <RefreshCcw size={14} className={cn(isRefreshing && "animate-spin")} />
            </button>
            <button
              type="button"
              onClick={() => router.push("/observatory/research")}
              className="grid h-10 w-10 place-items-center border border-[var(--rule)] text-[var(--ink-3)] transition-colors hover:border-[var(--lime-ink)] hover:text-[var(--ink)]"
              title="Abrir Observatory"
            >
              <ExternalLink size={14} />
            </button>
          </div>
        </div>
      </header>

      <section className="relative min-h-[calc(100vh-60px)] border-b border-[var(--rule)]">
        <div className="pointer-events-none absolute inset-0 grid grid-cols-4">
          <span className="border-l border-[var(--rule-soft)]" />
          <span className="border-l border-[var(--rule-soft)]" />
          <span className="border-l border-[var(--rule-soft)]" />
          <span className="border-x border-[var(--rule-soft)]" />
        </div>
        <div
          className="pointer-events-none absolute left-1/2 top-[23%] hidden -translate-x-1/2 select-none text-center text-[22vw] font-black uppercase leading-none text-[rgba(245,244,231,0.045)] lg:block"
          style={{ fontFamily: DISPLAY_FONT }}
        >
          AIOX
        </div>

        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-60px)] max-w-[1280px] flex-col px-5 py-14 lg:px-10 lg:py-20">
          <div className="mx-auto flex w-full max-w-[960px] flex-1 flex-col items-center justify-center text-center">
            <div
              className="mb-5 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em]"
              style={{ fontFamily: MONO_FONT }}
            >
              <span className="text-[var(--ink)]">[00]</span>
              <span className="text-[var(--lime-ink)]">Open Research · AIOX Research_</span>
            </div>

            <h1
              className="max-w-[940px] text-[42px] font-black uppercase leading-[0.96] tracking-normal text-[var(--ink)] sm:text-[64px] lg:text-[88px]"
              style={{ fontFamily: DISPLAY_FONT }}
            >
              {hasResearchSession ? (
                <>
                  Pesquisa em <span className="text-[var(--lime-ink)]">{sessionHeadline(runs, consolidationRun)}</span>
                </>
              ) : (
                <>
                  O que você quer <span className="text-[var(--lime-ink)]">pesquisar?</span>
                </>
              )}
            </h1>

            <div className="mt-9 w-full border border-[var(--rule-strong)] bg-[var(--surface)] text-left shadow-[0_28px_90px_rgba(0,0,0,0.42)]">
              <div className="grid border-b border-[var(--rule)] bg-[var(--paper-deep)] sm:grid-cols-[1fr_auto]">
                <div className="flex min-h-12 items-center gap-3 border-b border-[var(--rule)] px-4 sm:border-b-0 sm:border-r">
                  <Search size={16} className="text-[var(--lime-ink)]" />
                  <span
                    className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--ink-3)]"
                    style={{ fontFamily: MONO_FONT }}
                  >
                    [01] Research Prompt
                  </span>
                </div>
                <div
                  className="flex min-h-12 items-center px-4 text-[10px] uppercase tracking-[0.12em] text-[var(--ink-2)]"
                  style={{ fontFamily: MONO_FONT }}
                >
                  {methodId} · {depth}
                </div>
              </div>

              {hasResearchSession ? (
                <SessionPromptSummary
                  query={query}
                  runs={runs}
                  consolidationRun={consolidationRun}
                  methodId={methodId}
                  depth={depth}
                />
              ) : (
                <>
                  <textarea
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={handlePromptKeyDown}
                    placeholder="Pesquise um mercado, uma tecnologia, um concorrente, uma tese ou um conjunto de fontes..."
                    className="min-h-44 w-full resize-none border-0 bg-[var(--paper-deep)] px-5 py-5 text-[18px] leading-[1.55] text-[var(--ink)] outline-none placeholder:text-[var(--ink-dim)] focus:bg-[var(--surface-console)]"
                  />

                  <div className="grid gap-0 border-t border-[var(--rule)] bg-[var(--surface)] sm:grid-cols-[1fr_auto]">
                    <div
                      className="hidden min-h-14 items-center px-4 text-[10px] uppercase tracking-[0.12em] text-[var(--ink-dim)] sm:flex"
                      style={{ fontFamily: MONO_FONT }}
                    >
                      Enter para rodar em paralelo · Shift + Enter para nova linha
                    </div>
                    <button
                      type="button"
                      onClick={submitResearch}
                      disabled={!canStart || isStarting}
                      className={cn(
                        "inline-flex min-h-14 items-center justify-center gap-3 px-5 text-[10px] font-bold uppercase tracking-[0.12em] transition-colors sm:border-l sm:border-[var(--rule)]",
                        canStart
                          ? "bg-[var(--lime-ink)] text-black hover:brightness-95"
                          : "bg-[var(--ink-faint)] text-[var(--ink-dim)]",
                      )}
                      style={{ fontFamily: MONO_FONT }}
                    >
                      <Play size={15} fill="currentColor" />
                      {isStarting
                        ? "Executando"
                        : executionMode === "byok"
                          ? "Executar BYOK"
                          : `Executar ${runnableSelectedClis.length} runtime${runnableSelectedClis.length === 1 ? "" : "s"}`}
                    </button>
                  </div>
                </>
              )}
            </div>

            {error && (
              <p className="mt-4 flex max-w-[960px] gap-2 text-left text-[13px] leading-[1.45] text-[var(--danger-ink)]">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                {error}
              </p>
            )}

            {!hasResearchSession && (
              <>
                <div className="mt-5 grid w-full max-w-[960px] gap-[1px] bg-[var(--rule)] sm:grid-cols-2 lg:grid-cols-4">
                  {RESEARCH_METHODS.map((method) => {
                    const active = method.id === methodId
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setMethodId(method.id)}
                        className={cn(
                          "inline-flex min-h-12 items-center justify-center gap-2 bg-[var(--paper-alt)] px-4 text-[12px] transition-colors",
                          active
                            ? "text-[var(--lime-ink)]"
                            : "text-[var(--ink-3)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)]",
                        )}
                        title={method.description}
                      >
                        <Radar size={14} />
                        {method.label}
                      </button>
                    )
                  })}
                </div>

                <div className="mt-[1px] grid w-full max-w-[960px] gap-[1px] bg-[var(--rule)] sm:grid-cols-2">
                  {DEPTH_OPTIONS.map((option) => {
                    const active = depth === option.id
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setDepth(option.id)}
                        className={cn(
                          "min-h-11 bg-[var(--paper-alt)] px-4 text-[10px] font-bold uppercase tracking-[0.12em] transition-colors",
                          active
                            ? "text-[var(--lime-ink)]"
                            : "text-[var(--ink-3)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)]",
                        )}
                        style={{ fontFamily: MONO_FONT }}
                        title={option.description}
                      >
                        {option.label}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          <div className="mx-auto mt-14 w-full max-w-[960px] border border-[var(--rule)] bg-[var(--surface)]">
            <section className="min-w-0">
              <div className="border-b border-[var(--rule)] px-5 py-4">
                <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--ink-3)]" style={{ fontFamily: MONO_FONT }}>
                  [02] Execução
                </p>
              </div>
              <div className="p-5">
                {runs.length > 0 || consolidationRun ? (
                  <BatchStatus
                    runs={runs}
                    consolidationRun={consolidationRun}
                    focusedRunId={focusedRunId}
                    canConsolidate={canConsolidate}
                    isConsolidating={isConsolidating}
                    onConsolidate={() => void startConsolidationRun()}
                    onFocus={setFocusedRunId}
                    onOpen={(run) => router.push(`/observatory/research?slug=${encodeURIComponent(run.outputSlug)}`)}
                  />
                ) : hasUrlScopedSession ? (
                  <div className="grid min-h-40 place-items-center border border-dashed border-[var(--rule)] bg-[var(--paper-deep)] p-5 text-center">
                    <div>
                      <RefreshCcw className="mx-auto mb-3 animate-spin text-[var(--lime-ink)]" size={22} />
                      <p className="text-[14px] font-semibold">Restaurando execução</p>
                      <p className="mt-1 text-[12px] leading-[1.45] text-[var(--ink-2)]">
                        Buscando o estado salvo dos runs informados nesta URL.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid min-h-40 place-items-center border border-dashed border-[var(--rule)] bg-[var(--paper-deep)] p-5 text-center">
                    <div>
                      <FileText className="mx-auto mb-3 text-[var(--ink-3)]" size={22} />
                      <p className="text-[14px] font-semibold">O resultado aparecerá aqui</p>
                      <p className="mt-1 text-[12px] leading-[1.45] text-[var(--ink-2)]">
                        A pesquisa será salva em `docs/research/` e poderá ser aberta no Observatory.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  )
}

function RuntimePicker({
  clis,
  selectedCliIds,
  mode,
  byokConfig,
  open,
  onOpenChange,
  onModeChange,
  onToggle,
  onSelectAll,
  onByokConfigChange,
}: {
  clis: ResearchCliStatus[]
  selectedCliIds: ResearchCliId[]
  mode: ResearchExecutionMode
  byokConfig: ResearchByokConfig
  open: boolean
  onOpenChange: (open: boolean) => void
  onModeChange: (mode: ResearchExecutionMode) => void
  onToggle: (cliId: ResearchCliId) => void
  onSelectAll: () => void
  onByokConfigChange: (patch: Partial<ResearchByokConfig>) => void
}) {
  const selectedRunnableCount = clis.filter((cli) => selectedCliIds.includes(cli.id) && cli.available && cli.launchSupported).length
  const label = mode === "byok" ? "BYOK" : selectedRunnableCount === 1 ? "1 CLI" : `${selectedRunnableCount} CLIs`
  const scope = mode === "byok" ? byokConfig.model || "modelo" : "paralelo"
  const modeReady = mode === "byok" ? Boolean(byokConfig.apiKey && byokConfig.baseUrl && byokConfig.model) : selectedRunnableCount > 0

  return (
    <div className="relative min-w-0">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className={cn(
          "inline-flex h-10 max-w-[min(520px,calc(100vw-2rem))] items-center gap-2 border px-3 text-[12px] transition-colors",
          open
            ? "border-[var(--lime-ink)] bg-[rgba(209,255,0,0.10)] text-[var(--ink)]"
            : "border-[var(--rule-strong)] bg-[var(--surface)] text-[var(--ink-2)] hover:border-[var(--lime-ink)] hover:text-[var(--ink)]",
        )}
        aria-expanded={open}
      >
        <span className={cn(
          "grid h-6 w-6 shrink-0 place-items-center border",
          modeReady
            ? "border-[var(--lime-ink)] bg-[var(--lime-ink)] text-black"
            : "border-[var(--rule)] bg-[var(--ink-faint)] text-[var(--ink-3)]",
        )}>
          <Terminal size={15} strokeWidth={2} />
        </span>
        <span
          className="hidden whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.12em] sm:inline"
          style={{ fontFamily: MONO_FONT }}
        >
          {mode === "byok" ? "API" : "Local CLI"}
        </span>
        <span className="hidden text-[var(--ink-dim)] sm:inline">·</span>
        <span className="truncate font-semibold text-[var(--ink)]">{label}</span>
        <span className="hidden text-[var(--ink-dim)] md:inline">·</span>
        <span className="hidden max-w-[160px] truncate whitespace-nowrap text-[var(--ink-3)] md:inline">{scope}</span>
        <ChevronDown size={16} className={cn("shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(640px,calc(100vw-2rem))] border border-[var(--rule-strong)] bg-[var(--surface)] shadow-[0_24px_70px_rgba(0,0,0,0.62)]">
          <div className="border-b border-[var(--rule)] px-5 py-4">
            <div className="grid gap-[1px] bg-[var(--rule)] p-[1px] sm:grid-cols-2">
              <button
                type="button"
                onClick={() => onModeChange("local")}
                className={cn(
                  "min-h-11 bg-[var(--paper-deep)] px-4 text-[10px] font-bold uppercase tracking-[0.12em] transition-colors",
                  mode === "local" ? "text-[var(--lime-ink)]" : "text-[var(--ink-3)] hover:text-[var(--ink)]",
                )}
                style={{ fontFamily: MONO_FONT }}
              >
                Local CLI
              </button>
              <button
                type="button"
                onClick={() => onModeChange("byok")}
                className={cn(
                  "min-h-11 bg-[var(--paper-deep)] px-4 text-[10px] font-bold uppercase tracking-[0.12em] transition-colors",
                  mode === "byok" ? "text-[var(--lime-ink)]" : "text-[var(--ink-3)] hover:text-[var(--ink)]",
                )}
                style={{ fontFamily: MONO_FONT }}
              >
                BYOK
              </button>
            </div>

            {mode === "local" ? (
              <>
                <div className="mt-4 flex items-center justify-between gap-4">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--ink-3)]" style={{ fontFamily: MONO_FONT }}>
                    Runtimes paralelos
                  </p>
                  <button
                    type="button"
                    onClick={onSelectAll}
                    className="text-[10px] uppercase tracking-[0.12em] text-[var(--ink-3)] transition-colors hover:text-[var(--lime-ink)]"
                    style={{ fontFamily: MONO_FONT }}
                  >
                    Todos prontos
                  </button>
                </div>
                <div className="mt-3 grid gap-[1px] bg-[var(--rule)] sm:grid-cols-2">
                  {clis.map((cli) => {
                    const active = selectedCliIds.includes(cli.id)
                    const enabled = cli.available && cli.launchSupported
                    return (
                      <button
                        key={cli.id}
                        type="button"
                        onClick={() => {
                          if (!enabled) return
                          onToggle(cli.id)
                        }}
                        disabled={!enabled}
                        className={cn(
                          "flex min-h-16 items-center gap-3 bg-[var(--paper-deep)] px-4 text-left transition-colors",
                          active && "bg-[rgba(209,255,0,0.10)] text-[var(--ink)]",
                          !active && enabled && "text-[var(--ink-2)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)]",
                          !enabled && "text-[var(--ink-dim)] opacity-60",
                        )}
                      >
                        <span className={cn(
                          "grid h-9 w-9 shrink-0 place-items-center border text-[12px] font-black uppercase",
                          active
                            ? "border-[var(--lime-ink)] bg-[var(--lime-ink)] text-black"
                            : "border-[var(--rule)] bg-[var(--paper)] text-[var(--ink-2)]",
                        )}>
                          {active ? "ON" : agentInitial(cli.name)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[15px] font-semibold">{cli.name}</span>
                          <span className="mt-0.5 block truncate text-[11px] text-[var(--ink-3)]">
                            {enabled ? "Pronto para executar" : cli.available ? "Detectado sem launcher" : "Não detectado"}
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </>
            ) : (
              <ByokPanel config={byokConfig} onChange={onByokConfigChange} />
            )}
          </div>

          <button
            type="button"
            disabled
            className="inline-flex min-h-12 w-full items-center gap-3 px-5 text-left text-[12px] text-[var(--ink-dim)]"
          >
            <Settings size={17} />
            {mode === "byok" ? "BYOK · chave armazenada apenas neste navegador" : "Execução local · modelos definidos por cada CLI"}
          </button>
        </div>
      )}
    </div>
  )
}

function ByokPanel({
  config,
  onChange,
}: {
  config: ResearchByokConfig
  onChange: (patch: Partial<ResearchByokConfig>) => void
}) {
  return (
    <div className="mt-4 grid gap-4">
      <div className="grid gap-[1px] bg-[var(--rule)] sm:grid-cols-4">
        {BYOK_PROVIDER_PRESETS.map((preset) => {
          const active = config.baseUrl === preset.baseUrl
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() =>
                onChange({
                  providerLabel: preset.label,
                  baseUrl: preset.baseUrl,
                  model: preset.model,
                })
              }
              className={cn(
                "min-h-10 bg-[var(--paper-deep)] px-3 text-[10px] font-bold uppercase tracking-[0.10em] transition-colors",
                active ? "text-[var(--lime-ink)]" : "text-[var(--ink-3)] hover:text-[var(--ink)]",
              )}
              style={{ fontFamily: MONO_FONT }}
            >
              {preset.label}
            </button>
          )
        })}
      </div>

      <div className="grid gap-3">
        <ByokField
          label="Base URL"
          value={config.baseUrl}
          onChange={(value) => onChange({ baseUrl: value, providerLabel: "Custom" })}
          placeholder="https://api.openai.com/v1"
        />
        <ByokField
          label="API key"
          value={config.apiKey}
          onChange={(value) => onChange({ apiKey: value })}
          placeholder="sk-..."
          secret
        />
        <ByokField
          label="Modelo"
          value={config.model}
          onChange={(value) => onChange({ model: value })}
          placeholder="gpt-4o"
        />
      </div>
    </div>
  )
}

function ByokField({
  label,
  value,
  onChange,
  placeholder,
  secret = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  secret?: boolean
}) {
  return (
    <label className="grid gap-2">
      <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--ink-3)]" style={{ fontFamily: MONO_FONT }}>
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={secret ? "password" : "text"}
        placeholder={placeholder}
        className="min-h-11 border border-[var(--rule)] bg-[var(--paper-deep)] px-3 text-[13px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-dim)] focus:border-[var(--lime-ink)]"
      />
    </label>
  )
}

function SessionRuntimeChip({
  runs,
  consolidationRun,
}: {
  runs: ResearchRunState[]
  consolidationRun: ResearchRunState | null
}) {
  const activeCount = [...runs, consolidationRun].filter(
    (run): run is ResearchRunState => {
      if (!run) return false
      return run.status === "running" || run.status === "queued"
    },
  ).length
  const label = runs.length > 0 ? `${runs.length} runtime${runs.length === 1 ? "" : "s"}` : "Restaurando"
  return (
    <div className="inline-flex h-10 max-w-[min(520px,calc(100vw-2rem))] items-center gap-2 border border-[var(--rule-strong)] bg-[var(--surface)] px-3 text-[12px] text-[var(--ink-2)]">
      <span
        className={cn(
          "grid h-6 w-6 shrink-0 place-items-center border text-black",
          activeCount > 0 ? "border-[var(--lime-ink)] bg-[var(--lime-ink)]" : "border-[var(--rule)] bg-[var(--ink-faint)] text-[var(--ink-3)]",
        )}
      >
        <Terminal size={15} strokeWidth={2} />
      </span>
      <span className="hidden whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.12em] sm:inline" style={{ fontFamily: MONO_FONT }}>
        Sessão
      </span>
      <span className="hidden text-[var(--ink-dim)] sm:inline">·</span>
      <span className="truncate font-semibold text-[var(--ink)]">{label}</span>
      <span className="hidden text-[var(--ink-dim)] md:inline">·</span>
      <span className="hidden whitespace-nowrap text-[var(--ink-3)] md:inline">{activeCount > 0 ? "ao vivo" : "fixa"}</span>
    </div>
  )
}

function SessionPromptSummary({
  query,
  runs,
  consolidationRun,
  methodId,
  depth,
}: {
  query: string
  runs: ResearchRunState[]
  consolidationRun: ResearchRunState | null
  methodId: ResearchMethodId
  depth: ResearchRunRequest["depth"]
}) {
  const visibleRuns = consolidationRun ? [...runs, consolidationRun] : runs
  const runtimeText = visibleRuns.length > 0
    ? visibleRuns.map((run) => cliLabel(run.cliId)).join(" · ")
    : "Restaurando runtimes da URL"
  return (
    <div className="grid gap-0">
      <div className="bg-[var(--paper-deep)] px-5 py-5">
        <p className="text-[18px] leading-[1.55] text-[var(--ink)]">
          {query || "Restaurando pergunta da pesquisa..."}
        </p>
      </div>
      <div className="grid gap-[1px] border-t border-[var(--rule)] bg-[var(--rule)] sm:grid-cols-3">
        <SessionMetaCell label="Runtimes" value={runtimeText} />
        <SessionMetaCell label="Modo" value={methodId} />
        <SessionMetaCell label="Profundidade" value={depth === "deep" ? "profunda" : "padrão"} />
      </div>
      <div className="border-t border-[var(--rule)] bg-[rgba(209,255,0,0.04)] px-5 py-3">
        <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--lime-ink)]" style={{ fontFamily: MONO_FONT }}>
          Sessão fixada pela URL · nova submissão bloqueada nesta aba.
        </p>
      </div>
    </div>
  )
}

function SessionMetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 bg-[var(--surface)] px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--ink-3)]" style={{ fontFamily: MONO_FONT }}>
        {label}
      </p>
      <p className="mt-1 truncate text-[13px] text-[var(--ink)]">{value}</p>
    </div>
  )
}

function BatchStatus({
  runs,
  consolidationRun,
  focusedRunId,
  canConsolidate,
  isConsolidating,
  onConsolidate,
  onFocus,
  onOpen,
}: {
  runs: ResearchRunState[]
  consolidationRun: ResearchRunState | null
  focusedRunId: string | null
  canConsolidate: boolean
  isConsolidating: boolean
  onConsolidate: () => void
  onFocus: (runId: string) => void
  onOpen: (run: ResearchRunState) => void
}) {
  const visibleRuns = consolidationRun ? [...runs, consolidationRun] : runs
  const completedRuns = runs.filter((run) => run.status === "completed")
  const activeRuns = runs.filter((run) => run.status === "running" || run.status === "queued")
  const failedRuns = runs.filter((run) => run.status === "failed")
  const focusedRun = visibleRuns.find((run) => run.runId === focusedRunId) ?? visibleRuns[0] ?? null
  const pipelineSteps = buildPipelineSteps({
    hasRuns: runs.length > 0,
    activeCount: activeRuns.length,
    completedCount: completedRuns.length,
    canConsolidate,
    consolidationRun,
  })

  return (
    <div className="grid gap-5">
      <PipelineRibbon
        runs={runs}
        activeCount={activeRuns.length}
        completedCount={completedRuns.length}
        failedCount={failedRuns.length}
        steps={pipelineSteps}
      />

      <div className="grid gap-[1px] bg-[var(--rule)] md:grid-cols-3">
        <MetricCell label="Ativas" value={String(activeRuns.length)} />
        <MetricCell label="Concluídas" value={String(completedRuns.length)} />
        <MetricCell label="Falhas" value={String(failedRuns.length)} />
      </div>

      <div className="grid gap-[1px] bg-[var(--rule)] lg:grid-cols-3">
        {visibleRuns.map((run) => (
          <RuntimeRunCard
            key={run.runId}
            run={run}
            selected={run.runId === focusedRun?.runId}
            consolidation={run.runId === consolidationRun?.runId}
            onFocus={() => onFocus(run.runId)}
          />
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        {focusedRun ? (
          <FocusedRunConsole run={focusedRun} onOpen={() => onOpen(focusedRun)} />
        ) : null}
        <ConsolidationPanel
          completedCount={completedRuns.length}
          totalCount={runs.length}
          canConsolidate={canConsolidate}
          isConsolidating={isConsolidating}
          consolidationRun={consolidationRun}
          onConsolidate={onConsolidate}
          onFocusConsolidation={() => consolidationRun && onFocus(consolidationRun.runId)}
        />
      </div>
    </div>
  )
}

type PipelineStepState = "done" | "active" | "pending" | "failed"

function PipelineRibbon({
  runs,
  activeCount,
  completedCount,
  failedCount,
  steps,
}: {
  runs: ResearchRunState[]
  activeCount: number
  completedCount: number
  failedCount: number
  steps: Array<{ id: string; label: string; state: PipelineStepState }>
}) {
  const liveLabel =
    activeCount > 0
      ? `EM EXECUÇÃO · ${activeCount} ativo${activeCount === 1 ? "" : "s"}`
      : completedCount >= 2
        ? "PRONTO PARA CONSOLIDAR"
        : failedCount > 0
          ? "EXECUÇÃO COM FALHAS"
          : "AGUARDANDO"

  return (
    <section className="border border-[var(--rule)] bg-[var(--surface)] p-5">
      <div
        className="mb-5 flex flex-wrap items-center justify-between gap-3 text-[10px] uppercase tracking-[0.14em] text-[var(--ink-dim)]"
        style={{ fontFamily: MONO_FONT }}
      >
        <span>
          Pipeline · <b className="font-medium text-[var(--ink)]">{runs.length || 0} runtime{runs.length === 1 ? "" : "s"}</b>
        </span>
        <span className="inline-flex items-center gap-2 text-[var(--lime-ink)]">
          {activeCount > 0 && <span className="h-1.5 w-1.5 animate-pulse bg-[var(--lime-ink)]" />}
          {liveLabel}
        </span>
      </div>

      <div className="relative grid grid-cols-5 gap-2">
        <span className="absolute left-[10%] right-[10%] top-3 h-px bg-[var(--rule)]" />
        {steps.map((step, index) => (
          <div key={step.id} className="relative z-10 grid justify-items-center gap-2 text-center">
            <span
              className={cn(
                "grid h-7 w-7 place-items-center border bg-[var(--paper-deep)] text-[10px] font-bold",
                step.state === "done" && "border-[var(--lime-ink)] bg-[var(--lime-ink)] text-black",
                step.state === "active" && "border-[var(--lime-ink)] text-[var(--lime-ink)] shadow-[0_0_0_4px_rgba(209,255,0,0.08)]",
                step.state === "failed" && "border-[var(--danger-ink)] text-[var(--danger-ink)]",
                step.state === "pending" && "border-[var(--rule)] text-[var(--ink-dim)]",
              )}
              style={{ fontFamily: MONO_FONT }}
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <span
              className={cn(
                "text-[10px] uppercase tracking-[0.10em]",
                step.state === "done" && "text-[var(--ink)]",
                step.state === "active" && "text-[var(--lime-ink)]",
                step.state === "pending" && "text-[var(--ink-dim)]",
                step.state === "failed" && "text-[var(--danger-ink)]",
              )}
              style={{ fontFamily: MONO_FONT }}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--paper-deep)] px-3 py-3">
      <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--ink-3)]" style={{ fontFamily: MONO_FONT }}>
        {label}
      </p>
      <p className="mt-1 text-[24px] font-black text-[var(--ink)]" style={{ fontFamily: DISPLAY_FONT }}>
        {value}
      </p>
    </div>
  )
}

function RuntimeRunCard({
  run,
  selected,
  consolidation,
  onFocus,
}: {
  run: ResearchRunState
  selected: boolean
  consolidation: boolean
  onFocus: () => void
}) {
  const progress = runProgress(run)
  const lastLine = lastMeaningfulLine(run.log)
  return (
    <button
      type="button"
      onClick={onFocus}
      aria-pressed={selected}
      className={cn(
        "relative grid min-h-44 content-between gap-4 bg-[var(--paper-deep)] p-4 text-left transition-colors hover:bg-[var(--surface-hover)]",
        selected && "bg-[rgba(209,255,0,0.05)]",
      )}
    >
      {selected && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[var(--lime-ink)] shadow-[0_0_14px_rgba(209,255,0,0.45)]" />}
      <span className="flex items-start gap-3">
        <span
          className={cn(
            "grid h-8 w-8 shrink-0 place-items-center border text-[11px] font-black uppercase",
            selected
              ? "border-[var(--lime-ink)] bg-[var(--lime-ink)] text-black"
              : "border-[var(--rule)] bg-[var(--paper)] text-[var(--ink-2)]",
          )}
          style={{ fontFamily: MONO_FONT }}
        >
          {consolidation ? "CO" : cliGlyph(run.cliId)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-semibold text-[var(--ink)]">
            {consolidation ? "Consolidação" : cliLabel(run.cliId)}
          </span>
          <span className="mt-1 block truncate text-[10px] uppercase tracking-[0.10em] text-[var(--ink-3)]" style={{ fontFamily: MONO_FONT }}>
            {statusLabel(run.status)} · {run.methodId}
          </span>
        </span>
        <StatusBadge status={run.status} exitCode={run.exitCode} />
      </span>

      <span className="grid gap-2">
        <span className="grid grid-cols-7 gap-1">
          {Array.from({ length: RUNTIME_STEP_TOTAL }).map((_, index) => (
            <span
              key={index}
              className={cn(
                "h-1 bg-[rgba(245,244,231,0.08)]",
                index < progress.done && "bg-[var(--lime-ink)] shadow-[0_0_6px_rgba(209,255,0,0.32)]",
                run.status === "running" && index === progress.done && "animate-pulse bg-[var(--lime-ink)]",
                run.status === "failed" && index === progress.done && "bg-[var(--danger-ink)]",
              )}
            />
          ))}
        </span>
        <span className="flex items-center justify-between text-[10px] uppercase tracking-[0.10em] text-[var(--ink-dim)]" style={{ fontFamily: MONO_FONT }}>
          <span>{progress.label}</span>
          <span>{formatRunTime(run.updatedAt)}</span>
        </span>
      </span>

      <span className="line-clamp-2 text-[11px] leading-[1.45] text-[var(--ink-3)]" style={{ fontFamily: MONO_FONT }}>
        {lastLine || "Aguardando saída do processo..."}
      </span>
    </button>
  )
}

type RuntimeDetailStep = {
  id: string
  num: string
  short: string
  name: string
  desc: string
  state: PipelineStepState
  substeps: string[]
  meta: string
}

function FocusedRunConsole({ run, onOpen }: { run: ResearchRunState; onOpen: () => void }) {
  const steps = buildRuntimeDetailSteps(run)
  const activeStep = steps.find((step) => step.state === "active" || step.state === "failed") ?? steps.at(-1)
  const doneCount = steps.filter((step) => step.state === "done").length
  const liveLabel =
    run.status === "completed"
      ? "CONCLUÍDO"
      : run.status === "failed"
        ? "FALHA"
        : `EM EXECUÇÃO · ${activeStep?.num ?? "01"} DE ${String(RUNTIME_STEP_TOTAL).padStart(2, "0")}`

  return (
    <section className="border border-[var(--rule)] bg-[var(--paper-deep)]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--rule)] px-4 py-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--lime-ink)]" style={{ fontFamily: MONO_FONT }}>
            Runtime · <span className="text-[var(--ink)]">{cliLabel(run.cliId)}</span>
          </p>
          <p className="mt-1 text-[15px] font-semibold text-[var(--ink)]">{run.outputSlug}</p>
          <p className="mt-1 text-[11px] text-[var(--ink-3)]">
            {doneCount} steps concluídos · docs/research/*-{run.outputSlug}
          </p>
        </div>
        <StatusBadge status={run.status} exitCode={run.exitCode} />
      </div>

      <RuntimePipeline steps={steps} liveLabel={liveLabel} run={run} />

      <div className="border-t border-[var(--rule)]">
        {steps.map((step) => (
          <RuntimeStepRow key={step.id} step={step} />
        ))}
      </div>

      <div className="border-t border-[var(--rule)] bg-[rgba(0,0,0,0.18)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--rule)] px-4 py-3">
          <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--ink-3)]" style={{ fontFamily: MONO_FONT }}>
            Saída bruta · tail do processo
          </span>
          <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--ink-dim)]" style={{ fontFamily: MONO_FONT }}>
            {formatRunTime(run.updatedAt)}
          </span>
        </div>
        <pre className="max-h-[34vh] min-h-48 overflow-auto p-4 text-[11px] leading-[1.55] text-[var(--ink-2)]">
          {run.log || "Aguardando saída do processo..."}
        </pre>
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 border-t border-[var(--rule)] px-3 text-[10px] uppercase tracking-[0.14em] text-[var(--ink-3)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--ink)]"
        style={{ fontFamily: MONO_FONT }}
      >
        <ExternalLink size={14} />
        Abrir no Observatory
      </button>
    </section>
  )
}

function RuntimePipeline({
  steps,
  liveLabel,
  run,
}: {
  steps: RuntimeDetailStep[]
  liveLabel: string
  run: ResearchRunState
}) {
  return (
    <div className="bg-[var(--surface)] px-4 py-5">
      <div
        className="mb-5 flex flex-wrap items-center justify-between gap-3 text-[10px] uppercase tracking-[0.14em] text-[var(--ink-dim)]"
        style={{ fontFamily: MONO_FONT }}
      >
        <span>
          Pipeline · <b className="font-medium text-[var(--ink)]">{cliLabel(run.cliId)}</b> · {run.runId.slice(0, 16)}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-2",
            run.status === "failed" ? "text-[var(--danger-ink)]" : "text-[var(--lime-ink)]",
          )}
        >
          {run.status === "running" || run.status === "queued" ? <span className="h-1.5 w-1.5 animate-pulse bg-[var(--lime-ink)]" /> : null}
          {liveLabel}
        </span>
      </div>

      <div className="relative grid gap-2" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        <span className="absolute left-[7%] right-[7%] top-3 h-px bg-[var(--rule)]" />
        {steps.map((step) => (
          <div key={step.id} className="relative z-10 grid justify-items-center gap-2 text-center">
            <span
              className={cn(
                "grid h-7 w-7 place-items-center border bg-[var(--paper-deep)] text-[10px] font-bold",
                step.state === "done" && "border-[var(--lime-ink)] bg-[var(--lime-ink)] text-black",
                step.state === "active" && "border-[var(--lime-ink)] text-[var(--lime-ink)] shadow-[0_0_0_4px_rgba(209,255,0,0.08)]",
                step.state === "failed" && "border-[var(--danger-ink)] text-[var(--danger-ink)]",
                step.state === "pending" && "border-[var(--rule)] text-[var(--ink-dim)]",
              )}
              style={{ fontFamily: MONO_FONT }}
            >
              {step.state === "done" ? <Check size={13} strokeWidth={3} /> : step.num}
            </span>
            <span
              className={cn(
                "hidden text-[10px] uppercase tracking-[0.10em] sm:block",
                step.state === "done" && "text-[var(--ink)]",
                step.state === "active" && "text-[var(--lime-ink)]",
                step.state === "pending" && "text-[var(--ink-dim)]",
                step.state === "failed" && "text-[var(--danger-ink)]",
              )}
              style={{ fontFamily: MONO_FONT }}
            >
              {step.short}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function RuntimeStepRow({ step }: { step: RuntimeDetailStep }) {
  return (
    <article
      className={cn(
        "grid gap-0 border-b border-[var(--rule-soft)] last:border-b-0 lg:grid-cols-[64px_36px_minmax(0,1fr)_minmax(180px,240px)_96px]",
        step.state === "active" && "border-l-2 border-l-[var(--lime-ink)]",
        step.state === "failed" && "border-l-2 border-l-[var(--danger-ink)]",
      )}
    >
      <div
        className={cn(
          "flex items-center px-4 py-3 text-[11px] font-semibold tracking-[0.08em] text-[var(--ink-dim)] lg:justify-center lg:border-r lg:border-[var(--rule-soft)] lg:px-0",
          (step.state === "done" || step.state === "active") && "text-[var(--lime-ink)]",
          step.state === "failed" && "text-[var(--danger-ink)]",
        )}
        style={{ fontFamily: MONO_FONT }}
      >
        [{step.num}]
      </div>
      <div
        className={cn(
          "hidden items-center justify-center text-[var(--ink-3)] lg:flex",
          (step.state === "done" || step.state === "active") && "text-[var(--lime-ink)]",
          step.state === "failed" && "text-[var(--danger-ink)]",
        )}
      >
        <RuntimeStepIcon step={step} />
      </div>
      <div className="px-4 pb-3 lg:py-4 lg:pl-0 lg:pr-4">
        <p
          className={cn(
            "text-[15px] font-medium text-[var(--ink)]",
            step.state === "pending" && "text-[var(--ink-2)]",
          )}
        >
          {step.name}
        </p>
        <p className="mt-1 text-[11.5px] leading-[1.5] text-[var(--ink-3)]" style={{ fontFamily: MONO_FONT }}>
          {step.desc}
        </p>
      </div>
      <div className="grid content-center gap-1 px-4 pb-4 lg:py-4 lg:pl-0 lg:pr-4">
        {step.substeps.slice(0, 3).map((substep) => (
          <span key={substep} className="flex min-w-0 items-center gap-2 text-[10.5px] text-[var(--ink-3)]" style={{ fontFamily: MONO_FONT }}>
            <span
              className={cn(
                "grid h-3 w-3 shrink-0 place-items-center text-[var(--ink-dim)]",
                (step.state === "done" || step.state === "active") && "text-[var(--lime-ink)]",
                step.state === "failed" && "text-[var(--danger-ink)]",
              )}
            >
              {step.state === "done" ? <Check size={10} strokeWidth={3} /> : <Circle size={8} fill="currentColor" />}
            </span>
            <span className="truncate">{substep}</span>
          </span>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-[var(--rule-soft)] px-4 py-3 lg:flex-col lg:items-end lg:justify-center lg:border-l lg:border-t-0 lg:border-[var(--rule-soft)]">
        <RuntimeStepBadge state={step.state} />
        <span className="text-[10px] tracking-[0.08em] text-[var(--ink-dim)]" style={{ fontFamily: MONO_FONT }}>
          {step.meta}
        </span>
      </div>
    </article>
  )
}

function RuntimeStepIcon({ step }: { step: RuntimeDetailStep }) {
  if (step.id === "prompt") return <Search size={17} />
  if (step.id === "boot") return <Terminal size={17} />
  if (step.id === "context") return <Radar size={17} />
  if (step.id === "evidence") return <FileText size={17} />
  if (step.id === "artifacts") return <Settings size={17} />
  if (step.id === "validate") return <Check size={17} />
  return <ExternalLink size={17} />
}

function RuntimeStepBadge({ state }: { state: PipelineStepState }) {
  const label = state === "done" ? "DONE" : state === "active" ? "RUNNING" : state === "failed" ? "FAILED" : "PENDING"
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 px-2 text-[9px] font-semibold uppercase tracking-[0.14em]",
        state === "done" && "bg-[var(--lime-ink)] text-black",
        state === "active" && "bg-[var(--lime-ink)] text-black",
        state === "failed" && "bg-[var(--danger-ink)] text-[var(--ink)]",
        state === "pending" && "border border-[var(--rule)] text-[var(--ink-3)]",
      )}
      style={{ fontFamily: MONO_FONT }}
    >
      {state === "active" ? <Loader2 size={10} className="animate-spin" /> : null}
      {label}
    </span>
  )
}

function ConsolidationPanel({
  completedCount,
  totalCount,
  canConsolidate,
  isConsolidating,
  consolidationRun,
  onConsolidate,
  onFocusConsolidation,
}: {
  completedCount: number
  totalCount: number
  canConsolidate: boolean
  isConsolidating: boolean
  consolidationRun: ResearchRunState | null
  onConsolidate: () => void
  onFocusConsolidation: () => void
}) {
  const readyLabel =
    consolidationRun
      ? statusLabel(consolidationRun.status)
      : canConsolidate
        ? "pronto"
        : `${completedCount}/${Math.max(totalCount, 2)} concluídas`

  return (
    <aside className="grid content-start gap-3 border border-[var(--rule)] bg-[var(--paper-deep)] p-4">
      <div>
        <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--ink-3)]" style={{ fontFamily: MONO_FONT }}>
          Consenso
        </p>
        <p className="mt-2 text-[22px] font-black uppercase leading-none text-[var(--ink)]" style={{ fontFamily: DISPLAY_FONT }}>
          Consolidar
        </p>
        <p className="mt-3 text-[12px] leading-[1.55] text-[var(--ink-2)]">
          Compare as saídas dos runtimes e gere uma pasta consolidada com consenso, dissensos e lacunas.
        </p>
      </div>

      <div className="grid gap-[1px] bg-[var(--rule)]">
        <MetricCell label="Estado" value={readyLabel} />
      </div>

      <button
        type="button"
        onClick={onConsolidate}
        disabled={!canConsolidate}
        className={cn(
          "inline-flex min-h-11 items-center justify-center gap-2 px-3 text-[10px] font-bold uppercase tracking-[0.12em] transition-colors",
          canConsolidate
            ? "bg-[var(--lime-ink)] text-black hover:brightness-95"
            : "bg-[var(--ink-faint)] text-[var(--ink-dim)]",
        )}
        style={{ fontFamily: MONO_FONT }}
      >
        <FileText size={14} />
        {isConsolidating ? "Consolidando" : "Consolidar pesquisas"}
      </button>

      {consolidationRun && (
        <button
          type="button"
          onClick={onFocusConsolidation}
          className="inline-flex min-h-10 items-center justify-center border border-[var(--rule)] px-3 text-[10px] uppercase tracking-[0.12em] text-[var(--ink-3)] transition-colors hover:border-[var(--lime-ink)] hover:text-[var(--ink)]"
          style={{ fontFamily: MONO_FONT }}
        >
          Ver consolidação
        </button>
      )}
    </aside>
  )
}

function StatusBadge({ status, exitCode }: { status: ResearchRunState["status"]; exitCode: number | null }) {
  const done = status === "completed"
  const failed = status === "failed"
  return (
    <span
      className={cn(
        "inline-flex h-8 items-center border px-2 text-[9px] uppercase tracking-[0.14em]",
        done && "border-[var(--lime-ink)] bg-[var(--lime-ink)] text-black",
        failed && "border-[var(--danger-ink)] text-[var(--danger-ink)]",
        !done && !failed && "border-[var(--rule)] text-[var(--ink-3)]",
      )}
      style={{ fontFamily: MONO_FONT }}
    >
      {exitCode === null ? "ativo" : `exit ${exitCode}`}
    </span>
  )
}

function statusLabel(status: ResearchRunState["status"]) {
  if (status === "queued") return "fila"
  if (status === "running") return "rodando"
  if (status === "completed") return "concluída"
  return "falhou"
}

function sessionHeadline(runs: ResearchRunState[], consolidationRun: ResearchRunState | null) {
  if (consolidationRun?.status === "running" || consolidationRun?.status === "queued") return "consolidação"
  if (runs.some((run) => run.status === "running" || run.status === "queued")) return "andamento"
  if (consolidationRun?.status === "completed") return "consolidada"
  if (runs.length > 0 && runs.every((run) => run.status === "completed")) return "concluída"
  if (runs.length > 0 && runs.every((run) => run.status === "failed")) return "falha"
  return "restauração"
}

function buildRuntimeDetailSteps(run: ResearchRunState): RuntimeDetailStep[] {
  const progress = runProgress(run)
  const logLines = meaningfulLogLines(run.log)
  const latest = lastMeaningfulLine(run.log)
  const stdoutCount = logLines.filter((line) => line.startsWith("[stdout]")).length
  const stderrCount = logLines.filter((line) => line.startsWith("[stderr]")).length
  const finalLine = logLines.findLast((line) => line.includes("processo finalizado"))

  const templates = [
    {
      id: "prompt",
      short: "Prompt",
      name: "Receber instrução de pesquisa",
      desc: `Pergunta fixada na URL com modo ${run.methodId} e slug ${run.outputSlug}.`,
      substeps: [`Runtime · ${cliLabel(run.cliId)}`, `Slug · ${run.outputSlug}`, `Início · ${formatRunTime(run.startedAt)}`],
    },
    {
      id: "boot",
      short: "Boot",
      name: "Inicializar CLI local",
      desc: "Processo criado no workspace do Sinkra Hub com stdin controlado pelo AIOX Research.",
      substeps: [`Run · ${run.runId.slice(0, 22)}`, "Workspace · sinkra-hub", `Estado · ${statusLabel(run.status)}`],
    },
    {
      id: "context",
      short: "Contexto",
      name: "Ler contrato e contexto",
      desc: "Carrega o prompt técnico, restrições de escrita e contrato de artefatos em docs/research.",
      substeps: ["Skill · tech-research", "Saída · README/report/recommendations", "Governança · sem escrita fora de docs/research"],
    },
    {
      id: "evidence",
      short: "Evidência",
      name: "Investigar fontes e claims",
      desc: latest ? `Último sinal recebido: ${latest}` : "Aguardando os primeiros eventos do runtime.",
      substeps: [
        stdoutCount > 0 ? `stdout · ${stdoutCount} evento${stdoutCount === 1 ? "" : "s"}` : "stdout · aguardando",
        stderrCount > 0 ? `stderr · ${stderrCount} evento${stderrCount === 1 ? "" : "s"}` : "stderr · limpo até agora",
        `Log · ${logLines.length} linha${logLines.length === 1 ? "" : "s"}`,
      ],
    },
    {
      id: "artifacts",
      short: "Artefatos",
      name: "Materializar pacote da pesquisa",
      desc: "Escreve a pasta canônica com métricas, fontes, recomendações, grafo e matrizes quando defensáveis.",
      substeps: ["README.md", "metrics.yaml", "sources.yaml / research-graph.json"],
    },
    {
      id: "validate",
      short: "Validar",
      name: "Validar saída e rastreabilidade",
      desc: "Confere se a execução fechou sem erro e se o runtime reportou artefatos ausentes ou lacunas.",
      substeps: [
        finalLine ? finalLine.replace(/^\[dash\]\s*/i, "") : "Processo ainda aberto",
        run.exitCode === null ? "Exit · pendente" : `Exit · ${run.exitCode}`,
        `Atualizado · ${formatRunTime(run.updatedAt)}`,
      ],
    },
    {
      id: "finish",
      short: "Final",
      name: "Disponibilizar no Observatory",
      desc: "Quando o runtime concluir, o pacote pode ser aberto no Observatory para leitura, comparação e consolidação.",
      substeps: [`Destino · docs/research/*-${run.outputSlug}`, "Ação · abrir no Observatory", "Consenso · disponível com 2+ runs concluídos"],
    },
  ]

  return templates.map((template, index) => ({
    ...template,
    num: String(index + 1).padStart(2, "0"),
    state: runtimeStepState(run.status, progress.done, index),
    meta: runtimeStepMeta(run, index),
  }))
}

function runtimeStepState(status: ResearchRunState["status"], completedSteps: number, index: number): PipelineStepState {
  if (status === "completed") return "done"
  if (status === "failed") {
    if (index < completedSteps) return "done"
    if (index === completedSteps) return "failed"
    return "pending"
  }
  if (index < completedSteps) return "done"
  if (index === completedSteps) return "active"
  return "pending"
}

function runtimeStepMeta(run: ResearchRunState, index: number) {
  const completedSteps = runProgress(run).done
  if (run.status === "completed") return index === RUNTIME_STEP_TOTAL - 1 ? "final" : "ok"
  if (run.status === "failed" && index >= completedSteps) return index === completedSteps ? "erro" : "pendente"
  if (index < completedSteps) return "ok"
  if (index === completedSteps) return run.status === "queued" ? "fila" : "stream"
  return "pendente"
}

function buildPipelineSteps({
  hasRuns,
  activeCount,
  completedCount,
  canConsolidate,
  consolidationRun,
}: {
  hasRuns: boolean
  activeCount: number
  completedCount: number
  canConsolidate: boolean
  consolidationRun: ResearchRunState | null
}): Array<{ id: string; label: string; state: PipelineStepState }> {
  const allParallelDone = hasRuns && activeCount === 0
  const consolidationState: PipelineStepState = consolidationRun
    ? consolidationRun.status === "completed"
      ? "done"
      : consolidationRun.status === "failed"
        ? "failed"
        : "active"
    : canConsolidate
      ? "active"
      : "pending"

  return [
    { id: "prompt", label: "Prompt", state: hasRuns ? "done" : "active" },
    { id: "parallel", label: "Runtimes", state: activeCount > 0 ? "active" : hasRuns ? "done" : "pending" },
    { id: "evidence", label: "Evidência", state: completedCount > 0 ? (allParallelDone ? "done" : "active") : "pending" },
    { id: "artifacts", label: "Artefatos", state: allParallelDone && completedCount > 0 ? "done" : completedCount > 0 ? "active" : "pending" },
    { id: "consensus", label: "Consenso", state: consolidationState },
  ]
}

function runProgress(run: ResearchRunState) {
  const lines = meaningfulLogLines(run.log).length
  if (run.status === "completed") return { done: RUNTIME_STEP_TOTAL, label: "07 de 07" }
  if (run.status === "failed") return { done: Math.max(1, Math.min(6, Math.ceil(lines / 8))), label: "interrompido" }
  if (run.status === "queued") return { done: 0, label: "01 de 07" }
  const activeStep = Math.max(2, Math.min(6, 2 + Math.floor(lines / 10)))
  return { done: activeStep - 1, label: `${String(activeStep).padStart(2, "0")} de 07` }
}

function meaningfulLogLines(log: string) {
  return log
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
}

function lastMeaningfulLine(log: string) {
  const lines = meaningfulLogLines(log)
  const last = lines.at(-1) ?? ""
  return last
    .replace(/^\[(stdout|stderr|dash)\]\s*/i, "")
    .replace(/\s+/g, " ")
}

function cliLabel(cliId: ResearchCliId) {
  if (cliId === "claude") return "Claude Code"
  if (cliId === "codex") return "Codex CLI"
  if (cliId === "gemini") return "Gemini CLI"
  if (cliId === "byok") return "BYOK API"
  return "OpenCode"
}

function cliGlyph(cliId: ResearchCliId) {
  if (cliId === "claude") return "CC"
  if (cliId === "codex") return "CX"
  if (cliId === "gemini") return "GM"
  if (cliId === "byok") return "BK"
  return "OC"
}

function formatRunTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "--:--"
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

function datedResearchSlug(baseSlug: string) {
  if (/^\d{4}-\d{2}-\d{2}-/.test(baseSlug)) return baseSlug
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}-${baseSlug}`
}

async function fetchRunState(runId: string) {
  const response = await fetch(`/api/research/runs/${encodeURIComponent(runId)}`, { cache: "no-store" })
  if (!response.ok) return null
  return (await response.json()) as ResearchRunState
}

function uniqueIds(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
}

function uniqueCliIds(values: ResearchCliId[]) {
  return Array.from(new Set(values))
}

function agentInitial(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
}

function preferredCli(clis: ResearchCliStatus[]) {
  return (
    clis.find((cli) => cli.available && cli.launchSupported && cli.id === "claude") ??
    clis.find((cli) => cli.available && cli.launchSupported) ??
    clis[0]
  )
}
