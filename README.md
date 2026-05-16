# AIOX Dash

Dashboard local-first para visualizar artefatos operacionais de Research, Bench e SINKRA Maps.

O app foi pensado para funcionar em instalações locais e parciais. Se uma instalação não tiver `docs/` ou `outputs/`, a fonte correspondente simplesmente não aparece no menu. O `Demo` sempre fica disponível para onboarding.

---

## TL;DR para AIOX DevOps

```bash
# Dentro de sinkra-hub (apps/dash é submodule)
git submodule update --init --recursive apps/dash

cd apps/dash
npm install
cp .env.example .env.local           # opcional, só se for apontar para dados reais
npm run dev -- --port 3001
# Abrir: http://localhost:3001/observatory/demo
```

Sem dados reais o app abre normalmente em `/observatory/demo`. Se a instalação for limpa e o Demo carregar, a instalação está saudável.

---

## Stack & Prerequisites

| Item | Versão | Observação |
|---|---|---|
| Node.js | 18.18+ ou 20+ | Requerido pelo Next 16 |
| npm | 9+ | Vem com Node 18.18+ |
| OS | Linux / macOS / Windows | Windows funciona via PowerShell ou WSL |
| Memória build | ~1 GB livre | Next 16 + webpack |
| Disco | ~500 MB | `node_modules` + `.next` |

Sem `engines` declarado no `package.json` (decisão consciente). Versões abaixo do mínimo do Next 16 vão falhar no `next dev` com erro claro.

Stack interno (todas instaladas via `npm install`, não precisam ser provisionadas):

- Next.js 16.2.6 (App Router, webpack explícito via flag `--webpack`)
- React 19.2.3
- Tailwind v4 (`@tailwindcss/postcss`)
- TypeScript 5 (strict)
- `react-markdown`, `remark-gfm`, `yaml`, `lucide-react`

Sem banco de dados. Sem autenticação. Sem dependências externas em runtime — o app só lê o filesystem que você apontar.

---

## Submodule Note (Hub Sinkra)

`apps/dash` é um **git submodule** apontando para `https://github.com/oalanicolas/aiox-dash-research.git`.

Quando o Hub é clonado sem `--recurse-submodules`, o diretório `apps/dash` fica vazio e o app não roda. Sempre rode:

```bash
git submodule update --init --recursive apps/dash
```

Para atualizar a versão pinada do dash dentro do Hub:

```bash
cd apps/dash
git fetch origin
git checkout <commit-ou-tag>
cd ../..
git add apps/dash
git commit -m "chore(dash): bump submodule to <ref>"
```

Push do bump no Hub deve ser feito por `@devops` (Constitution Article II).

---

## Instalação (passo a passo)

### 1. Obter o código

```bash
# Opção A — fresh clone do Hub
git clone --recurse-submodules https://github.com/<owner>/sinkra-hub.git
cd sinkra-hub

# Opção B — Hub já clonado, faltando submodules
git submodule update --init --recursive apps/dash

# Opção C — standalone (fora do Hub)
git clone https://github.com/oalanicolas/aiox-dash-research.git apps/dash
cd apps/dash
```

### 2. Instalar dependências

```bash
cd apps/dash
npm install
```

Em monorepo npm workspaces, force escopo local:

```bash
npm install --workspaces=false
```

### 3. Configurar ambiente (opcional)

```bash
cp .env.example .env.local
```

Sem `.env.local` o app continua funcionando: o loader detecta o root automaticamente ou cai no Demo.

### 4. Subir o app

```bash
# Dev (hot reload)
npm run dev -- --port 3001

# Produção
npm run build
npm run start -- --port 3001
```

Validação de tipos (não é build):

```bash
npm run typecheck
```

> **Ordem importa em instalação limpa:** rode `build` antes de `typecheck`. O Next gera `.next/types/`, referenciado pelo `tsconfig.json`.

---

## Variáveis de Ambiente

Todas as variáveis ficam em `.env.local` (gitignored). O template oficial é `.env.example`.

