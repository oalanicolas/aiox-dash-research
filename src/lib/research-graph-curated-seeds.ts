import type { ResearchGraphEdge } from "@/components/research-graph/types"

export type CuratedSeedConnection = Pick<
  ResearchGraphEdge,
  "source" | "target" | "relation" | "label" | "strength" | "evidence" | "why"
>

export const CURATED_SEED_CONNECTIONS: CuratedSeedConnection[] = [
  {
    source: "research:2026-05-16-validar-aiox-open-research-stack",
    target: "bench:2026-05-19-local-deep-research-absorption",
    relation: "operationalizes",
    label: "vira absorção",
    strength: 0.9,
    evidence:
      "docs/research/2026-05-16-validar-aiox-open-research-stack/02-research-report.md:28; docs/bench/2026-05-19-local-deep-research-absorption/research-contract.json:6",
    why:
      "A pesquisa decide não vender um produto standalone; o bench transforma esse stack em roadmap de absorção TS-nativa. Útil para separar estratégia de produto de implementação técnica.",
  },
  {
    source: "research:2026-05-16-quais-as-clis-mais-usadas-das-llms-codex",
    target: "bench:2026-05-21-codex-vs-claude-code",
    relation: "validates",
    label: "valida workflow",
    strength: 0.86,
    evidence:
      "docs/research/2026-05-16-quais-as-clis-mais-usadas-das-llms-codex/evolving_report.md:13; docs/bench/2026-05-21-codex-vs-claude-code/scenario-scorecards.json",
    why:
      "A pesquisa propõe o padrão Codex para edição rápida e Claude Code para commits; o bench testa a decisão em cenários comparáveis. Útil para definir quando cada CLI entra no fluxo.",
  },
  {
    source: "research:2026-05-16-eddie-ai-marketing",
    target: "bench:submagic-vs-eddie-ai",
    relation: "distinguishes",
    label: "separa categoria",
    strength: 0.84,
    evidence:
      "docs/research/2026-05-16-eddie-ai-marketing/positioning-and-messaging.md:37; docs/bench/submagic-vs-eddie-ai/comparison-matrix.md:101",
    why:
      "A pesquisa mostra que Eddie não ocupa diretamente o espaço de short-form creators; o bench prova que Eddie e Submagic resolvem problemas diferentes. Útil para evitar comparação competitiva superficial.",
  },
  {
    source: "research:2026-05-11-tecnicas-mapeamento-processos-tasks-workflows",
    target: "bench:2026-05-23-aiox-sop-vs-opensource-ai-process-mapping",
    relation: "calibrates",
    label: "calibra critérios",
    strength: 0.88,
    evidence:
      "docs/research/2026-05-11-tecnicas-mapeamento-processos-tasks-workflows/02-research-report.md:17,296; docs/bench/2026-05-23-aiox-sop-vs-opensource-ai-process-mapping/evaluation-rubric.yaml:7",
    why:
      "A pesquisa define quando usar SIPOC, BPMN, DMN e process mining; o bench mede quais capacidades o aiox-sop deve absorver. Útil para transformar teoria em critérios de absorção.",
  },
  {
    source: "research:2026-05-16-submagic-marketing",
    target: "bench:oss-shortform-pipelines",
    relation: "opens_gap",
    label: "abre gaps OSS",
    strength: 0.82,
    evidence:
      "docs/research/2026-05-16-submagic-marketing/README.md:5; docs/bench/oss-shortform-pipelines/gap-analysis.md:3",
    why:
      "A pesquisa separa marketing/GTM das features já cobertas no bench comercial; o bench OSS usa Submagic Pro como teto de paridade. Útil para separar narrativa de mercado de roadmap de substituição.",
  },
  {
    source: "research:2026-03-19-slide-creator-v2-upgrade",
    target: "bench:slides-creator-open-source-absorption",
    relation: "anchors",
    label: "ancora QA visual",
    strength: 0.84,
    evidence:
      "docs/research/2026-03-19-slide-creator-v2-upgrade/03-andragogic-slide-design-system.md:459; docs/bench/slides-creator-open-source-absorption/scenario-scorecards.json:829,947",
    why:
      "A pesquisa define regras de design andragógico e anti-padrões de slide; o bench avalia quais players permitem absorver esse comportamento com segurança. Útil para ligar qualidade pedagógica à escolha de engine.",
  },
]
