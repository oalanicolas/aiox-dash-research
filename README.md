# AIOX Dash

Dashboard local para visualizar artefatos operacionais de Research, Bench e SINKRA Maps.

O app foi pensado para funcionar em instalações parciais. Se uma instalação não tiver `docs/` ou `outputs/`, a fonte correspondente simplesmente não aparece no menu.

## Fontes Suportadas

| Fonte | Pasta esperada | Rota | Comportamento |
|---|---|---|---|
| Research | `docs/research` | `/observatory/research` | Leitor de pesquisas em Markdown/YAML/JSON estruturado |
| Bench | `docs/bench` | `/observatory/bench` | Relatórios comparativos, matriz, score, personas, TCO e decisão |
| SINKRA Maps | `outputs/sinkra-squad` | `/observatory/sinkra-maps` | Mapas visuais de processo, fluxo, automação, governança, RACI, gaps e evidências |

## Descoberta Automática

Na inicialização de cada request, o app verifica se estas pastas existem:

```txt
docs/research
docs/bench
outputs/sinkra-squad
```

Regras:

- Se uma pasta não existir, a fonte não aparece no menu superior.
- Se uma rota direta for aberta para uma fonte inexistente, o app retorna `404`.
- `/observatory` redireciona para a primeira fonte disponível.
- Se nenhuma fonte existir, `/observatory` mostra uma tela de configuração vazia.

## Rodando Localmente

```bash
cd apps/dash
npm install
npm run dev -- --port 3001
```

Abra:

```txt
http://localhost:3001/observatory
```

## Estrutura Recomendada Dos Dados

### Research

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

#### Contrato Visual de Research

O Research Observatory não deve depender de leitura manual do Markdown para comunicar valor. Cada pesquisa deve tentar alimentar estas abas:

| Aba | Função narrativa | Artefatos principais |
|---|---|---|
| `Map` | visão executiva da descoberta | `metrics.yaml`, `pipeline-state.yaml`, `matrices.yaml`, `ux-patterns.yaml`, `curiosity_queue.yaml` |
| `Ações` | decisão, checklist, quick wins e roadmap | `03-recommendations.md`, `quick-wins.md`, `curiosity_queue.yaml`, follow-ups Markdown |
| `Evidências` | confiança, fontes, grafo e materialidade da conclusão | `sources.yaml`, `research-graph.json`, `metrics.yaml` |
| `Waves` | evolução da investigação | `execution-log.jsonl`, arquivos `wave*.md` |
| `Fontes` | referências externas acionáveis | `sources.yaml` |
| `Players` | ferramentas, empresas ou alternativas analisadas | `players.yaml` |
| `Perguntas` | fila de dúvidas que podem mudar a decisão | `curiosity_queue.yaml` |
| `Doc` | leitura integral dos documentos | qualquer `.md`, `.yaml`, `.json`, `.jsonl` legível |

Arquivos estruturados podem ser gerados a partir dos Markdown existentes, desde que a regra de não invenção seja respeitada. Quando um valor for derivado por heurística, ele deve ser claramente marcado como inferido no próprio YAML/JSON ou no comentário do campo.

#### Processo Para Compatibilizar Pesquisas Existentes

Use este processo para tornar qualquer pasta `docs/research/<slug>/` compatível com o painel visual:

1. **Inventariar**
   - Liste os arquivos do slug.
   - Classifique o run como `rich`, `partial` ou `legacy`.
   - Identifique quais abas ficariam vazias hoje.

2. **Preservar**
   - Não apague nem reescreva os documentos originais.
   - Não renomeie o slug sem aprovação.
   - Não invente fonte, player, score ou decisão.

3. **Normalizar o core**
   - Garanta, quando possível, `README.md`, `00-query-original.md`, `01-deep-research-prompt.md`, `02-research-report.md` e `03-recommendations.md`.
   - Se o run antigo usa nomes diferentes (`report.md`, `recommendations.md`), mantenha o original e crie uma versão canônica apenas quando o conteúdo estiver claro.

