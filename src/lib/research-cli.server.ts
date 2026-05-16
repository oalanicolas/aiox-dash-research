import "server-only"

import { execFile, spawn } from "node:child_process"
import { lookup } from "node:dns/promises"
import { accessSync, constants, existsSync } from "node:fs"
import { appendFile, mkdir, readFile, rename, writeFile } from "node:fs/promises"
import { isIP } from "node:net"
import { delimiter } from "node:path"
import os from "node:os"
import path from "node:path"
import {
  type ResearchByokConfig,
  buildResearchConsolidationPrompt,
  buildResearchWorkbenchPrompt,
  normalizeResearchConsolidationRunRequest,
  normalizeResearchRunRequest,
  type ResearchCliCandidateStatus,
  type ResearchCliDiscovery,
  type ResearchCliId,
  type ResearchCliStatus,
  type ResearchConsolidationRunRequest,
  type ResearchRunRequest,
  type ResearchRunState,
} from "@/lib/research-workbench-contract"
import { getDashWorkspaceRoot } from "@/lib/workspace-root.server"

type CliDefinition = {
  id: ResearchCliId
  name: string
  bin: string
  fallbackBins?: string[]
  versionArgs: string[]
  launchSupported: boolean
  installHint: string
  launchHint: string
}

const CLI_DEFINITIONS: CliDefinition[] = [
  {
    id: "claude",
    name: "Claude Code",
    bin: "claude",
    fallbackBins: ["openclaude"],
    versionArgs: ["--version"],
    launchSupported: true,
    installHint: "Instale e autentique o Claude Code; o AIOX Research procura `claude` no PATH.",
    launchHint: "Executa `claude -p` com prompt via stdin.",
  },
  {
    id: "codex",
    name: "Codex CLI",
    bin: "codex",
    versionArgs: ["--version"],
    launchSupported: true,
    installHint: "Instale e autentique o Codex CLI; o AIOX Research procura `codex` no PATH.",
    launchHint: "Executa `codex exec` no workspace com sandbox workspace-write.",
  },
  {
    id: "gemini",
    name: "Gemini CLI",
    bin: "gemini",
    versionArgs: ["--version"],
    launchSupported: true,
    installHint: "Instale e autentique o Gemini CLI; o AIOX Research procura `gemini` no PATH.",
    launchHint: "Executa `gemini --yolo` com prompt via stdin.",
  },
  {
    id: "opencode",
    name: "OpenCode",
    bin: "opencode",
    versionArgs: ["--version"],
    launchSupported: false,
    installHint: "Instale o OpenCode se quiser usá-lo como runtime de pesquisa.",
    launchHint: "Detectado para inventário; execução web ainda não foi habilitada neste adapter.",
  },
]

type ProbeResult = {
  path: string | null
  version: string | null
  candidates: ResearchCliCandidateStatus[]
}

type VersionProbeResult = {
  version: string | null
  error: string | null
}

type CliInvocation = {
  command: string
  args: string[]
  env: Record<string, string>
  shell?: boolean
}

type PersistedRunState = Omit<ResearchRunState, "log"> & {
  log: string
}

const RUNS_DIR = path.join(getDashWorkspaceRoot(), ".tmp", "aiox-research-runs")
const LOCAL_LOG_PREFIX = "[localhost]"
const stateWriteQueues = new Map<string, Promise<void>>()

export async function getResearchCliDiscovery(): Promise<ResearchCliDiscovery> {
  const clis = await Promise.all(CLI_DEFINITIONS.map(probeCliDefinition))
  return {
    workspaceRoot: getDashWorkspaceRoot(),
    generatedAt: new Date().toISOString(),
    clis,
  }
}

export async function startResearchRun(input: Partial<ResearchRunRequest>): Promise<ResearchRunState> {
  const request = normalizeResearchRunRequest(input)
  if (request.query.length < 8) {
    throw new Error("Informe uma pergunta de pesquisa com pelo menos 8 caracteres.")
  }
  if (request.cliId === "byok") {
    if (!request.byok?.apiKey || !request.byok.baseUrl || !request.byok.model) {
      throw new Error("Configure base URL, API key e modelo para executar via BYOK.")
    }
    const outputSlug = request.outputSlug ?? "research-byok"
    return startByokBackedRun({
      cliId: request.cliId,
      methodId: request.methodId,
      query: request.query,
      outputSlug,
      prompt: buildResearchWorkbenchPrompt(request),
      logLabel: "pesquisa",
      byok: request.byok,
    })
  }

  const outputSlug = request.outputSlug ?? "research-run"
  return startCliBackedRun({
    cliId: request.cliId,
    methodId: request.methodId,
    query: request.query,
    outputSlug,
    prompt: buildResearchWorkbenchPrompt(request),
    logLabel: "pesquisa",
  })
}

