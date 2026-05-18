# Research Observatory Contract

Este documento é o contrato entre o pipeline `tech-research` e o dashboard `apps/research`.

Ele responde três perguntas:

1. Qual artefato deve existir para cada aba visual.
2. Qual campo cada aba consome.
3. Que valor aquele dado entrega para o usuário.

A versão tipada do contrato fica em `src/lib/research-observatory-contract.ts`. Quando o pipeline gerar uma pesquisa de referência, ele deve mirar o nível `gold`.

## Tiers

| Tier | Significado | Artefatos mínimos |
|---|---|---|
| `legacy` | Há conteúdo textual para leitura bruta, mas as abas visuais terão muitos vazios. | `README.md` |
| `partial` | Há relatório e recomendações, mas pouca prova estruturada. | `README.md`, `02-research-report.md`, `03-recommendations.md` |
| `rich` | As abas principais já são úteis: Map, Evidências, Waves, Fontes, Players e Perguntas. | `metrics.yaml`, `pipeline-state.yaml`, `execution-log.jsonl`, `sources.yaml`, `research-profile.yaml`, `research-graph.json`, `curiosity_queue.yaml`, `players.yaml` |
| `gold` | A pesquisa vira ativo operacional: tem plano executável, claims, riscos, ledger, Rubrica decisória e validação. | `action-plan.yaml`, `claims.yaml`, `decision-ledger.yaml`, `risk-register.yaml`, `decision-rubric.yaml`, `dashboard-manifest.yaml`, `validation-report.yaml` |

Regra prática: `rich` mostra bem a pesquisa; `gold` permite decidir, delegar e auditar.

## Regras Globais

- Nunca renderizar objeto cru na UI. Todo objeto precisa ter `title`, `summary`, `label` ou `name`.
- Scores podem vir como `0-1` ou `0-100`; o consumidor normaliza para `0-100`.
- Prioridades devem preferir `HIGH`, `MEDIUM`, `LOW`. A UI aceita `P1`, `P2`, `P3` como legado.
- `curiosity_queue.yaml` deve preferir `questions[]`. `items[]` existe apenas por compatibilidade com extratores antigos.
- `pipeline-state.yaml` deve preferir `phases[]` como array ordenado. Objeto por chave é aceito como legado.
- `execution-log.jsonl` deve ter uma entrada JSON válida por linha.
- Todo campo visual importante deve ser rastreável para uma fonte, claim, evento ou decisão.
- Toda pesquisa nova deve emitir `research-profile.yaml` com `profile.type` em `tech | bench | market | product | mapping`.
- O profile adapta linguagem, política de artefatos e Rubrica sem criar pipelines separados.
- `consumerStatus` documenta a realidade do dashboard atual, não a intenção futura: `implemented`, `partial`, `planned`, `missing` ou `legacy`.
- `research-graph.json` deve aceitar as duas formas de edge durante a migração: `from/to/relation` (forma usada por fixtures e consumidores atuais) e `source/target/type/weight` (forma normalizada/planejada). A Story 150.2 deve normalizar ambas antes da renderização.

## Artefatos Canônicos

