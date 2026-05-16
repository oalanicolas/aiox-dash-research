export const RESEARCH_METHODS = [
  {
    id: "landscape",
    label: "Landscape",
    description: "Mapeia o território, players, categorias, trade-offs e lacunas.",
  },
  {
    id: "evidence",
    label: "Evidências",
    description: "Prioriza fontes, claims, credibilidade e rastreabilidade.",
  },
  {
    id: "tech-eval",
    label: "Tech Eval",
    description: "Compara arquiteturas, bibliotecas, riscos, custos e maturidade.",
  },
  {
    id: "product",
    label: "Produto",
    description: "Converte pesquisa em decisões, roadmap, quick wins e perguntas abertas.",
  },
] as const

export type ResearchMethodId = (typeof RESEARCH_METHODS)[number]["id"]

export type ResearchCliId = "claude" | "codex" | "gemini" | "opencode" | "byok"

export type ResearchByokConfig = {
  baseUrl: string
  apiKey: string
  model: string
  providerLabel?: string
}

export type ResearchRunRequest = {
  query: string
  cliId: ResearchCliId
  methodId: ResearchMethodId
  depth: "standard" | "deep"
  outputSlug?: string
  byok?: ResearchByokConfig
}

export type ResearchConsolidationRunRequest = {
  query: string
  cliId: ResearchCliId
  methodId: ResearchMethodId
  depth: "standard" | "deep"
  sourceOutputSlugs: string[]
  sourceCliIds: ResearchCliId[]
  outputSlug?: string
}

export type ResearchCliStatus = {
  id: ResearchCliId
  name: string
  bin: string
  available: boolean
  launchSupported: boolean
  version: string | null
  path: string | null
  candidates: ResearchCliCandidateStatus[]
  installHint: string
  launchHint: string
}

export type ResearchCliCandidateStatus = {
  path: string
  ok: boolean
  version: string | null
  error: string | null
}

export type ResearchCliDiscovery = {
  workspaceRoot: string
  generatedAt: string
  clis: ResearchCliStatus[]
}

export type ResearchRunState = {
  runId: string
  cliId: ResearchCliId
  methodId: ResearchMethodId
  query: string
  outputSlug: string
  status: "queued" | "running" | "completed" | "failed"
  startedAt: string
  updatedAt: string
  exitCode: number | null
  log: string
  logPath: string
}

const TECH_RESEARCH_RUNTIME_PHASES = [
  "[P0] Auto-clarify: inferir foco, domínio, tecnologias e intenção temporal antes de perguntar qualquer coisa.",
  "[P1] Clarify fallback: só perguntar se o contexto não puder ser inferido.",
  "[P1.5] Decompose: quebrar a pergunta em 5-7 subqueries ortogonais usando o prompt de decomposição.",
  "[P2] Generate prompt: registrar o prompt executado e o plano de pesquisa derivado do contrato inline.",
  "[P3] Execute waves: pesquisar em ondas, registrar progresso e usar estratégia de ferramentas por fonte.",
  "[P3.2] Deep read: ler fontes prioritárias quando snippets/resumos forem insuficientes.",
  "[P3.5] Coverage gate: calcular coverage_score, source_quality, gaps e next_queries com o rubric inline.",
  "[P3.6] Compress wave: produzir wave-{N}-summary.md e manter evolving_report.md.",
  "[P3.7] Escape valve: em modo profundo ou coverage < 70 após wave 2, usar extração profunda disponível e documentar limitações.",
  "[P4] Synthesize: sintetizar findings sem apagar contradições; extrair quick wins de alto valor e baixo esforço.",
  "[P4.5] Citation gate: verificar integridade das citações e marcar claims não suportados.",
  "[P5] Document: materializar narrativa, métricas, fontes, grafo e arquivos ricos consumidos pelo Observatory.",
] as const

