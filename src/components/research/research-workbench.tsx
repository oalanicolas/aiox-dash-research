"use client"

import { useEffect, useMemo, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react"
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
const MAX_RESEARCH_TOPIC_SLUG_LENGTH = 44

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
  "--surface-console": "#12130F",
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
  const [retryingRunIds, setRetryingRunIds] = useState<string[]>([])
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
  const allRunsFinished = runs.length > 0 && runs.every((run) => run.status === "completed" || run.status === "failed")
  const canConsolidate = allRunsFinished && completedRuns.length >= 2 && !isConsolidating && consolidationRun?.status !== "running"
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

  async function retryRun(run: ResearchRunState) {
    if (run.status !== "failed" || retryingRunIds.includes(run.runId)) return
    setRetryingRunIds((current) => [...current, run.runId])
    setError(null)
    try {
      const response = await fetch("/api/research/runs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          query: run.query,
          cliId: run.cliId,
          methodId: run.methodId,
          depth,
          outputSlug: run.outputSlug,
          byok: run.cliId === "byok" ? byokConfig : undefined,
        }),
      })
      const body = (await response.json()) as ResearchRunState | { error?: string }
      if (!response.ok || "error" in body) {
        throw new Error("error" in body && body.error ? body.error : `Falha ao reiniciar ${cliLabel(run.cliId)}.`)
      }

      const nextRun = body as ResearchRunState
      let nextRunsSnapshot: ResearchRunState[] | null = null
      setRuns((current) => {
        const nextRuns = current.map((item) => (item.runId === run.runId ? nextRun : item))
        nextRunsSnapshot = nextRuns
        return nextRuns
      })
      setConsolidationRun((current) => (current?.runId === run.runId ? nextRun : current))
      setFocusedRunId(nextRun.runId)
      syncResearchUrl(nextRunsSnapshot ?? runs.map((item) => (item.runId === run.runId ? nextRun : item)), consolidationRun?.runId === run.runId ? nextRun : consolidationRun)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : `Falha ao reiniciar ${cliLabel(run.cliId)}.`)
    } finally {
      setRetryingRunIds((current) => current.filter((runId) => runId !== run.runId))
    }
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
              aria-label="Detectar CLIs"
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

        <div
          className={cn(
            "relative z-10 mx-auto flex max-w-[1280px] flex-col px-5 lg:px-10",
            hasResearchSession
              ? "min-h-0 py-12 lg:py-16"
              : "min-h-[calc(100vh-60px)] py-14 lg:py-20",
          )}
        >
          <div
            className={cn(
              "mx-auto flex w-full max-w-[960px] flex-col items-center text-center",
              hasResearchSession ? "justify-start" : "flex-1 justify-center",
            )}
          >
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

          <div className="mx-auto mt-12 w-full max-w-[960px]">
            {runs.length > 0 || consolidationRun ? (
              <BatchStatus
                runs={runs}
                consolidationRun={consolidationRun}
                focusedRunId={focusedRunId}
                canConsolidate={canConsolidate}
                isConsolidating={isConsolidating}
                onConsolidate={() => void startConsolidationRun()}
                retryingRunIds={retryingRunIds}
                onRetryRun={(run) => void retryRun(run)}
                onFocus={setFocusedRunId}
                onOpen={(run) => router.push(`/observatory/research?slug=${encodeURIComponent(run.outputSlug)}`)}
              />
            ) : hasUrlScopedSession ? (
              <ExecutionEmptyState
                icon={<RefreshCcw className="mx-auto mb-3 animate-spin text-[var(--lime-ink)]" size={22} />}
                title="Restaurando execução"
                body="Buscando o estado salvo dos runs informados nesta URL."
              />
            ) : (
              <ExecutionEmptyState
                icon={<FileText className="mx-auto mb-3 text-[var(--ink-3)]" size={22} />}
                title="O resultado aparecerá aqui"
                body="A pesquisa será salva em docs/research/ e poderá ser aberta no Observatory."
              />
            )}
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

