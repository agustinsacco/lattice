# Architecture Decision Records (ADRs)

This document captures key architectural decisions for the Lattice platform. Each ADR follows the format:
- **Status**: Proposed | Accepted | Deprecated | Superseded
- **Context**: What is the issue we're addressing?
- **Decision**: What are we doing?
- **Consequences**: What becomes easier or harder because of this decision?

---

## ADR-001: Session Persistence Model

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-01-15 |
| **Authors** | Lattice Team |

### Context

The system needs to persist conversation history for AI agent sessions to enable:
1. Context continuity across multiple user messages
2. Session recovery after pod termination
3. Audit trail for debugging and billing

### Options Considered

**Option A: Blob/File Model (Chosen)**
- Store conversation as JSONL in a single TEXT column (`conversation_log`)
- Append-only writes
- Parse on read

**Option B: Relational Model**
- Separate table for messages with foreign keys to sessions
- Normalized schema
- Complex queries possible

**Option C: External Store**
- Redis for hot data, S3 for cold storage
- High performance, higher complexity

### Decision

**Option A: Blob/File Model**

We will store the full conversation history as newline-delimited JSON (JSONL) in the `sessions.conversation_log` column.

```sql
ALTER TABLE sessions ADD COLUMN conversation_log TEXT DEFAULT '';
```

Each log entry is a single line of JSON:
```json
{"timestamp":1705312800000,"role":"user","content":"Build a bracket"}
{"timestamp":1705312801000,"role":"assistant","tool_calls":[{"name":"write_file","args":{"path":"design.py"}}],"token_usage":{"input":100,"output":500}}
```

### Rationale

1. **Simplicity**: Single write per message, no joins
2. **Cost**: Cheaper than separate table with indexes
3. **Performance**: Fast for sequential reads (full conversation)
4. **Supabase Compatibility**: Works well with Postgres TEXT type

### Consequences

**Positive:**
- Simple implementation
- Low database overhead
- Easy to export/import sessions

**Negative:**
- Cannot query individual messages efficiently
- Log grows unbounded (need archival strategy)
- Partial updates require read-modify-write

### Migration Path

1. Add `conversation_log` column to existing sessions (nullable)
2. Update `session.service.ts` to write JSONL on each agent response
3. Add background job to archive old logs to cold storage

---

## ADR-002: Sandbox Lifecycle Management

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-01-16 |
| **Authors** | Lattice Team |

### Context

Agent execution requires an isolated environment with:
- Python + build123d + OpenCascade
- Node.js bridge for communication
- Ephemeral storage for artifacts

### Options Considered

**Option A: Ephemeral Pods (Chosen)**
- Create new pod per session
- Destroy after completion
- Clean slate every time

**Option B: Long-running Pods**
- Persistent pods per user
- Keep state between sessions
- Higher resource usage

**Option C: Shared Pod Pool**
- Fixed pool of pre-warmed pods
- Assign to sessions as needed
- Complex state management

### Decision

**Option A: Ephemeral Pods**

Each session gets a unique Kubernetes namespace with a single pod that is destroyed after the session ends (or after timeout).

```typescript
// Namespace naming: sandbox-{sessionId}-{timestamp}
const namespace = `sandbox-${sessionId}-${Date.now()}`;
```

### Rationale

1. **Isolation**: No cross-session contamination
2. **Security**: Each session fully isolated
3. **Cost**: Pay only for actual usage time
4. **Simplicity**: No state management between runs

### Consequences

**Positive:**
- Clean environment every time
- Easy to reason about
- Natural rate limiting (pod creation time)

**Negative:**
- Cold start latency (~4 seconds per pod)
- Cannot resume interrupted sessions without persistence
- Higher overhead for short sessions

### Mitigations

1. **Pod Pre-warming**: Keep 1-2 pods ready during business hours
2. **Session Persistence**: Save conversation log to resume in new pod
3. **Timeout Enforcement**: Kill pods after 5 minutes of inactivity

---

## ADR-003: Agent Communication Protocol

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-01-17 |
| **Authors** | Lattice Team |

### Context

The system needs a reliable way to communicate between:
- Next.js backend (Socket.io server)
- Agent bridge (Express in sandbox pod)
- `pi` coding agent (running in bridge container)

### Options Considered

**Option A: REST + Polling (Chosen)**
- POST prompt to `/run` endpoint
- Poll `/status/{runId}` for completion
- GET `/artifacts/{runId}` for results

**Option B: WebSocket Streaming**
- Bidirectional streaming of logs
- Real-time updates
- More complex error handling

**Option C: Message Queue**
- RabbitMQ/Redis for job queue
- Decoupled producer/consumer
- Overkill for current scale

### Decision

**Option A: REST + Polling**

The bridge exposes a simple REST API:

```
POST /run
{
  "session_id": "abc123",
  "prompt": "Build a bracket",
  "conversation_log": "..."
}

GET /status/{runId}
{
  "status": "running" | "completed" | "failed",
  "progress": 0.5,
  "logs": ["line 1", "line 2"]
}

GET /artifacts/{runId}
{
  "stl_base64": "...",
  "session_log": "..."
}
```

