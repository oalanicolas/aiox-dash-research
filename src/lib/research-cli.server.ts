import "server-only"

import { execFile, spawn } from "node:child_process"
import { lookup } from "node:dns/promises"
import { accessSync, constants, existsSync } from "node:fs"
import { appendFile, lstat, mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises"
import { isIP } from "node:net"
import { delimiter } from "node:path"
import os from "node:os"
import path from "node:path"
import {
  TECH_RESEARCH_CANONICAL_PHASES,
  OPENROUTER_CLI_LABEL,
  methodById,
  type ResearchByokConfig,
  buildResearchCliInput,
  buildResearchConsolidationPrompt,
  buildResearchFallbackPrompt,
  normalizeResearchConsolidationRunRequest,
  normalizeResearchRunRequest,
  type ResearchCliCandidateStatus,
  type ResearchCliDiscovery,
  type ResearchCliId,
  type ResearchCliStatus,
  type ResearchConsolidationRunRequest,
  type ResearchFilesystemSnapshot,
  type ResearchMethodId,
  type TechResearchCanonicalPhase,
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
    launchSupported: false,
    installHint: "Instale e autentique o Gemini CLI; o AIOX Research procura `gemini` no PATH.",
    launchHint: "Detectado para inventário; execução canônica bloqueada porque este adapter ainda não ativa skills locais.",
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
const FILESYSTEM_POLL_INTERVAL_MS = 5_000
const FILESYSTEM_LATEST_FILE_LIMIT = 8
const FILESYSTEM_SCAN_FILE_LIMIT = 900
const RUNTIME_STEP_TOTAL = 7
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
      throw new Error("Configure API key e modelo para executar via OpenRouter CLI.")
    }
    const outputSlug = request.outputSlug ?? "research-byok"
    return startByokBackedRun({
      cliId: request.cliId,
      methodId: request.methodId,
      query: request.query,
      outputSlug,
      prompt: buildResearchFallbackPrompt(request),
      logLabel: "pesquisa",
      byok: request.byok,
    })
  }

  const outputSlug = request.outputSlug ?? "research-run"
  const workspaceRoot = getDashWorkspaceRoot()
  return startCliBackedRun({
    cliId: request.cliId,
    methodId: request.methodId,
    query: request.query,
    outputSlug,
    prompt: buildResearchCliInput(request, workspaceRoot),
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
  const shell = await ensureResearchRunShell({
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
      `${LOCAL_LOG_PREFIX} diretório da pesquisa: ${shell.researchDir}`,
      `${LOCAL_LOG_PREFIX} runtime dir: ${shell.runtimeDir}`,
      `${LOCAL_LOG_PREFIX} learning log: ${shell.learningLogPath}`,
      "",
    ].join("\n"),
    logPath,
  }
  await persistRunState(statePath, initialState)

  const invocation = buildInvocation(input.cliId, cli.path, discovery.workspaceRoot)
  const method = methodById(input.methodId)
  const child = spawn(invocation.command, invocation.args, {
    cwd: discovery.workspaceRoot,
    shell: invocation.shell,
    env: {
      ...process.env,
      ...invocation.env,
      AIOX_RESEARCH_RUN_ID: runId,
      AIOX_DASH_RESEARCH_RUN_ID: runId,
      AIOX_RESEARCH_METHOD: method.id,
      AIOX_RESEARCH_SKILL: method.skill.name,
      AIOX_RESEARCH_WORKFLOW: method.workflow.id,
      AIOX_RESEARCH_OUTPUT_DIR: shell.researchDir,
      AIOX_RESEARCH_RUNTIME_DIR: shell.runtimeDir,
      AIOX_RESEARCH_CANONICAL_OUTPUT_DIR: method.workflow.outputRoot.replace("{slug}", input.outputSlug),
      AIOX_RESEARCH_LEARNING_LOG: shell.learningLogPath,
      AIOX_RESEARCH_CANONICAL_WORKFLOW: path.join(discovery.workspaceRoot, method.workflow.path),
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
  const shell = await ensureResearchRunShell({
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
  const providerLabel = input.byok.providerLabel || OPENROUTER_CLI_LABEL
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
      `${LOCAL_LOG_PREFIX} ${now} iniciando ${input.logLabel} com ${OPENROUTER_CLI_LABEL}`,
      `${LOCAL_LOG_PREFIX} provider: ${providerLabel}`,
      `${LOCAL_LOG_PREFIX} model: ${input.byok.model}`,
      `${LOCAL_LOG_PREFIX} diretório da pesquisa: ${shell.researchDir}`,
      `${LOCAL_LOG_PREFIX} runtime dir: ${shell.runtimeDir}`,
      `${LOCAL_LOG_PREFIX} learning log: ${shell.learningLogPath}`,
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
    await appendRunLog(statePath, `${LOCAL_LOG_PREFIX} ${new Date().toISOString()} conectando ao endpoint OpenRouter\n`)

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
    if (!answer.trim()) throw new Error("O OpenRouter respondeu sem conteúdo textual.")

    const usage = parsed.usage?.total_tokens ? `\n${LOCAL_LOG_PREFIX} tokens totais reportados: ${parsed.usage.total_tokens}` : ""
    await appendRunLog(statePath, `[stdout] ${answer}${usage}\n`)
    await markRunFinished(statePath, "completed", 0, "processo OpenRouter finalizado com sucesso")
  } catch (error) {
    const message = error instanceof Error ? redactSecret(error.message, input.byok.apiKey) : "Falha ao executar OpenRouter CLI."
    await markRunFinished(statePath, "failed", 1, message)
  }
}

type ResearchShellInput = Pick<ResearchRunState, "runId" | "query" | "methodId" | "outputSlug" | "cliId"> & {
  workspaceRoot: string
  prompt: string
  logLabel: string
}

type ResearchShell = {
  researchDir: string
  runtimeDir: string
  learningLogPath: string
}

type WorkflowPhaseTemplate = Pick<TechResearchCanonicalPhase, "id" | "phase" | "name" | "checkpoint" | "conditional">

async function ensureResearchRunShell(input: ResearchShellInput): Promise<ResearchShell> {
  const method = methodById(input.methodId)
  const researchDir = path.join(input.workspaceRoot, "docs", "research", input.outputSlug)
  const runtimeDir = path.join(researchDir, "runtimes", input.cliId)
  const learningLogDir = path.join(input.workspaceRoot, ".aiox", "learning", "logs", method.skill.name)
  const learningLogPath = path.join(learningLogDir, `${input.outputSlug}-${input.runId}.yaml`)
  const outputDir = `docs/research/${input.outputSlug}`
  const canonicalOutputDir = method.workflow.outputRoot.replace("{slug}", input.outputSlug)
  const runtimeRelativeDir = `${outputDir}/runtimes/${input.cliId}`
  const now = new Date().toISOString()

  await mkdir(runtimeDir, { recursive: true })
  await mkdir(learningLogDir, { recursive: true })
  await Promise.all([
    writeIfMissing(
      path.join(researchDir, "README.md"),
      [
        `# ${input.query}`,
        "",
        "> Pesquisa em execução via AIOX Research.",
        "",
        "Esta pasta é a unidade de monitoramento da pesquisa. Saídas individuais de CLIs/LLMs ficam em `runtimes/<runtime>/`; os arquivos raiz são usados pelo Observatory e pela consolidação.",
        "",
        `O contrato de execução segue a skill canônica \`${method.skill.invocation}\` e o workflow \`${method.workflow.path}\`.`,
        `Saída canônica do modo: \`${canonicalOutputDir}\`.`,
        "",
        "## Estado",
        "",
        "- Status: em execução",
        `- Modo: ${method.label}`,
        `- Slug: ${input.outputSlug}`,
        `- Skill: ${method.skill.name}`,
        `- Workflow: ${method.workflow.id}`,
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
      buildPipelineStateYaml({
        now,
        status: "running",
        outputDir,
        runtimeDir: runtimeRelativeDir,
        runId: input.runId,
        runtime: input.cliId,
        layout: "parallel-runtimes-v1",
        scope: "root",
        methodId: input.methodId,
      }),
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
        `- Seguir a skill \`${method.skill.invocation}\` via \`${method.workflow.path}\`.`,
        `- Saída canônica do modo: \`${canonicalOutputDir}\`.`,
        "- Carregar os YAMLs/prompts/templates/tarefas do squad na entrada de cada fase e registrar marcador `LOADED`.",
        "- Atualizar `pipeline-state.yaml` e o learning log incremental em cada transição de fase.",
        "- Gravar artefatos estruturados nesta pasta do runtime sem sobrescrever outros runtimes.",
        "- Registrar limitações de ferramentas/fontes e reduzir confiança quando necessário.",
        "",
      ].join("\n"),
    ),
    writeIfMissing(path.join(runtimeDir, "runtime-input.md"), `# Entrada do runtime\n\n\`\`\`txt\n${input.prompt}\n\`\`\`\n`),
    writeIfMissing(
      path.join(runtimeDir, "pipeline-state.yaml"),
      buildPipelineStateYaml({
        now,
        status: "running",
        outputDir,
        runtimeDir: runtimeRelativeDir,
        runId: input.runId,
        runtime: input.cliId,
        layout: "runtime-v1",
        scope: "runtime",
        methodId: input.methodId,
      }),
    ),
    writeIfMissing(
      learningLogPath,
      buildLearningLogYaml({
        now,
        outputDir,
        runtimeDir: runtimeRelativeDir,
        runId: input.runId,
        runtime: input.cliId,
        query: input.query,
        methodId: input.methodId,
        degraded: input.cliId === "byok",
      }),
    ),
  ])

  await appendExecutionEvent(path.join(researchDir, "execution-log.jsonl"), {
    ts: now,
    event: "runtime.started",
    run_id: input.runId,
    runtime: input.cliId,
    runtime_dir: `runtimes/${input.cliId}`,
    kind: input.logLabel,
  })

  return { researchDir, runtimeDir, learningLogPath } satisfies ResearchShell
}

function workflowPhaseTemplates(methodId: ResearchMethodId): readonly WorkflowPhaseTemplate[] {
  if (methodId === "tech") return TECH_RESEARCH_CANONICAL_PHASES
  return [
    { id: "p00_init", phase: "P00", name: "Initialize Run" },
    { id: "p0_load_contracts", phase: "P0", name: "Load Skill + Workflow Contracts" },
    { id: "p1_diagnostic", phase: "P1", name: "Diagnostic + Routing" },
    { id: "p2_execute_workflow", phase: "P2", name: "Execute Canonical Workflow" },
    { id: "p3_materialize_artifacts", phase: "P3", name: "Materialize Mode Artifacts" },
    { id: "p4_quality_gate", phase: "P4", name: "Evidence + Quality Gate", checkpoint: "COVERAGE_GATE" as const },
    { id: "p5_publish", phase: "P5", name: "Publish Observatory Package" },
  ]
}

function buildPipelineStateYaml(input: {
  now: string
  status: string
  outputDir: string
  runtimeDir: string
  runId: string
  runtime: ResearchCliId
  layout: string
  scope: "root" | "runtime"
  methodId: ResearchMethodId
}) {
  const method = methodById(input.methodId)
  const phaseTemplates = workflowPhaseTemplates(input.methodId)
  const phaseLines = phaseTemplates.flatMap((phase) => [
    `  - id: ${escapeYaml(phase.id)}`,
    `    phase: ${escapeYaml(phase.phase)}`,
    `    name: ${escapeYaml(phase.name)}`,
    "    status: pending",
    ...(phase.checkpoint ? [`    checkpoint: ${escapeYaml(phase.checkpoint)}`, "    verdict: null"] : []),
    ...(phase.conditional ? ["    conditional: true"] : []),
  ])

  return [
    "schema: aiox-research-pipeline-v2",
    `status: ${escapeYaml(input.status)}`,
    `scope: ${escapeYaml(input.scope)}`,
    `run_id: ${escapeYaml(input.runId)}`,
    `runtime: ${escapeYaml(input.runtime)}`,
    `output_dir: ${escapeYaml(input.outputDir)}`,
    `runtime_dir: ${escapeYaml(input.runtimeDir)}`,
    `layout: ${escapeYaml(input.layout)}`,
    `created_at: ${escapeYaml(input.now)}`,
    `method: ${escapeYaml(method.id)}`,
    `canonical_workflow: ${escapeYaml(method.workflow.path)}`,
    `canonical_skill: ${escapeYaml(method.skill.path)}`,
    `canonical_output_dir: ${escapeYaml(method.workflow.outputRoot.replace("{slug}", path.basename(input.outputDir)))}`,
    "phase_status_values: [pending, in_progress, completed, skipped, halted, failed]",
    "phases:",
    ...phaseLines,
    "",
  ].join("\n")
}

function buildLearningLogYaml(input: {
  now: string
  outputDir: string
  runtimeDir: string
  runId: string
  runtime: ResearchCliId
  query: string
  methodId: ResearchMethodId
  degraded: boolean
}) {
  const method = methodById(input.methodId)
  const phaseLines = workflowPhaseTemplates(input.methodId).flatMap((phase) => [
    `  ${phase.id}:`,
    `    phase: ${escapeYaml(phase.phase)}`,
    `    name: ${escapeYaml(phase.name)}`,
    `    status: ${phase.id === "p00c_learning_log" ? "completed" : "pending"}`,
    ...(phase.id === "p00c_learning_log"
      ? [`    started_at: ${escapeYaml(input.now)}`, `    completed_at: ${escapeYaml(input.now)}`, "    scaffolded_by: aiox-research-shell"]
      : []),
    ...(phase.checkpoint ? [`    checkpoint: ${escapeYaml(phase.checkpoint)}`, "    verdict: null"] : []),
    ...(phase.conditional ? ["    conditional: true"] : []),
  ])

  return [
    'schema_version: "1.0"',
    `skill_id: ${escapeYaml(method.skill.name)}`,
    `method: ${escapeYaml(method.id)}`,
    `workflow_id: ${escapeYaml(method.workflow.id)}`,
    `workflow_path: ${escapeYaml(method.workflow.path)}`,
    `run_id: ${escapeYaml(input.runId)}`,
    `timestamp_started: ${escapeYaml(input.now)}`,
    `timestamp_updated: ${escapeYaml(input.now)}`,
    "timestamp_completed: null",
    "outcome: in_progress",
    "scaffolded_by: aiox-research-shell",
    `execution_capability: ${escapeYaml(input.degraded ? "degraded_byok_no_workspace_tools" : "local_cli_workspace_tools")}`,
    "",
    "inputs:",
    `  query: ${escapeYaml(input.query)}`,
    `  output_dir: ${escapeYaml(input.outputDir)}`,
    `  runtime_dir: ${escapeYaml(input.runtimeDir)}`,
    `  runtime: ${escapeYaml(input.runtime)}`,
    "",
    "phases:",
    ...phaseLines,
    "",
    "artifacts:",
    "  required: []",
    "  optional: []",
    "",
  ].join("\n")
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
    state = await refreshFilesystemSnapshotIfNeeded(statePath, state)
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

async function refreshFilesystemSnapshotIfNeeded(statePath: string, state: PersistedRunState): Promise<PersistedRunState> {
  const active = state.status === "running" || state.status === "queued"
  const lastCheckedAt = Date.parse(state.filesystem?.checkedAt ?? "")
  const shouldCheck =
    !state.filesystem ||
    !state.filesystem.progress ||
    (active && (Number.isNaN(lastCheckedAt) || Date.now() - lastCheckedAt >= FILESYSTEM_POLL_INTERVAL_MS))

  if (!shouldCheck) return state

  const filesystem = await scanResearchFilesystem(state.outputSlug, state.methodId)
  const previous = state.filesystem
  const hasFileProgress =
    previous?.latestActivityAt !== filesystem.latestActivityAt ||
    previous?.fileCount !== filesystem.fileCount ||
    previous?.totalBytes !== filesystem.totalBytes
  const nextState: PersistedRunState = {
    ...state,
    status: state.status !== "failed" && filesystem.progress.status === "completed" ? "completed" : state.status,
    exitCode: state.exitCode ?? (state.status !== "failed" && filesystem.progress.status === "completed" ? 0 : null),
    updatedAt: hasFileProgress && filesystem.latestActivityAt
      ? latestIsoTimestamp(state.updatedAt, filesystem.latestActivityAt)
      : filesystem.progress.status === "completed"
        ? latestIsoTimestamp(state.updatedAt, filesystem.checkedAt)
        : state.updatedAt,
    log: state.status !== "failed" && state.status !== "completed" && filesystem.progress.status === "completed"
      ? `${state.log}\n${LOCAL_LOG_PREFIX} ${filesystem.checkedAt} workflow concluído detectado em docs/research/${state.outputSlug}/pipeline-state.yaml\n`
      : state.log,
    filesystem,
  }

  await persistRunState(statePath, nextState)
  if (state.status !== "failed" && state.status !== "completed" && nextState.status === "completed") {
    await persistRuntimeCompletionArtifacts(nextState, "workflow concluído detectado pelos artefatos da pesquisa")
  }
  return nextState
}

async function scanResearchFilesystem(outputSlug: string, methodId: ResearchMethodId): Promise<ResearchFilesystemSnapshot> {
  const checkedAt = new Date().toISOString()
  const safeSlug = sanitizeId(outputSlug)
  const workspaceRoot = getDashWorkspaceRoot()
  const method = methodById(methodId)
  const monitorRoot = path.posix.join("docs", "research", safeSlug)
  const canonicalRoot = method.workflow.outputRoot.replace("{slug}", safeSlug)
  const scanRoots = Array.from(new Set([monitorRoot, canonicalRoot]))
  const researchDir = path.join(workspaceRoot, ...monitorRoot.split("/"))
  const files: Array<{ path: string; updatedAt: string; size: number; mtimeMs: number }> = []
  let scannedRoots = 0

  for (const scanRoot of scanRoots) {
    const absoluteRoot = path.join(workspaceRoot, ...scanRoot.split("/"))
    try {
      await collectResearchFiles(absoluteRoot, "", scanRoot, files)
      scannedRoots += 1
    } catch {
      // Root may not exist yet. Other mode roots can still contain useful progress.
    }
  }

  if (scannedRoots === 0) {
    return {
      checkedAt,
      latestActivityAt: null,
      fileCount: 0,
      totalBytes: 0,
      progress: {
        status: "pending",
        doneSteps: 0,
        totalSteps: RUNTIME_STEP_TOTAL,
        signals: [],
      },
      latestFiles: [],
      error: "Pasta da pesquisa ainda não existe ou não pôde ser lida.",
    }
  }

  files.sort((left, right) => right.mtimeMs - left.mtimeMs)
  const progress = await inferResearchFilesystemProgress({
    researchDir,
    canonicalDir: path.join(workspaceRoot, ...canonicalRoot.split("/")),
    outputSlug: safeSlug,
    methodId,
    filePaths: files.map((file) => file.path),
  })
  return {
    checkedAt,
    latestActivityAt: files[0]?.updatedAt ?? null,
    fileCount: files.length,
    totalBytes: files.reduce((total, file) => total + file.size, 0),
    progress,
    latestFiles: files.slice(0, FILESYSTEM_LATEST_FILE_LIMIT).map(({ path: filePath, updatedAt, size }) => ({
      path: filePath,
      updatedAt,
      size,
    })),
  }
}

async function collectResearchFiles(
  directory: string,
  relativeDirectory: string,
  displayRoot: string,
  files: Array<{ path: string; updatedAt: string; size: number; mtimeMs: number }>,
) {
  if (files.length >= FILESYSTEM_SCAN_FILE_LIMIT) return
  let entries
  try {
    entries = await readdir(directory, { withFileTypes: true })
  } catch (error) {
    if (relativeDirectory) return
    throw error
  }

  for (const entry of entries) {
    if (files.length >= FILESYSTEM_SCAN_FILE_LIMIT) return
    if (entry.name === ".DS_Store" || entry.name.startsWith(".")) continue

    const relativePath = relativeDirectory ? path.posix.join(relativeDirectory, entry.name) : entry.name
    const absolutePath = path.join(directory, entry.name)
    let entryStat
    try {
      entryStat = await lstat(absolutePath)
    } catch {
      continue
    }

    if (entryStat.isDirectory()) {
      await collectResearchFiles(absolutePath, relativePath, displayRoot, files)
      continue
    }
    if (!entryStat.isFile()) continue

    files.push({
      path: path.posix.join(displayRoot, relativePath),
      updatedAt: entryStat.mtime.toISOString(),
      size: entryStat.size,
      mtimeMs: entryStat.mtimeMs,
    })
  }
}

async function inferResearchFilesystemProgress(input: {
  researchDir: string
  canonicalDir: string
  outputSlug: string
  methodId: ResearchMethodId
  filePaths: string[]
}): Promise<ResearchFilesystemSnapshot["progress"]> {
  const method = methodById(input.methodId)
  const fileSet = new Set(input.filePaths.map((filePath) => filePath.replaceAll("\\", "/")))
  const monitorStatus = await readPipelineCompletionStatus(path.join(input.researchDir, "pipeline-state.yaml"))
  const canonicalStatus = await readPipelineCompletionStatus(path.join(input.canonicalDir, "pipeline-state.yaml"))
  const status = combineFilesystemStatus(monitorStatus, canonicalStatus)
  const methodSignals = inferMethodFilesystemSignals(method.id, fileSet, input.outputSlug)
  const signals = [
    hasResearchFile(fileSet, input.outputSlug, ["00-query-original.md", "runtime-input.md"]) ? "prompt" : "",
    hasResearchFile(fileSet, input.outputSlug, ["runtimes/claude/README.md", "runtimes/codex/README.md", "runtimes/byok/README.md", "pipeline-state.yaml"]) ? "boot" : "",
    hasResearchFile(fileSet, input.outputSlug, ["01-deep-research-prompt.md", "pipeline-state.yaml"]) ? "context" : "",
    methodSignals.evidence ? "evidence" : "",
    methodSignals.artifacts ? "artifacts" : "",
    methodSignals.validate ? "validate" : "",
    status === "completed" || methodSignals.final ? "final" : "",
  ].filter(Boolean)

  return {
    status,
    doneSteps: status === "completed" ? RUNTIME_STEP_TOTAL : Math.min(RUNTIME_STEP_TOTAL - 1, signals.length),
    totalSteps: RUNTIME_STEP_TOTAL,
    signals,
  }
}

function combineFilesystemStatus(
  left: ResearchFilesystemSnapshot["progress"]["status"],
  right: ResearchFilesystemSnapshot["progress"]["status"],
): ResearchFilesystemSnapshot["progress"]["status"] {
  if (left === "completed" || right === "completed") return "completed"
  if (left === "failed" || right === "failed") return "failed"
  if (left === "running" || right === "running") return "running"
  if (left === "unknown" || right === "unknown") return "unknown"
  return "pending"
}

function inferMethodFilesystemSignals(methodId: ResearchMethodId, fileSet: Set<string>, outputSlug: string) {
  if (methodId === "benchmark") {
    return {
      evidence: hasResearchFile(fileSet, outputSlug, ["metadata.json", "bench-matrix.md", "bench-matrix.json"]),
      artifacts: hasResearchFile(fileSet, outputSlug, ["bench-output-dash.json", "bench-report.md", "bench-scores.md", "bench-scores.json"]),
      validate: hasResearchFile(fileSet, outputSlug, ["gap-analysis.md", "battle-card.md", "pipeline-state.yaml"]),
      final: hasResearchFile(fileSet, outputSlug, ["bench-output-dash.json", "bench-report.md"]),
    }
  }

  return {
    evidence: hasResearchFile(fileSet, outputSlug, ["sources.yaml", "players.yaml", "evolving_report.md"]),
    artifacts: hasResearchFile(fileSet, outputSlug, ["02-research-report.md", "03-recommendations.md", "metrics.yaml", "matrices.yaml", "research-graph.json"]),
    validate: hasResearchFile(fileSet, outputSlug, ["execution-log.jsonl", "research-graph.json", "metrics.yaml"]),
    final: hasResearchFile(fileSet, outputSlug, ["README.md"]),
  }
}

function hasResearchFile(fileSet: Set<string>, outputSlug: string, candidates: string[]) {
  const prefix = path.posix.join("docs", "research", outputSlug)
  const benchPrefix = path.posix.join("docs", "bench", outputSlug)
  const filePaths = Array.from(fileSet)
  return candidates.some((candidate) =>
    filePaths.some(
      (filePath) =>
        filePath === path.posix.join(prefix, candidate) ||
        filePath === path.posix.join(benchPrefix, candidate) ||
        filePath.endsWith(`/${candidate}`),
    ),
  )
}

async function readPipelineCompletionStatus(filePath: string): Promise<ResearchFilesystemSnapshot["progress"]["status"]> {
  try {
    const raw = await readFile(filePath, "utf8")
    const statusMatch = raw.match(/^\s*status:\s*["']?([a-z_-]+)["']?/im)
    const value = statusMatch?.[1]?.toLowerCase()
    if (value === "completed") return "completed"
    if (value === "failed" || value === "error") return "failed"
    if (value === "running" || value === "in_progress") return "running"
    if (value === "pending") return "pending"
    return "unknown"
  } catch {
    return "pending"
  }
}

function latestIsoTimestamp(left: string, right: string) {
  const leftTime = Date.parse(left)
  const rightTime = Date.parse(right)
  if (Number.isNaN(leftTime)) return right
  if (Number.isNaN(rightTime)) return left
  return rightTime > leftTime ? right : left
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
    throw new Error("baseUrl OpenRouter deve usar http:// ou https://.")
  }

  await assertPublicByokHost(url.hostname)
  return url.toString()
}

function buildOpenAIChatCompletionUrl(baseUrl: string) {
  let url: URL
  try {
    url = new URL(baseUrl)
  } catch {
    throw new Error("baseUrl OpenRouter inválida.")
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
    throw new Error("baseUrl OpenRouter não pode apontar para localhost.")
  }

  if (isIP(hostname)) {
    if (isForbiddenIp(hostname)) throw new Error("baseUrl OpenRouter não pode apontar para IP privado, loopback ou link-local.")
    return
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true })
  if (addresses.length === 0) throw new Error("baseUrl OpenRouter não resolveu nenhum endereço.")
  if (addresses.some((entry) => isForbiddenIp(entry.address))) {
    throw new Error("baseUrl OpenRouter resolveu para IP privado, loopback ou link-local.")
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
