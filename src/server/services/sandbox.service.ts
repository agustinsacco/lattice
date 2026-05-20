import * as k8s from "@kubernetes/client-node";
import { v4 as uuidv4 } from "uuid";
import { Server } from "socket.io";
import * as net from "net";
import { getSessionLog, updateSessionLog, getMessages } from "./session.service";
import { supabaseAdmin } from "../lib/supabase";
import { SUPABASE_BUCKET_NAME } from "../../common/config";

/**
 * Finds a free port on the host machine.
 */
async function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, () => {
      const port = (server.address() as net.AddressInfo).port;
      server.close(() => {
        resolve(port);
      });
    });
  });
}

/**
 * Service to manage ephemeral agent sandboxes in K3d/K3s.
 */
export class SandboxService {
  private k8sApi: k8s.CoreV1Api;
  private watch: k8s.Watch;
  private kc: k8s.KubeConfig;

  constructor() {
    this.kc = new k8s.KubeConfig();
    try {
      this.kc.loadFromDefault();
    } catch (e) {
      console.warn("[SandboxService] Kubeconfig not found. Pod execution will fail.");
    }
    this.k8sApi = this.kc.makeApiClient(k8s.CoreV1Api);
    this.watch = new k8s.Watch(this.kc);
  }

  /**
   * Runs the agent in a K3s Pod and streams logs.
   * 
   * @param sessionId - Session ID
   * @param userId - User ID
   * @param io - Socket.io for streaming logs
   */
  async runAgent(sessionId: string, userId: string, io: Server) {
    const podName = `agent-${sessionId.substring(0, 8)}-${uuidv4().substring(0, 4)}`;
    const namespace = "lattice-sandboxes";

    // Ensure namespace exists programmatically in the cluster
    await this.ensureNamespaceExists(namespace);

    // 1. Get the current session log (JSONL)
    const sessionLog = await getSessionLog(sessionId, userId);

    // 2. Find the last user message prompt
    const { messages } = await getMessages(sessionId, userId);
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
    const prompt = typeof lastUserMessage?.content === "string" 
      ? lastUserMessage.content 
      : Array.isArray(lastUserMessage?.content)
        ? (lastUserMessage.content.find((p) => p.type === "text") as any)?.text || "Generate model"
        : "Generate model";

    // 3. Find a free port on the host
    const allocatedPort = await findFreePort();
    console.log(`[SandboxService] Allocated free hostPort ${allocatedPort} for Pod ${podName}`);

    try {
      // 4. Define the Pod Manifest
      const pod: k8s.V1Pod = {
        metadata: {
          name: podName,
          labels: {
            app: "lattice-agent",
            sessionId: sessionId,
          },
        },
        spec: {
          restartPolicy: "Never",
          containers: [
            {
              name: "agent",
              image: "lattice-agent:latest",
              imagePullPolicy: "Never",
              ports: [
                {
                  containerPort: 8080,
                  hostPort: allocatedPort,
                },
              ],
              env: [
                { name: "SESSION_ID", value: sessionId },
                { name: "USER_ID", value: userId },
                { name: "GOOGLE_API_KEY", value: process.env.GOOGLE_GENERATIVE_AI_API_KEY || "" },
                { name: "GEMINI_API_KEY", value: process.env.GOOGLE_GENERATIVE_AI_API_KEY || "" },
              ],
              resources: {
                limits: {
                  cpu: "1",
                  memory: "1Gi",
                },
              },
              volumeMounts: [
                { name: "workspace", mountPath: "/workspace" },
              ],
            },
          ],
          volumes: [
            { name: "workspace", emptyDir: {} },
          ],
        },
      };

      // 5. Create NetworkPolicy for Isolation
      await this.createNetworkPolicy(sessionId);

      // 6. Create the Pod
      console.log(`[SandboxService] Creating Pod ${podName} in namespace ${namespace}`);
      await this.k8sApi.createNamespacedPod({ namespace, body: pod });

      // 7. Wait for Pod to enter "Running" phase
      await this.waitForPodRunning(podName, namespace);
      console.log(`[SandboxService] Pod ${podName} is running. Allowing bridge to boot...`);
      await new Promise((resolve) => setTimeout(resolve, 800)); // Brief warm-up

      // 8. POST the run to the bridge and stream logs
      await this.executeBridgeRun(allocatedPort, sessionLog, prompt, sessionId, io);

      // 9. Pull artifacts on success
      await this.pullArtifactsAndPersist(allocatedPort, sessionId, userId, io);

    } catch (error) {
      console.error("[SandboxService] Error running agent:", error);
      io.to(sessionId).emit("error", { message: "Error during agent execution." });
      throw error;
    } finally {
      // 10. Clean up Pod and NetworkPolicy (Scale to Zero)
      await this.cleanupPod(podName, namespace, sessionId);
    }
  }

