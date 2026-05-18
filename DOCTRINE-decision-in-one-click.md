# UX Doctrine — Decision-in-One-Click

> **Quem:** apps/research (Observatory tri-pane, Bench mode).
> **Por que:** os competidores em `docs/bench/deepresearch-absorption-benchmark/` geram relatório. Eles não entregam decisão. apps/research vai dominar virando o painel onde o operador decide em segundos.
> **Quando:** sempre que algum mode bench (matrix, personas, decision, weights) for tocado.

---

## Princípio único

**Toda decisão visível precisa caber em uma URL.** Se o usuário move um slider, troca de persona, esconde 3 players ou marca um veto — esse estado vai pra `?` query. Refresh preserva. Share-link reproduz exatamente. Print captura.

Corolário: nada decisório vive em React state efêmero. Sliders, persona ativa, players visíveis, mode ativo, dimensão expandida — tudo URL.

## Os 6 atos da decisão

| # | Ato | Atalho mental | Onde acontece |
|---|---|---|---|
| 1 | **Ver paisagem** | "Quem está no jogo?" | matrix-view (heatmap + chips de player) |
| 2 | **Cenarizar** | "E se eu fosse academic? founder PT-BR?" | personas-view + weights-view |
| 3 | **Calibrar** | "Aumenta `evidence_fidelity`, derruba `training_methodology`" | weights-view (sliders agrupados) |
| 4 | **Confrontar** | "AIOX vs deer-flow nessa configuração" | duel-view |
| 5 | **Decidir** | "Top 1 é X, runner-up Y, gap Z, veto W" | decision-view + cliffs |
| 6 | **Compartilhar** | "Manda o link pro time" | URL + copy battle-card |

apps/research só vence se cada ato leva ≤2s e ≤2 cliques.

## Anti-padrões a abater

1. **Wall of Text (WoT).** Se uma view tem >7 blocos de texto sem hierarquia, refatorar pra cartões/strip/grade. Texto que não vira ação não conta.
2. **Mode-locked state.** Mexer um slider em /weights mas o ranking em /matrix continuar o baseline. Solução: state global compartilhado via URL, recalculado em todos os modes.
3. **Decisão sem persistência.** "Construí minha persona customizada" e não consegui copiar a URL.
4. **Ranking sem delta narrativo.** "Local-DR sobe pro 1º" sem explicar "porque você puxou `private_kb` de 4 → 11".
5. **Player toggle sem efeito downstream.** Esconder players na matrix mas o leaderboard de weights continuar com 25. Estado tem que ser canônico.
6. **130 sliders empilhados.** Sliders agrupam por `row.group` (16 grupos), com toggle expand/collapse por grupo, e summary "este grupo soma X% do peso".

## O contrato técnico (binding)

- **URL params canônicos:** `?w_<row_id>=<int>` para cada slider mexido; `?players=k1,k2,k3` players visíveis; `?persona=<id>` snap-to-persona ativo; `?compare=a,b` para duel forçado.
- **Estado computado vs URL:** se URL tem `?w_*`, esse override vence persona/baseline. Se tem `?persona=X`, aplica os pesos da persona X como override (não escreve `?w_*`). Reset = remove todos os params decisórios.
- **Leaderboard reativo cross-mode:** `useWeightedRanking(matrix, weightsFromUrl)` é hook único usado em weights-view, personas-view, decision-view (categorical override), e matrix-view (totals).
- **Delta narrativo:** ao mover um slider, mostrar "rank changes" caixa flutuante: "deer-flow ▲ 3→1 (+6.2); local-dr ▼ 1→2 (-0.4)".
- **Snap & save:** botão "snap to closest preset" no weights-view; botão "save as custom persona" gera URL e copia.

## Checklist Gold (apps/research vs bench)

A página é Gold quando:

- [ ] `?w_<id>=N` sobrevive refresh e replica ranking exato.
- [ ] Mover um slider provoca animação de ranking + delta-toast em <300ms.
- [ ] Persona-chip clicada escreve `?persona=ID` (não `?w_*`) e o leaderboard cita "preset: ID" no header.
- [ ] Players escondidos via chip viram `?players=...` e somem do leaderboard, do duel e dos cliffs.
- [ ] `?players=` afeta `summary.winner` calculado: se eu escondo o leader oficial, o painel mostra "Com este recorte, vencedor é X (era Y)".
- [ ] Botão "Copiar permalink desta decisão" no topbar.
- [ ] Botão "Copiar battle card" gera MD: "winner | runner | top-3 dims | top-2 cliffs | tiebreaker decisivo".
- [ ] Sliders agrupados por `row.group`, com header de grupo "(Σ=22%) Multi-Agent Orchestration" colapsável.
- [ ] Default load: persona "neutral-baseline" implícita; nenhuma URL params decisórios.

## Referência

- `apps/research/src/components/observatory/organisms/weights-view.tsx` — base atual
- `apps/research/src/components/observatory/organisms/matrix-view.tsx` — player toggle existente (local state, precisa virar URL)
- `.claude/rules/url-as-state-frontend.md` — princípio governante
- `docs/bench/deepresearch-absorption-benchmark/evaluation-rubric.yaml` — fonte dos 16 grupos e 8 personas

---

*Sinkra Hub — apps/research v1 Decision-in-One-Click Doctrine | 2026-05-18*