| Artefato | Função |
|---|---|
| `README.md` | Sumário humano do run e ponto de entrada para auditoria. |
| `00-query-original.md` | Pergunta original, restrições, escopo e critérios de sucesso. |
| `01-deep-research-prompt.md` | Prompt ou plano usado para executar waves. |
| `02-research-report.md` | Relatório narrativo principal. |
| `03-recommendations.md` | Recomendações, decisão, próximos passos e trade-offs. |
| `quick-wins.md` | Ações de baixo custo e alto retorno. |
| `metrics.yaml` | Scores, cobertura, integridade, breakdown e status de decisão. |
| `pipeline-state.yaml` | Fases, status, artefatos produzidos e estado final. |
| `execution-log.jsonl` | Linha do tempo auditável de eventos, waves e validações. |
| `sources.yaml` | Fontes normalizadas com credibilidade, data, tipo e seção de uso. |
| `research-profile.yaml` | Perfil universal da pesquisa: tech, bench, market, product ou mapping, com linguagem do dashboard e política de artefatos. |
| `research-graph.json` | Grafo conectando query, waves, fontes, claims, decisões e artefatos. |
| `matrices.yaml` | Matrizes de decisão, comparação, gaps e priorização. |
| `curiosity_queue.yaml` | Perguntas abertas priorizadas por impacto. |
| `players.yaml` | Players, categorias, tier, papel, fit e ação recomendada. |
| `decision-rubric.yaml` | Rubrica ponderada para avaliar alternativas detectadas pela pesquisa sob diferentes pesos e presets. |
| `ux-patterns.yaml` | Padrões de UX/produto observados. |
| `action-plan.yaml` | Plano canônico de decisão, ações, roadmap, quick wins e owners. |
| `claims.yaml` | Claims com evidências, confiança e status de validação. |
| `decision-ledger.yaml` | Histórico de decisões, alternativas rejeitadas e rationale. |
| `risk-register.yaml` | Riscos, severidade, mitigação, gatilhos e donos. |
| `dashboard-manifest.yaml` | Manifesto opcional declarando completude por aba. |
| `validation-report.yaml` | Resultado dos validadores e checklist de completude visual. |

## Consumer Status

Esta seção registra o estado real dos consumidores no `apps/research` em 2026-05-17. Ela evita que o contrato pareça Gold-ready quando o dashboard ainda não lê todos os artefatos.

| Status | Significado |
|---|---|
| `implemented` | O dashboard atual lê e renderiza o campo ou artefato. |
| `partial` | O dashboard lê parte do dado, usa fallback frágil ou ignora subcampos importantes. |
| `planned` | O campo está contratado, mas a implementação fica em story posterior do EPIC-150. |
| `missing` | Não há consumer conhecido no dashboard atual. |
| `legacy` | Campo mantido para compatibilidade com pesquisas antigas. |

### Artefatos Gold Ainda Sem Consumer Real

| Artefato | Status atual | Onde deve gerar valor | Story responsável |
|---|---|---|---|
| `claims.yaml` | `planned` | Aba Evidências, como lista de claims verificáveis com confiança e status. | 150.2 / 150.3 |
| `decision-ledger.yaml` | `planned` | Aba Ações ou Doc, como histórico de decisões e alternativas rejeitadas. | 150.2 / 150.3 |
| `risk-register.yaml` | `planned` | Aba Ações, como riscos estruturados com severidade, mitigação e gatilho. | 150.2 / 150.3 |
| `decision-rubric.yaml` | `partial` | Aba Players mostra baseline, dimensões e presets; Rubrica interativa com sliders fica como evolução. | 150.7 |
| `dashboard-manifest.yaml` | `planned` | Topbar/Doc, como tier por aba e motivo de ausência. | 150.5 |
| `validation-report.yaml` | `planned` | Evidências/Doc, como checks passados, avisos e falhas. | 150.5 |

### Consumers Parciais Críticos

| Artefato | Status atual | Gap |
|---|---|---|
| `action-plan.yaml` | `partial` | Map e Slides usam parte de `decision`, mas a aba Ações ainda deve priorizar `actions[]` e `roadmap[]` na Story 150.2. |
| `research-graph.json` | `partial` | Consumidores atuais usam `from/to/relation`; o contrato também aceita `source/target/type/weight`, mas a normalização fica para Story 150.2. |
| `players.yaml` | `partial` | A UI exibe players, mas ainda precisa renderizar `tier_meaning`/legenda de forma mais útil. |

### Status por Aba

Esta tabela é o mapa rápido para PM, design e engenharia decidirem onde agir. `implemented` significa valor visual real hoje; `partial` significa que a aba mostra algo, mas ainda pode ocultar dado Gold; `planned` significa que o pipeline pode gerar o artefato, porém o dashboard ainda precisa de consumer.