  private async waitForPodRunning(podName: string, namespace: string, timeoutMs: number = 30000) {
    const start = Date.now();
    let lastPhase = "Unknown";
    while (Date.now() - start < timeoutMs) {
      try {
        const pod = await this.k8sApi.readNamespacedPodStatus({ name: podName, namespace });
        lastPhase = pod.status?.phase || "Unknown";
        if (lastPhase === "Running") {
          return;
        }
        if (lastPhase === "Failed" || lastPhase === "Unknown") {
          await this.debugPodFailure(podName, namespace);
          throw new Error(`Pod failed to start. Phase: ${lastPhase}`);
        }
      } catch (err: any) {
        // Ignore read errors during startup, might be transient
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    await this.debugPodFailure(podName, namespace);
    throw new Error(`Timeout waiting for Pod ${podName} to start. Last phase: ${lastPhase}`);
  }

  private async debugPodFailure(podName: string, namespace: string) {
    console.error(`[SandboxService] Debugging pod failure for ${podName}...`);
    try {
      const logs = await this.k8sApi.readNamespacedPodLog({ name: podName, namespace });
      console.error(`[SandboxService] Pod Logs:\n${logs}`);
    } catch (logErr) {
      console.error(`[SandboxService] Could not fetch logs for ${podName}:`, logErr);
    }
  }

  private async executeBridgeRun(port: number, sessionLog: string, prompt: string, sessionId: string, io: Server) {
    console.log(`[SandboxService] Contacting bridge at http://127.0.0.1:${port}/run`);

    const response = await fetch(`http://127.0.0.1:${port}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionLog, prompt }),
    });

    if (!response.ok) {
      throw new Error(`Failed to start execution on bridge. Code: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = "";
    let assistantText = ""; // Accumulate streamed text deltas

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;

        try {
          const ssePayload = JSON.parse(line.substring(6));

          // Bridge-level events
          if (ssePayload.type === "bridge_error") {
            console.error(`[Sandbox Bridge Error] ${ssePayload.data}`);
            io.to(sessionId).emit("error", { message: ssePayload.data });
            continue;
          }

          if (ssePayload.type === "bridge_status") {
            console.log(`[Sandbox Bridge Status] ${JSON.stringify(ssePayload.data)}`);
            continue;
          }

          // RPC events from pi
          if (ssePayload.type !== "rpc_event") continue;

          const rpcEvent = ssePayload.data;
          this.handleRpcEvent(rpcEvent, sessionId, io, { assistantText: () => assistantText, setAssistantText: (t: string) => { assistantText = t; } });

        } catch (e) {
          // Non-JSON or malformed line — skip silently
        }
      }
    }
  }

  /**
   * Maps a pi RPC event to the Socket.IO events the frontend expects.
   */
  private handleRpcEvent(
    event: any,
    sessionId: string,
    io: Server,
    textAccumulator: { assistantText: () => string; setAssistantText: (t: string) => void }
  ) {
    switch (event.type) {
      // === Agent Lifecycle ===
      case "agent_start":
        console.log(`[RPC] agent_start for session ${sessionId}`);
        io.to(sessionId).emit("agentLoading", { isLoading: true });
        textAccumulator.setAssistantText("");
        break;

      case "agent_end":
        console.log(`[RPC] agent_end for session ${sessionId}`);
        // Emit the final accumulated assistant message
        const finalText = textAccumulator.assistantText();
        if (finalText.trim()) {
          io.to(sessionId).emit("agentMessage", {
            id: `agent-${Date.now()}`,
            sessionId,
            role: "assistant",
            content: finalText,
            timestamp: Date.now(),
            status: "confirmed",
            type: "text",
          });
        }
        io.to(sessionId).emit("agentLoading", { isLoading: false });
        break;

      // === Message Streaming ===
      case "message_update": {
        const delta = event.assistantMessageEvent;
        if (!delta) break;

        switch (delta.type) {
          case "text_delta":
            // Accumulate text for the final message
            textAccumulator.setAssistantText(textAccumulator.assistantText() + delta.delta);
            break;

          case "toolcall_start":
            // A tool call is starting — extract the tool name from the partial
            const toolName = delta.partial?.name || "unknown";
            console.log(`[RPC] toolcall_start: ${toolName}`);
            io.to(sessionId).emit("toolStatus", { toolName, status: "start" });
            break;

          case "toolcall_end":
            // Tool call definition is complete (arguments are ready)
            const endToolName = delta.toolCall?.name || "unknown";
            console.log(`[RPC] toolcall_end: ${endToolName}`);
            break;

          case "error":
            console.error(`[RPC] message error: ${delta.reason}`);
            io.to(sessionId).emit("error", { message: `Agent error: ${delta.reason || "unknown"}` });
            break;
        }
        break;
      }

      // === Tool Execution ===
      case "tool_execution_start":
        console.log(`[RPC] tool_execution_start: ${event.toolName} (${event.toolCallId})`);
        io.to(sessionId).emit("toolStatus", { toolName: event.toolName, status: "start" });
        break;

      case "tool_execution_update":
        // Streaming partial tool output (e.g., bash stdout)
        // Could be used for live terminal streaming in the future
        break;

      case "tool_execution_end":
        console.log(`[RPC] tool_execution_end: ${event.toolName} (error=${event.isError})`);
        io.to(sessionId).emit("toolStatus", { toolName: event.toolName, status: "end" });
        break;

      // === Turn Lifecycle ===
      case "turn_start":
        console.log(`[RPC] turn_start`);
        break;

      case "turn_end":
        console.log(`[RPC] turn_end`);
        break;

      // === Session Events ===
      case "compaction_start":
        console.log(`[RPC] compaction_start (reason: ${event.reason})`);
        break;

      case "compaction_end":
        console.log(`[RPC] compaction_end`);
        break;

      case "auto_retry_start":
        console.log(`[RPC] auto_retry (attempt ${event.attempt}/${event.maxAttempts}): ${event.errorMessage}`);
        break;

      case "auto_retry_end":
        console.log(`[RPC] auto_retry_end (success: ${event.success})`);
        break;

      case "extension_error":
        console.error(`[RPC] extension_error: ${event.error}`);
        break;

      // === RPC Responses (to commands we sent) ===
      case "response":
        if (!event.success) {
          console.error(`[RPC] Command "${event.command}" failed: ${event.error}`);
          if (event.command === "prompt") {
            io.to(sessionId).emit("error", { message: `Agent prompt failed: ${event.error}` });
          }
        } else {
          console.log(`[RPC] Command "${event.command}" accepted`);
        }
        break;

      default:
        // Unknown event type — log for debugging
        console.log(`[RPC] Unhandled event type: ${event.type}`);
        break;
    }
  }

  private async pullArtifactsAndPersist(port: number, sessionId: string, userId: string, io: Server) {
    console.log(`[SandboxService] Pulling artifacts from bridge...`);
    const response = await fetch(`http://127.0.0.1:${port}/artifacts`);
    if (!response.ok) {
      throw new Error("Failed to pull artifacts from bridge.");
    }

    const artifacts = await response.json();

    // 1. Update the session log in Supabase
    if (artifacts.log) {
      await updateSessionLog(sessionId, artifacts.log, userId);
    }

    // 2. Save the design Python file if available
    if (artifacts.code) {
      const buffer = Buffer.from(artifacts.code, "utf8");
      await supabaseAdmin.storage
        .from(SUPABASE_BUCKET_NAME)
        .upload(`${sessionId}/design.py`, buffer, {
          contentType: "text/plain",
          upsert: true,
        });
    }

    // 3. Save the STL file to Supabase Storage if generated
    if (artifacts.stlBase64) {
      console.log(`[SandboxService] Received generated STL model. Saving to storage...`);
      const buffer = Buffer.from(artifacts.stlBase64, "base64");
      const { error: uploadError } = await supabaseAdmin.storage
        .from(SUPABASE_BUCKET_NAME)
        .upload(`${sessionId}/model.stl`, buffer, {
          contentType: "application/sla",
          upsert: true,
        });

      if (uploadError) {
        console.error("[SandboxService] STL upload failed:", uploadError.message);
      } else {
        console.log(`[SandboxService] STL model saved successfully.`);
        io.to(sessionId).emit("modelUpdated"); // Trigger reloads on client
      }
    }
  }

  private async cleanupPod(podName: string, namespace: string, sessionId: string) {
    console.log(`[SandboxService] Cleaning up Pod ${podName}`);
    try {
      await this.k8sApi.deleteNamespacedPod({ name: podName, namespace });
    } catch (e) {
      // Already deleted or not found
    }

    try {
      const networkingApi = this.kc.makeApiClient(k8s.NetworkingV1Api);
      await networkingApi.deleteNamespacedNetworkPolicy({ name: `isolate-${sessionId.substring(0, 8)}`, namespace });
    } catch (e) {
      // Not found
    }
  }

  private async createNetworkPolicy(sessionId: string) {
    const networkingApi = this.kc.makeApiClient(k8s.NetworkingV1Api);
    const policy: k8s.V1NetworkPolicy = {
      metadata: {
        name: `isolate-${sessionId.substring(0, 8)}`,
      },
      spec: {
        podSelector: {
          matchLabels: {
            sessionId: sessionId,
          },
        },
        policyTypes: ["Egress"],
        egress: [
          // Allow DNS resolution (required for the agent to reach LLM APIs)
          {
            ports: [
              { protocol: "UDP", port: 53 },
              { protocol: "TCP", port: 53 },
            ],
          },
          // Allow HTTPS egress (required for Google Gemini API calls)
          {
            ports: [
              { protocol: "TCP", port: 443 },
            ],
          },
        ],
      },
    };
    try {
      await networkingApi.createNamespacedNetworkPolicy({ namespace: "lattice-sandboxes", body: policy });
    } catch (e) {
      console.warn("[SandboxService] Failed to apply NetworkPolicy. Proceeding without isolation.");
    }
  }

  private async ensureNamespaceExists(namespace: string): Promise<void> {
    try {
      await this.k8sApi.readNamespace({ name: namespace });
    } catch (error) {
      console.log(`[SandboxService] Namespace ${namespace} not found. Creating it...`);
      try {
        await this.k8sApi.createNamespace({
          body: {
            metadata: {
              name: namespace,
            },
          },
        });
      } catch (createError) {
        console.error(`[SandboxService] Failed to create namespace ${namespace}:`, createError);
        throw createError;
      }
    }
  }
}

export const sandboxService = new SandboxService();
