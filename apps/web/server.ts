import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";
import { getUserFromAccessToken } from "./src/server/lib/auth";
import { startAgentProcess } from "./src/server/services/agent.service";
import { appendMessage } from "./src/server/services/session.service";
import { v4 as uuidv4 } from "uuid";
import { ChatMessage, type ChatMessageContent } from "@lattice/shared";

import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handle);
  const io = new Server(httpServer, {
    path: "/api/socketio",
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  (globalThis as Record<string, unknown>).io = io;

  io.on("connection", async (socket) => {
    const { sessionId, accessToken } = socket.handshake.auth;

    if (!sessionId || !accessToken) {
      console.warn("[Socket] Connection rejected: missing credentials.");
      socket.disconnect();
      return;
    }

    // Authenticate user
    const userId = await getUserFromAccessToken(accessToken);
    if (!userId) {
      console.warn("[Socket] Connection rejected: invalid access token.");
      socket.disconnect();
      return;
    }

    socket.join(sessionId);
    console.log(`[Socket] User ${userId} joined session ${sessionId}`);

    socket.emit("joinedSession");

    // Listen for client messages
    socket.on("clientMessage", async ({ message, attachments }) => {
      console.log(`[Socket] Received message from user ${userId} for session ${sessionId}`);

      try {
        let content: unknown = message;

        // If there are attachments, format as multi-part content
        if (attachments && attachments.length > 0) {
          content = [
            { type: "text", text: message },
            ...attachments.map((att: Record<string, unknown>) => ({
              type: att.type,
              image: att.type === "image" ? att.data : undefined,
              data: att.type === "file" ? att.data : undefined,
              mediaType: att.mediaType,
              filename: att.filename,
            })),
          ];
        }

        // 1. Persist user message to Supabase
        const userMessage: ChatMessage = {
          id: uuidv4(),
          role: "user",
          content: content as ChatMessageContent,
          timestamp: Date.now(),
        };

        await appendMessage(sessionId, userMessage, userId);

        // 2. Start the Agent sandbox process
        await startAgentProcess(sessionId, userId, io);

      } catch (error) {
        console.error("[Socket] Failed to process client message:", error);
        socket.emit("error", { message: "Failed to send message." });
      }
    });

    socket.on("disconnect", () => {
      console.log(`[Socket] User ${userId} disconnected from session ${sessionId}`);
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
