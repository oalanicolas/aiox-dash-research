# Handoff P1 — Compatibilizar Todas as Pesquisas com o Research Observatory

type: agent_transfer  
scope: intra_processo  
from: Codex / aiox-dev  
to: Agent:next-session  
date: 2026-05-14  
project: apps/dash — Research Observatory

## Critical Context

O `apps/dash` agora renderiza pesquisas como uma narrativa visual (`Map`, `Ações`, `Evidências`, `Waves`, `Fontes`, `Players`, `Perguntas`, `Doc`), mas a maioria das pastas em `docs/research/<slug>/` ainda não possui todos os artefatos estruturados necessários para preencher essas abas com clareza.

## Objetivo do Próximo Agente

Padronizar todas as pesquisas existentes em `docs/research/**` para que sejam 100% compatíveis com o Research Observatory, sem inventar dados. Quando um dado não existir, o agente deve extrair do Markdown existente, marcar como inferido ou deixar ausente de forma explícita.

## Estado Atual

Implementado no app:

- `apps/dash/src/lib/research-observatory.server.ts`
  - Descobre runs em `docs/research`.
  - Lê artefatos por aba para reduzir carga.
  - Usa `2026-05-11-visual-deep-research-apps` como demo preferida.
- `apps/dash/src/components/observatory/adapters/research.ts`
  - Monta abas conforme artefatos presentes.
  - Aba `Evidências` existe quando há `sources.yaml` ou `research-graph.json`.
- `apps/dash/src/components/observatory/organisms/reader-body.tsx`
  - `Map`: narrativa executiva.
  - `Ações`: decisão, checklist, quick wins, roadmap, riscos.
  - `Evidências`: confiança de fontes, grafo, sinais, arquivos.
  - `Perguntas`: backlog priorizado.

Demo atual:

```txt
http://localhost:3001/observatory/research?slug=2026-05-11-visual-deep-research-apps&view=map
```

## Estado Desejado

Cada pesquisa deve ter, no mínimo, um contrato visual previsível:

```txt
docs/research/<slug>/
  README.md
  00-query-original.md
  01-deep-research-prompt.md
  02-research-report.md
  03-recommendations.md
  metrics.yaml
  pipeline-state.yaml
  execution-log.jsonl
  sources.yaml
  research-graph.json
  matrices.yaml
  curiosity_queue.yaml
  players.yaml
  ux-patterns.yaml
  quick-wins.md
```

Nem todo arquivo precisa existir para toda pesquisa, mas o processo de compatibilização deve tentar gerar todos os que forem defensáveis a partir dos documentos existentes.

## Arquivos Para Ler Antes de Executar

Leia nesta ordem:

1. `apps/dash/README.md`
2. `apps/dash/src/lib/research-observatory.server.ts`
3. `apps/dash/src/components/observatory/adapters/research.ts`
4. `apps/dash/src/components/observatory/organisms/reader-body.tsx`
5. `docs/research/2026-05-11-visual-deep-research-apps/`
6. Uma pesquisa antiga/incompleta em `docs/research/**` para comparar gaps

## Processo Replicável

Para cada `docs/research/<slug>/`:

1. Inventariar arquivos existentes.
2. Classificar a pesquisa:
   - `rich`: tem core, metrics, sources, graph, recommendations.
   - `partial`: tem relatório e alguns YAML/JSON.
   - `legacy`: quase só Markdown.
3. Preservar documentos originais.
4. Gerar ou normalizar artefatos estruturados:
   - `metrics.yaml`: score, coverage, integrity, decision, stop_reason.
   - `pipeline-state.yaml`: fases e status.
   - `execution-log.jsonl`: timeline de eventos, se houver evidência temporal.
   - `sources.yaml`: fontes com URL, título, credibilidade, flags.
   - `research-graph.json`: nós e links entre query, waves, fontes, relatório, decisões.
   - `matrices.yaml`: tabelas extraídas dos Markdown.
   - `curiosity_queue.yaml`: perguntas abertas e próximos testes.
   - `players.yaml`: ferramentas/players citados.
   - `ux-patterns.yaml`: padrões reutilizáveis quando a pesquisa for de UX/produto.
   - `quick-wins.md`: ações rápidas extraídas das recomendações.
5. Validar no browser:
   - `view=map`
   - `view=evidence`
   - `view=recommendations`
   - `view=waves`
   - `view=sources`
   - `view=curiosity`
6. Registrar no README ou em relatório final quais slugs foram compatibilizados.

## Regras de Não Invenção

- Não criar fonte que não esteja citada ou inferível de URL/texto existente.
- Não transformar opinião em métrica sem marcar como inferida.
- Não preencher `coverage_score` com número arbitrário; se não existir, derivar de presença de artefatos e registrar no comentário do YAML.
- Não apagar arquivos originais.
- Não renomear slugs sem aprovação.
- Não mudar visual do app enquanto estiver apenas compatibilizando dados.

## Exemplo Concreto

Para uma pesquisa legada com `README.md` e `report.md`:

1. Extrair título e query do primeiro heading e parágrafos iniciais.
2. Criar `metrics.yaml` com:
   - `coverage_score`: derivado de completude documental.
   - `integrity_score`: derivado de fontes/citações presentes.
   - `decision`: `continue`, `stop`, `inconclusive` ou `needs_followup`.
3. Criar `pipeline-state.yaml` com fases presentes/ausentes.
4. Extrair links para `sources.yaml`.
5. Extrair tabelas markdown para `matrices.yaml`.
6. Criar `curiosity_queue.yaml` com perguntas explícitas de "lacunas", "riscos", "próximos passos".
7. Abrir `/observatory/research?slug=<slug>&view=map` e verificar se não há cards vazios/confusos.

## Critérios de Aceite

- Todas as pesquisas aparecem sem quebrar em `/observatory/research`.
- Nenhuma aba visual importante mostra apenas vazio quando há informação extraível nos Markdown.
- Pesquisas sem determinado dado escondem a aba correspondente ou mostram fallback claro.
- `Map` mantém leitura executiva.
- `Evidências` sempre explica fonte/confiança/grafo quando artefatos existem.
- `Ações` sempre mostra decisão/checklist/roadmap quando há recomendações.
- `npm run build --workspaces=false` passa em `apps/dash`.
- `npm run typecheck --workspaces=false` passa depois do build.

## Glossário

- `Research run`: uma pasta em `docs/research/<slug>/`.
- `Core`: documentos básicos `README`, query, prompt, report e recommendations.
- `Map`: aba executiva de descoberta.
- `Evidências`: aba dedicada a fontes, grafo e materialidade da conclusão.
- `Ações`: aba de decisão e próximos passos.
- `Waves`: iterações de aprofundamento da pesquisa.
- `Curiosity queue`: perguntas abertas que podem mudar a decisão.
- `Source credibility`: classificação de confiança da fonte.
- `Research graph`: relação entre artefatos, fontes e conclusões.
- `Matrix`: tabela extraída do relatório.
- `Inferred`: dado derivado por heurística, não originalmente declarado.

## Bootstrap do Próximo Agente

Antes de editar qualquer pesquisa, responda para si:

1. Qual slug vou compatibilizar primeiro?
2. Quais arquivos já existem?
3. Quais abas do Observatory ficam vazias hoje?
4. Quais dados posso extrair sem inventar?
5. Como vou marcar dados inferidos?
6. Como vou validar visualmente o resultado?

Comece por 1 pesquisa completa e 1 pesquisa legada. Depois aplique o processo em lote.
