# Pi RPC Integration Plan

> Reference: `.vendor/pi/packages/coding-agent/docs/rpc.md`
> Types: `.vendor/pi/packages/coding-agent/src/modes/rpc/rpc-types.ts`
> Agent Events: `.vendor/pi/packages/agent/src/types.ts`

## Current Architecture (Broken)

```
Browser ──Socket.IO──▶ Next.js Server ──HTTP SSE──▶ Bridge (index.js) ──spawn──▶ pi --print
                                                     stdout parsing          (unstructured text)
```

**Problems:**
1. `--print` mode outputs human-readable text, not machine-parsable events
2. Bridge forwards raw lines as `agentLog` / `agentError` — the frontend doesn't listen to these
3. Frontend expects structured Socket.IO events: `agentMessage`, `toolStatus`, `agentLoading`
4. No way to distinguish tool calls from text output in print mode

## Target Architecture (RPC Mode)

```
Browser ──Socket.IO──▶ Next.js Server ──HTTP SSE──▶ Bridge (index.js) ──stdin/stdout──▶ pi --mode rpc
                         ▲                              (JSONL framing)                   (structured JSON)
                         │
                    Maps RPC events
                    to Socket.IO events
```

## RPC Protocol Summary

### Starting Pi in RPC Mode
```bash
pi --mode rpc --provider google --model gemini-2.5-pro --no-session
```

### Communication
- **Commands → stdin**: JSON objects, one per line (LF-delimited)
- **Events ← stdout**: JSON objects, one per line (LF-delimited)
- **IMPORTANT**: Do NOT use Node `readline` — it splits on Unicode separators. Use custom LF-only splitter.

### Key Command: `prompt`
```json
{"id": "req-1", "type": "prompt", "message": "Design a phone stand"}
```

Response (acceptance acknowledgment):
```json
{"id": "req-1", "type": "response", "command": "prompt", "success": true}
```

Then events stream asynchronously:

### Event Flow for a Single Turn
```
agent_start
  turn_start
    message_start        → assistant message begins
    message_update       → text_delta chunks (stream to chat)
    message_update       → toolcall_start (tool name appears)
    message_update       → toolcall_delta (arguments streaming)
    message_update       → toolcall_end (full tool call ready)
    message_end          → assistant message complete
    tool_execution_start → tool begins running (e.g., bash, write)
    tool_execution_update → streaming partial output
    tool_execution_end   → tool result ready
  turn_end               → turn complete with message + tool results
  [... more turns if tool calls trigger another LLM call ...]
agent_end                → all done, contains all generated messages
```

### Key Event Types

| RPC Event | Maps To (Socket.IO) | Description |
|-----------|---------------------|-------------|
| `agent_start` | `agentLoading: {isLoading: true}` | Agent begins processing |
| `agent_end` | `agentLoading: {isLoading: false}` + final `agentMessage` | Agent done |
| `message_update` (text_delta) | Stream to chat bubble | Text content for the user |
| `message_update` (toolcall_start) | `toolStatus: {toolName, status: "start"}` | Tool invocation begins |
| `tool_execution_start` | `toolStatus: {toolName, status: "start"}` | Tool execution begins |
| `tool_execution_end` | `toolStatus: {toolName, status: "end"}` | Tool execution complete |
| `message_end` | Finalize assistant message in DB | Complete assistant response |

### Message Update Delta Types
- `text_start` / `text_delta` / `text_end` — streaming text response
- `thinking_start` / `thinking_delta` / `thinking_end` — model reasoning
- `toolcall_start` / `toolcall_delta` / `toolcall_end` — tool invocations
- `done` — message complete (reason: `"stop"`, `"length"`, `"toolUse"`)
- `error` — message failed (reason: `"aborted"`, `"error"`)

## Bridge Changes Required

### Old Bridge (broken)
```javascript
// Spawns CLI, parses unstructured stdout
const agentProcess = spawn("npx", [
  "-y", "@earendil-works/pi-coding-agent",
  "--print", "--provider", "google",
  prompt
]);
// Forwards raw text lines as SSE
```

### New Bridge (RPC)
```javascript
import { spawn } from "child_process";
import { StringDecoder } from "string_decoder";

// Spawn in RPC mode
const agent = spawn("npx", [
  "-y", "@earendil-works/pi-coding-agent",
  "--mode", "rpc",
  "--provider", "google",
  "--model", "gemini-2.5-pro",
  "--no-session"
], { cwd: WORKSPACE_DIR });

// Custom LF-only JSONL reader (NOT readline!)
function attachJsonlReader(stream, onLine) {
  const decoder = new StringDecoder("utf8");
  let buffer = "";
  stream.on("data", (chunk) => {
    buffer += typeof chunk === "string" ? chunk : decoder.write(chunk);
    while (true) {
      const idx = buffer.indexOf("\n");
      if (idx === -1) break;
      let line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      onLine(line);
    }
  });
}

// Send prompt via stdin
agent.stdin.write(JSON.stringify({ id: "req-1", type: "prompt", message: prompt }) + "\n");

// Forward structured events as SSE to Next.js
attachJsonlReader(agent.stdout, (line) => {
  const event = JSON.parse(line);
  sendEvent("rpc", event); // Forward full JSON to SandboxService
});
```

### SandboxService Changes

Instead of parsing SSE `log`/`error` events, the `SandboxService` will:
1. Receive full RPC JSON events from the bridge
2. Map them to Socket.IO events the frontend already expects

```typescript
// In executeBridgeRun():
for (const event of rpcEvents) {
  switch (event.type) {
    case "agent_start":
      io.to(sessionId).emit("agentLoading", { isLoading: true });
      break;
    case "message_update":
      const delta = event.assistantMessageEvent;
      if (delta.type === "text_delta") {
        // Stream text to frontend chat
        io.to(sessionId).emit("agentMessage", {
          role: "assistant",
          content: delta.delta, // incremental text
        });
      }
      if (delta.type === "toolcall_start") {
        io.to(sessionId).emit("toolStatus", {
          toolName: delta.partial?.name || "unknown",
          status: "start",
        });
      }
      break;
    case "tool_execution_end":
      io.to(sessionId).emit("toolStatus", {
        toolName: event.toolName,
        status: "end",
      });
      break;
    case "agent_end":
      io.to(sessionId).emit("agentLoading", { isLoading: false });
      // Save final assistant message to Supabase
      break;
  }
}
```

## Additional RPC Commands We Can Use

| Command | Use Case |
|---------|----------|
| `abort` | User clicks "Stop" button in the UI |
| `get_session_stats` | Display token usage / cost in session footer |
| `steer` | Send a follow-up message while agent is still working |
| `set_thinking_level` | Let user toggle thinking depth from the UI |

## JSONL Framing Warning

> **Critical**: Node's `readline` module splits on U+2028 and U+2029 (Unicode line/paragraph separators), which are valid inside JSON strings. Use a custom `\n`-only splitter as shown above.

The reference implementation is in `.vendor/pi/packages/coding-agent/src/modes/rpc/jsonl.ts`.
