# Deploy — apps/research

Day-1: Vercel + snapshot local. Day-N: API remota em `research.aioxsquad.ai`.

## Pré-requisitos

- Vercel CLI instalado (`npm i -g vercel`)
- Acesso ao team `team_IQxJy2TCLBezjOJvLsiEsxmB` (mesmo do `apps/design`)
- DNS de `research.aioxsquad.ai` apontando para Vercel (CNAME `cname.vercel-dns.com`)

## Topologia

```
apps/research/
├── scripts/build-research-snapshot.mjs   # predev/prebuild
├── src/data/snapshot/                    # gitignored, regenerado em build
│   ├── docs/research/                    # mirror de <repo>/docs/research
│   ├── docs/bench/                       # mirror de <repo>/docs/bench
│   └── outputs/sinkra-squad/             # mirror de <repo>/outputs/sinkra-squad
├── src/lib/workspace-root.server.ts      # resolver com env switch
└── next.config.ts                        # outputFileTracing aponta snapshot
```

## Setup inicial (uma vez)

```bash
cd apps/research

# 1. Link com novo projeto Vercel
vercel link
# Quando perguntar:
#   Set up "apps/research"? Yes
#   Which scope? Selecionar team_IQxJy2TCLBezjOJvLsiEsxmB
#   Link to existing project? No
#   Project name: research (ou aioxsquad-research)
#   Root directory: ./ (já estamos em apps/research)
#   Auto-detected framework: Next.js (confirmar)

# 2. Configurar environment variables
vercel env add DEPLOY_MODE production
# Valor: remote

# Opcional (override do snapshot em dev local)
# vercel env add AIOX_RESEARCH_ROOT development
# Valor: /caminho/local/do/monorepo

# 3. Domínio
vercel domains add research.aioxsquad.ai
# Seguir instrucoes de DNS

# 4. Preview deploy
vercel
# Verificar URL preview

# 5. Smoke test
curl -s -o /dev/null -w "HTTP %{http_code}\n" -L https://<preview-url>/
curl -s -o /dev/null -w "HTTP %{http_code}\n" https://<preview-url>/observatory/research

# 6. Production deploy
vercel --prod
```

## Build pipeline

`vercel build` (executado pelo Vercel) roda:

1. `npm install` (resolve deps)
2. `npm run prebuild` → `node scripts/build-research-snapshot.mjs` (97 MB de dados materializados em `src/data/snapshot/`)
3. `npm run build` → `next build --webpack` (Next.js traceia snapshot via `outputFileTracingIncludes`)
4. Snapshot é incluido no lambda bundle

Build size esperado: aprox 100 MB de data + lambda Next.js. Dentro do limite Vercel (250 MB unzipped).

## Environment variables

| Var | Scope | Valor | Efeito |
|---|---|---|---|
| `DEPLOY_MODE` | production | `remote` | Desabilita CLI workbench (sem spawn de processos, sem writes em filesystem) |
| `RESEARCH_DATA_SOURCE` | (futuro) | `api` | Day-N: troca leitores para fetch contra `RESEARCH_API_URL` |
| `RESEARCH_API_URL` | (futuro) | `https://api.research.aioxsquad.ai` | Endpoint da API DB-backed |
| `AIOX_RESEARCH_ROOT` | dev local | `/caminho/monorepo` | Override do snapshot — leitores apontam para monorepo vivo |

## Day-N cutover (DB-backed)

Quando a API REST/GraphQL em `research.aioxsquad.ai` estiver pronta:

1. Reescrever os loaders server-side (`research-observatory.server.ts`, `bench-dashboard.server.ts`, `sinkra-maps-observatory.server.ts`) para usar `fetch()` em vez de `fs.readFile()`. O contrato de dados não muda.
2. Set `RESEARCH_DATA_SOURCE=api` + `RESEARCH_API_URL=https://api.research.aioxsquad.ai` em Vercel envs.
3. Remover `predev` e `prebuild` scripts (snapshot não é mais necessário).
4. Adicionar `src/data/snapshot/` ao `.vercelignore` (não shipa mais).

UI permanece intacta. Componentes não mudam.

## Troubleshooting

**Build falha com "no source subtrees found"**: o script `build-research-snapshot.mjs` não encontrou `docs/research/`. Confirme que `apps/research/` está dentro do monorepo OU que `AIOX_RESEARCH_SNAPSHOT_ROOT` está setado.

**Lambda muito grande (>250 MB)**: filtrar mais agressivamente o snapshot. Editar `EXCLUDED_DIRS` ou `EXCLUDED_FILENAMES` em `scripts/build-research-snapshot.mjs`. Alvos provaveis: `outputs/sinkra-squad/<slug>/raw_html/`, screenshots, .png.

**`getDashWorkspaceRoot() throws` em deploy**: `RESEARCH_DATA_SOURCE=api` setado mas loaders ainda usam filesystem. Remover `RESEARCH_DATA_SOURCE` da env de produção ate cutover real ser feito.

**CLI workbench renderiza vazio em deploy**: esperado. `DEPLOY_MODE=remote` desabilita probes locais. UI exibe `clis: []`.
