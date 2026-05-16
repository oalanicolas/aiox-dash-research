# Research: AI Agent Orchestration Patterns

Overview of agent orchestration patterns evaluated for AIOX runners. This
research consolidates findings from the multi-wave deep research pipeline.

## Key Sources

- [Anthropic Multi-Agent Research](https://docs.anthropic.com/en/docs/agents)
- [OpenAI Swarm](https://github.com/openai/swarm)
- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)

## Findings Matrix

| Pattern | Latency | Failure Mode | Maintained |
|---|---|---|---|
| Sequential | Low | Single-point | Yes |
| Hierarchical | Medium | Manager bottleneck | Yes |
| Swarm | High | Coordination drift | Partial |

## Open Questions

- Quais patterns escalam para 10+ agentes sem perda de coerência?
- Como instrumentar handoffs entre agentes para depurar falhas?
- Qual a estratégia de retry quando um agente filho falha em silêncio?