function ExecutionEmptyState({
  icon,
  title,
  body,
}: {
  icon: ReactNode
  title: string
  body: string
}) {
  return (
    <section className="border border-[var(--rule)] bg-[var(--surface)]">
      <SectionHeading index="02" title="Execução" meta="aguardando pesquisa" />
      <div className="grid min-h-40 place-items-center border-t border-dashed border-[var(--rule)] bg-[var(--paper-deep)] p-5 text-center">
        <div>
          {icon}
          <p className="text-[14px] font-semibold">{title}</p>
          <p className="mt-1 text-[12px] leading-[1.45] text-[var(--ink-2)]">{body}</p>
        </div>
      </div>
    </section>
  )
}

function SectionHeading({
  index,
  title,
  meta,
  accent,
}: {
  index: string
  title: string
  meta?: string
  accent?: string
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-3 py-5">
      <h2 className="flex items-baseline gap-3 text-[22px] font-black uppercase tracking-normal text-[var(--ink)]" style={{ fontFamily: DISPLAY_FONT }}>
        <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--ink-dim)]" style={{ fontFamily: MONO_FONT }}>
          [{index}]
        </span>
        {title}
        {accent ? <span className="text-[var(--lime-ink)]">{accent}</span> : null}
      </h2>
      {meta ? (
        <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--ink-dim)]" style={{ fontFamily: MONO_FONT }}>
          {meta}
        </span>
      ) : null}
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
  retryingRunIds,
  onRetryRun,
  onFocus,
  onOpen,
}: {
  runs: ResearchRunState[]
  consolidationRun: ResearchRunState | null
  focusedRunId: string | null
  canConsolidate: boolean
  isConsolidating: boolean
  onConsolidate: () => void
  retryingRunIds: string[]
  onRetryRun: (run: ResearchRunState) => void
  onFocus: (runId: string) => void
  onOpen: (run: ResearchRunState) => void
}) {
  const visibleRuns = consolidationRun ? [...runs, consolidationRun] : runs
  const completedRuns = runs.filter((run) => run.status === "completed")
  const activeRuns = runs.filter((run) => run.status === "running" || run.status === "queued")
  const failedRuns = runs.filter((run) => run.status === "failed")
  const allParallelRunsFinished = runs.length > 0 && activeRuns.length === 0
  const showConsolidationPanel = allParallelRunsFinished || Boolean(consolidationRun)
  const focusedRun = visibleRuns.find((run) => run.runId === focusedRunId) ?? visibleRuns[0] ?? null

  return (
    <div className="grid gap-8 text-left">
      <RunStatsStrip
        runs={runs}
        activeCount={activeRuns.length}
        completedCount={completedRuns.length}
        failedCount={failedRuns.length}
        consolidationRun={consolidationRun}
      />

      <section>
        <SectionHeading
          index="02"
          title="Runtimes paralelos"
          meta={`${runs.length} runtime${runs.length === 1 ? "" : "s"} · ${completedRuns.length} concluído${completedRuns.length === 1 ? "" : "s"} · ${activeRuns.length} em curso`}
        />
        <div
          className="grid gap-[1px] bg-[var(--rule)]"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))" }}
        >
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
      </section>

      <div className="grid gap-8">
        {focusedRun ? (
          <>
            <SectionHeading
              index="03"
              title="Runtime"
              accent={focusedRun.runId === consolidationRun?.runId ? "Consolidação" : cliLabel(focusedRun.cliId)}
              meta={runtimeSummaryLabel(focusedRun)}
            />
            <FocusedRunConsole
              run={focusedRun}
              retrying={retryingRunIds.includes(focusedRun.runId)}
              onRetry={() => onRetryRun(focusedRun)}
              onOpen={() => onOpen(focusedRun)}
            />
          </>
        ) : null}
        {showConsolidationPanel ? (
          <ConsolidationPanel
            completedCount={completedRuns.length}
            totalCount={runs.length}
            canConsolidate={canConsolidate}
            isConsolidating={isConsolidating}
            consolidationRun={consolidationRun}
            onConsolidate={onConsolidate}
            onFocusConsolidation={() => consolidationRun && onFocus(consolidationRun.runId)}
          />
        ) : null}
      </div>
    </div>
  )
}

