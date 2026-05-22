# Implementation Gaps Analysis

This document catalogs the **critical gaps** between the documented architecture and actual implementation in the Lattice codebase. Each gap includes:
- **Severity**: Impact on production readiness
- **Location**: Where the gap exists in code/docs
- **Impact**: What breaks or is missing
- **Fix**: Concrete implementation steps

---

## 🔴 Critical Gaps (Block Production)

### 1. Session State Persistence Not Implemented

| Field | Value |
|-------|-------|
| **Severity** | 🔴 Critical |
| **Location** | `session.service.ts`, `agent.service.ts`, DB schema |
| **Impact** | Agent loses context on every message; no session recovery |

**Description:**
The database schema includes a `conversation_log` field (TEXT type for JSONL), but it is **never written to** in the codebase. The documented "Blob/File Model" for durable session persistence is not implemented.

**Current Code:**
```typescript
// session.service.ts - updateSession() never writes conversation_log
async function updateSession(sessionId: string, updates: Partial<Session>) {
  const { data, error } = await supabaseAdmin
    .from("sessions")
    .update({
      name: updates.name,
      cost_usd: updates.cost_usd,
      credits_used: updates.credits_used,
      // conversation_log is NEVER updated
    })
    .eq("id", sessionId);
}
```

**Expected Behavior:**
After each agent run, the full conversation history (including agent thoughts/tool calls) should be appended to `conversation_log` as JSONL.

**Fix Required:**
```typescript
// 1. Add method to append to conversation log
async function appendToSessionLog(sessionId: string, entry: SessionLogEntry) {
  // Fetch current log
  const { data: session } = await supabaseAdmin
    .from("sessions")
    .select("conversation_log")
    .eq("id", sessionId)
    .single();

  // Append new entry as JSONL
  const currentLog = session?.conversation_log || "";
  const newLog = currentLog + JSON.stringify(entry) + "\n";

  // Update
  await supabaseAdmin
    .from("sessions")
    .update({ conversation_log: newLog })
    .eq("id", sessionId);
}

// 2. Call after agent completes in agent.service.ts
await appendToSessionLog(sessionId, {
  timestamp: Date.now(),
  role: "assistant",
  content: agentResponse,
  toolCalls: toolExecutionLog,
  tokenUsage: tokenUsage,
});
```

**Files to Modify:**
- `src/server/services/session.service.ts` - Add `appendToSessionLog()`
- `src/server/services/agent.service.ts` - Call after agent completes
- `src/common/types/database.ts` - Define `SessionLogEntry` interface

---

### 2. Agent Process Never Actually Starts

| Field | Value |
|-------|-------|
| **Severity** | 🔴 Critical |
| **Location** | `agent.service.ts`, `server.ts` |
| **Impact** | User messages received but no agent execution |

**Description:**
The `agent.service.ts` has a `startAgentProcess()` function signature but it's **never implemented**. The Socket.io server receives `clientMessage` events but doesn't trigger actual agent execution.

**Current Code:**
```typescript
// agent.service.ts - Function exists but not implemented
export async function startAgentProcess(
  sessionId: string,
  userId: string,
  message: string
): Promise<AgentResult> {
  // TODO: Implement agent invocation
  throw new Error("Not implemented");
}

// server.ts - Event handler doesn't call agent
socket.on("clientMessage", async ({ message, sessionId }) => {
  // Just emits back, never starts agent
  socket.emit("agentMessage", {
    role: "assistant",
    content: "Processing...",
  });
});
```

**Expected Behavior:**
1. User sends message via socket
2. Server calls `startAgentProcess()`
3. Sandbox pod is created via `sandbox.service.ts`
4. Agent bridge receives prompt and executes
5. Results streamed back via socket

**Fix Required:**
```typescript
// server.ts - Complete implementation
socket.on("clientMessage", async ({ message, sessionId, userId }) => {
  try {
    // Emit loading state
    socket.emit("agentLoading", { isLoading: true });

    // Start agent process
    const result = await startAgentProcess(sessionId, userId, message);

    // Emit result
    socket.emit("agentMessage", {
      id: generateId(),
      role: "assistant",
      content: result.output,
      timestamp: Date.now(),
      tokenUsage: result.tokenUsage,
    });

    // Update session cost
    await updateSessionCost(sessionId, result.cost);

  } catch (error) {
    socket.emit("error", { message: error.message });
  } finally {
    socket.emit("agentLoading", { isLoading: false });
  }
});
```