export async function startResearchConsolidationRun(
  input: Partial<ResearchConsolidationRunRequest>,
): Promise<ResearchRunState> {
  const request = normalizeResearchConsolidationRunRequest(input)
  if (request.query.length < 8) {
    throw new Error("Informe uma pergunta de pesquisa com pelo menos 8 caracteres.")
  }
  if (request.sourceCliIds.length < 2 && request.sourceOutputSlugs.length < 2) {
    throw new Error("Selecione pelo menos dois runtimes concluídos para consolidar.")
  }

  return startCliBackedRun({
    cliId: request.cliId,
    methodId: request.methodId,
    query: request.query,
    outputSlug: request.outputSlug ?? "research-consolidado",
    prompt: buildResearchConsolidationPrompt(request),
    logLabel: "consolidação",
  })
}

type CliBackedRunInput = Pick<ResearchRunState, "cliId" | "methodId" | "query" | "outputSlug"> & {
  prompt: string
  logLabel: string
}

type ByokBackedRunInput = CliBackedRunInput & {
  byok: ResearchByokConfig
}

async function startCliBackedRun(input: CliBackedRunInput): Promise<ResearchRunState> {
  const discovery = await getResearchCliDiscovery()
  const cli = discovery.clis.find((candidate) => candidate.id === input.cliId)
  if (!cli?.available || !cli.path) {
    throw new Error("CLI selecionado não está disponível no PATH detectado pelo AIOX Research.")
  }
  if (!cli.launchSupported) {
    throw new Error("Este CLI foi detectado, mas ainda não possui execução web habilitada.")
  }

  await mkdir(RUNS_DIR, { recursive: true })

  const runId = `${Date.now()}-${input.cliId}-${safeId(input.outputSlug)}`
  const researchDir = await ensureResearchRunShell({
    workspaceRoot: discovery.workspaceRoot,
    runId,
    query: input.query,
    methodId: input.methodId,
    outputSlug: input.outputSlug,
    cliId: input.cliId,
    prompt: input.prompt,
    logLabel: input.logLabel,
  })
  const logPath = path.join(RUNS_DIR, `${runId}.log`)
  const statePath = path.join(RUNS_DIR, `${runId}.json`)
  const now = new Date().toISOString()
  const initialState: ResearchRunState = {
    runId,
    cliId: input.cliId,
    methodId: input.methodId,
    query: input.query,
    outputSlug: input.outputSlug,
    status: "running",
    startedAt: now,
    updatedAt: now,
    exitCode: null,
    log: [
      `${LOCAL_LOG_PREFIX} ${now} iniciando ${input.logLabel} com ${cli.name}`,
      `${LOCAL_LOG_PREFIX} workspace: ${discovery.workspaceRoot}`,
      `${LOCAL_LOG_PREFIX} diretório da pesquisa: ${researchDir}`,
      `${LOCAL_LOG_PREFIX} runtime dir: ${path.join(researchDir, "runtimes", input.cliId)}`,
      "",
    ].join("\n"),
    logPath,
  }
  await persistRunState(statePath, initialState)

  const invocation = buildInvocation(input.cliId, cli.path, discovery.workspaceRoot)
  const child = spawn(invocation.command, invocation.args, {
    cwd: discovery.workspaceRoot,
    shell: invocation.shell,
    env: {
      ...process.env,
      ...invocation.env,
      AIOX_RESEARCH_RUN_ID: runId,
      AIOX_DASH_RESEARCH_RUN_ID: runId,
    },
    stdio: ["pipe", "pipe", "pipe"],
  })

  child.stdout.setEncoding("utf8")
  child.stderr.setEncoding("utf8")

  child.stdout.on("data", (chunk: string) => {
    void appendRunLog(statePath, formatProcessChunk("stdout", chunk)).catch(() => undefined)
  })
  child.stderr.on("data", (chunk: string) => {
    void appendRunLog(statePath, formatProcessChunk("stderr", chunk)).catch(() => undefined)
  })
  child.on("error", (error) => {
    void markRunFinished(statePath, "failed", null, error.message).catch(() => undefined)
  })
  child.on("close", (code) => {
    void markRunFinished(statePath, code === 0 ? "completed" : "failed", code, `processo finalizado com código ${code ?? "n/a"}`).catch(() => undefined)
  })

  child.stdin.write(input.prompt)
  child.stdin.end()

  return initialState
}