const TECH_RESEARCH_OUTPUT_CONTRACT = [
  "`README.md` — sumário executivo, escopo, método, principais achados, limitações e próximos passos.",
  "`00-query-original.md` — pergunta original, interpretação do foco, premissas e critérios de sucesso.",
  "`01-deep-research-prompt.md` — prompt/contrato executado e decisões de escopo tomadas pelo runtime.",
  "`02-research-report.md` — relatório principal com achados, evidências, trade-offs, riscos e lacunas.",
  "`03-recommendations.md` — recomendações acionáveis, priorizadas por impacto, esforço e confiança.",
  "`quick-wins.md` — ações de alto valor e baixa fricção, com responsável sugerido quando inferível.",
  "`curiosity_queue.yaml` — perguntas abertas com prioridade, razão e status.",
  "`evolving_report.md` — progresso incremental por onda, incluindo mudanças de hipótese.",
  "`wave-{N}-summary.md` — resumo de cada onda com queries, fontes, aprendizados e gaps restantes.",
  "`metrics.yaml` — coverage_score, integrity_score, confidence_score, waves, source totals, stop_reason e inferências.",
  "`pipeline-state.yaml` — fases executadas, status, timestamps e checkpoints.",
  "`sources.yaml` — fontes com URL, título, data, tipo, credibilidade, claims suportados e notas.",
  "`players.yaml` — projetos/players com categoria, maturidade, sinais, riscos e links.",
  "`ux-patterns.yaml` — padrões de experiência ou operação observados, quando aplicável.",
  "`matrices.yaml` — matrizes comparativas defensáveis; vazio estruturado se não houver dados suficientes.",
  "`execution-log.jsonl` — eventos relevantes em JSONL com timestamp, fase, status e notas.",
  "`research-graph.json` — grafo conectando query, ondas, fontes, claims, players e decisões.",
] as const

const MAX_RESEARCH_TOPIC_SLUG_LENGTH = 44

export function methodById(methodId: string): (typeof RESEARCH_METHODS)[number] {
  return RESEARCH_METHODS.find((method) => method.id === methodId) ?? RESEARCH_METHODS[0]
}

export function slugifyResearchTopic(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return truncateSlug(normalized, MAX_RESEARCH_TOPIC_SLUG_LENGTH) || "research-run"
}

export function normalizeResearchRunRequest(input: Partial<ResearchRunRequest>): ResearchRunRequest {
  const query = typeof input.query === "string" ? input.query.trim() : ""
  const cliId = isResearchCliId(input.cliId) ? input.cliId : "claude"
  const methodId = isResearchMethodId(input.methodId) ? input.methodId : "landscape"
  const depth = input.depth === "deep" ? "deep" : "standard"
  const outputSlug = typeof input.outputSlug === "string" ? input.outputSlug.trim() : ""
  const byok = normalizeResearchByokConfig(input.byok)
  const normalizedSlug = normalizeDatedResearchSlug(outputSlug || slugifyResearchTopic(query))

  return {
    query,
    cliId,
    methodId,
    depth,
    outputSlug: normalizedSlug,
    ...(byok ? { byok } : {}),
  }
}

export function normalizeResearchConsolidationRunRequest(
  input: Partial<ResearchConsolidationRunRequest>,
): ResearchConsolidationRunRequest {
  const query = typeof input.query === "string" ? input.query.trim() : ""
  const cliId = isResearchCliId(input.cliId) ? input.cliId : "claude"
  const methodId = isResearchMethodId(input.methodId) ? input.methodId : "product"
  const depth = input.depth === "deep" ? "deep" : "standard"
  const sourceOutputSlugs = Array.isArray(input.sourceOutputSlugs)
    ? input.sourceOutputSlugs.filter((slug): slug is string => typeof slug === "string").map((slug) => slug.trim()).filter(Boolean)
    : []
  const sourceCliIds = Array.isArray(input.sourceCliIds)
    ? input.sourceCliIds.filter(isResearchCliId)
    : []
  const outputSlug = typeof input.outputSlug === "string" ? input.outputSlug.trim() : ""

  return {
    query,
    cliId,
    methodId,
    depth,
    sourceOutputSlugs,
    sourceCliIds,
    outputSlug: normalizeDatedResearchSlug(outputSlug || slugifyResearchTopic(query)),
  }
}

