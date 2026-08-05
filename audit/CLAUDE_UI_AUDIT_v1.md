# Claude Desktop UI Capability Audit — Julia Electron Blueprint

> **Date**: 2026-08-05  
> **Purpose**: Audit Claude Code's full UI capability surface, map gaps against Julia Electron E0.5 skeleton, and produce a prioritized implementation roadmap.

---

## 1. Claude UI Architecture

Claude Code is a **TUI** (Terminal UI) built on **Ink** (React renderer for terminal). It renders components as ANSI text, not DOM. Despite being terminal-based, its UI architecture is a clean reference for Julia Electron because the conceptual modules are identical.

### 1.1 Component Tree (Simplified)

```
App
├── REPL (main chat loop)
│   ├── AgentProgressLine       ← "Thinking..." / "Reading files..." / status
│   ├── CompactSummary           ← Post-compact state display
│   ├── ContextSuggestions       ← What Claude thinks you might need
│   └── BaseTextInput             ← User input
├── ResumeConversation           ← Session picker / history browser
├── Doctor                       ← Health/diagnostic screen
├── AutoUpdater                  ← Version management
├── ConfigurableShortcutHint     ← Keyboard shortcut helper
├── BypassPermissionsModeDialog  ← Permission escalation
├── ChannelDowngradeDialog       ← Model/channel switching
└── AutoModeOptInDialog          ← Feature opt-in
```

### 1.2 Key UI Capabilities

| Capability | Claude | Julia E0.5 | Gap |
|-----------|--------|-----------|-----|
| **Chat Loop** | REPL with streaming | ChatView + ChatInput | Done |
| **Agent Progress Line** | "Thinking..." / tool state | isThinking dots | Basic — need richer status |
| **Session Resume** | ResumeConversation screen | Not yet | P0 |
| **Session History** | assistant/sessionHistory.ts | Not yet | P1 |
| **Health/Diagnostics** | Doctor screen | /health check + basic Status | P1 |
| **Keyboard Shortcuts** | ConfigurableShortcutHint | Ctrl+Shift+J only | P1 |
| **Permission Escalation** | BypassPermissionsModeDialog | Not yet (no tools yet) | P2 |
| **Compact Summary** | Post-compact restored state | Not yet | P2 |
| **Context Suggestions** | What to do next | Not yet | P2 |
| **Auto Update** | AutoUpdater | Not yet | P3 |
| **Feature Opt-in** | AutoModeOptInDialog | Not yet | P3 |

---

## 2. What Claude Has That Julia Needs (P0-P1)

### 2.1 Agent Progress Line → Julia Runtime Status

Claude shows: `Thinking...` → `Reading files...` → `Editing...` → `Done`

Julia should show: ` ` 理解中 → ` ` 查询 Market Brain → ` ` 组织回答 → ` ` 完成

**Action**: Replace E0's three-dot isThinking with a proper `RuntimeStatus` component that reads event types from the server.

### 2.2 Session Resume → Julia Conversation History

Claude has `ResumeConversation.tsx` — a session picker that shows recent sessions.

Julia needs: `ConversationList` showing:
- Today: "上午市场分析"
- Yesterday: "ai_theme_app讨论"
- 7/24: "Julia人格实验"

Each with: title, timestamp, message count, topic tags.

**Action**: Add `conversation/ConversationList.jsx` to the skeleton (alongside existing ChatView).

### 2.3 Doctor Screen → Julia Health Dashboard

Claude has `Doctor.tsx` — system health, connectivity, configuration check.

Julia needs: A health panel showing:
- Julia Core server status
- LLM provider status (DeepSeek / GPT / Claude)
- Voice engine status (ElevenLabs / Edge TTS)
- Memory OS status
- ai_theme_app MCP connection
- Last compact timestamp
- Continuity checkpoint status

**Action**: Expand `Status.jsx` into a `StatusDashboard.jsx`. Keep the 6-dot online indicator for the title bar, add a full panel accessible from sidebar.

---

## 3. What Julia Needs That Claude Doesn't Have

### 3.1 Memory Center (Julia-specific)

Claude has `getMemoryPath()` but no visual memory browser. Julia's memory is governed, typed, and user-facing.

Needs: MemoryPanel (already in skeleton) — User / Relationship / Market / Experience cards with real entry counts and browse capability.

### 3.2 Tool Registry (Julia-specific)

Claude's tools are hardcoded. Julia's tools should be transparent — you see what she can do.

