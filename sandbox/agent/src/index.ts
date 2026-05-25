import express, { Request, Response } from "express";
import { spawn } from "child_process";
import { StringDecoder } from "string_decoder";
import fs from "fs";
import path from "path";

const app = express();
app.use(express.json({ limit: "10mb" }));

const WORKSPACE_DIR = "/workspace";

// Ensure workspace exists
if (!fs.existsSync(WORKSPACE_DIR)) {
  fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
}

/**
 * Attach an LF-only JSONL reader to a stream.
 *
 * This intentionally does NOT use Node readline. readline splits on additional
 * Unicode separators (U+2028, U+2029) that are valid inside JSON strings.
 */
function attachJsonlReader(stream: NodeJS.ReadableStream, onLine: (line: string) => void) {
  const decoder = new StringDecoder("utf8");
  let buffer = "";

  stream.on("data", (chunk: Buffer | string) => {
    buffer += typeof chunk === "string" ? chunk : decoder.write(chunk);

    while (true) {
      const newlineIndex = buffer.indexOf("\n");
      if (newlineIndex === -1) break;

      let line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.length > 0) onLine(line);
    }
  });

  stream.on("end", () => {
    buffer += decoder.end();
    if (buffer.length > 0) {
      if (buffer.endsWith("\r")) buffer = buffer.slice(0, -1);
      onLine(buffer);
      buffer = "";
    }
  });
}

interface RunRequestBody {
  sessionLog?: string;
  prompt: string;
}

/**
 * POST /run
 *
 * Spawns the pi coding agent in RPC mode and streams structured JSON events
 * back to the caller (SandboxService) over HTTP SSE.
 */
app.post("/run", (req: Request<object, object, RunRequestBody>, res: Response) => {
  const { prompt } = req.body;

  console.log(`[Sandbox] Starting RPC agent turn with prompt: "${prompt}"`);

  // 1. Prepare the workspace
  const designFile = path.join(WORKSPACE_DIR, "design.py");
  if (!fs.existsSync(designFile)) {
    fs.writeFileSync(designFile, "# Start building your 3D model here\nfrom build123d import *\n");
  }

  // Clear previous output artifacts
  const outputsDir = path.join(WORKSPACE_DIR, "outputs");
  if (fs.existsSync(outputsDir)) {
    fs.rmSync(outputsDir, { recursive: true, force: true });
  }
  fs.mkdirSync(outputsDir, { recursive: true });

  // 2. Spawn pi in RPC mode (pre-installed via package.json)
  const piBin = path.join(process.cwd(), "node_modules", ".bin", "pi");
  const agentProcess = spawn(piBin, [
    "--mode", "rpc",
    "--provider", "google",
    "--model", "gemini-2.5-pro",
    "--no-session",
  ], {
    cwd: WORKSPACE_DIR,
    env: {
      ...process.env,
      // Ensure pi's bash tool doesn't try to open interactive editors
      EDITOR: "cat",
      VISUAL: "cat",
    },
  });

  // 3. Set headers for streaming
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendEvent = (type: string, data: unknown) => {
    res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
  };

  // 4. Parse structured JSONL from pi's stdout and forward as SSE
  if (agentProcess.stdout) {
    attachJsonlReader(agentProcess.stdout, (line) => {
      try {
        const event = JSON.parse(line);
        // Forward the full RPC event to the SandboxService
        sendEvent("rpc_event", event);
      } catch (_e) {
        // Non-JSON output (startup messages, etc.) — log but don't crash
        console.log(`[Sandbox stdout] ${line}`);
      }
    });
  }

  // 5. Capture stderr for debugging (warnings do not cause bridge_error events now)
  if (agentProcess.stderr) {
    agentProcess.stderr.on("data", (data) => {
      const text = data.toString().trim();
      if (text) {
        console.error(`[Sandbox stderr] ${text}`);
      }
    });
  }

  // 6. Once pi is ready, send the prompt via stdin
  // Give pi a moment to initialize before sending the prompt command
  setTimeout(() => {
    const promptCmd = JSON.stringify({
      id: "prompt-1",
      type: "prompt",
      message: prompt,
    }) + "\n";

    console.log(`[Sandbox] Sending RPC prompt command`);
    if (agentProcess.stdin) {
      agentProcess.stdin.write(promptCmd);
    }
  }, 1500);

  // 7. Handle process exit
  agentProcess.on("close", (code) => {
    console.log(`[Sandbox] Pi agent exited with code ${code}`);
    sendEvent("bridge_status", { status: code === 0 ? "completed" : "failed", exitCode: code });
    res.end();
  });

  agentProcess.on("error", (err) => {
    console.error(`[Sandbox] Failed to spawn pi agent:`, err);
    sendEvent("bridge_error", `Failed to spawn agent: ${err.message}`);
    res.end();
  });

  // Handle client disconnect
  req.on("close", () => {
    if (!agentProcess.killed) {
      console.log(`[Sandbox] Client disconnected. Sending abort and killing agent.`);
      try {
        if (agentProcess.stdin) {
          agentProcess.stdin.write(JSON.stringify({ type: "abort" }) + "\n");
        }
      } catch (_e) {
        // stdin may already be closed
      }
      setTimeout(() => {
        if (!agentProcess.killed) agentProcess.kill("SIGTERM");
      }, 2000);
    }
  });
});

interface ArtifactsResponse {
  log: string;
  code: string;
  stlBase64: string | null;
}

/**
 * GET /artifacts
 *
 * Returns generated files (STLs, code, logs).
 */
app.get("/artifacts", (req: Request, res: Response) => {
  const artifacts: ArtifactsResponse = {
    log: "",
    code: "",
    stlBase64: null,
  };

  try {
    const designFile = path.join(WORKSPACE_DIR, "design.py");
    if (fs.existsSync(designFile)) {
      artifacts.code = fs.readFileSync(designFile, "utf8");
    }

    // The agent exports the STL to /workspace/outputs/model.stl (as per generator)
    const stlFile = path.join(WORKSPACE_DIR, "outputs", "model.stl");
    if (fs.existsSync(stlFile)) {
      artifacts.stlBase64 = fs.readFileSync(stlFile).toString("base64");
    }

    res.json(artifacts);
  } catch (error) {
    console.error("[Sandbox] Failed to read artifacts:", error);
    res.status(500).json({ error: "Failed to read artifacts" });
  }
});

const PORT = 8080;
app.listen(PORT, () => {
  console.log(`[Sandbox] Ephemeral agent sandbox listening on port ${PORT} (RPC mode)`);
});
