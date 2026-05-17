export type ResearchArtifactName =
  | "README.md"
  | "00-query-original.md"
  | "01-deep-research-prompt.md"
  | "02-research-report.md"
  | "03-recommendations.md"
  | "quick-wins.md"
  | "metrics.yaml"
  | "pipeline-state.yaml"
  | "execution-log.jsonl"
  | "sources.yaml"
  | "research-graph.json"
  | "matrices.yaml"
  | "curiosity_queue.yaml"
  | "players.yaml"
  | "decision-rubric.yaml"
  | "ux-patterns.yaml"
  | "action-plan.yaml"
  | "claims.yaml"
  | "decision-ledger.yaml"
  | "risk-register.yaml"
  | "dashboard-manifest.yaml"
  | "validation-report.yaml"

export type ResearchTabId =
  | "map"
  | "slides"
  | "recommendations"
  | "evidence"
  | "waves"
  | "sources"
  | "players"
  | "curiosity"
  | "document"

export type ResearchRenderTier = "legacy" | "partial" | "rich" | "gold"

export type ResearchConsumerStatus = "implemented" | "partial" | "planned" | "missing" | "legacy"

export type ResearchVisualFieldContract = {
  field: string
  artifact: ResearchArtifactName
  path: string
  importance: "required" | "recommended" | "optional" | "legacy"
  fallback: string
  consumer: string
  /**
   * Current dashboard implementation status. This reflects the real consumer
   * state in apps/research, not the desired future contract.
   */
  consumerStatus?: ResearchConsumerStatus
  valueForUser: string
  normalization?: string
  qualityRule?: string
  example?: string
}

export type ResearchTabContract = {
  tab: ResearchTabId
  label: string
  purpose: string
  primaryQuestion: string
  valueForUser: string
  minimumTier: ResearchRenderTier
  emptyStateMeaning: string
  artifacts: ResearchArtifactName[]
  fields: ResearchVisualFieldContract[]
}

