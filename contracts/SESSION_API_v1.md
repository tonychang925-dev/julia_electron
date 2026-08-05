# Session API Contract v1 — FROZEN

> Electron consumes. Julia Core implements later. Electron mocks now.

```
GET  /sessions              → SessionSummary[]
GET  /sessions/{id}         → SessionDetail
POST /sessions              → SessionDetail
PUT  /sessions/{id}/title   → SessionDetail
```

## SessionSummary
```json
{ "id": "sess_001", "title": "AI Agent讨论", "topic": "market_analysis",
  "message_count": 24, "created_at": "2026-08-05T08:00:00Z",
  "updated_at": "2026-08-05T09:30:00Z" }
```

## SessionDetail
```json
{ "id": "sess_001", "title": "AI Agent讨论", "topic": "market_analysis",
  "messages": [{"role":"user","text":"今天市场怎么样？","timestamp":"..."}],
  "summary": "讨论了AI Agent板块的扩散信号，Tony关注机器人方向",
  "memory_refs": ["memory://event/julia-core-origin"],
  "created_at": "2026-08-05T08:00:00Z" }
```