**Files to Modify:**
- `src/server/services/agent.service.ts` - Implement `startAgentProcess()`
- `server.ts` - Complete socket event handler
- `src/server/services/sandbox.service.ts` - Ensure `runAgent()` is called

---

### 3. Sandbox Service Doesn't Execute Agent

| Field | Value |
|-------|-------|
| **Severity** | 🔴 Critical |
| **Location** | `sandbox.service.ts` |
| **Impact** | Pods created but agent code never runs |

**Description:**
The `sandbox.service.ts` has methods to create pods and execute the bridge, but the actual agent invocation flow is incomplete. The `runAgent()` method exists but doesn't integrate with the `pi` agent bridge.

**Current Code:**
```typescript
// sandbox.service.ts - Incomplete implementation
async runAgent(sessionId: string, prompt: string): Promise<AgentResult> {
  // Creates pod but doesn't actually run agent
  await this.createPod(sessionId);

  // Bridge call is incomplete
  const result = await this.executeBridgeRun(sessionId, prompt);

  // Doesn't wait for completion or handle errors
  return result;
}
```

**Expected Behavior:**
1. Create sandbox pod with unique namespace
2. Wait for pod to be ready (bridge listening)
3. POST prompt to bridge `/run` endpoint
4. Poll for completion or stream output
5. Pull artifacts (STL, logs) from pod
6. Clean up pod

**Fix Required:**
```typescript
async runAgent(sessionId: string, prompt: string): Promise<AgentResult> {
  const namespace = `sandbox-${sessionId}-${Date.now()}`;

  try {
    // 1. Create namespace and pod
    await this.createPod(sessionId, namespace);

    // 2. Wait for bridge to be ready
    await this.waitForBridgeReady(namespace, 30000);

    // 3. Send prompt to agent
    const runId = await this.executeBridgeRun(namespace, prompt);

    // 4. Poll for completion
    const result = await this.pollForCompletion(namespace, runId, 300000);

    // 5. Pull artifacts
    const artifacts = await this.pullArtifacts(namespace);

    // 6. Upload to Supabase
    await this.persistArtifacts(sessionId, artifacts);

    return result;

  } finally {
    // 7. Cleanup (or keep for debugging)
    if (!this.config.keepSandboxes) {
      await this.deletePod(namespace);
    }
  }
}
```

**Files to Modify:**
- `src/server/services/sandbox.service.ts` - Complete `runAgent()` implementation

---

## 🟠 High Priority Gaps (Block Core Features)

### 4. No Timeout or Retry Logic for Agent Execution

| Field | Value |
|-------|-------|
| **Severity** | 🟠 High |
| **Location** | `sandbox.service.ts`, `agent.service.ts` |
| **Impact** | Hung agents drain credits indefinitely |

**Description:**
No timeout is enforced on agent execution. If the agent hangs or enters an infinite loop, the user's credits continue to be consumed with no way to stop it.

**Fix Required:**
```typescript
// Add timeout to agent execution
async runAgent(sessionId: string, prompt: string, options?: {
  timeoutMs?: number;
  maxRetries?: number;
}): Promise<AgentResult> {
  const timeout = options?.timeoutMs ?? 300000; // 5 min default
  const maxRetries = options?.maxRetries ?? 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await Promise.race([
        this.executeAgent(sessionId, prompt),
        this.timeout(timeout, "Agent execution timed out"),
      ]);
      return result;
    } catch (error) {
      if (attempt === maxRetries) throw error;
      console.warn(`Agent attempt ${attempt} failed, retrying...`);
    }
  }
}

// Helper timeout function
function timeout(ms: number, message: string): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
}
```

---

### 5. No Concurrency Limits

| Field | Value |
|-------|-------|
| **Severity** | 🟠 High |
| **Location** | `sandbox.service.ts`, `server.ts` |
| **Impact** | Single user can exhaust cluster resources |