export const RESEARCH_OBSERVATORY_BEST_CASE_CONTRACT = {
  schemaVersion: "aiox-research-observatory-contract-v1",
  generatedAt: "2026-05-17",
  consumerStatuses: {
    implemented: "O dashboard atual lê e renderiza este campo.",
    partial: "O dashboard lê parte do campo ou usa fallback frágil.",
    planned: "Campo contratado para uma story do EPIC-150, mas ainda não implementado no dashboard.",
    missing: "Campo sem consumer conhecido no dashboard atual.",
    legacy: "Campo mantido só para compatibilidade com pesquisas antigas.",
  } satisfies Record<ResearchConsumerStatus, string>,
  renderTiers: {
    legacy: {
      meaning: "Existe conteúdo textual suficiente para o leitor de documento, mas as abas ricas terão estados vazios.",
      requiredArtifacts: ["README.md"] satisfies ResearchArtifactName[],
    },
    partial: {
      meaning: "A pesquisa tem relatório e recomendações, mas ainda não prova cobertura, fontes, players e plano de ação.",
      requiredArtifacts: ["README.md", "02-research-report.md", "03-recommendations.md"] satisfies ResearchArtifactName[],
    },
    rich: {
      meaning: "As principais abas visuais são úteis: decisão, evidências, waves, fontes, players e perguntas.",
      requiredArtifacts: [
        "README.md",
        "02-research-report.md",
        "03-recommendations.md",
        "metrics.yaml",
        "pipeline-state.yaml",
        "execution-log.jsonl",
        "sources.yaml",
        "research-graph.json",
        "curiosity_queue.yaml",
        "players.yaml",
        "decision-rubric.yaml",
      ] satisfies ResearchArtifactName[],
    },
    gold: {
      meaning: "A pesquisa vira referência operacional: tem plano executável, rastreabilidade de claims, riscos, ledger de decisão e validação.",
      requiredArtifacts: [
        "action-plan.yaml",
        "claims.yaml",
        "decision-ledger.yaml",
        "risk-register.yaml",
        "dashboard-manifest.yaml",
        "validation-report.yaml",
      ] satisfies ResearchArtifactName[],
    },
  },
  artifacts: {
    "README.md": "Sumário humano do run e ponto de entrada para auditoria.",
    "00-query-original.md": "Pergunta original, restrições, escopo e critérios de sucesso.",
    "01-deep-research-prompt.md": "Prompt ou plano de pesquisa usado para executar waves.",
    "02-research-report.md": "Relatório narrativo principal com achados, evidências e síntese.",
    "03-recommendations.md": "Recomendações operacionais, decisão, próximos passos e trade-offs.",
    "quick-wins.md": "Ações de baixo custo e alto retorno que podem começar agora.",
    "metrics.yaml": "Scores, cobertura, integridade, breakdown e status de decisão.",
    "pipeline-state.yaml": "Fases, status, artefatos produzidos e estado final da execução.",
    "execution-log.jsonl": "Linha do tempo auditável de eventos, waves, decisões e validações.",
    "sources.yaml": "Fontes normalizadas com credibilidade, data, tipo e seção de uso.",
    "research-graph.json": "Grafo de evidência conectando query, waves, fontes, claims, decisões e artefatos.",
    "matrices.yaml": "Matrizes de decisão, comparação, gap analysis e priorização.",
    "curiosity_queue.yaml": "Perguntas abertas priorizadas por impacto na decisão.",
    "players.yaml": "Players, categorias, tier, papel, fit e ação recomendada.",
    "decision-rubric.yaml": "Rubrica ponderada para avaliar alternativas detectadas pela pesquisa sob diferentes pesos e presets.",
    "ux-patterns.yaml": "Padrões de UX/produto observados e implicações.",
    "action-plan.yaml": "Plano canônico de decisão, ações, roadmap, quick wins e owners.",
    "claims.yaml": "Claims estruturados com evidências, confiança e status de validação.",
    "decision-ledger.yaml": "Histórico de decisões, alternativas rejeitadas e rationale.",
    "risk-register.yaml": "Riscos, severidade, mitigação, gatilhos e donos.",
    "dashboard-manifest.yaml": "Manifesto opcional que declara quais abas estão completas e por quê.",
    "validation-report.yaml": "Resultado dos validadores e checklist de completude visual.",
  } satisfies Record<ResearchArtifactName, string>,
  tabs: [
    {
      tab: "map",
      label: "Map",
      purpose: "Resumo executivo da pesquisa: decisão, score, fases, eventos, cobertura, perguntas P1 e sinais de descoberta.",
      primaryQuestion: "Posso confiar no veredito e entender como a pesquisa chegou nele?",
      valueForUser: "Reduz leitura inicial: mostra maturidade, rastreabilidade e lacunas críticas antes de abrir qualquer documento bruto.",
      minimumTier: "rich",
      emptyStateMeaning: "A pesquisa existe, mas ainda não possui telemetria suficiente para auditoria visual.",
      artifacts: [
        "metrics.yaml",
        "pipeline-state.yaml",
        "execution-log.jsonl",
        "research-graph.json",
        "matrices.yaml",
        "ux-patterns.yaml",
        "curiosity_queue.yaml",
        "action-plan.yaml",
      ],
      fields: [
        {
          field: "decision_title",
          artifact: "action-plan.yaml",
          path: "decision.title",
          importance: "required",
          fallback: "metrics.decision.summary | selectedRun.status",
          consumer: "ResearchMapReport hero",
          consumerStatus: "partial",
          valueForUser: "Transforma o mapa em veredito, não em relatório genérico.",
          qualityRule: "Deve ser uma frase acionável, não objeto, array ou slug técnico.",
          example: "Construir SDC Supervisor Runtime para Codex",
        },
        {
          field: "decision_summary",
          artifact: "action-plan.yaml",
          path: "decision.summary",
          importance: "required",
          fallback: "metrics.stop_reason",
          consumer: "ResearchMapReport hero",
          consumerStatus: "partial",
          valueForUser: "Explica o porquê da decisão sem exigir leitura completa.",
          qualityRule: "Máximo recomendado de 240 caracteres.",
        },
        {
          field: "coverage_score",
          artifact: "metrics.yaml",
          path: "coverage_score",
          importance: "required",
          fallback: "selectedRun.coverage",
          consumer: "ResearchMapReport hero and radar",
          consumerStatus: "implemented",
          valueForUser: "Indica se a pesquisa cobriu material suficiente.",
          normalization: "Aceita 0-1 ou 0-100; UI normaliza para 0-100.",
        },
        {
          field: "integrity_score",
          artifact: "metrics.yaml",
          path: "integrity_score",
          importance: "required",
          fallback: "selectedRun.integrity",
          consumer: "ResearchMapReport hero",
          consumerStatus: "implemented",
          valueForUser: "Mostra se os dados são coerentes e rastreáveis.",
          normalization: "Aceita 0-1 ou 0-100; UI normaliza para 0-100.",
        },
        {
          field: "coverage_breakdown",
          artifact: "metrics.yaml",
          path: "coverage_breakdown.*",
          importance: "recommended",
          fallback: "empty radar",
          consumer: "ResearchRadarPanel",
          consumerStatus: "implemented",
          valueForUser: "Revela onde a confiança vem de fato: docs oficiais, fonte local, runners, dashboard, etc.",
          normalization: "Chaves viram labels; valores aceitam 0-1 ou 0-100.",
        },
        {
          field: "phases",
          artifact: "pipeline-state.yaml",
          path: "phases[].id/status/name/artifacts",
          importance: "required",
          fallback: "execution-log timeline",
          consumer: "ResearchMapReport pipeline cards",
          consumerStatus: "implemented",
          valueForUser: "Mostra quais etapas foram concluídas e onde a execução parou.",
          qualityRule: "Preferir array ordenado; objeto legado é aceito e normalizado.",
        },
        {
          field: "events",
          artifact: "execution-log.jsonl",
          path: "ts/phase/event/summary/status",
          importance: "recommended",
          fallback: "empty event list",
          consumer: "ResearchMapReport event cards and waves",
          consumerStatus: "implemented",
          valueForUser: "Permite auditar evolução, não só resultado final.",
        },
        {
          field: "p1_questions",
          artifact: "curiosity_queue.yaml",
          path: "questions[].priority | items[].priority",
          importance: "recommended",
          fallback: "0",
          consumer: "ResearchMapReport open questions",
          consumerStatus: "implemented",
          valueForUser: "Mostra o que ainda pode mudar a decisão.",
          normalization: "HIGH/P1 contam como P1.",
        },
      ],
    },
    {
      tab: "slides",
      label: "Slides",
      purpose: "Deck operacional gerado a partir da pesquisa para comunicar problema, evidência, decisão e plano.",
      primaryQuestion: "Como eu explico esta pesquisa para alguém que não vai ler todos os artefatos?",
      valueForUser: "Converte a pesquisa em narrativa apresentável para decisão executiva, revisão técnica ou handoff.",
      minimumTier: "partial",
      emptyStateMeaning: "Há documentos, mas não há material suficiente para síntese em formato de apresentação.",
      artifacts: ["README.md", "02-research-report.md", "03-recommendations.md", "sources.yaml", "players.yaml", "action-plan.yaml", "metrics.yaml"],
      fields: [
        {
          field: "opening_slide",
          artifact: "README.md",
          path: "title/summary/status",
          importance: "required",
          fallback: "selectedRun metadata",
          consumer: "OperationalSlidesReport",
          consumerStatus: "implemented",
          valueForUser: "Dá contexto imediato: tema, status e tese.",
        },
        {
          field: "evidence_slide",
          artifact: "sources.yaml",
          path: "sources[].title/url/credibility",
          importance: "recommended",
          fallback: "topSources",
          consumer: "OperationalSlidesReport",
          consumerStatus: "implemented",
          valueForUser: "Evita apresentação opinativa sem base verificável.",
        },
        {
          field: "decision_slide",
          artifact: "action-plan.yaml",
          path: "decision.title/summary/why_now",
          importance: "recommended",
          fallback: "03-recommendations.md",
          consumer: "OperationalSlidesReport",
          consumerStatus: "partial",
          valueForUser: "Fecha narrativa em decisão, não em curiosidade.",
        },
        {
          field: "market_map_slide",
          artifact: "players.yaml",
          path: "players[].name/tier/category/role/fit/action",
          importance: "optional",
          fallback: "hidden",
          consumer: "OperationalSlidesReport",
          consumerStatus: "implemented",
          valueForUser: "Mostra quem inspira, quem compete e quem deve ser ignorado.",
        },
      ],
    },
    {
      tab: "recommendations",
      label: "Ações",
      purpose: "Decisão operacional: plano de ação, quick wins, roadmap, riscos e follow-ups.",
      primaryQuestion: "O que fazemos agora, em qual ordem e com qual risco?",
      valueForUser: "Transforma achados em execução priorizada para engenharia, produto ou pesquisa seguinte.",
      minimumTier: "gold",
      emptyStateMeaning: "A pesquisa tem análise, mas ainda não virou plano executável.",
      artifacts: ["03-recommendations.md", "quick-wins.md", "action-plan.yaml", "curiosity_queue.yaml", "risk-register.yaml"],
      fields: [
        {
          field: "decision",
          artifact: "action-plan.yaml",
          path: "decision.title/summary/confidence",
          importance: "required",
          fallback: "03-recommendations.md ## Decisão",
          consumer: "ResearchRecommendationsReport decision block",
          consumerStatus: "partial",
          valueForUser: "Define o veredito antes da lista de tarefas.",
        },
        {
          field: "actions",
          artifact: "action-plan.yaml",
          path: "actions[].id/title/type/priority/owner/status/rationale/evidence",
          importance: "required",
          fallback: "markdown next steps",
          consumer: "Ações counters and cards",
          consumerStatus: "planned",
          valueForUser: "Permite priorizar o próximo movimento sem reler relatório.",
          qualityRule: "Cada ação deve ter owner ou função responsável, prioridade e evidência.",
        },
        {
          field: "roadmap",
          artifact: "action-plan.yaml",
          path: "roadmap[].horizon/title/outcome/dependencies",
          importance: "recommended",
          fallback: "03-recommendations.md roadmap",
          consumer: "Ações roadmap",
          consumerStatus: "planned",
          valueForUser: "Separa agora, próximo e depois.",
        },
        {
          field: "quick_wins",
          artifact: "quick-wins.md",
          path: "sections/items",
          importance: "recommended",
          fallback: "action-plan.yaml actions[type=quick_win]",
          consumer: "Ações quick wins",
          consumerStatus: "implemented",
          valueForUser: "Identifica baixo esforço que já melhora o sistema.",
        },
        {
          field: "risks",
          artifact: "risk-register.yaml",
          path: "risks[].risk/severity/mitigation/trigger",
          importance: "recommended",
          fallback: "03-recommendations.md risks",
          consumer: "Ações risk cards",
          consumerStatus: "planned",
          valueForUser: "Evita ação sem consciência de trade-off.",
        },
      ],
    },
    {
      tab: "evidence",
      label: "Evidências",
      purpose: "Base de prova: fontes, grafo, claims, validação e materialidade dos artefatos.",
      primaryQuestion: "Por que deveríamos acreditar nesta pesquisa?",
      valueForUser: "Audita a força do argumento e separa evidência direta de inferência.",
      minimumTier: "rich",
      emptyStateMeaning: "A pesquisa tem texto, mas ainda não possui prova estruturada.",
      artifacts: ["sources.yaml", "research-graph.json", "metrics.yaml", "claims.yaml", "validation-report.yaml"],
      fields: [
        {
          field: "sources",
          artifact: "sources.yaml",
          path: "sources[].id/title/url/type/date/credibility/flags",
          importance: "required",
          fallback: "topSources empty",
          consumer: "ResearchEvidenceReport source cards",
          consumerStatus: "implemented",
          valueForUser: "Mostra base externa e local usada para sustentar claims.",
        },
        {
          field: "graph_nodes",
          artifact: "research-graph.json",
          path: "nodes[].id/type/label/summary/source",
          importance: "required",
          fallback: "empty graph",
          consumer: "ResearchArtifactDag",
          consumerStatus: "partial",
          valueForUser: "Mostra como query, waves, fontes, claims e decisões se conectam.",
        },
        {
          field: "graph_edges",
          artifact: "research-graph.json",
          path: "edges[] | links[]; existing fixtures use from/to/relation, normalized aliases accept source/target/type/weight",
          importance: "required",
          fallback: "empty graph",
          consumer: "ResearchArtifactDag",
          consumerStatus: "partial",
          valueForUser: "Prova encadeamento, não só presença de documentos.",
          normalization: "STORY-150.2 deve normalizar edges|links e from/to/relation|source/target/type/weight antes de renderizar.",
          qualityRule: "Cada edge deve apontar para ids existentes. Contrato atual declara as duas formas porque o dashboard e as fixtures existentes usam from/to/relation.",
        },
        {
          field: "claims",
          artifact: "claims.yaml",
          path: "claims[].claim/evidence_ids/confidence/status",
          importance: "recommended",
          fallback: "inferred from report sections",
          consumer: "Evidence claim list",
          consumerStatus: "planned",
          valueForUser: "Transforma frases importantes em unidades verificáveis.",
        },
        {
          field: "validation",
          artifact: "validation-report.yaml",
          path: "checks[].id/status/message",
          importance: "recommended",
          fallback: "validator absent",
          consumer: "Evidence validation badges",
          consumerStatus: "planned",
          valueForUser: "Diz o que foi validado mecanicamente e o que depende de revisão humana.",
        },
      ],
    },
    {
      tab: "waves",
      label: "Waves",
      purpose: "Linha do tempo de execução: waves, eventos, mudanças de direção e material produzido.",
      primaryQuestion: "Como o raciocínio evoluiu e onde houve mudança de rota?",
      valueForUser: "Mostra se a pesquisa foi profunda ou apenas uma síntese final sem processo auditável.",
      minimumTier: "rich",
      emptyStateMeaning: "Não há log estruturado de execução; a profundidade não é auditável pela UI.",
      artifacts: ["execution-log.jsonl", "pipeline-state.yaml", "02-research-report.md", "metrics.yaml"],
      fields: [
        {
          field: "events",
          artifact: "execution-log.jsonl",
          path: "ts/phase/wave/event/summary/artifacts",
          importance: "required",
          fallback: "selectedRun timeline",
          consumer: "ResearchWavesReport",
          consumerStatus: "implemented",
          valueForUser: "Revela o caminho percorrido, não só a conclusão.",
        },
        {
          field: "wave_summaries",
          artifact: "02-research-report.md",
          path: "## Wave *",
          importance: "recommended",
          fallback: "execution-log grouped by wave",
          consumer: "ResearchWavesReport wave cards",
          consumerStatus: "implemented",
          valueForUser: "Mostra descobertas incrementais por wave.",
        },
        {
          field: "stop_reason",
          artifact: "metrics.yaml",
          path: "stop_reason",
          importance: "recommended",
          fallback: "pipeline-state.yaml status",
          consumer: "ResearchWavesReport footer",
          consumerStatus: "implemented",
          valueForUser: "Explica por que a pesquisa terminou: saturação, tempo, bloqueio ou decisão suficiente.",
        },
      ],
    },
    {
      tab: "sources",
      label: "Fontes",
      purpose: "Inventário de fontes com credibilidade, cobertura, frescor e uso dentro da pesquisa.",
      primaryQuestion: "Quais fontes sustentam a pesquisa e quais são fracas ou ausentes?",
      valueForUser: "Permite revisar a qualidade da base sem vasculhar markdown.",
      minimumTier: "rich",
      emptyStateMeaning: "Não há fonte normalizada; qualquer conclusão é difícil de auditar.",
      artifacts: ["sources.yaml", "metrics.yaml", "research-graph.json"],
      fields: [
        {
          field: "source_identity",
          artifact: "sources.yaml",
          path: "sources[].id/title/url/publisher",
          importance: "required",
          fallback: "source title from report links",
          consumer: "Sources tab cards",
          consumerStatus: "implemented",
          valueForUser: "Identifica exatamente de onde veio cada evidência.",
        },
        {
          field: "credibility",
          artifact: "sources.yaml",
          path: "sources[].credibility/source_type/official",
          importance: "recommended",
          fallback: "unknown",
          consumer: "Sources credibility sort and badges",
          consumerStatus: "implemented",
          valueForUser: "Separa docs oficiais, código local, blog, opinião e inferência.",
          normalization: "Preferir 0-100; 0-1 aceito.",
        },
        {
          field: "freshness",
          artifact: "sources.yaml",
          path: "sources[].date/accessed_at",
          importance: "recommended",
          fallback: "undated",
          consumer: "Sources freshness indicators",
          consumerStatus: "implemented",
          valueForUser: "Mostra risco de fonte obsoleta.",
        },
        {
          field: "usage",
          artifact: "research-graph.json",
          path: "edges[source=source:*]",
          importance: "optional",
          fallback: "not connected",
          consumer: "Sources evidence links",
          consumerStatus: "partial",
          valueForUser: "Mostra quais fontes realmente sustentam claims e decisões.",
        },
      ],
    },
    {
      tab: "players",
      label: "Players",
      purpose: "Mapa de players, categorias, tiers, ação recomendada e Rubrica decisória ponderada.",
      primaryQuestion: "Quem informa a decisão, o que devo fazer com cada player e quem vence sob cada critério?",
      valueForUser: "Transforma lista de nomes em análise de arquitetura, mercado, execução e ranking por persona.",
      minimumTier: "rich",
      emptyStateMeaning: "Há menções soltas, mas não há categorização útil para decisão.",
      artifacts: ["players.yaml", "decision-rubric.yaml"],
      fields: [
        {
          field: "tier_meaning",
          artifact: "players.yaml",
          path: "tier_meaning",
          importance: "recommended",
          fallback: "Tier 1=adotar, Tier 2=adaptar, Tier 3=monitorar",
          consumer: "ResearchPlayersView legend",
          consumerStatus: "partial",
          valueForUser: "Explica o que cada tier significa antes de mostrar nomes.",
        },
        {
          field: "tier",
          artifact: "players.yaml",
          path: "players[].tier",
          importance: "required",
          fallback: "2",
          consumer: "ResearchPlayersView tiers and scatter",
          consumerStatus: "implemented",
          valueForUser: "Prioriza quem é referência, comparação ou ruído.",
          normalization: "Aceita número 1/2/3 ou texto Tier 1/2/3.",
        },
        {
          field: "category",
          artifact: "players.yaml",
          path: "players[].category",
          importance: "required",
          fallback: "sem categoria",
          consumer: "ResearchPlayersView categories",
          consumerStatus: "implemented",
          valueForUser: "Agrupa players por função real: runtime, runner, dashboard, framework, source.",
        },
        {
          field: "role",
          artifact: "players.yaml",
          path: "players[].role",
          importance: "recommended",
          fallback: "hidden",
          consumer: "ResearchPlayerCompactRow",
          consumerStatus: "implemented",
          valueForUser: "Explica por que aquele player entrou na pesquisa.",
        },
        {
          field: "fit",
          artifact: "players.yaml",
          path: "players[].fit",
          importance: "recommended",
          fallback: "hidden",
          consumer: "ResearchPlayerCompactRow",
          consumerStatus: "implemented",
          valueForUser: "Diz se serve para copiar, adaptar, evitar ou monitorar.",
        },
        {
          field: "action",
          artifact: "players.yaml",
          path: "players[].action",
          importance: "recommended",
          fallback: "insight",
          consumer: "ResearchPlayerCompactRow",
          consumerStatus: "implemented",
          valueForUser: "Converte player em próximo passo.",
        },
        {
          field: "decision_rubric",
          artifact: "decision-rubric.yaml",
          path: "dimensions[], presets[], players[].scores, rankings",
          importance: "recommended",
          fallback: "players tiers and fit",
          consumer: "ResearchPlayersView",
          consumerStatus: "partial",
          valueForUser: "Permite recalcular ranking por peso/persona sem refazer a pesquisa.",
          qualityRule: "Deve existir em toda pesquisa; quando não houver comparação suficiente, usar status not_applicable. Consumer atual mostra baseline, dimensões e presets; sliders ficam para evolução futura.",
        },
      ],
    },
    {
      tab: "curiosity",
      label: "Perguntas",
      purpose: "Fila de dúvidas abertas priorizada por impacto na decisão.",
      primaryQuestion: "O que ainda precisamos descobrir para reduzir risco ou desbloquear execução?",
      valueForUser: "Evita que lacunas fiquem escondidas no relatório e orienta a próxima wave.",
      minimumTier: "rich",
      emptyStateMeaning: "A pesquisa não declarou incertezas; isso reduz utilidade para follow-up.",
      artifacts: ["curiosity_queue.yaml"],
      fields: [
        {
          field: "questions",
          artifact: "curiosity_queue.yaml",
          path: "questions[] | items[]",
          importance: "required",
          fallback: "empty state",
          consumer: "ResearchCuriosityReport",
          consumerStatus: "implemented",
          valueForUser: "Transforma dúvida em backlog de investigação.",
        },
        {
          field: "priority",
          artifact: "curiosity_queue.yaml",
          path: "questions[].priority | items[].priority",
          importance: "required",
          fallback: "MEDIUM",
          consumer: "P1 counters and sort",
          consumerStatus: "implemented",
          valueForUser: "Separa dúvidas que mudam decisão de curiosidades secundárias.",
          normalization: "HIGH/P1, MEDIUM/P2, LOW/P3.",
        },
        {
          field: "why_it_matters",
          artifact: "curiosity_queue.yaml",
          path: "questions[].why_it_matters | items[].why",
          importance: "recommended",
          fallback: "question text",
          consumer: "Question cards",
          consumerStatus: "implemented",
          valueForUser: "Explica o custo de não responder.",
        },
        {
          field: "next_action",
          artifact: "curiosity_queue.yaml",
          path: "questions[].next_action | items[].next_action",
          importance: "recommended",
          fallback: "Aprofundar",
          consumer: "Question cards",
          consumerStatus: "implemented",
          valueForUser: "Converte lacuna em tarefa de pesquisa.",
        },
      ],
    },
    {
      tab: "document",
      label: "Doc",
      purpose: "Leitor bruto dos artefatos selecionados.",
      primaryQuestion: "Qual é a fonte textual ou estruturada exata por trás da visualização?",
      valueForUser: "Preserva auditabilidade total: qualquer card visual pode ser conferido no artefato original.",
      minimumTier: "legacy",
      emptyStateMeaning: "O run não possui arquivos legíveis.",
      artifacts: [
        "README.md",
        "00-query-original.md",
        "01-deep-research-prompt.md",
        "02-research-report.md",
        "03-recommendations.md",
        "quick-wins.md",
        "metrics.yaml",
        "pipeline-state.yaml",
        "execution-log.jsonl",
        "sources.yaml",
        "research-graph.json",
        "matrices.yaml",
        "curiosity_queue.yaml",
        "players.yaml",
        "ux-patterns.yaml",
        "action-plan.yaml",
        "claims.yaml",
        "decision-ledger.yaml",
        "risk-register.yaml",
        "dashboard-manifest.yaml",
        "validation-report.yaml",
      ],
      fields: [
        {
          field: "selected_document",
          artifact: "README.md",
          path: "content",
          importance: "required",
          fallback: "first readable document",
          consumer: "DocumentReader",
          consumerStatus: "implemented",
          valueForUser: "Permite inspeção direta e comparação com a UI.",
        },
        {
          field: "document_metadata",
          artifact: "dashboard-manifest.yaml",
          path: "artifacts[].file/phase/role",
          importance: "optional",
          fallback: "filesystem metadata",
          consumer: "Document picker",
          consumerStatus: "planned",
          valueForUser: "Ajuda o usuário a escolher o artefato certo para auditar.",
        },
      ],
    },
  ] satisfies ResearchTabContract[],
} as const