async function startByokBackedRun(input: ByokBackedRunInput): Promise<ResearchRunState> {
  await mkdir(RUNS_DIR, { recursive: true })

  const runId = `${Date.now()}-byok-${safeId(input.outputSlug)}`
  const workspaceRoot = getDashWorkspaceRoot()
  const researchDir = await ensureResearchRunShell({
    workspaceRoot,
    runId,
    query: input.query,
    methodId: input.methodId,
    outputSlug: input.outputSlug,
    cliId: "byok",
    prompt: input.prompt,
    logLabel: input.logLabel,
  })
  const logPath = path.join(RUNS_DIR, `${runId}.log`)
  const statePath = path.join(RUNS_DIR, `${runId}.json`)
  const now = new Date().toISOString()
  const providerLabel = input.byok.providerLabel || "OpenAI compatible"
  const initialState: ResearchRunState = {
    runId,
    cliId: "byok",
    methodId: input.methodId,
    query: input.query,
    outputSlug: input.outputSlug,
    status: "running",
    startedAt: now,
    updatedAt: now,
    exitCode: null,
    log: [
      `${LOCAL_LOG_PREFIX} ${now} iniciando ${input.logLabel} com BYOK`,
      `${LOCAL_LOG_PREFIX} provider: ${providerLabel}`,
      `${LOCAL_LOG_PREFIX} model: ${input.byok.model}`,
      `${LOCAL_LOG_PREFIX} diretório da pesquisa: ${researchDir}`,
      `${LOCAL_LOG_PREFIX} runtime dir: ${path.join(researchDir, "runtimes", "byok")}`,
      "",
    ].join("\n"),
    logPath,
  }
  await persistRunState(statePath, initialState)

  void executeByokRun(statePath, input)

  return initialState
}