type PipelineStepState = "done" | "active" | "pending" | "failed"

function RunStatsStrip({
  runs,
  activeCount,
  completedCount,
  failedCount,
  consolidationRun,
}: {
  runs: ResearchRunState[]
  activeCount: number
  completedCount: number
  failedCount: number
  consolidationRun: ResearchRunState | null
}) {
  const totalSteps = Math.max(1, runs.length * RUNTIME_STEP_TOTAL)
  const doneSteps = runs.reduce((total, run) => total + runProgress(run).done, 0)
  const percent = Math.round((doneSteps / totalSteps) * 100)
  const newestRun = [...runs, consolidationRun]
    .filter((run): run is ResearchRunState => Boolean(run))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]
  const elapsed = newestRun ? formatElapsed(newestRun.startedAt, newestRun.updatedAt) : "0s"
  const pipelineLabel = consolidationRun
    ? `consolidação · ${statusLabel(consolidationRun.status)}`
    : activeCount > 0
      ? `${activeCount} em curso`
      : failedCount > 0
        ? `${failedCount} com falha`
        : "runtimes finalizados"

  return (
    <section className="grid gap-[1px] border border-[var(--rule)] bg-[var(--rule-soft)] sm:grid-cols-2 lg:grid-cols-4" aria-label="Estatísticas da execução">
      <RunStatCard label="Runtimes" value={String(runs.length)} unit={activeCount > 0 ? "ativos" : "total"} trend={`${completedCount} done · ${activeCount} em curso`} />
      <RunStatCard label="Steps" value={String(doneSteps)} unit={`de ${totalSteps}`} trend={`${percent}% do pipeline paralelo`} positive />
      <RunStatCard label="Tempo" value={elapsed} unit="janela" trend={newestRun ? `${cliLabel(newestRun.cliId)} · ${formatRunTime(newestRun.updatedAt)}` : "sem run ativo"} />
      <RunStatCard label="Estado" value={failedCount > 0 ? "!" : activeCount > 0 ? "live" : "ok"} unit="pipeline" trend={pipelineLabel} positive={failedCount === 0} />
    </section>
  )
}

