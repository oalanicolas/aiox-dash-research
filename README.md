# AIOX Research

> **⚠️ Requer acesso AIOX Enterprise ou AIOX Pro.**
> O código é open (Elastic License v2) para transparência, auditoria e onboarding via Demo.
> Os modos **Research**, **Bench** e **SINKRA Maps** consomem artefatos gerados por pipelines internos disponíveis apenas em workspaces **AIOX Enterprise** e **AIOX Pro**.
> Sem um workspace AIOX provisionado, só o `/observatory/demo` carrega.

AIOX Research é um console local-first para **executar pesquisas**, consolidar runtimes e visualizar artefatos operacionais de Research, Bench e SINKRA Maps.

O app foi pensado para funcionar em instalações locais e parciais. Se uma instalação não tiver `docs/` ou `outputs/`, a fonte correspondente simplesmente não aparece no menu. O `Demo` sempre fica disponível para onboarding. A rota `/research` adiciona uma camada ativa: cria pesquisas em `docs/research/` usando CLIs locais detectados automaticamente ou BYOK OpenAI-compatible.

---

## Quem Pode Usar Este App

| Tier | Acesso | O que funciona |
|---|---|---|
| **Visitante público** | Clone o repo, `npm install`, `npm run dev` | Apenas `/observatory/demo` (dataset embutido) |
| **AIOX Pro** | Workspace AIOX provisionado com pipelines Research/Bench/SINKRA Maps | Demo + Research + Bench + SINKRA Maps apontando para seu workspace |
| **AIOX Enterprise** | Workspace AIOX completo + suporte dedicado + integrações | Tudo do Pro + integrações com ServiceBus, ClickUp, Google Workspace, ETL |

Os modos Research/Bench/SINKRA Maps **não funcionam sem um workspace AIOX populado**. Eles esperam estruturas específicas de pastas (`docs/research/`, `docs/bench/`, `outputs/sinkra-squad/`) geradas por pipelines proprietários AIOX. Apontar `AIOX_RESEARCH_ROOT` para um diretório vazio ou para um projeto não-AIOX vai resultar apenas no Demo aparecendo no menu.