**Description:**
No limits on:
- Concurrent sessions per user
- Total active sandboxes cluster-wide
- Rate of sandbox creation

**Fix Required:**
```typescript
// Add concurrency limits to config
export const SANDBOX_CONFIG = {
  MAX_SANDBOXES_PER_USER: 3,
  MAX_TOTAL_SANDBOXES: 50,
  SANDBOX_CREATION_RATE_LIMIT: 5, // per minute
};

// Check before creating sandbox
async canCreateSandbox(userId: string): Promise<boolean> {
  // Count active sandboxes for user
  const userSandboxes = await this.getActiveSandboxesForUser(userId);
  if (userSandboxes.length >= SANDBOX_CONFIG.MAX_SANDBOXES_PER_USER) {
    throw new Error("Maximum concurrent sessions reached");
  }

  // Count total active sandboxes
  const totalSandboxes = await this.getTotalActiveSandboxes();
  if (totalSandboxes >= SANDBOX_CONFIG.MAX_TOTAL_SANDBOXES) {
    throw new Error("Cluster capacity reached");
  }

  return true;
}
```

---

### 6. Artifact Versioning Not Implemented

| Field | Value |
|-------|-------|
| **Severity** | 🟠 High |
| **Location** | `sandbox.service.ts`, Supabase storage |
| **Impact** | Each new model overwrites previous; no history |

**Description:**
STL files are saved to `/{sessionId}/model.stl`, overwriting any previous model. Users cannot view or download earlier versions.

**Fix Required:**
```typescript
// Versioned artifact storage
async persistArtifacts(sessionId: string, artifacts: Artifacts) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const version = await this.getNextVersion(sessionId);

  // Store with version in path
  const stlPath = `${sessionId}/v${version}_${timestamp}/model.stl`;
  await supabaseAdmin.storage
    .from(SUPABASE_BUCKET_NAME)
    .upload(stlPath, artifacts.stl);

  // Record version in session log
  await this.recordArtifactVersion(sessionId, {
    version,
    path: stlPath,
    timestamp,
    prompt: artifacts.prompt,
  });
}

// Fetch all versions
async getArtifactVersions(sessionId: string): Promise<ArtifactVersion[]> {
  const { data } = await supabaseAdmin
    .from("artifact_versions")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });

  return data || [];
}
```

---

## 🟡 Medium Priority Gaps (UX Improvements)

### 7. Cost Tracking Incomplete

| Field | Value |
|-------|-------|
| **Severity** | 🟡 Medium |
| **Location** | `cost.service.ts`, `agent.service.ts` |
| **Impact** | Only token costs tracked; missing sandbox/runtime costs |

**Description:**
Current cost tracking only accounts for LLM token usage. Missing:
- Sandbox runtime costs (CPU/memory time)
- Agent bridge API costs
- Storage costs for artifacts

**Fix Required:**
```typescript
// Expand cost model
export interface FullCostBreakdown {
  tokenCost: number;      // LLM input/output tokens
  runtimeCost: number;    // Sandbox CPU/memory seconds
  storageCost: number;    // Artifact storage
  totalCost: number;
}

export function calculateFullCost(
  tokenUsage: TokenUsage,
  runtime: { cpuSeconds: number; memoryGBSeconds: number },
  storageBytes: number
): FullCostBreakdown {
  const tokenCost = calculateTokenCost(tokenUsage);
  const runtimeCost = (
    runtime.cpuSeconds * 0.00001 +  // $0.01 per CPU-second
    runtime.memoryGBSeconds * 0.000002 // $0.002 per GB-second
  );
  const storageCost = storageBytes * 0.0000001; // $0.10 per GB-month (prorated)

  return {
    tokenCost,
    runtimeCost,
    storageCost,
    totalCost: tokenCost + runtimeCost + storageCost,
  };
}
```

---

### 8. Error Recovery UI Missing

| Field | Value |
|-------|-------|
| **Severity** | 🟡 Medium |
| **Location** | `chat-interface.tsx`, `socket-provider.tsx` |
| **Impact** | Users see errors but no recovery options |

**Description:**
When agent execution fails, users see an error message but have no way to:
- Retry the failed request
- See what went wrong
- Continue from where it failed