function RunStatCard({
  label,
  value,
  unit,
  trend,
  positive = false,
}: {
  label: string
  value: string
  unit: string
  trend: string
  positive?: boolean
}) {
  return (
    <article className="grid min-h-[128px] min-w-0 content-between bg-[var(--surface)] px-5 py-5">
      <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--ink-dim)]" style={{ fontFamily: MONO_FONT }}>
        {label}
      </p>
      <p className="flex min-w-0 items-baseline gap-2 text-[40px] font-black leading-none text-[var(--ink)]" style={{ fontFamily: DISPLAY_FONT }}>
        <span className="shrink-0">{value}</span>
        <span className="min-w-0 truncate text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--ink-dim)]" style={{ fontFamily: MONO_FONT }}>
          {unit}
        </span>
      </p>
      <p
        className={cn("truncate text-[10.5px] tracking-[0.06em] text-[var(--ink-dim)]", positive && "text-[var(--lime-ink)]")}
        style={{ fontFamily: MONO_FONT }}
      >
        {trend}
      </p>
    </article>
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
  const issueLines = runIssueLines(run.log, run.status === "failed")
  const hasLiveIssue = issueLines.length > 0 && run.status !== "completed"
  const displayLine = hasLiveIssue ? issueLines.at(-1) ?? lastLine : lastLine
  const percent = Math.round((progress.done / RUNTIME_STEP_TOTAL) * 100)
  const currentStep = String(Math.min(RUNTIME_STEP_TOTAL, Math.max(1, progress.done + (run.status === "completed" ? 0 : 1)))).padStart(2, "0")
  const cardStatus = run.status === "completed" ? "FINAL" : run.status === "failed" ? "FALHA" : `[${currentStep}] AGORA`
  return (
    <button
      type="button"
      onClick={onFocus}
      aria-pressed={selected}
      className={cn(
        "relative grid min-h-[244px] overflow-hidden content-between gap-5 bg-[var(--surface)] p-5 text-left transition-colors hover:bg-[var(--surface-hover)]",
        selected && "bg-[rgba(209,255,0,0.045)]",
      )}
    >
      {hasLiveIssue && run.status !== "failed" ? <span className="absolute inset-y-0 left-0 w-0.5 bg-[var(--warning-ink)]" /> : null}
      {run.status === "failed" ? <span className="absolute inset-y-0 left-0 w-0.5 bg-[var(--danger-ink)]" /> : null}
      {selected && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[var(--lime-ink)] shadow-[0_0_14px_rgba(209,255,0,0.45)]" />}
      <span className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3">
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
        <StatusBadge status={run.status} exitCode={run.exitCode} hasIssue={hasLiveIssue} />
      </span>

      <span className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-end gap-3">
        <span className="text-[52px] font-black leading-none text-[var(--ink)]" style={{ fontFamily: DISPLAY_FONT }}>
          {String(progress.done).padStart(2, "0")}
        </span>
        <span className="min-w-0 text-[10.5px] uppercase tracking-[0.14em] text-[var(--ink-dim)]" style={{ fontFamily: MONO_FONT }}>
          <b className="block font-medium text-[var(--ink)]">de 07 steps</b>
          {run.status === "completed" ? "concluído" : run.status === "failed" ? "interrompido" : `${percent}% concluído`}
        </span>
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
          <span>{formatElapsed(run.startedAt, run.updatedAt)}</span>
        </span>
      </span>

      <span className="line-clamp-2 text-[11px] leading-[1.45] text-[var(--ink-3)]" style={{ fontFamily: MONO_FONT }}>
        <span className="text-[var(--ink-dim)]">{cardStatus} · </span>
        <b className="font-medium text-[var(--ink)]">{displayLine || "Aguardando saída do processo..."}</b>
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

function FocusedRunConsole({
  run,
  retrying,
  onRetry,
  onOpen,
}: {
  run: ResearchRunState
  retrying: boolean
  onRetry: () => void
  onOpen: () => void
}) {
  const steps = buildRuntimeDetailSteps(run)
  const activeStep = steps.find((step) => step.state === "active" || step.state === "failed") ?? steps.at(-1)
  const doneCount = steps.filter((step) => step.state === "done").length
  const issueLines = runIssueLines(run.log, run.status === "failed")
  const hasLiveIssue = issueLines.length > 0 && run.status !== "completed"
  const liveLabel =
    run.status === "completed"
      ? "CONCLUÍDO"
      : run.status === "failed"
        ? "FALHA"
        : hasLiveIssue
          ? "ATENÇÃO · STDERR"
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
            {doneCount} steps concluídos · docs/research/{run.outputSlug}
          </p>
        </div>
        <StatusBadge status={run.status} exitCode={run.exitCode} hasIssue={hasLiveIssue} />
      </div>

      {issueLines.length > 0 ? <RuntimeIssuePanel run={run} lines={issueLines} /> : null}

      <RuntimePipeline steps={steps} liveLabel={liveLabel} run={run} />

      <div className="border-t border-[var(--rule)]">
        {steps.map((step) => (
          <RuntimeStepRow
            key={step.id}
            step={step}
            retrying={retrying}
            onRetry={run.status === "failed" && step.state === "failed" ? onRetry : undefined}
          />
        ))}
      </div>

      <TerminalOutput run={run} />

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

type TerminalLineKind = "local" | "stdout" | "stderr" | "plain"

type TerminalLine = {
  kind: TerminalLineKind
  text: string
}

function TerminalOutput({ run }: { run: ResearchRunState }) {
  const lines = parseTerminalLines(run.log)
  const visibleLines = lines.length > 0 ? lines : [{ kind: "plain" as const, text: "Aguardando saída do processo..." }]
  const hasErrors = lines.some((line) => line.kind === "stderr")
  const prompt = terminalPrompt()

  return (
    <div className="border-t border-[var(--rule)] bg-[var(--surface-console)]">
      <div className="grid border-b border-[var(--rule)] bg-[rgba(0,0,0,0.24)] md:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex min-w-0 items-center gap-3 px-4 py-3">
          <span className="flex shrink-0 items-center gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 border border-[rgba(237,70,9,0.68)] bg-[rgba(237,70,9,0.16)]" />
            <span className="h-2.5 w-2.5 border border-[rgba(245,158,11,0.62)] bg-[rgba(245,158,11,0.14)]" />
            <span className="h-2.5 w-2.5 border border-[rgba(209,255,0,0.62)] bg-[rgba(209,255,0,0.13)]" />
          </span>
          <span className="min-w-0 truncate text-[10px] uppercase tracking-[0.14em] text-[var(--ink-3)]" style={{ fontFamily: MONO_FONT }}>
            Terminal · linhas de comando
          </span>
        </div>
        <div
          className="flex min-w-0 items-center justify-between gap-4 border-t border-[var(--rule-soft)] px-4 py-3 text-[10px] uppercase tracking-[0.14em] text-[var(--ink-dim)] md:border-l md:border-t-0"
          style={{ fontFamily: MONO_FONT }}
        >
          <span className={cn("truncate", hasErrors && "text-[var(--danger-ink)]")}>{hasErrors ? "stderr detectado" : "stream limpo"}</span>
          <span className="shrink-0">{formatRunTime(run.updatedAt)}</span>
        </div>
      </div>

      <div className="border-b border-[var(--rule-soft)] px-4 py-3">
        <p className="flex min-w-0 items-center gap-2 text-[11px] leading-none text-[var(--ink-2)]" style={{ fontFamily: MONO_FONT }}>
          <span className="text-[var(--lime-ink)]">{prompt}</span>
          <span className="text-[var(--ink-dim)]">:</span>
          <span className="min-w-0 truncate text-[var(--ink-3)]">docs/research/{run.outputSlug}</span>
          <span className="ml-1 h-3 w-1 animate-pulse bg-[var(--lime-ink)]" aria-hidden="true" />
        </p>
      </div>

      <div className="max-h-[34vh] min-h-48 overflow-auto py-3" role="log" aria-label="Saída do processo">
        {visibleLines.map((line, index) => (
          <div
            key={`${index}-${line.kind}-${line.text}`}
            className="grid min-w-full grid-cols-[48px_86px_minmax(0,1fr)] items-start gap-3 px-4 py-0.5 text-[11px] leading-[1.55] hover:bg-[rgba(245,244,231,0.035)]"
            style={{ fontFamily: MONO_FONT }}
          >
            <span className="select-none text-right text-[var(--ink-dim)]">{String(index + 1).padStart(2, "0")}</span>
            <span
              className={cn(
                "select-none uppercase tracking-[0.12em]",
                line.kind === "local" && "text-[var(--lime-ink)]",
                line.kind === "stdout" && "text-[var(--blue-ink)]",
                line.kind === "stderr" && "text-[var(--danger-ink)]",
                line.kind === "plain" && "text-[var(--ink-dim)]",
              )}
            >
              {terminalLineLabel(line.kind)}
            </span>
            <span
              className={cn(
                "whitespace-pre-wrap break-words",
                line.kind === "stderr" ? "text-[var(--danger-ink)]" : "text-[var(--ink-2)]",
                line.kind === "local" && "text-[var(--ink-3)]",
              )}
            >
              {line.text || " "}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function RuntimeIssuePanel({ run, lines }: { run: ResearchRunState; lines: string[] }) {
  const failed = run.status === "failed"
  return (
    <div
      className={cn(
        "border-b border-[var(--rule)] px-4 py-3",
        failed ? "bg-[rgba(239,68,68,0.08)]" : "bg-[rgba(245,158,11,0.08)]",
      )}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          size={17}
          className={cn("mt-0.5 shrink-0", failed ? "text-[var(--danger-ink)]" : "text-[var(--warning-ink)]")}
        />
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-[10px] font-bold uppercase tracking-[0.14em]",
              failed ? "text-[var(--danger-ink)]" : "text-[var(--warning-ink)]",
            )}
            style={{ fontFamily: MONO_FONT }}
          >
            {failed ? "Falha do runtime" : "Atenção do runtime"}
          </p>
          <div className="mt-2 grid gap-1">
            {lines.slice(-4).map((line, index) => (
              <p key={`${line}-${index}`} className="text-[11px] leading-[1.45] text-[var(--ink-2)]" style={{ fontFamily: MONO_FONT }}>
                {line}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
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
  const doneCount = steps.filter((step) => step.state === "done").length
  const hasActive = steps.some((step) => step.state === "active" || step.state === "failed")
  const fillRatio = steps.length > 1 ? (hasActive ? doneCount : steps.length - 1) / (steps.length - 1) : 1
  const trackStyle = {
    gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))`,
    "--pipeline-fill": `calc((100% - 100% / ${steps.length}) * ${fillRatio})`,
  } as CSSProperties

  return (
    <div className="bg-[var(--surface)] px-6 py-6">
      <div
        className="mb-6 flex flex-wrap items-center justify-between gap-3 text-[10px] uppercase tracking-[0.14em] text-[var(--ink-dim)]"
        style={{ fontFamily: MONO_FONT }}
      >
        <span>
          Pipeline · <b className="font-medium text-[var(--ink)]">{cliLabel(run.cliId)}</b> · {run.runId.slice(0, 16)}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-2",
            run.status === "failed"
              ? "text-[var(--danger-ink)]"
              : liveLabel.startsWith("ATENÇÃO")
                ? "text-[var(--warning-ink)]"
                : "text-[var(--lime-ink)]",
          )}
        >
          {run.status === "running" || run.status === "queued" ? <span className="h-1.5 w-1.5 animate-pulse bg-[var(--lime-ink)]" /> : null}
          {liveLabel}
        </span>
      </div>

      <div className="relative grid gap-2" style={trackStyle}>
        <span className="absolute left-[calc(100%/14)] right-[calc(100%/14)] top-3 h-px bg-[var(--rule)]" />
        <span className="absolute left-[calc(100%/14)] top-3 h-px w-[var(--pipeline-fill)] bg-[var(--blue-ink)] shadow-[0_0_8px_rgba(0,153,255,0.18)]" />
        {steps.map((step) => (
          <div key={step.id} className="relative z-10 grid justify-items-center gap-2 text-center">
            <span
              className={cn(
                "grid h-7 w-7 place-items-center border bg-[var(--paper-deep)] text-[10px] font-bold",
                step.state === "done" && "border-[var(--ink)] bg-[var(--ink)] text-black",
                step.state === "active" && "border-[var(--lime-ink)] text-[var(--lime-ink)] shadow-[0_0_0_4px_rgba(209,255,0,0.08),0_0_18px_rgba(209,255,0,0.22)]",
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

function RuntimeStepRow({
  step,
  retrying,
  onRetry,
}: {
  step: RuntimeDetailStep
  retrying?: boolean
  onRetry?: () => void
}) {
  return (
    <article
      className={cn(
        "relative grid gap-0 border-b border-[var(--rule-soft)] last:border-b-0 lg:grid-cols-[76px_36px_minmax(0,1fr)_minmax(190px,260px)_108px]",
        step.state === "active" && "border-l-2 border-l-[var(--lime-ink)] bg-[rgba(209,255,0,0.025)]",
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
        {step.state === "active" ? (
          <span className="mt-2 h-[3px] overflow-hidden bg-[var(--paper-deep)]">
            <span className="block h-full w-1/3 animate-pulse bg-[var(--lime-ink)] shadow-[0_0_8px_rgba(209,255,0,0.35)]" />
          </span>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-[var(--rule-soft)] px-4 py-3 lg:flex-col lg:items-end lg:justify-center lg:border-l lg:border-t-0 lg:border-[var(--rule-soft)]">
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            disabled={retrying}
            title="Tentar de Novo"
            className="inline-flex h-6 items-center gap-1.5 bg-[var(--danger-ink)] px-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--ink)] transition-opacity hover:opacity-85 disabled:opacity-60"
            style={{ fontFamily: MONO_FONT }}
          >
            <RefreshCcw size={10} className={cn(retrying && "animate-spin")} />
            {retrying ? "Retrying" : "Retry"}
          </button>
        ) : (
          <RuntimeStepBadge state={step.state} />
        )}
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
    <section className="grid gap-4 border border-[var(--rule)] bg-[var(--paper-deep)] p-4 md:grid-cols-[minmax(0,1fr)_260px] md:items-end">
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

      <div className="grid gap-3">
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
      </div>
    </section>
  )
}

function StatusBadge({
  status,
  exitCode,
  hasIssue = false,
}: {
  status: ResearchRunState["status"]
  exitCode: number | null
  hasIssue?: boolean
}) {
  const done = status === "completed"
  const failed = status === "failed"
  const warning = hasIssue && !done && !failed
  const label = done ? "ok" : failed ? (exitCode === null ? "falha" : `exit ${exitCode}`) : warning ? "atenção" : "ativo"
  return (
    <span
      className={cn(
        "inline-flex h-8 items-center border px-2 text-[9px] uppercase tracking-[0.14em]",
        done && "border-[var(--lime-ink)] bg-[var(--lime-ink)] text-black",
        failed && "border-[var(--danger-ink)] text-[var(--danger-ink)]",
        warning && "border-[var(--warning-ink)] text-[var(--warning-ink)]",
        !done && !failed && !warning && "border-[var(--rule)] text-[var(--ink-3)]",
      )}
      style={{ fontFamily: MONO_FONT }}
    >
      {label}
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

function runtimeSummaryLabel(run: ResearchRunState) {
  const steps = buildRuntimeDetailSteps(run)
  const done = steps.filter((step) => step.state === "done").length
  const active = steps.filter((step) => step.state === "active").length
  const failed = steps.filter((step) => step.state === "failed").length
  const pending = steps.filter((step) => step.state === "pending").length
  if (failed > 0) return `${steps.length} steps · ${done} concluídos · ${failed} falhou · ${pending} pendentes`
  if (run.status === "completed") return `${steps.length} steps · todos concluídos · total ${formatElapsed(run.startedAt, run.updatedAt)}`
  return `${steps.length} steps · ${done} concluídos · ${active} em curso · ${pending} pendentes`
}

function buildRuntimeDetailSteps(run: ResearchRunState): RuntimeDetailStep[] {
  const progress = runProgress(run)
  const logLines = meaningfulLogLines(run.log)
  const latest = lastMeaningfulLine(run.log)
  const stdoutCount = logLines.filter((line) => line.startsWith("[stdout]")).length
  const stderrCount = logLines.filter((line) => line.startsWith("[stderr]")).length
  const issueLines = runIssueLines(run.log, run.status === "failed")
  const latestIssue = issueLines.at(-1)
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
      substeps: ["Protocolo · inline", "Saída · README/report/recommendations", "Governança · sem escrita fora de docs/research"],
    },
    {
      id: "evidence",
      short: "Evidência",
      name: "Investigar fontes e claims",
      desc: latestIssue
        ? `Último alerta recebido: ${latestIssue}`
        : latest
          ? `Último sinal recebido: ${latest}`
          : "Aguardando os primeiros eventos do runtime.",
      substeps: [
        stdoutCount > 0 ? `stdout · ${stdoutCount} evento${stdoutCount === 1 ? "" : "s"}` : "stdout · aguardando",
        stderrCount > 0 ? `stderr · ${stderrCount} evento${stderrCount === 1 ? "" : "s"}` : "stderr · limpo até agora",
        issueLines.length > 0 ? `alertas · ${issueLines.length}` : `Log · ${logLines.length} linha${logLines.length === 1 ? "" : "s"}`,
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
  return compactLogLine(last)
}

function compactLogLine(line: string) {
  return line
    .replace(/^\[(stdout|stderr|dash|localhost)\]\s*/i, "")
    .replace(/\s+/g, " ")
    .trim()
}

function runIssueLines(log: string, includeAnyStderr = false) {
  const issuePatterns = [
    /attempt\s+\d+\s+failed/i,
    /exhausted your capacity/i,
    /\bquota\b/i,
    /\brate\s*limit/i,
    /\b429\b/i,
    /\berror\b/i,
    /\berro\b/i,
    /\bfailed\b/i,
    /\bfalh/i,
    /exception/i,
    /timeout/i,
    /timed out/i,
    /permission denied/i,
    /unauthorized/i,
    /forbidden/i,
  ]

  let currentStream: "stdout" | "stderr" | null = null
  return meaningfulLogLines(log)
    .flatMap((rawLine) => {
      const streamMatch = rawLine.match(/^\[(stdout|stderr)\]\s*(.*)$/i)
      const bracketMatch = rawLine.match(/^\[([a-z]+)\]\s*(.*)$/i)
      let line = rawLine

      if (streamMatch) {
        currentStream = streamMatch[1]?.toLowerCase() === "stderr" ? "stderr" : "stdout"
        line = streamMatch[2] ?? ""
      } else if (bracketMatch) {
        currentStream = null
        line = bracketMatch[2] ?? rawLine
      }

      const compacted = compactLogLine(line)
      if (!compacted) return []

      const matchesIssue = issuePatterns.some((pattern) => pattern.test(compacted)) && currentStream !== "stdout"
      if (matchesIssue || (includeAnyStderr && currentStream === "stderr")) return [compacted]
      return []
    })
    .slice(-8)
}

function parseTerminalLines(log: string): TerminalLine[] {
  return log.split("\n").flatMap((rawLine): TerminalLine[] => {
    const line = rawLine.trimEnd()
    if (!line.trim()) return []

    const match = line.match(/^\[(stdout|stderr|dash|localhost)\]\s*(.*)$/i)
    if (!match) return [{ kind: "plain", text: line }]

    const source = match[1]?.toLowerCase()
    const text = match[2] ?? ""
    if (source === "stderr") return [{ kind: "stderr", text }]
    if (source === "stdout") return [{ kind: "stdout", text }]
    return [{ kind: "local", text }]
  })
}

function terminalLineLabel(kind: TerminalLineKind) {
  if (kind === "local") return "local"
  if (kind === "stdout") return "stdout"
  if (kind === "stderr") return "erro"
  return "shell"
}

function terminalPrompt() {
  return "alan@Mac-Studio-de-Alan"
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

function formatElapsed(start: string, end: string) {
  const startTime = new Date(start).getTime()
  const endTime = new Date(end).getTime()
  if (Number.isNaN(startTime) || Number.isNaN(endTime) || endTime < startTime) return "0s"
  const seconds = Math.round((endTime - startTime) / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${minutes}m${String(rest).padStart(2, "0")}s`
}

function datedResearchSlug(baseSlug: string) {
  const match = baseSlug.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/)
  if (match) return `${match[1]}-${truncateSlug(match[2] ?? "", MAX_RESEARCH_TOPIC_SLUG_LENGTH) || "research-run"}`
  const compactSlug = truncateSlug(baseSlug, MAX_RESEARCH_TOPIC_SLUG_LENGTH)
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}-${compactSlug || "research-run"}`
}

function truncateSlug(slug: string, maxLength: number) {
  if (slug.length <= maxLength) return slug
  const parts = slug.split("-")
  const kept: string[] = []
  for (const part of parts) {
    const next = [...kept, part].join("-")
    if (next.length > maxLength) break
    kept.push(part)
  }
  return kept.length > 0 ? kept.join("-") : slug.slice(0, maxLength).replace(/-+$/g, "")
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