async function executeByokRun(statePath: string, input: ByokBackedRunInput) {
  try {
    const chatUrl = await resolveByokChatUrl(input.byok.baseUrl)
    await appendRunLog(statePath, `${LOCAL_LOG_PREFIX} ${new Date().toISOString()} conectando ao endpoint BYOK\n`)

    const response = await fetch(chatUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${input.byok.apiKey}`,
      },
      body: JSON.stringify({
        model: input.byok.model,
        messages: [
          {
            role: "user",
            content: input.prompt,
          },
        ],
        temperature: 0.2,
        stream: false,
      }),
    })

    const rawBody = await response.text()
    if (!response.ok) {
      throw new Error(`upstream ${response.status}: ${redactSecret(rawBody, input.byok.apiKey).slice(0, 1400)}`)
    }

    const parsed = JSON.parse(rawBody) as OpenAIChatCompletionResponse
    const answer = extractOpenAICompatibleAnswer(parsed)
    if (!answer.trim()) throw new Error("O provider BYOK respondeu sem conteúdo textual.")

    const usage = parsed.usage?.total_tokens ? `\n${LOCAL_LOG_PREFIX} tokens totais reportados: ${parsed.usage.total_tokens}` : ""
    await appendRunLog(statePath, `[stdout] ${answer}${usage}\n`)
    await markRunFinished(statePath, "completed", 0, "processo BYOK finalizado com sucesso")
  } catch (error) {
    const message = error instanceof Error ? redactSecret(error.message, input.byok.apiKey) : "Falha ao executar BYOK."
    await markRunFinished(statePath, "failed", 1, message)
  }
}

type ResearchShellInput = Pick<ResearchRunState, "runId" | "query" | "methodId" | "outputSlug" | "cliId"> & {
  workspaceRoot: string
  prompt: string
  logLabel: string
}

async function ensureResearchRunShell(input: ResearchShellInput) {
  const researchDir = path.join(input.workspaceRoot, "docs", "research", input.outputSlug)
  const runtimeDir = path.join(researchDir, "runtimes", input.cliId)
  const now = new Date().toISOString()

  await mkdir(runtimeDir, { recursive: true })
  await Promise.all([
    writeIfMissing(
      path.join(researchDir, "README.md"),
      [
        `# ${input.query}`,
        "",
        "> Pesquisa em execução via AIOX Research.",
        "",
        "Esta pasta é a unidade canônica da pesquisa. Saídas individuais de CLIs/LLMs ficam em `runtimes/<runtime>/`; os arquivos raiz são usados pelo Observatory e pela consolidação.",
        "",
        "O contrato de execução segue o pipeline completo `SP-TECH-RESEARCH` do Research Squad: decomposição, ondas de pesquisa, gate de cobertura, síntese, verificação de citações e documentação rica.",
        "",
        "## Estado",
        "",
        "- Status: em execução",
        `- Modo: ${input.methodId}`,
        `- Slug: ${input.outputSlug}`,
        "",
        "## Runtimes",
        "",
        `- ${input.cliId}: \`runtimes/${input.cliId}/\``,
        "",
        "## Próximo passo",
        "",
        "Quando pelo menos dois runtimes terminarem, use a ação de consolidação no AIOX Research para reconciliar consenso, dissensos, lacunas e recomendações nos arquivos raiz.",
        "",
      ].join("\n"),
    ),
    writeIfMissing(path.join(researchDir, "00-query-original.md"), `# Pergunta original\n\n${input.query}\n`),
    writeIfMissing(path.join(researchDir, "01-deep-research-prompt.md"), `# Contrato de execução\n\n\`\`\`txt\n${input.prompt}\n\`\`\`\n`),
    writeIfMissing(
      path.join(researchDir, "02-research-report.md"),
      [
        "# Relatório em formação",
        "",
        "A consolidação final ainda não foi executada. Consulte as subpastas em `runtimes/` para as saídas individuais de cada runtime.",
        "",
      ].join("\n"),
    ),
    writeIfMissing(
      path.join(researchDir, "03-recommendations.md"),
      [
        "# Recomendações em formação",
        "",
        "As recomendações consolidadas serão materializadas aqui após a comparação dos runtimes.",
        "",
      ].join("\n"),
    ),
    writeIfMissing(
      path.join(researchDir, "quick-wins.md"),
      [
        "# Quick wins",
        "",
        "Aguardando consolidação dos runtimes.",
        "",
      ].join("\n"),
    ),
    writeIfMissing(
      path.join(researchDir, "curiosity_queue.yaml"),
      [
        "schema: aiox-research-curiosity-v1",
        "items:",
        "  - question: \"Quais lacunas permaneceram após a execução paralela?\"",
        "    status: pending",
        "    source: dash-scaffold",
        "",
      ].join("\n"),
    ),
    writeIfMissing(
      path.join(researchDir, "evolving_report.md"),
      [
        "# Evolving report",
        "",
        "Estado inicial criado pelo AIOX Research. Os runtimes devem atualizar seus próprios `runtimes/<runtime>/evolving_report.md`; a consolidação final reconcilia o arquivo raiz.",
        "",
      ].join("\n"),
    ),
    writeIfMissing(
      path.join(researchDir, "metrics.yaml"),
      [
        "schema: aiox-research-metrics-v1",
        "status: running",
        `decision: ${escapeYaml("em execução")}`,
        "coverage_score: 10",
        "integrity_score: 0",
        "confidence_score: 0",
        "sources_total: 0",
        "sources_high: 0",
        "sources_medium: 0",
        "inferred:",
        "  coverage_score: true",
        "  integrity_score: true",
        "runtime_layout: parallel-runtimes-v1",
        "",
      ].join("\n"),
    ),
    writeIfMissing(
      path.join(researchDir, "pipeline-state.yaml"),
      [
        "schema: aiox-research-pipeline-v1",
        `status: ${escapeYaml("running")}`,
        `output_dir: ${escapeYaml(`docs/research/${input.outputSlug}`)}`,
        "layout: parallel-runtimes-v1",
        "phases:",
        "  - id: prompt",
        "    status: done",
        "  - id: runtimes",
        "    status: running",
        "  - id: consolidation",
        "    status: pending",
        "",
      ].join("\n"),
    ),
    writeIfMissing(
      path.join(researchDir, "sources.yaml"),
      [
        "schema: aiox-research-sources-v1",
        "totals:",
        "  total: 0",
        "  high: 0",
        "  medium: 0",
        "  low: 0",
        "  date_coverage_ratio: 0",
        "sources: []",
        "",
      ].join("\n"),
    ),
    writeIfMissing(
      path.join(researchDir, "players.yaml"),
      [
        "schema: aiox-research-players-v1",
        "players: []",
        "",
      ].join("\n"),
    ),
    writeIfMissing(
      path.join(researchDir, "ux-patterns.yaml"),
      [
        "schema: aiox-research-ux-patterns-v1",
        "patterns: []",
        "",
      ].join("\n"),
    ),
    writeIfMissing(
      path.join(researchDir, "matrices.yaml"),
      [
        "schema: aiox-research-matrices-v1",
        "matrices: []",
        "",
      ].join("\n"),
    ),
    writeIfMissing(
      path.join(researchDir, "research-graph.json"),
      `${JSON.stringify(
        {
          schema: "aiox-research-graph-v1",
          status: "running",
          nodes: [
            { id: "query", type: "query", label: input.query },
            { id: "runtimes", type: "runtime_group", label: "Runtimes paralelos" },
          ],
          edges: [{ from: "query", to: "runtimes", type: "executes" }],
        },
        null,
        2,
      )}\n`,
    ),
    writeIfMissing(
      path.join(runtimeDir, "README.md"),
      [
        `# Runtime ${input.cliId}`,
        "",
        `- Run ID: ${input.runId}`,
        `- Tipo: ${input.logLabel}`,
        `- Início: ${now}`,
        "",
        "## Contrato",
        "",
        "- Seguir `SP-TECH-RESEARCH` com decomposição, ondas, coverage gate, síntese, citation gate e documentação.",
        "- Gravar artefatos estruturados nesta pasta do runtime sem sobrescrever outros runtimes.",
        "- Registrar limitações de ferramentas/fontes e reduzir confiança quando necessário.",
        "",
      ].join("\n"),
    ),
    writeIfMissing(path.join(runtimeDir, "prompt.md"), `# Prompt do runtime\n\n\`\`\`txt\n${input.prompt}\n\`\`\`\n`),
  ])

  await appendExecutionEvent(path.join(researchDir, "execution-log.jsonl"), {
    ts: now,
    event: "runtime.started",
    run_id: input.runId,
    runtime: input.cliId,
    runtime_dir: `runtimes/${input.cliId}`,
    kind: input.logLabel,
  })

  return researchDir
}