**Fix Required:**
```typescript
// In chat-interface.tsx
{message.status === "failed" && (
  <div className="flex items-center gap-2 mt-2">
    <AlertCircle className="w-4 h-4 text-red-500" />
    <span className="text-sm text-red-500">{message.error}</span>
    <Button
      size="sm"
      variant="outline"
      onClick={() => handleRetry(message)}
    >
      <RefreshCw className="w-3 h-3 mr-1" />
      Retry
    </Button>
  </div>
)}

// In socket-provider.tsx
socket.on("agentError", ({ messageId, error }) => {
  queryClient.setQueryData(["messages", sessionId], (old) => {
    const messages = [...old.messages];
    const msgIndex = messages.findIndex(m => m.id === messageId);
    if (msgIndex >= 0) {
      messages[msgIndex] = {
        ...messages[msgIndex],
        status: "failed",
        error: error.message,
      };
    }
    return { ...old, messages };
  });
});
```

---

### 9. No Session Sharing or Export

| Field | Value |
|-------|-------|
| **Severity** | 🟡 Medium |
| **Location** | Not implemented anywhere |
| **Impact** | Cannot share designs or export session data |

**Description:**
Users cannot:
- Share a session with others (read-only or collaborative)
- Export session as JSON for backup
- Import a session from JSON

**Fix Required:**
```typescript
// API route: POST /api/sessions/[sessionId]/share
export async function POST(
  req: Request,
  { params }: { params: { sessionId: string } }
) {
  const { sessionId } = await params;
  const { userId } = await getAuthenticatedUserId();

  // Generate share token
  const shareToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await supabaseAdmin.from("session_shares").insert({
    session_id: sessionId,
    owner_id: userId,
    share_token: shareToken,
    expires_at: expiresAt,
    permissions: "read", // or "read_write"
  });

  return NextResponse.json({ shareUrl: `${window.location.origin}/share/${shareToken}` });
}

// API route: GET /api/sessions/[sessionId]/export
export async function GET(
  req: Request,
  { params }: { params: { sessionId: string } }
) {
  const session = await getSession(sessionId);
  const messages = await getMessages(sessionId);
  const artifacts = await getArtifactVersions(sessionId);

  return NextResponse.json({
    version: 1,
    exportedAt: new Date().toISOString(),
    session,
    messages,
    artifacts,
  });
}
```

---

## 🟢 Low Priority Gaps (Nice to Have)

### 10. Missing Documentation

| Field | Value |
|-------|-------|
| **Severity** | 🟢 Low |
| **Location** | Throughout codebase |
| **Impact** | Hard to onboard new developers |

**Missing Documentation:**
- [ ] API route documentation (OpenAPI/Swagger)
- [ ] Architecture Decision Records (ADRs)
- [ ] Runbooks for operations
- [ ] Developer onboarding guide
- [ ] Troubleshooting guide

---

### 11. No Analytics/Telemetry

| Field | Value |
|-------|-------|
| **Severity** | 🟢 Low |
| **Location** | Not implemented |
| **Impact** | Cannot measure usage patterns or optimize |

**Fix Required:**
```typescript
// Track key metrics
export function trackEvent(event: AnalyticsEvent) {
  // Send to analytics service (PostHog, Mixpanel, etc.)
  console.log("[Analytics]", event);
}

// Usage:
trackEvent({
  type: "session_created",
  userId: userId,
  timestamp: Date.now(),
});

trackEvent({
  type: "agent_execution",
  sessionId: sessionId,
  durationMs: duration,
  success: true,
  tokenUsage: tokenUsage,
});
```

---

## Summary

| Severity | Count | Description |
|----------|-------|-------------|
| 🔴 Critical | 3 | Block any real usage |
| 🟠 High | 4 | Block core features |
| 🟡 Medium | 3 | UX improvements |
| 🟢 Low | 2 | Nice to have |

**Total Gaps:** 12

**Immediate Next Steps:**
1. Implement session state persistence (Gap #1)
2. Connect agent process to socket events (Gap #2)
3. Complete sandbox agent execution (Gap #3)

These three critical gaps must be resolved before the system can handle real user sessions.