| Variável | Obrigatória | Default | Descrição |
|---|---|---|---|
| `AIOX_DASH_ROOT` | não | auto-detect | Caminho **absoluto** para a pasta que contém `docs/research`, `docs/bench` e/ou `outputs/sinkra-squad`. Se omitida, o app caminha para cima a partir do cwd procurando uma das três pastas. |
| `PORT` | não | `3000` | Porta HTTP. Sobrescrita pela flag CLI `--port`. |
| `HOSTNAME` | não | `0.0.0.0` | Interface de bind do `next start`. Use `127.0.0.1` para restringir a localhost. |
| `NODE_ENV` | não | `development` em `dev`, `production` em `start` | Setado automaticamente pelos scripts. Não sobrescrever. |

Exemplo de `.env.local` para apontar a uma instalação AIOX típica:

```dotenv
AIOX_DASH_ROOT=/srv/aiox/workspace
```

`AIOX_DASH_ROOT` deve apontar **apenas** para o diretório cujo conteúdo o app está autorizado a ler. Não aponte para `/` nem para a raiz home do usuário.

---

## Fontes de Dados Suportadas

O app descobre estas pastas dentro de `AIOX_DASH_ROOT` em cada request:

| Fonte | Pasta esperada | Rota | Comportamento |
|---|---|---|---|
| Demo | nenhuma | `/observatory/demo` | Exemplo completo de onboarding (Map, Slides, Roadmap, Evidências, Matriz, Duelo, Score, Personas, TCO, Decisão) |
| Research | `docs/research/<slug>/` | `/observatory/research` | Leitor de pesquisas Markdown/YAML/JSON estruturado |
| Bench | `docs/bench/<slug>/` | `/observatory/bench` | Relatórios comparativos, matriz, score, personas, TCO e decisão |
| SINKRA Maps | `outputs/sinkra-squad/<group>/map/<slug>/` | `/observatory/sinkra-maps` | Mapas visuais de processo, fluxo, automação, governança, RACI, gaps e evidências |

Regras de descoberta:

- `Demo` sempre aparece e não depende de filesystem externo.
- Se uma pasta não existir, a fonte não aparece no menu superior.
- Rota direta para fonte inexistente retorna `404`.
- `/observatory` redireciona para a primeira fonte disponível.
- Instalações sem `docs/` e sem `outputs/` continuam abrindo em `/observatory/demo`.

---

## Health Check / Smoke Test

Após `npm run dev` ou `npm run start`, valide nesta ordem:

| Verificação | URL | Esperado |
|---|---|---|
| Demo carrega | `http://localhost:3001/observatory/demo` | Página com Map/Slides/Evidências renderizada |
| Index do observatório | `http://localhost:3001/observatory` | Redireciona para Demo ou primeira fonte presente |
| Tipos passam | `npm run typecheck` | Exit code 0, zero `error TS` |
| Build limpo | `npm run build` | Exit code 0, `.next/` criado |

Smoke test mínimo via curl:

```bash
curl -fsS -o /dev/null -w "%{http_code}\n" http://localhost:3001/observatory/demo
# Esperado: 200
```

---

## Produção & Process Management

O app não embute Dockerfile, configuração Vercel/Railway nem CI/CD nesta versão. Deploy é manual e baseado em `next start`.

Padrões aceitos para AIOX:

- **systemd** (recomendado em VMs): unit `aiox-dash.service` rodando `npm run start -- --port 3001` com `WorkingDirectory=/srv/aiox/sinkra-hub/apps/dash` e `Environment=AIOX_DASH_ROOT=/srv/aiox/workspace`.
- **pm2**: `pm2 start npm --name aiox-dash -- run start -- --port 3001`.
- **Reverse proxy obrigatório se exposto à rede**: nginx/Caddy na frente, terminando TLS e adicionando autenticação (Basic Auth, OAuth-proxy, Cloudflare Access). O app **não** tem auth.

Restart policy: o app é stateless. Pode reiniciar livremente, não há cache persistente em disco. Caches de listagem e payload são em memória, TTL 5 min.

---

## Performance e Caches

SINKRA Maps pode ter muitos arquivos em `outputs/`. Para reduzir latência:

- Índice de mapeamentos em cache em memória por 5 min.
- Payload estruturado do mapeamento selecionado em cache em memória por 5 min.
- Payload carregado por aba — `map`, `flow`, `automation`, `governance`, `accountability`, `gaps`, `evidence`, `score`, `document` leem apenas os YAML/JSON necessários.
- YAML/JSON estruturados da aba ativa carregados em paralelo.
- Conteúdo bruto de documentos carregado sob demanda.
- Views pesadas via `next/dynamic` (code splitting).

Próximo passo recomendado pelo pipeline: materializar `_index.json` e `observatory_payload.json` no gerador dos mapeamentos. Evita varredura de filesystem e parse de YAML em runtime.

---

## Troubleshooting

| Sintoma | Causa provável | Ação |
|---|---|---|
| `apps/dash` está vazio após clone | Submodule não inicializado | `git submodule update --init --recursive apps/dash` |
| `Cannot find module 'next'` | `npm install` não rodou | `cd apps/dash && npm install` |
| `npm run typecheck` falha em instalação limpa | `.next/types/` ainda não existe | Rodar `npm run build` primeiro |
| `EADDRINUSE :3001` | Porta ocupada | `npm run dev -- --port 3002` (ou matar processo na 3001) |
| `/observatory/research` retorna 404 | `docs/research/` não existe no `AIOX_DASH_ROOT` | Criar a pasta com pelo menos um slug, ou usar `/observatory/demo` |
| Menu superior só mostra Demo | `AIOX_DASH_ROOT` não aponta para pasta com `docs/` ou `outputs/` | Conferir `.env.local`, conferir caminho absoluto, conferir permissão de leitura |
| Build trava com `out of memory` | Heap padrão insuficiente em CI | `NODE_OPTIONS=--max-old-space-size=4096 npm run build` |
| Mudou YAML mas dashboard não atualiza | Cache de 5 min em memória | Reiniciar processo (`npm run start` ou systemd restart) |
| Tailwind não aplica estilos após upgrade | Cache antigo do Next | `rm -rf .next && npm run dev` |
| Submodule preso em commit antigo | `git pull` não atualiza submodules | `git submodule update --remote apps/dash` |

---

## Atualizando o Submodule a Partir do Hub

```bash
# Buscar últimas refs do remote do dash
cd apps/dash
git fetch origin
git checkout main          # ou um commit/tag específico
git pull origin main

# Registrar o novo pointer no Hub
cd ../..
git status                 # apps/dash deve aparecer como modified
git add apps/dash
git commit -m "chore(dash): bump submodule to <ref>"
# Push pelo @devops
```

Para reverter para o pointer registrado no Hub:

```bash
git submodule update --init apps/dash
```

---

## Estrutura Recomendada dos Dados

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

---

## Segurança

- O app é **read-only**: lê arquivos locais e renderiza relatórios.
- **Sem autenticação embutida**. Em rede aberta, sempre atrás de reverse proxy com auth.
- `AIOX_DASH_ROOT` deve apontar apenas para a pasta autorizada. Nunca raiz do disco nem `$HOME`.
- Não publique workspaces com dados sensíveis em repositórios abertos.
- `.env.local` está em `.gitignore`. Não comitar.

---

## Limitações Conhecidas

- Sem Dockerfile / vercel.json / railway.json — deploy é manual via `next start` + supervisor (systemd/pm2).
- Sem lint script no `package.json` (use `npm run typecheck` como gate de qualidade).
- Sem testes automatizados nesta versão.
- Sem CI/CD configurado para o submodule.
- Hot reload do Next ignora `node_modules`, `.git`, `.claude`, `outputs/`, `squads/` — mudanças nesses paths não disparam rebuild (intencional para performance).

---

## Referência Rápida de Comandos

```bash
# Submodule
git submodule update --init --recursive apps/dash
git submodule update --remote apps/dash

# Dev
npm install
npm run dev -- --port 3001

# Prod
npm run build
npm run start -- --port 3001

# QA
npm run typecheck

# Smoke
curl -fsS -o /dev/null -w "%{http_code}\n" http://localhost:3001/observatory/demo
```

---

*AIOX Dash — local-first observatory · stack Next 16 / React 19 / Tailwind v4 · sem dependências externas em runtime*