| Aba | Fonte primária | Fallback atual | Status do consumer | Valor entregue hoje | Próxima ação |
|---|---|---|---|---|---|
| Map | `research-profile.yaml`, `metrics.yaml`, `pipeline-state.yaml`, `execution-log.jsonl`, `action-plan.yaml` | Metadados do run e `metrics.stop_reason` | `partial` | Mostra profile, score, fases, cobertura e parte da decisão; labels principais já se adaptam por profile. | Próxima evolução: aplicar labels adaptativos também na navegação/topbar. |
| Slides | `README.md`, `sources.yaml`, `players.yaml`, `action-plan.yaml` | Metadados e markdown principal | `partial` | Gera narrativa executiva básica com evidências e players. | Story 150.2 deve usar decisão normalizada do YAML. |
| Ações | `research-profile.yaml`, `action-plan.yaml`, `quick-wins.md`, `risk-register.yaml` | Regex sobre `03-recommendations.md` e `quick-wins.md` | `partial` | Mostra quick wins, roadmap e riscos com label adaptativo por profile. | Próxima evolução: aplicar labels adaptativos também em cards internos de risco/roadmap. |
| Evidências | `sources.yaml`, `research-graph.json`, `claims.yaml`, `validation-report.yaml` | Lista de fontes e grafo vazio | `partial` | Mostra fontes e parte do grafo. | Story 150.2 deve normalizar edges; 150.3 deve renderizar claims e validação. |
| Waves | `execution-log.jsonl`, `02-research-report.md`, `metrics.yaml` | Timeline do run | `implemented` | Mostra caminho de execução e motivo de parada. | Manter compatibilidade com logs antigos. |
| Fontes | `sources.yaml`, `research-graph.json` | Links extraídos do markdown | `partial` | Audita identidade, credibilidade e frescor das fontes. | Story 150.2 deve ligar uso da fonte ao grafo/claims. |
| Players | `research-profile.yaml`, `players.yaml`, `decision-rubric.yaml` | Lista vazia ou agrupamento sem categoria | `partial` | Mostra players/alternativas/atores conforme profile, tiers, categorias, fit, ação sugerida, ranking baseline, dimensões e presets de Rubrica. | Evolução futura deve transformar o baseline em sliders interativos. |
| Perguntas | `curiosity_queue.yaml` | Sem perguntas abertas | `implemented` | Mostra lacunas P1/P2/P3 e próximos passos de investigação. | Manter alias `items[]` somente como legado. |
| Doc | `README.md`, `dashboard-manifest.yaml` | Leitor bruto de documento | `partial` | Permite inspecionar artefatos textuais. | Story 150.5 deve consumir manifesto de completude e validação. |

## Abas

### 01 Map

Pergunta que responde: posso confiar no veredito e entender como a pesquisa chegou nele?

Valor: reduz a leitura inicial. O usuário vê maturidade, rastreabilidade, decisão e lacunas críticas antes de abrir documentos.

Artefatos consumidos:

- `metrics.yaml`
- `research-profile.yaml`
- `pipeline-state.yaml`
- `execution-log.jsonl`
- `research-graph.json`
- `matrices.yaml`
- `ux-patterns.yaml`
- `curiosity_queue.yaml`
- `action-plan.yaml`

Campos essenciais:

| Campo visual | Fonte | Caminho | Valor |
|---|---|---|---|
| Decisão | `action-plan.yaml` | `decision.title` | Transforma o mapa em veredito. |
| Tipo da pesquisa | `research-profile.yaml` | `profile.type` | Diferencia tech, bench, mercado, produto e mapeamento sem novo pipeline. |
| Labels do dashboard | `research-profile.yaml` | `dashboard_labels.*` | Adapta labels de Players, Matrizes, Ações e Rubrica ao domínio. |
| Resumo da decisão | `action-plan.yaml` | `decision.summary` | Explica o porquê sem exigir leitura completa. |
| Cobertura | `metrics.yaml` | `coverage_score` | Indica se a pesquisa cobriu material suficiente. |
| Integridade | `metrics.yaml` | `integrity_score` | Mostra se os dados são coerentes e rastreáveis. |
| Breakdown | `metrics.yaml` | `coverage_breakdown.*` | Revela de onde vem a confiança. |
| Fases | `pipeline-state.yaml` | `phases[]` | Mostra execução concluída e pontos de parada. |
| Eventos | `execution-log.jsonl` | `ts`, `phase`, `event`, `summary` | Audita evolução, não só conclusão. |
| Perguntas P1 | `curiosity_queue.yaml` | `questions[].priority` | Mostra o que ainda pode mudar a decisão. |

