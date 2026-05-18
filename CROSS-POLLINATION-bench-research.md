# Cross-Pollination Bench ↔ Research — Backlog

> Origin: founder directive 2026-05-18 — "Tem algumas coisas que criamos em
> bench que precisamos melhorar em pesquisas e tem mt coisa em pesquisa
> interessante pra trazermos pra bench"

## Status atual da paridade

| Feature | /bench | /research | Diagnóstico |
|---|:---:|:---:|---|
| URL-state decisional (`?w_*`, `?persona`, `?players`, `?compare`) | ✅ | ❌ | Hook `useDecisionState` está acoplado a `ObservatoryMatrix` — research não tem matrix |
| Overview 1-pager (hero clamp + decisão panel) | ✅ | ❌ | Research usa `ResearchMapReport` (7+ seções) |
| DocsView icon-only (Sun/Moon + Copy/Check) | ✅ | ✅ | Já é compartilhado (sem guard de source) |
| Run row clean (sem subjects chip, prune title) | ✅ | ✅ | Regex `pruneRedundantTitle` cobre bench+research |
| Player chips com mini-bar score + bulk-select | ✅ | n/a | Research não tem "players" comparáveis (tem `mentioned_players` mas é lista plana) |
| Permalink + Battle card MD copy | ✅ | ❌ | Bench: `weights-view` exporta `winner/runner/gap/permalink`. Research poderia exportar `decision/sources/claims/permalink` |
| Onboarding dims (setup/time-to-run/docs) | ✅ | n/a | Bench-specific (compara projetos OSS) |
| Verdict comparativo cross-competitor | ✅ | n/a | Bench-specific |
| Curiosity Queue (P1/P2/P3 + why_it_matters + next_action) | ❌ | ✅ | Bench TEM `curiosity-queue.yaml` mas adapter não consome |
| Recommendations Report (priorizado por confiança) | parcial (`roadmap`) | ✅ | Bench usa roadmap; research tem renderer rico |
| Waves Timeline (event-by-event scrubbable) | parcial (`execution-log.jsonl`) | ✅ | Bench tem o log mas não tem viewer dedicado |
| Evidence Map (claims com confidence + source path) | ✅ (matrix cell-drawer) | ✅ (sources view) | Padrões diferentes — ambos OK na sua categoria |

## P0 backlog (próxima sessão)

### A. Bench → Research

1. **Trazer `BenchOverviewView` pra /research como `ResearchOverviewView`**
   - Hero clamp(88px) + decisão-panel lime + verdict-bar gradient + 3 action cards (Waves / Sources / Evidências)
   - Decisão extraída de `action-plan.yaml#decision.title`
   - Score panel: coverage_score / integrity_score / sources_count / claims_count / waves_count / confidence%
   - Substitui `ResearchMapReport` (7+ seções pesadas) no mode `map`

2. **Permalink + Battle card pra /research**
   - Icon-only buttons no topbar de `/research`
   - Permalink: `?slug=...&view=...&file=...` (URL state já existe)
   - Battle card MD: decision + top 3 sources + top 2 claims + permalink
   - Reuso direto do código do `weights-view.tsx`

3. **DocsView toolbar icon-only** — já aplicado (`docs-view.tsx` é shared)

4. **Run row prune title em research** — já aplicado (regex estendido)

### B. Research → Bench

1. **Mode `curiosity` no bench** — bench tem `curiosity-queue.yaml` mas o
   adapter ignora. Adicionar:
   - `extractDashCuriosity()` em `bench-dashboard.server.ts`
   - `availableModes.push("curiosity")` quando questions > 0
   - Reaproveitar `BenchCuriosityReport` que provavelmente já existe no
     reader-body (ou criar copy do `ResearchCuriosityReport`)

2. **Waves Timeline pra bench** — bench tem `execution-log.jsonl` mas só
   é exposto via Docs mode. Trazer mode `waves` dedicado, renderizando:
   - Eventos por fase com ts + summary
   - Stop reason
   - Wave-by-wave findings (se disponível)

3. **Recommendations granulares no bench** — hoje `roadmap` mostra ações
   mas sem confidence/effort per-item. Trazer pattern do
   `ResearchRecommendationsReport`: priority badges + estimated_effort +
   blocked_by chain.

### C. Refactors compartilhados

1. **`useDecisionState` generalizado** — separar lógica de `weights/personas/players`
   (bench-only) de `view/file` (universal). Permite research usar `?compare=run1,run2`
   pra duelo entre 2 runs da mesma pesquisa.

2. **Topbar permalink action universal** — colocar o copy permalink button
   no `Topbar` organism (não só dentro de `weights-view`). Disponível em
   qualquer source.

3. **Run row metadata adaptativa** — hoje mostra "files · #ID · status".
   Em research, "waves · #ID · coverage" faria mais sentido. Adapter pode
   passar `metadataDisplay: {primary, secondary, tertiary}`.

## Esforço estimado

| Item | Esforço | Valor |
|---|---|---|
| A1 ResearchOverviewView | 3h | ★★★★★ (research vira tão decisional quanto bench) |
| A2 Permalink/Battle card universal | 2h | ★★★★ (compartilhamento de decisões fora do dashboard) |
| B1 Mode curiosity no bench | 1.5h | ★★★ (P0/P1/P2 explícito no bench) |
| B2 Waves Timeline pra bench | 4h | ★★★★ (transparência do método do bench) |
| B3 Recommendations granular | 2h | ★★★ (roadmap fica acionável) |
| C1 useDecisionState generalizado | 5h | ★★★★ (research duelo cross-runs) |
| C2 Topbar permalink universal | 1h | ★★★ (UX consistente) |
| C3 Run row adaptativa | 2h | ★★ (cleanup) |
| **Total** | **20.5h** | ~3 sprints |

## Como aplicar incrementalmente

1. Sprint 1 (4.5h): A1 + B1 → research ganha overview decisional, bench ganha curiosity.
2. Sprint 2 (3h): A2 + C2 → permalink universal, battle card universal.
3. Sprint 3 (6h): B2 + B3 → bench ganha timeline e roadmap granular.
4. Backlog opcional: C1 (5h) + C3 (2h) — refactors arquiteturais.

---

*Sinkra Hub — apps/research Cross-Pollination Backlog | 2026-05-18*