4. **Gerar artefatos visuais**
   - `metrics.yaml`: `coverage_score`, `integrity_score`, `decision`, `stop_reason`, `coverage_breakdown`.
   - `pipeline-state.yaml`: fases executadas e status de cada fase.
   - `execution-log.jsonl`: eventos em ordem temporal, quando houver evidência.
   - `sources.yaml`: URLs, títulos, credibilidade e flags.
   - `research-graph.json`: nós e edges entre query, prompt, waves, fontes, métricas, relatório e decisão.
   - `matrices.yaml`: tabelas extraídas dos Markdown.
   - `curiosity_queue.yaml`: perguntas abertas, prioridade e próximo movimento.
   - `players.yaml`: ferramentas, empresas, frameworks ou alternativas citadas.
   - `ux-patterns.yaml`: padrões reutilizáveis quando existirem achados de UX/produto.
   - `quick-wins.md`: ações rápidas extraídas das recomendações.

5. **Validar visualmente**
   - Abra `/observatory/research?slug=<slug>&view=map`.
   - Abra `/observatory/research?slug=<slug>&view=evidence`.
   - Abra `/observatory/research?slug=<slug>&view=recommendations`.
   - Abra `/observatory/research?slug=<slug>&view=curiosity`.
   - Verifique se cada aba tem uma narrativa clara e não apenas cards vazios.

6. **Registrar**
   - Registre quais slugs foram compatibilizados.
   - Marque lacunas que exigem nova pesquisa em vez de preencher artificialmente.

Checklist mínimo por slug:

```txt
[ ] Map tem score, fases, gaps ou padrões úteis
[ ] Evidências tem fontes ou grafo
[ ] Ações tem decisão/checklist/roadmap quando há recomendações
[ ] Perguntas tem fila priorizada ou a aba não aparece
[ ] Doc preserva leitura dos arquivos originais
[ ] Dados inferidos estão marcados
```

Handoff detalhado para outro agente: `apps/dash/HANDOFF-research-compatibility.md`.

### Bench

```txt
docs/bench/<slug>/
  bench-output-dash.json
  README.md
  scorecard.json
  executive-report.md
```

### SINKRA Maps

```txt
outputs/sinkra-squad/<group>/map/<slug>/
  observatory_map.yaml
  workflow_definition.yaml
  task_definitions.yaml
  quality_gates.yaml
  score_card.yaml
  process_map.yaml
  domain_map.yaml
  dependency_graph.yaml
  automation_specs.yaml
  raci_matrix.yaml
  capability_gaps.yaml
  compliance_score.yaml
```

Nenhum arquivo individual é obrigatório. Quanto mais artefatos estruturados existirem, mais visual e completo fica o relatório.

## Performance

O SINKRA Maps pode ter muitos arquivos em `outputs/`. Para reduzir latência:

- o índice de mapeamentos fica em cache em memória por 5 minutos;
- o payload estruturado do mapeamento selecionado fica em cache em memória por 5 minutos;
- o payload estruturado é carregado por aba: `map`, `flow`, `automation`, `governance`, `accountability`, `gaps`, `evidence`, `score` e `document` leem apenas os YAML/JSON necessários para aquela visualização;
- YAML/JSON estruturados da aba ativa são lidos em paralelo;
- o conteúdo bruto de documentos é carregado sob demanda apenas para o arquivo selecionado;
- views pesadas são carregadas com code splitting via `next/dynamic`.

Próximo passo recomendado: materializar um `_index.json` e um `observatory_payload.json` no pipeline que gera os mapeamentos. Isso evita varredura de filesystem e parse de YAML em runtime.

## Build

```bash
npm run build --workspaces=false
npm run typecheck --workspaces=false
```

Em uma instalação limpa, rode `build` antes de `typecheck`: o Next gera `.next/types`, que faz parte do `tsconfig.json`.

## Adaptação Para Outras Instalações

Para usar o app fora do Sinkra Hub:

1. Copie `apps/dash` para o novo monorepo ou app.
2. Preserve o layout relativo das pastas que deseja habilitar.
3. Crie apenas as fontes necessárias. Exemplo: se só quiser SINKRA Maps, crie apenas `outputs/sinkra-squad`.
4. Rode `/observatory`; o menu será montado automaticamente com base no que existir.

Instalações sem `docs/` e sem `outputs/` continuam abrindo normalmente: o app mostra uma tela de estado vazio em `/observatory` em vez de quebrar no loader.