export function buildResearchWorkbenchPrompt(request: ResearchRunRequest) {
  const method = methodById(request.methodId)
  const depthText = request.depth === "deep" ? "profunda, com múltiplas ondas" : "objetiva e suficiente"
  const outputSlug = normalizeDatedResearchSlug(request.outputSlug || slugifyResearchTopic(request.query))
  const runtimeDir = `docs/research/${outputSlug}/runtimes/${request.cliId}`

  return [
    "Execute esta pesquisa usando o protocolo autônomo embutido do AIOX Research, não como resposta rápida.",
    "Não dependa de skills, agentes, prompts, templates ou arquivos externos ao diretório atual. O contrato completo está inline abaixo.",
    "",
    `Pergunta de pesquisa: ${request.query}`,
    `Modo: ${method.label} — ${method.description}`,
    `Profundidade: ${depthText}`,
    `Diretório canônico da pesquisa: docs/research/${outputSlug}/`,
    `Runtime desta execução: ${request.cliId}`,
    `Diretório obrigatório deste runtime: ${runtimeDir}/`,
    "",
    "Contrato de persistência:",
    "- Existe UMA pasta por pesquisa. Não crie pastas irmãs com sufixo de CLI/LLM.",
    `- Grave os artefatos desta execução em \`${runtimeDir}/\`.`,
    `- Se \`${runtimeDir}/\` já contiver artefatos de uma tentativa anterior, leia-os primeiro e continue do primeiro passo incompleto ou inconsistente; não recomece do zero sem necessidade.`,
    "- Não sobrescreva artefatos de outros runtimes.",
    "- O AIOX Research materializa arquivos raiz para indexação; a consolidação final deve reconciliar tudo no diretório raiz.",
    "",
    buildTechResearchRuntimeProtocol(request.depth, runtimeDir),
    "",
    "Contrato de saída desejado dentro do diretório do runtime:",
    ...TECH_RESEARCH_OUTPUT_CONTRACT.map((atom) => `- ${atom}`),
    "",
    "Regras:",
    "- Não implemente código de produto nesta execução.",
    `- Não escreva fora de \`${runtimeDir}/\`, exceto se precisar apenas ler artefatos raiz da pesquisa.`,
    "- Não invente fontes, números ou players; marque inferências explicitamente.",
    "- Se uma ferramenta de busca/web não estiver disponível neste runtime, documente a limitação, use fontes locais disponíveis e reduza confidence_score.",
    "- Se coverage_score ficar abaixo de 50 após as ondas possíveis, entregue com caveat explícito em vez de forçar conclusão.",
    "- Use PT-BR com acentuação correta.",
    "- Ao terminar, informe o caminho da subpasta do runtime e os arquivos estruturados que ficaram ausentes.",
  ].join("\n")
}

export function buildResearchConsolidationPrompt(request: ResearchConsolidationRunRequest) {
  const method = methodById(request.methodId)
  const depthText = request.depth === "deep" ? "profunda, reconciliando divergências" : "objetiva, reconciliando achados principais"
  const outputSlug = normalizeDatedResearchSlug(request.outputSlug || slugifyResearchTopic(request.query))
  const sourceList = Array.from(new Set(request.sourceOutputSlugs))
    .map((slug) => normalizeDatedResearchSlug(slug))
    .map((slug) => `- Diretório raiz: \`docs/research/${slug}/\` com subpastas \`runtimes/*/\``)
    .join("\n")
  const cliList = request.sourceCliIds.length > 0 ? request.sourceCliIds.join(", ") : "CLIs paralelos selecionados"

  return [
    "Consolide pesquisas paralelas já geradas no workspace atual usando o protocolo autônomo embutido do AIOX Research.",
    "Esta etapa não é uma resposta rápida: ela deve reconciliar os runtimes com avaliação de cobertura, verificação de citações e documentação compatível com o Observatory.",
    "Não dependa de skills, agentes, prompts, templates ou arquivos externos ao diretório atual. O contrato completo está inline abaixo.",
    "",
    `Pergunta original: ${request.query}`,
    `Modo base: ${method.label} — ${method.description}`,
    `Profundidade da consolidação: ${depthText}`,
    `Runtimes comparados: ${cliList}`,
    `Diretório raiz de saída: docs/research/${outputSlug}/`,
    "",
    "Fontes internas obrigatórias:",
    sourceList || "- Nenhum diretório de origem informado; interrompa e reporte o problema.",
    "",
    "Tarefa:",
    "- Leia os artefatos em `runtimes/*/` antes de escrever a consolidação.",
    "- Compare convergências, divergências, lacunas, fontes fortes/fracas e decisões conflitantes.",
    "- Pontue cobertura por runtime e no consolidado usando os thresholds inline: target 85, approve >= 70, review 50-70, veto/caveat abaixo de 50.",
    "- Separe fonte confirmada, inferência e claim não suportado; não trate ausência de evidência como evidência positiva.",
    `- Grave o resultado consolidado nos arquivos raiz de \`docs/research/${outputSlug}/\`.`,
    "",
    "Contrato de saída no diretório raiz:",
    ...TECH_RESEARCH_OUTPUT_CONTRACT.map((atom) => `- ${atom}`),
    "",
    "Regras:",
    "- Não rode uma nova pesquisa externa se as fontes internas forem suficientes; só navegue se houver lacuna crítica.",
    "- Não implemente código de produto nesta execução.",
    `- Não escreva fora de \`docs/research/${outputSlug}/\`.`,
    "- Não invente fontes, números ou players; marque inferências explicitamente.",
    "- Preserve dissensos entre runtimes; não trate um runtime como autoridade por padrão.",
    "- metrics.yaml deve incluir coverage_score, integrity_score, confidence_score, source_runs e stop_reason.",
    "- Use PT-BR com acentuação correta.",
    "- Ao terminar, informe quais divergências permaneceram abertas.",
  ].join("\n")
}