async function writeIfMissing(filePath: string, content: string) {
  if (existsSync(filePath)) return
  await writeFile(filePath, content, "utf8")
}

async function appendExecutionEvent(filePath: string, event: Record<string, unknown>) {
  await appendFile(filePath, `${JSON.stringify(event)}\n`, "utf8")
}

function escapeYaml(value: string) {
  return JSON.stringify(value)
}

export async function getResearchRunState(runId: string): Promise<ResearchRunState | null> {
  const id = sanitizeId(runId)
  if (id !== runId) return null
  const statePath = path.join(RUNS_DIR, `${id}.json`)
  if (!existsSync(statePath)) return null
  let state: PersistedRunState
  try {
    state = await readState(statePath)
  } catch {
    return null
  }
  return {
    ...state,
    log: tail(state.log, 24_000),
  }
}

async function probeCliDefinition(definition: CliDefinition): Promise<ResearchCliStatus> {
  const candidates = resolveBinCandidates([definition.bin, ...(definition.fallbackBins ?? [])])
  const candidateStatuses: ResearchCliCandidateStatus[] = []
  for (const candidate of candidates) {
    const probe = await probeVersion(candidate, definition.versionArgs)
    const candidateStatus = {
      path: candidate,
      ok: Boolean(probe.version),
      version: probe.version,
      error: probe.error,
    }
    candidateStatuses.push(candidateStatus)
    if (probe.version) {
      return toCliStatus(definition, {
        path: candidate,
        version: probe.version,
        candidates: candidateStatuses,
      })
    }
  }

  if (candidates.length === 0) {
    return toCliStatus(definition, { path: null, version: null, candidates: [] })
  }

  return toCliStatus(definition, { path: null, version: null, candidates: candidateStatuses })
}

function toCliStatus(definition: CliDefinition, probe: ProbeResult): ResearchCliStatus {
  return {
    id: definition.id,
    name: definition.name,
    bin: definition.bin,
    available: Boolean(probe.path),
    launchSupported: definition.launchSupported,
    version: probe.version,
    path: probe.path,
    candidates: probe.candidates,
    installHint: definition.installHint,
    launchHint: definition.launchHint,
  }
}

function resolveBinCandidates(bins: string[]) {
  const candidates: string[] = []
  const seen = new Set<string>()
  for (const bin of bins) {
    for (const resolved of resolveOnPath(bin)) {
      if (seen.has(resolved)) continue
      seen.add(resolved)
      candidates.push(resolved)
    }
  }
  return candidates
}

