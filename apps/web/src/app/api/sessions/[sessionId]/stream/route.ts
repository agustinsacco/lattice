import { NextRequest } from "next/server";
import { getAuthenticatedUserId } from "@/server/lib/supabase/server";

/**
 * SSE endpoint to stream agent logs for a session.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await context.params;
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const sendEvent = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // In a real implementation, we would subscribe to a message queue or 
      // Socket.io events here and forward them to the SSE stream.
      // For now, this is a placeholder for the durable harness.
      
      sendEvent({ type: "status", status: "connecting", sessionId });

      // Keep connection alive
      const interval = setInterval(() => {
        sendEvent({ type: "ping", timestamp: Date.now() });
      }, 30000);

      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