Exemplo mínimo:

```yaml
# action-plan.yaml
decision:
  title: Construir SDC Supervisor Runtime para Codex
  summary: Usar heartbeat externo, manager agent e estado persistido; rejeitar full-sdc.sh determinístico como arquitetura primária.
  confidence: 0.9
```

```yaml
# metrics.yaml
coverage_score: 96
integrity_score: 94
coverage_breakdown:
  official_docs: 0.9
  local_claude_code_source: 0.95
  local_runner_library: 0.92
  codex_runtime_mapping: 0.9
```

### 02 Slides

Pergunta que responde: como explico esta pesquisa para alguém que não vai ler todos os artefatos?

Valor: converte a pesquisa em narrativa apresentável para decisão executiva, revisão técnica ou handoff.

Artefatos consumidos:

- `README.md`
- `02-research-report.md`
- `03-recommendations.md`
- `sources.yaml`
- `players.yaml`
- `action-plan.yaml`
- `metrics.yaml`

Campos essenciais:

| Campo visual | Fonte | Caminho | Valor |
|---|---|---|---|
| Abertura | `README.md` | `title`, `summary`, `status` | Dá contexto imediato. |
| Evidência | `sources.yaml` | `sources[].title`, `url`, `credibility` | Evita apresentação opinativa. |
| Decisão | `action-plan.yaml` | `decision.title`, `summary`, `why_now` | Fecha narrativa em decisão. |
| Mapa de players | `players.yaml` | `players[].tier`, `category`, `role`, `fit` | Mostra referências e adaptações. |

### 03 Ações

Pergunta que responde: o que fazemos agora, em qual ordem e com qual risco?

Valor: transforma achados em execução priorizada.

Artefatos consumidos:

- `03-recommendations.md`
- `quick-wins.md`
- `action-plan.yaml`
- `curiosity_queue.yaml`
- `risk-register.yaml`

Campos essenciais:

| Campo visual | Fonte | Caminho | Valor |
|---|---|---|---|
| Decisão recomendada | `action-plan.yaml` | `decision.title`, `summary`, `confidence` | Define o veredito antes da tarefa. |
| Ações | `action-plan.yaml` | `actions[]` | Prioriza o próximo movimento. |
| Roadmap | `action-plan.yaml` | `roadmap[]` | Separa agora, próximo e depois. |
| Quick wins | `quick-wins.md` ou `action-plan.yaml` | seções ou `actions[type=quick_win]` | Identifica baixo esforço. |
| Riscos | `risk-register.yaml` | `risks[]` | Evita execução sem trade-off. |

Formato recomendado:

```yaml
actions:
  - id: A1
    type: roadmap
    priority: HIGH
    title: Criar SDC Supervisor Runtime
    owner: platform
    status: proposed
    rationale: Mantém autonomia longa sem transformar skill em script determinístico.
    evidence:
      - claim:codex-loop-heartbeat
      - source:claude-code-agent-teams
roadmap:
  - horizon: now
    title: Contrato de estado persistido
    outcome: Supervisor consegue retomar missão sem depender de contexto vivo.
```

### 04 Evidências

Pergunta que responde: por que deveríamos acreditar nesta pesquisa?

Valor: audita a força do argumento e separa evidência direta de inferência.

Artefatos consumidos:

- `sources.yaml`
- `research-graph.json`
- `metrics.yaml`
- `claims.yaml`
- `validation-report.yaml`

Campos essenciais:

| Campo visual | Fonte | Caminho | Valor |
|---|---|---|---|
| Fontes | `sources.yaml` | `sources[]` | Mostra base externa e local. |
| Nós do grafo | `research-graph.json` | `nodes[]` | Mostra entidades e artefatos relevantes. |
| Links do grafo | `research-graph.json` | `edges[]` ou `links[]`; aceitar `from/to/relation` e `source/target/type/weight` | Prova encadeamento entre sinais. |
| Claims | `claims.yaml` | `claims[]` | Transforma frase importante em unidade verificável. |
| Validação | `validation-report.yaml` | `checks[]` | Diz o que foi validado mecanicamente. |

Formato recomendado do grafo:

```json
{
  "schema_version": "research-graph.v2",
  "nodes": [
    { "id": "query:root", "type": "query", "label": "Codex Full-SDC Orchestration" },
    { "id": "source:openai-agents-sdk", "type": "source", "label": "OpenAI Agents SDK" },
    { "id": "decision:supervisor-runtime", "type": "decision", "label": "Construir supervisor runtime" }
  ],
  "edges": [
    { "from": "source:openai-agents-sdk", "to": "decision:supervisor-runtime", "relation": "supports", "weight": 0.8 },
    { "source": "source:openai-agents-sdk", "target": "decision:supervisor-runtime", "type": "supports", "weight": 0.8 }
  ],
  "links": [
    { "from": "source:openai-agents-sdk", "to": "decision:supervisor-runtime", "relation": "supports", "weight": 0.8 },
    { "source": "source:openai-agents-sdk", "target": "decision:supervisor-runtime", "type": "supports", "weight": 0.8 }
  ]
}
```

### 05 Waves

Pergunta que responde: como o raciocínio evoluiu e onde houve mudança de rota?

Valor: mostra se houve pesquisa profunda ou apenas síntese final sem processo auditável.

Artefatos consumidos:

- `execution-log.jsonl`
- `pipeline-state.yaml`
- `02-research-report.md`
- `metrics.yaml`

Campos essenciais:

| Campo visual | Fonte | Caminho | Valor |
|---|---|---|---|
| Eventos | `execution-log.jsonl` | `ts`, `phase`, `wave`, `event`, `summary` | Revela o caminho percorrido. |
| Resumos por wave | `02-research-report.md` | seções `Wave` | Mostra descobertas incrementais. |
| Motivo de parada | `metrics.yaml` | `stop_reason` | Explica saturação, bloqueio ou decisão suficiente. |

Formato recomendado:

```jsonl
{"ts":"2026-05-17T00:05:00-03:00","phase":"external-research","wave":1,"event":"started","summary":"Levantamento de documentação oficial e padrões de agentes."}
{"ts":"2026-05-17T00:20:00-03:00","phase":"local-code-study","wave":2,"event":"completed","summary":"Claude Code usa teams e coordenação; runner determinístico não replica autonomia."}
```

### 06 Fontes

Pergunta que responde: quais fontes sustentam a pesquisa e quais são fracas ou ausentes?

Valor: permite revisar qualidade da base sem vasculhar markdown.

Artefatos consumidos:

- `sources.yaml`
- `metrics.yaml`
- `research-graph.json`

Campos essenciais:

| Campo visual | Fonte | Caminho | Valor |
|---|---|---|---|
| Identidade | `sources.yaml` | `sources[].id`, `title`, `url`, `publisher` | Identifica evidência. |
| Credibilidade | `sources.yaml` | `credibility`, `source_type`, `official` | Separa docs oficiais, código local e opinião. |
| Frescor | `sources.yaml` | `date`, `accessed_at` | Mostra risco de obsolescência. |
| Uso | `research-graph.json` | edges de fontes | Mostra quais fontes sustentam claims. |

Formato recomendado:

```yaml
sources:
  - id: source:openai-agents-sdk
    title: OpenAI Agents SDK Documentation
    url: https://platform.openai.com/docs
    publisher: OpenAI
    source_type: official_docs
    official: true
    credibility: 95
    accessed_at: "2026-05-17"
    used_in:
      - claim:codex-can-coordinate-workers
```

### 07 Players