function resolveOnPath(bin: string) {
  const seen = new Set<string>()
  const candidates = [
    ...(process.env.PATH ?? "").split(delimiter),
    ...wellKnownCliDirs(),
  ].filter((entry) => {
    if (!entry || seen.has(entry)) return false
    seen.add(entry)
    return true
  })

  const matches: string[] = []
  for (const dir of candidates) {
    for (const candidate of executableCandidates(dir, bin)) {
      if (isExecutable(candidate)) matches.push(candidate)
    }
  }
  return matches
}

function executableCandidates(dir: string, bin: string) {
  const explicitExtension = Boolean(path.extname(bin))
  if (process.platform !== "win32" || explicitExtension) return [path.join(dir, bin)]

  return windowsExecutableExtensions().map((extension) => path.join(dir, `${bin}${extension}`))
}

function windowsExecutableExtensions() {
  const raw = process.env.PATHEXT || ".COM;.EXE;.BAT;.CMD"
  const extensions = raw
    .split(";")
    .map((extension) => extension.trim().toLowerCase())
    .filter(Boolean)
  return ["", ...extensions]
}

function wellKnownCliDirs() {
  const home = os.homedir()
  const dirs = [
    "/opt/homebrew/bin",
    "/usr/local/bin",
    "/usr/bin",
    "/bin",
    path.join(home, ".local", "bin"),
    path.join(home, ".npm-global", "bin"),
    path.join(home, ".bun", "bin"),
    path.join(home, ".cargo", "bin"),
  ]
  if (process.platform === "win32") {
    dirs.push(
      path.join(home, "AppData", "Roaming", "npm"),
      path.join(home, ".bun", "bin"),
      path.join(home, "scoop", "shims"),
    )
  }
  return dirs
}

function isExecutable(candidate: string) {
  try {
    if (process.platform === "win32") return existsSync(candidate)
    accessSync(candidate, constants.X_OK)
    return true
  } catch {
    return false
  }
}

async function probeVersion(command: string, args: string[]) {
  return new Promise<VersionProbeResult>((resolve) => {
    execFile(command, args, { timeout: 3000, maxBuffer: 256 * 1024, shell: shouldUseShell(command) }, (error, stdout, stderr) => {
      const output = `${stdout}${stderr}`.trim()
      if (error) {
        resolve({ version: null, error: compactProbeError(error, output, command) })
        return
      }
      const version = output.split("\n")[0]?.trim()
      resolve(version ? { version, error: null } : { version: null, error: "Probe não retornou versão." })
    })
  })
}

function compactProbeError(error: unknown, output: string, command: string) {
  const errnoMatch = output.match(/spawn\s+(.+?)\s+ENOENT/i)
  if (errnoMatch) return `ENOENT: ${errnoMatch[1]}`

  const typedError = error as NodeJS.ErrnoException & { code?: string | number }
  if (typedError.code === "ENOENT") return `ENOENT: ${typedError.path ?? command}`
  if (typedError.code) return `Probe falhou (${typedError.code}).`

  const message = error instanceof Error ? error.message : String(error)
  const detail = output.split("\n").map((line) => line.trim()).filter(Boolean)[0]
  return detail ? `${message}: ${detail}` : message
}

function shouldUseShell(command: string) {
  return process.platform === "win32" && /\.(bat|cmd)$/i.test(command)
}

function buildInvocation(cliId: ResearchCliId, command: string, workspaceRoot: string): CliInvocation {
  if (cliId === "claude") {
    return {
      command,
      args: ["-p", "--permission-mode", "bypassPermissions"],
      env: {},
      shell: shouldUseShell(command),
    }
  }
  if (cliId === "codex") {
    return {
      command,
      args: [
        "exec",
        "--skip-git-repo-check",
        "--sandbox",
        "workspace-write",
        "-c",
        "sandbox_workspace_write.network_access=true",
        "-C",
        workspaceRoot,
      ],
      env: {},
      shell: shouldUseShell(command),
    }
  }
  if (cliId === "gemini") {
    return {
      command,
      args: ["--yolo"],
      env: { GEMINI_CLI_TRUST_WORKSPACE: "true" },
      shell: shouldUseShell(command),
    }
  }
  throw new Error(`Adapter sem launcher: ${cliId}`)
}

async function readState(statePath: string): Promise<PersistedRunState> {
  const raw = await readFile(statePath, "utf8")
  const parsed = parsePersistedState(raw) as PersistedRunState
  return hydrateStateLogFromSidecar(parsed, statePath)
}