### Rationale

1. **Simplicity**: Easy to implement and debug
2. **Reliability**: HTTP is well-understood
3. **Compatibility**: Works across network boundaries
4. **Testing**: Easy to test with curl/Postman

### Consequences

**Positive:**
- Simple error handling
- Works with load balancers
- Easy to add authentication

**Negative:**
- Polling overhead
- Not truly real-time
- Latency in log streaming

### Mitigations

1. **Long Polling**: `/status` holds connection until change
2. **WebSocket Fallback**: Add streaming later if needed
3. **Smart Polling**: Exponential backoff (1s, 2s, 4s, 8s)

---

## ADR-004: Cost Model and Billing

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-01-18 |
| **Authors** | Lattice Team |

### Context

Users need transparent, predictable pricing for:
- LLM token usage
- Sandbox runtime
- Artifact storage

### Options Considered

**Option A: Credit System (Chosen)**
- Users purchase credits ($1 = 100 credits)
- Each operation deducts credits
- Real-time balance tracking

**Option B: Pay-per-use**
- Direct billing per operation
- Credit card charged after each session
- Complex UX

**Option C: Subscription**
- Monthly flat fee
- Unlimited usage (with fair use)
- Revenue risk

### Decision

**Option A: Credit System**

Pricing breakdown:
```
LLM Tokens:
  - Input: 0.25 credits per 1K tokens (gemini-3.1-flash-lite)
  - Output: 1.5 credits per 1K tokens

Sandbox Runtime:
  - 1 credit per minute of pod runtime

Storage:
  - 1 credit per 100MB per month
```

### Rationale

1. **Predictability**: Users know cost upfront
2. **Flexibility**: Can adjust pricing per component
3. **Simplicity**: Single currency for all operations
4. **Prepaid**: Reduces billing risk

### Consequences

**Positive:**
- Clear cost visibility
- Easy to implement discounts/promotions
- No surprise bills

**Negative:**
- Users must prepay
- Credit balance management overhead
- Refund complexity

### Implementation

```typescript
// cost.service.ts
export function calculateCost(
  tokenUsage: TokenUsage,
  runtimeMinutes: number,
  storageMB: number
): number {
  const tokenCost = (
    tokenUsage.inputTokens / 1000 * 0.25 +
    tokenUsage.outputTokens / 1000 * 1.5
  );
  const runtimeCost = runtimeMinutes * 1;
  const storageCost = storageMB / 100 * 0.01;

  return Math.ceil((tokenCost + runtimeCost + storageCost) * 100) / 100;
}
```

---

## ADR-005: Error Handling Strategy

| Field | Value |
|-------|-------|
| **Status** | Proposed |
| **Date** | 2026-01-20 |
| **Authors** | Lattice Team |

### Context

The system must handle failures gracefully:
- Agent crashes
- Network timeouts
- Resource exhaustion
- Invalid user input

### Options Considered

**Option A: Fail Fast (Chosen)**
- Immediate error on any failure
- No retries by default
- User sees error and can retry manually

**Option B: Automatic Retry**
- Retry failed operations automatically
- Exponential backoff
- User unaware of failures

**Option C: Hybrid**
- Retry transient errors (network)
- Fail fast on permanent errors (invalid input)
- Configurable per operation

### Decision

**Option C: Hybrid**

```typescript
export const ERROR_RECOVERY_POLICY = {
  // Transient errors - auto retry
  TRANSIENT_ERRORS: [
    "ECONNREFUSED",
    "ETIMEDOUT",
    "503 Service Unavailable",
  ],
  RETRY_CONFIG: {
    maxAttempts: 3,
    backoffMs: 1000,
    maxBackoffMs: 32000,
  },

  // Permanent errors - fail immediately
  PERMANENT_ERRORS: [
    "400 Bad Request",
    "401 Unauthorized",
    "403 Forbidden",
    "Invalid prompt",
  ],
};
```

### Rationale

1. **User Experience**: Don't hide failures, but don't punish transient issues
2. **Cost Control**: Don't retry expensive operations blindly
3. **Debugging**: Clear error messages help users understand issues

### Consequences

**Positive:**
- Balanced approach
- Cost-effective
- Good UX

**Negative:**
- More complex error classification
- Edge cases in error detection

---

## ADR-006: Artifact Storage Strategy

| Field | Value |
|-------|-------|
| **Status** | Proposed |
| **Date** | 2026-01-21 |
| **Authors** | Lattice Team |

### Context

Generated STL files and logs need persistent storage:
- Survive pod termination
- Accessible from frontend
- Version history

### Options Considered

**Option A: Supabase Storage (Chosen)**
- S3-compatible object storage
- Integrated with Supabase auth
- Built-in CDN

**Option B: Local File System**
- Store on Next.js server
- Simple, not scalable
- Data loss on restart