Pergunta que responde: quem informa a decisão e o que devo fazer com cada player?

Valor: transforma lista de nomes em análise de arquitetura, mercado e execução.

Artefatos consumidos:

- `players.yaml`
- `decision-rubric.yaml`

Campos essenciais:

| Campo visual | Fonte | Caminho | Valor |
|---|---|---|---|
| Significado dos tiers | `players.yaml` | `tier_meaning` | Explica o mapa antes dos nomes. |
| Tier | `players.yaml` | `players[].tier` | Prioriza referência, adaptação ou monitoramento. |
| Categoria | `players.yaml` | `players[].category` | Agrupa por função real. |
| Papel | `players.yaml` | `players[].role` | Explica por que entrou. |
| Fit | `players.yaml` | `players[].fit` | Diz se serve para copiar, adaptar, evitar ou monitorar. |
| Ação | `players.yaml` | `players[].action` | Converte player em próximo passo. |
| Perfil da rubrica | `decision-rubric.yaml` | `profile.type`, `model.dimension_pack` | Garante que os critérios pertencem ao domínio da pesquisa. |
| Dimensões | `decision-rubric.yaml` | `dimensions[]` | Explica quais critérios estão sendo ponderados. |
| Presets/personas | `decision-rubric.yaml` | `presets[]` | Mostra como o ranking muda por perfil de decisão. |
| Scores por player | `decision-rubric.yaml` | `players[].scores` | Permite comparar alternativas além de tier fixo. |
| Rankings | `decision-rubric.yaml` | `rankings` | Entrega a ordenação por baseline e presets sem refazer pesquisa. |

Formato recomendado:

```yaml
tier_meaning:
  1: "Adotar como padrão principal ou referência direta."
  2: "Adaptar parcialmente; útil, mas não resolve sozinho."
  3: "Monitorar ou usar apenas como inspiração lateral."
players:
  - name: Codex Subagents
    category: codex-runtime
    tier: 1
    role: Mecanismo nativo de delegação paralela.
    fit: Alto fit para manager-mediated orchestration.
    action: Usar como base da arquitetura de swarm em Codex.
```

### 08 Perguntas

Pergunta que responde: o que ainda precisamos descobrir para reduzir risco ou desbloquear execução?

Valor: evita que lacunas fiquem escondidas e orienta a próxima wave.

Artefatos consumidos:

- `curiosity_queue.yaml`

Campos essenciais:

| Campo visual | Fonte | Caminho | Valor |
|---|---|---|---|
| Pergunta | `curiosity_queue.yaml` | `questions[].question` | Transforma lacuna em backlog. |
| Prioridade | `curiosity_queue.yaml` | `questions[].priority` | Separa decisão de curiosidade. |
| Por que importa | `curiosity_queue.yaml` | `why_it_matters` | Explica custo de não responder. |
| Próxima ação | `curiosity_queue.yaml` | `next_action` | Converte dúvida em tarefa. |

Formato recomendado:

```yaml
questions:
  - id: Q1
    priority: HIGH
    question: Como manter o supervisor rodando por horas sem depender do contexto vivo do Codex?
    why_it_matters: Sem isso, a experiência não replica o valor de autonomia longa do Claude Code.
    next_action: Prototipar heartbeat externo com estado persistido.
```

### 09 Doc

Pergunta que responde: qual é a fonte textual ou estruturada exata por trás da visualização?

Valor: preserva auditabilidade total. Qualquer card visual deve poder ser conferido no artefato original.

Artefatos consumidos:

- Todos os artefatos legíveis: `.md`, `.yaml`, `.yml`, `.json`, `.jsonl`.

Campos essenciais:

| Campo visual | Fonte | Caminho | Valor |
|---|---|---|---|
| Documento selecionado | qualquer artefato | conteúdo bruto | Permite inspeção direta. |
| Metadados | `dashboard-manifest.yaml` ou filesystem | `file`, `phase`, `role` | Ajuda a escolher o artefato certo. |

## Fronteira com Bench/Duelo