function parsePersistedState(raw: string) {
  try {
    return JSON.parse(raw)
  } catch (error) {
    const firstObject = extractFirstJsonObject(raw)
    if (!firstObject) throw error
    return JSON.parse(firstObject)
  }
}

async function hydrateStateLogFromSidecar(state: PersistedRunState, statePath: string): Promise<PersistedRunState> {
  const fallbackLogPath = path.join(path.dirname(statePath), `${path.basename(statePath, ".json")}.log`)
  const logPath = typeof state.logPath === "string" && state.logPath ? state.logPath : fallbackLogPath
  if (!existsSync(logPath)) return { ...state, logPath, log: typeof state.log === "string" ? state.log : "" }

  try {
    const sidecarLog = await readFile(logPath, "utf8")
    const stateLog = typeof state.log === "string" ? state.log : ""
    return {
      ...state,
      logPath,
      log: sidecarLog.length >= stateLog.length ? sidecarLog : stateLog,
    }
  } catch {
    return { ...state, logPath, log: typeof state.log === "string" ? state.log : "" }
  }
}

function extractFirstJsonObject(raw: string) {
  let start = -1
  let depth = 0
  let inString = false
  let escaped = false

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index]
    if (start === -1) {
      if (char === "{") {
        start = index
        depth = 1
      }
      continue
    }

    if (inString) {
      if (escaped) {
        escaped = false
      } else if (char === "\\") {
        escaped = true
      } else if (char === "\"") {
        inString = false
      }
      continue
    }

    if (char === "\"") {
      inString = true
    } else if (char === "{") {
      depth += 1
    } else if (char === "}") {
      depth -= 1
      if (depth === 0) return raw.slice(start, index + 1)
    }
  }

  return null
}

async function persistRunState(statePath: string, state: ResearchRunState) {
  await writeFile(state.logPath, state.log, "utf8")
  const tmpPath = `${statePath}.${process.pid}.tmp`
  await writeFile(tmpPath, JSON.stringify(state, null, 2), "utf8")
  await rename(tmpPath, statePath)
}

async function appendRunLog(statePath: string, chunk: string) {
  await enqueueRunStateWrite(statePath, async () => {
    const state = await readState(statePath)
    const updated: ResearchRunState = {
      ...state,
      log: `${state.log}${chunk}`,
      updatedAt: new Date().toISOString(),
    }
    await persistRunState(statePath, updated)
  })
}

async function markRunFinished(
  statePath: string,
  status: ResearchRunState["status"],
  exitCode: number | null,
  message: string,
) {
  await enqueueRunStateWrite(statePath, async () => {
    const state = await readState(statePath)
    const updatedAt = new Date().toISOString()
    const updated: ResearchRunState = {
      ...state,
      status,
      exitCode,
      updatedAt,
      log: `${state.log}\n${LOCAL_LOG_PREFIX} ${updatedAt} ${message}\n`,
    }
    await persistRunState(statePath, updated)
    await persistRuntimeCompletionArtifacts(updated, message)
  })
}

function enqueueRunStateWrite(statePath: string, operation: () => Promise<void>) {
  const previous = stateWriteQueues.get(statePath) ?? Promise.resolve()
  const next = previous.catch(() => undefined).then(operation)
  stateWriteQueues.set(statePath, next)
  void next
    .finally(() => {
      if (stateWriteQueues.get(statePath) === next) stateWriteQueues.delete(statePath)
    })
    .catch(() => undefined)
  return next
}

type OpenAIMessageContentPart = string | { text?: unknown; type?: unknown }

type OpenAIChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | OpenAIMessageContentPart[]
    }
    text?: string
  }>
  usage?: {
    total_tokens?: number
  }
}

async function resolveByokChatUrl(baseUrl: string) {
  const url = buildOpenAIChatCompletionUrl(baseUrl)
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("baseUrl BYOK deve usar http:// ou https://.")
  }

  await assertPublicByokHost(url.hostname)
  return url.toString()
}

function buildOpenAIChatCompletionUrl(baseUrl: string) {
  let url: URL
  try {
    url = new URL(baseUrl)
  } catch {
    throw new Error("baseUrl BYOK inválida.")
  }

  const pathname = url.pathname.replace(/\/+$/, "")
  if (pathname.endsWith("/chat/completions")) return url

  const versionedPathname = pathname.endsWith("/v1") ? pathname : `${pathname}/v1`
  url.pathname = `${versionedPathname}/chat/completions`.replace(/\/{2,}/g, "/")
  return url
}

