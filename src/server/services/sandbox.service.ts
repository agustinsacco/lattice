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
              ports: [
                {
                  containerPort: 8080,
                  hostPort: allocatedPort,
                },
              ],
              env: [
                { name: "SESSION_ID", value: sessionId },
                { name: "USER_ID", value: userId },
                { name: "GOOGLE_API_KEY", value: process.env.GOOGLE_API_KEY || "" },
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
    while (Date.now() - start < timeoutMs) {
      const pod = await this.k8sApi.readNamespacedPodStatus({ name: podName, namespace });
      const phase = pod.status?.phase;
      if (phase === "Running") {
        return;
      }
      if (phase === "Failed" || phase === "Unknown") {
        throw new Error(`Pod failed to start. Phase: ${phase}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error(`Timeout waiting for Pod ${podName} to start.`);
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

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const event = JSON.parse(line.substring(6));
            if (event.type === "log") {
              // Parse log to see if it's a tool event or standard stdout
              console.log(`[Sandbox Log] ${event.data}`);
              io.to(sessionId).emit("agentLog", { log: event.data });
            } else if (event.type === "error") {
              console.error(`[Sandbox Error] ${event.data}`);
              io.to(sessionId).emit("agentError", { error: event.data });
            }
          } catch (e) {
            // Non-JSON or malformed line
          }
        }
      }
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
          {
            to: [
              {
                ipBlock: {
                  cidr: "0.0.0.0/0",
                  except: ["0.0.0.0/0"],
                },
              },
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
