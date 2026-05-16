# Research Report — Agent Orchestration

## Players

- Adotar LangGraph para fluxos hierárquicos com state explícito.
- Implementar swarm pattern apenas onde latência absorve coordination cost.
- Validar handoff via inspector externo antes de escalar para produção.

## Risk Inventory

- Coordination drift em swarm é alto risco quando agentes excedem 8.
- Falha silenciosa de retry em sequential é P1.

Fontes adicionais consultadas: https://arxiv.org/abs/2402.01000 e
https://www.anthropic.com/news/swarm-considered-harmful.