async function assertPublicByokHost(rawHostname: string) {
  const hostname = rawHostname.replace(/^\[|\]$/g, "").toLowerCase()
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new Error("baseUrl BYOK não pode apontar para localhost.")
  }

  if (isIP(hostname)) {
    if (isForbiddenIp(hostname)) throw new Error("baseUrl BYOK não pode apontar para IP privado, loopback ou link-local.")
    return
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true })
  if (addresses.length === 0) throw new Error("baseUrl BYOK não resolveu nenhum endereço.")
  if (addresses.some((entry) => isForbiddenIp(entry.address))) {
    throw new Error("baseUrl BYOK resolveu para IP privado, loopback ou link-local.")
  }
}

function isForbiddenIp(address: string) {
  const normalized = address.toLowerCase()
  if (normalized.startsWith("::ffff:")) {
    return isForbiddenIpv4(normalized.replace("::ffff:", ""))
  }
  if (isIP(normalized) === 4) return isForbiddenIpv4(normalized)
  if (isIP(normalized) === 6) return isForbiddenIpv6(normalized)
  return true
}

function isForbiddenIpv4(address: string) {
  const parts = address.split(".").map((part) => Number(part))
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true
  const [a, b] = parts
  if (a === undefined || b === undefined) return true

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  )
}

function isForbiddenIpv6(address: string) {
  const normalized = address.toLowerCase()
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:") ||
    normalized.startsWith("ff")
  )
}

function extractOpenAICompatibleAnswer(response: OpenAIChatCompletionResponse) {
  const choice = response.choices?.[0]
  const content = choice?.message?.content
  if (typeof content === "string") return content
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part
        return typeof part.text === "string" ? part.text : ""
      })
      .join("")
  }
  return choice?.text ?? ""
}

function redactSecret(value: string, secret: string) {
  return secret ? value.split(secret).join("[redacted]") : value
}

async function persistRuntimeCompletionArtifacts(state: ResearchRunState, message: string) {
  const workspaceRoot = getDashWorkspaceRoot()
  const researchDir = path.join(workspaceRoot, "docs", "research", state.outputSlug)
  const runtimeDir = path.join(researchDir, "runtimes", state.cliId)
  await mkdir(runtimeDir, { recursive: true })
  await Promise.all([
    writeFile(path.join(runtimeDir, "raw-output.log"), state.log, "utf8"),
    writeFile(
      path.join(runtimeDir, "runtime-summary.md"),
      [
        `# ${state.cliId} · ${state.status}`,
        "",
        `- Run ID: ${state.runId}`,
        `- Status: ${state.status}`,
        `- Exit code: ${state.exitCode ?? "n/a"}`,
        `- Atualizado em: ${state.updatedAt}`,
        "",
        "## Última saída",
        "",
        "```txt",
        tail(extractRuntimeSignal(state.log), 8_000),
        "```",
        "",
      ].join("\n"),
      "utf8",
    ),
    appendExecutionEvent(path.join(researchDir, "execution-log.jsonl"), {
      ts: state.updatedAt,
      event: state.status === "completed" ? "runtime.completed" : "runtime.failed",
      run_id: state.runId,
      runtime: state.cliId,
      exit_code: state.exitCode,
      message,
    }),
  ])
}

function extractRuntimeSignal(log: string) {
  const lines = log
    .split("\n")
    .filter((line) => line.startsWith("[stdout]") || line.startsWith("[stderr]"))
  return lines.length > 0 ? lines.join("\n") : log
}

function safeId(value: string) {
  return sanitizeId(value).slice(0, 72).replace(/-+$/g, "")
}

function sanitizeId(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-")
}

function formatProcessChunk(stream: "stdout" | "stderr", chunk: string) {
  const normalized = stripAnsi(chunk).replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  if (!normalized) return ""
  const hasTrailingNewline = normalized.endsWith("\n")
  const lines = normalized.split("\n")
  if (hasTrailingNewline) lines.pop()
  const prefixed = lines.map((line) => `[${stream}] ${line}`).join("\n")
  return `${prefixed}${hasTrailingNewline ? "\n" : ""}`
}

function stripAnsi(value: string) {
  return value.replace(
    // eslint-disable-next-line no-control-regex
    /[\u001B\u009B][[\]()#;?]*(?:(?:(?:[a-zA-Z\d]*(?:;[a-zA-Z\d]*)*)?\u0007)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g,
    "",
  )
}

function tail(value: string, maxLength: number) {
  if (value.length <= maxLength) return value
  return value.slice(value.length - maxLength)
}
