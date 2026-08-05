# Health Contract v1 — FROZEN

> Julia Control Center. Subsystem-level status. No Core changes yet.

```
GET /health → SubsystemHealth
```

```json
{
  "julia_core":       "ok",
  "llm_provider":     {"status":"ok","model":"deepseek"},
  "voice":            {"status":"ok","provider":"elevenlabs"},
  "memory":           {"status":"ok","governed_count":47},
  "continuity":       {"status":"ok","last_checkpoint":"2026-08-05T08:30:00Z"},
  "tools":            {"status":"degraded","active_tools":0},
  "mcp_ai_theme":     {"status":"disconnected"},
  "electron":         {"status":"ok","version":"0.1.0"}
}
```

Electron renders a Control Center panel — green/amber/red per subsystem. No guesses.