Needs: ToolPanel (already in skeleton) — with per-tool status (active/planned), description, permissions.

### 3.3 Workspace Context (Julia-specific)

Claude has `projectOnboardingState.ts` but no visual project context. Julia should know which project you're in.

Needs: WorkspacePanel (already in skeleton) — active projects with context awareness.

### 3.4 Identity Panel (Julia-specific)

ChatGPT has account settings. Julia needs identity settings — this is her "who am I" panel, not your account.

SettingsPanel skeleton already covers this. Future: persona selector, voice profile picker, relationship mode toggle.

---

## 4. Recommendations for julia_electron

### 4.1 Immediate (E0.5 — done)

- [x] Sidebar with nav (chat/memory/tools/workspace/settings)
- [x] All panels as empty skeletons
- [x] Simple view router

### 4.2 Next (E0.6 — Conversation History)

- [ ] `ConversationList.jsx` — session picker sidebar
- [ ] `ConversationStore` — local JSON file, keyed by date
- [ ] Per-session message persistence (localStorage → IndexedDB later)

This is the #1 Claude parity feature. Without it, Julia has no memory of "what we talked about yesterday" at the UI level.

### 4.3 E1 — Runtime Status + Streaming

- [ ] `RuntimeStatus.jsx` replaces three-dot animation with event-driven state
- [ ] WebSocket upgrade in `websocket.js` (from HTTP polling)
- [ ] Server pushes: `thinking.started` → `tool.started` → `tool.completed` → `assistant.reply`

### 4.4 E2 — Health Dashboard

- [ ] `StatusDashboard.jsx` showing all subsystem statuses
- [ ] Periodic /health polling with component-level status
- [ ] Error state per subsystem (not just "online/offline")

---

## 5. Recommendations for julia_core

Claude's UI audit revealed **three backend capabilities** Julia Core needs to support the UI, without becoming a UI framework itself:

### 5.1 Session Management API

```
GET  /sessions              → list all saved sessions
GET  /sessions/{id}         → load session messages
POST /sessions              → create new session
PUT  /sessions/{id}/title   → rename session
```

Currently: nothing. Voice loop uses an ephemeral array. ChatView has no session concept.

### 5.2 Runtime Status Event Stream

```
WebSocket events:
  { type: "runtime.started" }
  { type: "thinking.started" }
  { type: "tool.started", name: "read_file" }
  { type: "tool.completed", name: "read_file", result: {...} }
  { type: "assistant.reply", chunk: "今天市场..." }
  { type: "assistant.done" }
```

Currently: HTTP POST → wait → full reply. No streaming. No tool visibility. No thinking state.

### 5.3 Health Endpoint Expansion

```
GET /health
→ {
    status: "ok",
    subsystems: {
      julia_core: "ok",
      llm_provider: { status: "ok", model: "deepseek" },
      voice: { status: "ok", provider: "elevenlabs" },
      memory: { status: "ok", governed_count: 47 },
      mcp_ai_theme: { status: "disconnected" },
      continuity: { status: "ok", last_checkpoint: "2026-08-05T08:30:00Z" }
    }
  }
```

Currently: Flat `{ status: "ok", service: "julia_core" }`.

---

## 6. Prioritized Implementation Sequence

| Phase | Scope | Files | Effort |
|-------|-------|-------|--------|
| **E0.5** | UI skeleton (all panels) | 8 files | ✅ Done |
| **E0.6** | Conversation History | ConversationList + store | 1 day |
| **E1** | Runtime Status + WebSocket streaming | RuntimeStatus + ws upgrade | 2 days |
| **E2** | Health Dashboard | StatusDashboard | 1 day |
| **E3** | Session Management API (Core) | sessions endpoint | 2 days |
| **E4** | Voice Runtime | STT bridge + streaming TTS | 3 days |
| **E5** | Memory Panel live data | Wire MemoryPanel to Core API | 1 day |
| **E6** | Tool Panel live data | Wire ToolPanel to registry | 1 day |

---

## 7. Architecture Freeze

This audit does NOT propose changing Julia Core's Identity/Memory/Continuity layers. Electron is the UI shell — it renders what Core produces. The audit only identifies:

1. What UI capabilities Claude has → gaps in Julia Electron
2. What backend endpoints Core needs to expose → to enable those UI capabilities
3. What order to build them in

*Frozen: 2026-08-05. No Core changes. Electron skeleton only.*
