# Runtime Event Contract v1 — FROZEN

> WebSocket event stream. Electron renders. Core emits.

```
{ "type": "runtime.started",    "timestamp": "..." }
{ "type": "thinking.started",   "timestamp": "..." }
{ "type": "context.loading",    "timestamp": "..." }
{ "type": "memory.reading",     "timestamp": "..." }
{ "type": "tool.started",       "name": "read_file", "timestamp": "..." }
{ "type": "tool.completed",     "name": "read_file", "result": {...}, "timestamp": "..." }
{ "type": "response.streaming", "chunk": "今天市场...", "timestamp": "..." }
{ "type": "response.done",      "timestamp": "..." }
{ "type": "runtime.failed",     "reason": "...", "timestamp": "..." }
```

Electron maps each event to a visual state. It never guesses "is Julia thinking?"
