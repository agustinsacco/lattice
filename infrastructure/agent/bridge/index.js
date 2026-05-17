const express = require("express");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());

const WORKSPACE_DIR = "/workspace";
const LOG_FILE = path.join(WORKSPACE_DIR, "session.jsonl");

// Ensure workspace exists
if (!fs.existsSync(WORKSPACE_DIR)) {
  fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
}

/**
 * Endpoint to start the agent turn.
 * Accepts the initial session log.
 */
app.post("/run", (req, res) => {
  const { sessionLog, prompt } = req.body;

  console.log(`[Bridge] Starting agent turn with prompt: "${prompt}"`);

  // 1. Hydrate the session log
  fs.writeFileSync(LOG_FILE, sessionLog || "");

  // 2. Prepare the workspace
  // Write a default design.py if it doesn't exist
  const designFile = path.join(WORKSPACE_DIR, "design.py");
  if (!fs.existsSync(designFile)) {
    fs.writeFileSync(designFile, "# Start building your 3D model here\nfrom build123d import *\n");
  }

  // Clear previous output artifacts to guarantee atomicity (prevent stale/doubled-up STLs on failure)
  const outputsDir = path.join(WORKSPACE_DIR, "outputs");
  if (fs.existsSync(outputsDir)) {
    fs.rmSync(outputsDir, { recursive: true, force: true });
  }
  fs.mkdirSync(outputsDir, { recursive: true });

  // 3. Spawn the pi agent
  // We call the 'pi' CLI. We assume it is installed globally or in the bridge.
  // We pass the workspace, the log, and the new user prompt.
  const agentProcess = spawn("npx", [
    "-y",
    "@earendil-works/pi-coding-agent",
    "run",
    "--workspace", WORKSPACE_DIR,
    "--log", LOG_FILE,
    "--prompt", prompt
  ]);

  // Set headers for streaming logs (SSE style or plain text chunked)
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendEvent = (type, data) => {
    res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
  };

  // Stream agent stdout/stderr back to Next.js
  agentProcess.stdout.on("data", (data) => {
    const lines = data.toString().split("\n");
    for (const line of lines) {
      if (line.trim()) {
        sendEvent("log", line);
      }
    }
  });

  agentProcess.stderr.on("data", (data) => {
    console.error(`[Agent Error] ${data}`);
    sendEvent("error", data.toString());
  });

  agentProcess.on("close", (code) => {
    console.log(`[Bridge] Agent finished with code ${code}`);
    sendEvent("status", code === 0 ? "completed" : "failed");
    res.end();
  });
});

/**
 * Endpoint to retrieve all generated files (STLs, code, logs).
 */
app.get("/artifacts", (req, res) => {
  const artifacts = {
    log: "",
    code: "",
    stlBase64: null,
  };

  try {
    if (fs.existsSync(LOG_FILE)) {
      artifacts.log = fs.readFileSync(LOG_FILE, "utf8");
    }

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
    console.error("[Bridge] Failed to read artifacts:", error);
    res.status(500).json({ error: "Failed to read artifacts" });
  }
});

const PORT = 8080;
app.listen(PORT, () => {
  console.log(`[Bridge] Ephemeral agent bridge listening on port ${PORT}`);
});