O `tech-research` pode absorver estruturas úteis de Bench/Duelo sem virar um segundo processo. A regra é simples: se a pesquisa já coletou alternativas, players ou abordagens, o pipeline pode gerar comparação leve derivada; se o objetivo é declarar vencedor formal entre competidores, o método correto continua sendo Bench/Duelo.

| Capacidade | `tech-research` base | Comparação leve derivada | Bench/Duelo formal |
|---|---|---|---|
| Objetivo | Responder uma pergunta técnica com evidência rastreável. | Organizar alternativas já descobertas durante a pesquisa. | Comparar competidores com critérios e paridade de evidência. |
| Fonte | Waves, fontes, código local, runners, docs e artefatos da própria pesquisa. | Mesmos artefatos do `tech-research`, sem nova coleta obrigatória. | Dataset ou briefing de benchmark com critérios explícitos. |
| Artefatos | `sources.yaml`, `players.yaml`, `matrices.yaml`, `research-graph.json`, `action-plan.yaml`. | `matrices.yaml`, `players.yaml`, `claims.yaml` e `decision-ledger.yaml` com `derived_from_research: true`. | `bench-output-dash.json` e artefatos específicos do método `benchmark`. |
| Score | Cobertura, integridade, confiança e fit ao problema. | Ranking qualitativo ou fit score local, sempre com ressalva. | Score comparativo formal. |
| Vencedor | Não por padrão. | Só pode recomendar opção se a decisão estiver no `action-plan.yaml`. | Sim, quando os critérios do benchmark forem satisfeitos. |
| Dashboard | Usa as mesmas abas do Research Observatory. | Usa as mesmas abas e marca origem derivada. | Usa adapters Bench existentes, sem virar source of truth do `tech-research`. |

Valor para o usuário: uma boa pesquisa técnica não precisa disparar um processo Bench só para explicar alternativas. Ao mesmo tempo, ela não deve fingir rigor comparativo quando não houve paridade de coleta.

## Checklist de Pesquisa Gold

Antes de considerar uma pesquisa como exemplo máximo:

- `Map` não pode mostrar marcador cru de objeto JavaScript.
- `Map` deve ter decisão, resumo, score, fases, eventos, breakdown e P1.
- `Ações` deve ter ao menos uma ação priorizada e um roadmap.
- `Evidências` deve ter fontes, grafo com nós e links, e claims ou validação.
- `Waves` deve ter timeline real com eventos por fase.
- `Fontes` deve distinguir docs oficiais, código local, fonte externa e inferência.
- `Players` deve explicar tier, categoria, papel, fit e ação.
- `Perguntas` deve ter P1 com `why_it_matters` e `next_action`.
- `Doc` deve permitir auditoria do artefato bruto.
- `validation-report.yaml` deve declarar checks passados, avisos e falhas.

## Como Isso Entra no Pipeline `tech-research`

O pipeline deve gerar primeiro os artefatos narrativos, depois os estruturados:

1. Capturar escopo em `00-query-original.md`.
2. Executar waves e registrar eventos em `execution-log.jsonl`.
3. Consolidar relatório em `02-research-report.md`.
4. Extrair `sources.yaml`, `players.yaml`, `curiosity_queue.yaml`, `matrices.yaml` e `ux-patterns.yaml`.
5. Gerar `research-profile.yaml` para declarar se o dossier é `tech`, `bench`, `market`, `product` ou `mapping`.
6. Gerar `research-graph.json` a partir de fontes, players, claims, decisões, riscos, ações e perguntas.
7. Gerar `action-plan.yaml`, `claims.yaml`, `decision-ledger.yaml` e `risk-register.yaml`.
8. Gerar `decision-rubric.yaml` usando o profile como dimension pack; `model.dimension_pack` deve bater com `research-profile.yaml#profile.type`.
9. Rodar validadores e gravar `validation-report.yaml`.
10. Gravar `dashboard-manifest.yaml` com status por aba.

O dashboard não deve inventar significado ausente. Se a aba está vazia, o problema está no contrato de geração dos artefatos, não no layout.