function buildTechResearchRuntimeProtocol(depth: ResearchRunRequest["depth"], runtimeDir: string) {
  const depthRules =
    depth === "deep"
      ? [
          "- Modo deep: tente completar até 3 ondas de pesquisa; se parar antes, justifique com coverage_score >= 80 ou falta real de ferramentas/fontes.",
          "- Modo deep: acione deep read e escape valve quando coverage_score < 70 após a segunda onda ou quando fontes primárias exigirem leitura integral.",
        ]
      : [
          "- Modo standard: execute pelo menos uma onda e nunca pule o coverage gate; uma segunda onda é esperada quando houver gap de alta prioridade.",
          "- Modo standard: pode parar cedo apenas com coverage_score >= 80, source_quality defensável e stop_reason explícito.",
        ]

  return [
    "Protocolo obrigatório de profundidade:",
    "- Este protocolo é autônomo e substitui qualquer skill, prompt, template ou agente externo que não esteja disponível.",
    "- Execute as fases do pipeline `SP-TECH-RESEARCH` dentro do runtime:",
    ...TECH_RESEARCH_RUNTIME_PHASES.map((phase) => `  - ${phase}`),
    ...depthRules,
    "- Use os thresholds inline: target coverage 85, approve >= 70, review 50-70, veto/caveat abaixo de 50 após max_waves=3.",
    "- Classifique fontes por credibilidade: official docs, papers, maintainer/core team, GitHub repo, issues, blogs conhecidos, vendor marketing e baixa qualidade.",
    "- `sources.yaml` precisa conter URL, título, data quando houver, tipo, credibilidade, claims suportados e notas de uso.",
    "- `metrics.yaml` precisa conter coverage_score, coverage_breakdown, integrity_score, citation_verified, waves, totals de fontes e stop_reason.",
    "- `research-graph.json` deve conectar query, waves, fontes, claims, players e decisões quando houver sinal defensável.",
    `- Todos os outputs deste runtime devem ficar em \`${runtimeDir}/\`; exemplos de código são permitidos apenas como documentação dentro dos Markdown desta pasta.`,
  ].join("\n")
}

function isResearchCliId(value: unknown): value is ResearchCliId {
  return value === "claude" || value === "codex" || value === "gemini" || value === "opencode" || value === "byok"
}

function isResearchMethodId(value: unknown): value is ResearchMethodId {
  return RESEARCH_METHODS.some((method) => method.id === value)
}

function normalizeResearchByokConfig(input: unknown): ResearchByokConfig | null {
  if (!input || typeof input !== "object") return null
  const record = input as Partial<ResearchByokConfig>
  const baseUrl = typeof record.baseUrl === "string" ? record.baseUrl.trim() : ""
  const apiKey = typeof record.apiKey === "string" ? record.apiKey.trim() : ""
  const model = typeof record.model === "string" ? record.model.trim() : ""
  const providerLabel = typeof record.providerLabel === "string" ? record.providerLabel.trim() : ""

  if (!baseUrl && !apiKey && !model) return null

  return {
    baseUrl,
    apiKey,
    model,
    ...(providerLabel ? { providerLabel } : {}),
  }
}

function normalizeDatedResearchSlug(slug: string) {
  const match = slug.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/)
  if (match) return `${match[1]}-${slugifyResearchTopic(match[2] ?? "")}`
  return `${new Date().toISOString().slice(0, 10)}-${slugifyResearchTopic(slug)}`
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