**Option C: Multi-cloud**
- Primary: Supabase
- Backup: GCS/AWS S3
- Complex, expensive

### Decision

**Option A: Supabase Storage**

Storage structure:
```
lattice-artifacts/
├── {sessionId}/
│   ├── v1_2026-01-15T10-30-00/
│   │   ├── model.stl
│   │   └── session_log.jsonl
│   ├── v2_2026-01-15T11-45-00/
│   │   ├── model.stl
│   │   └── session_log.jsonl
│   └── current.stl (symlink to latest)
```

### Rationale

1. **Integration**: Already using Supabase for auth/DB
2. **Auth**: Row-level security for access control
3. **Cost**: Cheap storage ($0.026/GB/month)
4. **CDN**: Fast global delivery

### Consequences

**Positive:**
- Simple implementation
- Built-in auth
- Scalable

**Negative:**
- Vendor lock-in
- Limited metadata on objects

### Future Considerations

If storage needs grow:
1. Add lifecycle policies (archive after 90 days)
2. Implement multi-region replication
3. Add compression for large files

---

## ADR-007: Socket.io vs REST for Real-time

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-01-22 |
| **Authors** | Lattice Team |

### Context

Frontend needs real-time updates for:
- Agent execution progress
- Log streaming
- Model updates

### Options Considered

**Option A: Socket.io (Chosen)**
- Bidirectional real-time communication
- Automatic reconnection
- Room-based subscriptions

**Option B: Server-Sent Events (SSE)**
- Unidirectional (server → client)
- Simpler than WebSockets
- No native TypeScript support

**Option C: Polling**
- Simple HTTP polling
- High latency
- Wasteful

### Decision

**Option A: Socket.io**

Events:
```typescript
// Client → Server
socket.emit("clientMessage", { message, sessionId });
socket.emit("joinSession", sessionId);

// Server → Client
socket.emit("agentLoading", { isLoading: true });
socket.emit("toolStatus", { toolName: "write_file", status: "start" });
socket.emit("agentMessage", { role, content, timestamp });
socket.emit("modelUpdated", { sessionId });
socket.emit("sessionCostUpdated", { session });
```

### Rationale

1. **Bidirectional**: Client can send/receive
2. **Rooms**: Session-based isolation
3. **Reconnection**: Handles network issues
4. **Ecosystem**: Well-maintained, TypeScript support

### Consequences

**Positive:**
- Real-time UX
- Handles disconnections
- Scalable with adapters

**Negative:**
- More complex than REST
- Stateful connections
- Scaling requires Redis adapter

---

## ADR-008: Database Schema Design

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-01-10 |
| **Authors** | Lattice Team |

### Context

Need to track:
- User sessions
- Chat messages
- Credit transactions
- Artifact versions

### Decision

**Normalized Schema with JSONB for Flexible Data**

```sql
-- Sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  conversation_log TEXT DEFAULT '',  -- JSONL blob
  cost_usd DECIMAL(10,4) DEFAULT 0,
  credits_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Messages table (for quick queries)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL,  -- 'user' | 'assistant'
  content JSONB NOT NULL,  -- Flexible content structure
  token_usage JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Credit transactions
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  amount INTEGER NOT NULL,  -- Positive = add, Negative = deduct
  transaction_type TEXT NOT NULL,  -- 'usage' | 'purchase' | 'refund'
  description TEXT NOT NULL,
  session_id UUID REFERENCES sessions(id),
  message_id UUID REFERENCES messages(id),
  model TEXT,
  base_cost DECIMAL(10,6),
  margin DECIMAL(10,6),
  input_tokens INTEGER,
  output_tokens INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User credits (denormalized for fast reads)
CREATE TABLE user_credits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  balance INTEGER NOT NULL DEFAULT 0,
  has_received_welcome_credits BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Artifact versions
CREATE TABLE artifact_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  file_size_bytes INTEGER,
  prompt TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, version)
);
```

### Rationale

1. **Normalization**: Avoid data duplication
2. **JSONB**: Flexible schema for evolving message formats
3. **Denormalization**: `user_credits` table for fast balance reads
4. **Cascade**: Automatic cleanup on session deletion

---

## Open Decisions

### ODR-001: Agent Model Selection
**Status**: Open
**Question**: Which LLM model(s) should we support?
**Options**: 
- Gemini 2.5 Flash (current)
- Add Claude 3.5 Sonnet
- Add GPT-4o
**Decision Needed**: By 2026-02-01

### ODR-002: Sandbox Network Isolation
**Status**: Open
**Question**: How strict should network policies be?
**Options**:
- Complete isolation (no egress)
- Allow internal services only
- Allow specific external APIs
**Decision Needed**: By 2026-02-15

### ODR-003: Session Sharing Permissions
**Status**: Open
**Question**: What sharing model to implement?
**Options**:
- Read-only links (7-day expiry)
- Collaborative editing
- Full export/import
**Decision Needed**: By 2026-03-01