**Como obter AIOX Pro ou Enterprise:**
- Site: [alanicolas.com](https://alanicolas.com) (em breve aiox.com.br)
- Email: alan@alanicolas.com

---

## Licença

Este software é licenciado sob a **[Elastic License v2](./LICENSE)** (source-available, não open source no sentido OSI).

Resumo das permissões e restrições:

- ✅ **Permitido:** clonar, modificar, distribuir, usar internamente (incluindo uso comercial dentro da sua empresa).
- ❌ **Proibido:** oferecer o software como serviço gerenciado/hospedado para terceiros (SaaS competidor).
- ❌ **Proibido:** remover ou contornar funcionalidade de licenciamento ou marcas AIOX.
- ❌ **Proibido:** remover, alterar ou ocultar avisos de copyright/licença/marca.

Em caso de dúvida sobre o que sua organização pode ou não fazer, contate alan@alanicolas.com antes de prosseguir.

---

## TL;DR para AIOX DevOps

```bash
# Dentro de sinkra-hub (apps/research é submodule)
git submodule update --init --recursive apps/research

cd apps/research
npm install
cp .env.example .env.local           # opcional, só se for apontar para dados reais
npm run dev -- --port 3001
# Abrir: http://localhost:3001/research
# Demo visual: http://localhost:3001/observatory/demo
```

Sem dados reais o app abre normalmente em `/observatory/demo`. Para executar pesquisa real via `/research`, use um workspace com permissão de escrita em `docs/research/` e ao menos um CLI local autenticado ou uma chave BYOK configurada na tela.

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

Sem banco de dados. Sem autenticação. O Observatory lê o filesystem apontado; o Research Workbench também escreve artefatos em `docs/research/` e pode chamar provedores externos apenas quando o operador configura BYOK explicitamente.

---

## Submodule Note (Hub Sinkra)

`apps/research` é um **git submodule** apontando para `https://github.com/oalanicolas/aiox-research.git`.

Quando o Hub é clonado sem `--recurse-submodules`, o diretório `apps/research` fica vazio e o app não roda. Sempre rode:

```bash
git submodule update --init --recursive apps/research
```

Para atualizar a versão pinada do research dentro do Hub:

```bash
cd apps/research
git fetch origin
git checkout <commit-ou-tag>
cd ../..
git add apps/research
git commit -m "chore(research): bump submodule to <ref>"
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
git submodule update --init --recursive apps/research

# Opção C — standalone (fora do Hub)
git clone https://github.com/oalanicolas/aiox-research.git apps/research
cd apps/research
```

### 2. Instalar dependências

```bash
cd apps/research
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
| `AIOX_RESEARCH_ROOT` | não | auto-detect | Caminho **absoluto** para a pasta que contém `docs/research`, `docs/bench` e/ou `outputs/sinkra-squad`. Se omitida, o app caminha para cima a partir do cwd procurando uma das três pastas. |
| `PORT` | não | `3000` | Porta HTTP. Sobrescrita pela flag CLI `--port`. |
| `HOSTNAME` | não | `0.0.0.0` | Interface de bind do `next start`. Use `127.0.0.1` para restringir a localhost. |
| `NODE_ENV` | não | `development` em `dev`, `production` em `start` | Setado automaticamente pelos scripts. Não sobrescrever. |

Compatibilidade: `AIOX_DASH_ROOT` ainda é aceito como fallback legado, mas novas instalações devem usar `AIOX_RESEARCH_ROOT`.

Exemplo de `.env.local` para apontar a uma instalação AIOX típica:

```dotenv
AIOX_RESEARCH_ROOT=/srv/aiox/workspace
```

`AIOX_RESEARCH_ROOT` deve apontar **apenas** para o diretório cujo conteúdo o app está autorizado a ler. Não aponte para `/` nem para a raiz home do usuário.

BYOK não usa variável de ambiente nesta versão. A `API key`, `baseUrl` e `model` são configurados no seletor de runtime da tela `/research` e ficam armazenados apenas no navegador do operador.

---

## Fontes de Dados Suportadas

O app descobre estas pastas dentro de `AIOX_RESEARCH_ROOT` em cada request:

| Fonte | Pasta esperada | Rota | Comportamento |
|---|---|---|---|
| Research Workbench | `docs/research/` gravável | `/research` | Cria pesquisas via CLIs locais ou BYOK, acompanha execução em tempo real e redireciona para o run pela URL |
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

## Research Workbench

`/research` deixou o AIOX Research de ser apenas um localhost de observabilidade. Ele agora é uma ferramenta operacional para iniciar, acompanhar e consolidar pesquisas.

Fluxo principal:

1. O operador escreve a pergunta no buscador central.
2. Seleciona `Local CLI` ou `BYOK`.
3. Em `Local CLI`, o AIOX Research detecta `claude`, `codex`, `gemini` e `opencode` no `PATH`; os CLIs com launcher habilitado podem rodar em paralelo.
4. Em `BYOK`, o operador informa `baseUrl`, `API key` e `model` de um provider OpenAI-compatible.
5. Ao iniciar, a URL muda para `/research?runs=<runId...>`, então refresh no meio da execução restaura a sessão.
6. Cada run emite estado via SSE em `/api/research/runs/[runId]/stream`.
7. Ao iniciar, o AIOX Research cria a pasta canônica `docs/research/<YYYY-MM-DD>-<slug>/` com artefatos raiz mínimos para o Observatory.
8. Cada runtime grava sua saída em `docs/research/<YYYY-MM-DD>-<slug>/runtimes/<runtime>/`.
9. A consolidação final escreve os arquivos raiz da pesquisa e pode ser aberta no Observatory.

Profundidade do Research Squad:

- O prompt enviado aos runtimes não pede apenas uma resposta. Ele referencia o contrato completo `SP-TECH-RESEARCH`.
- Runtimes com suporte a skills devem ativar `sinkra-hub:tech-research`; runtimes sem esse mecanismo recebem o protocolo inline.
- O contrato exige auto-clarify, decomposição em subqueries, deep research prompt, ondas de pesquisa, deep read, coverage gate, compressão de waves, síntese, citation gate e documentação final.
- Os assets canônicos usados como referência ficam em `.agents/skills/tech-research/SKILL.md` e `squads/research/{workflows,prompts,templates,checklists}/tech-research/`.
- Uma pesquisa deve nascer como uma pasta única em `docs/research/<YYYY-MM-DD>-<slug>/`; os outputs de cada CLI/LLM ficam em `runtimes/<runtime>/` e a consolidação usa os arquivos raiz.

Runtimes suportados no workbench:

| Modo | Runtime | Requisito | Observação |
|---|---|---|---|
| Local CLI | Claude Code | `claude` autenticado no `PATH` | Launcher web habilitado |
| Local CLI | Codex CLI | `codex` autenticado no `PATH` | Usa sandbox `workspace-write` |
| Local CLI | Gemini CLI | `gemini` autenticado no `PATH` | Usa workspace trusted |
| Local CLI | OpenCode | `opencode` no `PATH` | Detectado para inventário; launcher ainda bloqueado |
| BYOK | OpenAI-compatible | `baseUrl`, `API key`, `model` | Chave fica no navegador; servidor rejeita localhost/IP privado como upstream |

Consolidação:

- Quando pelo menos duas pesquisas paralelas terminam com sucesso, o botão `Consolidar pesquisas` cria um novo run.
- A consolidação lê `runtimes/*/` e atualiza os arquivos raiz da mesma pasta da pesquisa.
- O objetivo é reconciliar consenso, dissensos, lacunas e recomendações sem inventar fontes.

---

## Health Check / Smoke Test

Após `npm run dev` ou `npm run start`, valide nesta ordem:

| Verificação | URL | Esperado |
|---|---|---|
| Workbench abre | `http://localhost:3001/research` | Tela de pesquisa com seletor Local CLI / BYOK |
| Demo carrega | `http://localhost:3001/observatory/demo` | Página com Map/Slides/Evidências renderizada |
| Index do observatório | `http://localhost:3001/observatory` | Redireciona para Demo ou primeira fonte presente |
| Tipos passam | `npm run typecheck` | Exit code 0, zero `error TS` |
| Build limpo | `npm run build` | Exit code 0, `.next/` criado |

Smoke test mínimo via curl:

```bash
curl -fsS -o /dev/null -w "%{http_code}\n" http://localhost:3001/observatory/demo
# Esperado: 200

curl -fsS -o /dev/null -w "%{http_code}\n" http://localhost:3001/research
# Esperado: 200
```

---

## Compatibilizar Projetos Legacy

> Disponível para workspaces **AIOX Pro** e **AIOX Enterprise**. Visitantes públicos com apenas o Demo não precisam rodar — não há artefatos para materializar.

Se o app cair em um workspace AIOX onde algum slug ficou sem os artefatos derivados esperados (`metrics.yaml`, `sources.yaml`, `bench-output-dash.json`, `_index.json`, `observatory_payload.json`), rode o inicializador:

```bash
npm run init
```

O script descobre `docs/research`, `docs/bench` e `outputs/sinkra-squad` dentro de `AIOX_RESEARCH_ROOT` (ou via walk-up do cwd) e materializa apenas artefatos derivados de sinal real existente. Não inventa dados. Não sobrescreve arquivos humanos. Slug sem sinal é skip silencioso.

```bash
npm run init        # processa todas as fontes detectadas
npm run init:test   # roda fixtures de teste
```

Saída idempotente em conteúdo semântico: rodar duas vezes seguidas não muda nada além de timestamps (`generated_at`) em arquivos com a marca `generated_by`. A política `KNOWN_GENERATORS` em `scripts/compat/shared.mjs` reconhece artefatos criados pelo `scripts/init-observatory.mjs` e pelo shim legado `scripts/research-observatory-compat.mjs` (Hub) — ambos são considerados gerados e podem ser sobrescritos. Arquivos sem essa marca são tratados como autorias humanas e nunca tocados.

Exit codes:
- `0` — sucesso (mesmo quando algum slug é skipped por ausência de sinal)
- `1` — erro de runtime (filesystem, parse)
- `2` — nenhuma fonte detectada (defina `AIOX_RESEARCH_ROOT` ou rode dentro de pasta com `docs/research`, `docs/bench` ou `outputs/sinkra-squad`)

Em instalações de Visitante público (sem workspace AIOX), o init retorna exit 2 com mensagem clara — não é um erro do app, é a indicação de que o tier não tem artefatos para materializar.

---

## Produção & Process Management

O app não embute Dockerfile, configuração Vercel/Railway nem CI/CD nesta versão. Deploy é manual e baseado em `next start`.

Padrões aceitos para AIOX:

- **systemd** (recomendado em VMs): unit `aiox-research.service` rodando `npm run start -- --port 3001` com `WorkingDirectory=/srv/aiox/sinkra-hub/apps/research` e `Environment=AIOX_RESEARCH_ROOT=/srv/aiox/workspace`.
- **pm2**: `pm2 start npm --name aiox-research -- run start -- --port 3001`.
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
| `apps/research` está vazio após clone | Submodule não inicializado | `git submodule update --init --recursive apps/research` |
| `Cannot find module 'next'` | `npm install` não rodou | `cd apps/research && npm install` |
| `npm run typecheck` falha em instalação limpa | `.next/types/` ainda não existe | Rodar `npm run build` primeiro |
| `EADDRINUSE :3001` | Porta ocupada | `npm run dev -- --port 3002` (ou matar processo na 3001) |
| `/observatory/research` retorna 404 | `docs/research/` não existe no `AIOX_RESEARCH_ROOT` | Criar a pasta com pelo menos um slug, ou usar `/observatory/demo` |
| Menu superior só mostra Demo | `AIOX_RESEARCH_ROOT` não aponta para pasta com `docs/` ou `outputs/` | Conferir `.env.local`, conferir caminho absoluto, conferir permissão de leitura |
| Build trava com `out of memory` | Heap padrão insuficiente em CI | `NODE_OPTIONS=--max-old-space-size=4096 npm run build` |
| Mudou YAML mas dashboard não atualiza | Cache de 5 min em memória | Reiniciar processo (`npm run start` ou systemd restart) |
| Tailwind não aplica estilos após upgrade | Cache antigo do Next | `rm -rf .next && npm run dev` |
| Submodule preso em commit antigo | `git pull` não atualiza submodules | `git submodule update --remote apps/research` |

---

## Atualizando o Submodule a Partir do Hub

```bash
# Buscar últimas refs do remote do research
cd apps/research
git fetch origin
git checkout main          # ou um commit/tag específico
git pull origin main

# Registrar o novo pointer no Hub
cd ../..
git status                 # apps/research deve aparecer como modified
git add apps/research
git commit -m "chore(research): bump submodule to <ref>"
# Push pelo @devops
```

Para reverter para o pointer registrado no Hub:

```bash
git submodule update --init apps/research
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
  runtimes/
    claude/
      README.md
      prompt.md
      runtime-summary.md
      raw-output.log
      ...artefatos específicos do Claude Code
    codex/
      README.md
      prompt.md
      runtime-summary.md
      raw-output.log
      ...artefatos específicos do Codex CLI
    gemini/
      README.md
      prompt.md
      runtime-summary.md
      raw-output.log
      ...artefatos específicos do Gemini CLI
    byok/
      README.md
      prompt.md
      runtime-summary.md
      raw-output.log
      ...artefatos específicos do provider BYOK
```

Uma pesquisa deve ter **uma única pasta raiz**. Não crie diretórios irmãos com sufixos como `-claude`, `-codex` ou `-gemini`. O isolamento por runtime acontece dentro de `runtimes/<runtime>/`; o relatório consolidado mora nos arquivos raiz.

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

Handoff detalhado para outro agente: `apps/research/HANDOFF-research-compatibility.md`.

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

- O Observatory é read-only: lê arquivos locais e renderiza relatórios.
- O Research Workbench escreve em `docs/research/` quando uma execução é iniciada.
- CLIs locais rodam no workspace configurado. Use apenas em diretórios onde o operador autoriza leitura e escrita de artefatos.
- BYOK envia o prompt ao provider configurado pelo operador. A chave fica no navegador e é enviada ao servidor apenas para aquela execução.
- O proxy BYOK rejeita `localhost`, IP privado, loopback e link-local como upstream para reduzir risco de SSRF.
- **Sem autenticação embutida**. Em rede aberta, sempre atrás de reverse proxy com auth.
- `AIOX_RESEARCH_ROOT` deve apontar apenas para a pasta autorizada. Nunca raiz do disco nem `$HOME`.
- Não publique workspaces com dados sensíveis em repositórios abertos.
- `.env.local` está em `.gitignore`. Não comitar.

---

## Limitações Conhecidas

- Sem Dockerfile / vercel.json / railway.json — deploy é manual via `next start` + supervisor (systemd/pm2).
- Sem lint script no `package.json` (use `npm run typecheck` como gate de qualidade).
- Sem testes automatizados nesta versão.
- Sem CI/CD configurado para o submodule.
- BYOK suporta providers OpenAI-compatible via `/v1/chat/completions`; Anthropic-native, Google-native e Azure-native ainda não têm adaptador próprio no AIOX Research.
- O stream do Workbench é SSE de estado/log do run; não é token-level streaming do provider BYOK.
- Hot reload do Next ignora `node_modules`, `.git`, `.claude`, `outputs/`, `squads/` — mudanças nesses paths não disparam rebuild (intencional para performance).

---

## Referência Rápida de Comandos

```bash
# Submodule
git submodule update --init --recursive apps/research
git submodule update --remote apps/research

# Dev
npm install
npm run dev -- --port 3001
open http://localhost:3001/research

# Prod
npm run build
npm run start -- --port 3001

# QA
npm run typecheck

# Smoke
curl -fsS -o /dev/null -w "%{http_code}\n" http://localhost:3001/observatory/demo
```

---

*AIOX Research — local-first research console + observatory · stack Next 16 / React 19 / Tailwind v4*
