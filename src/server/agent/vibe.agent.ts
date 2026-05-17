import { Experimental_Agent as Agent, tool, stepCountIs } from "ai";
import { google } from "@ai-sdk/google";
import { read_pdf, write_pdf } from "../../server/tools";
import { createMemoryTool } from "../../server/tools/userMemory.tool";
import { readPdfInputSchema, WritePdfInputSchema } from "../../server/types/pdf.schemas";
import { z } from "zod";
import { appendMessage, getSession, updateSessionCostAndCredits } from "@/server/services/session.service";
import { ChatMessage, TextPart, ToolCallPart, ToolResultPart, TokenUsage } from "../../common/types";
import { Server } from "socket.io";
import { AGENT_MAX_STEPS, VIBE_AGENT_MODEL_NAME } from "../../common/config";
import { calculateCost } from "../services/cost.service";

/**
 * Initializes and returns an AI agent for PDF form completion.
 *
 * @param sessionId - The ID of the current session.
 * @param userId - The ID of the authenticated user.
 * @param io - Socket.io server instance for real-time status updates.
 * @param pdfAnalysis - Optional pre-analyzed PDF structure to inject into the system prompt.
 * @returns An instance of the AI Agent.
 */
export function getAgent(sessionId: string, userId: string, io: Server, pdfAnalysis?: any) {
  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let insufficientCreditsEmitted = false;

  const pdfStructureContext = pdfAnalysis 
    ? `
**ACTIVE PDF STRUCTURE (Pre-Analyzed):**
The current PDF has the following fillable fields:
${JSON.stringify(pdfAnalysis.fillableFields || {}, null, 2)}

**Report:**
${pdfAnalysis.analysisReport || "Document analyzed."}
` 
    : "**PDF STRUCTURE NOT YET ANALYZED.** You MUST call \`read_pdf\` to understand the fields before writing.";

  const finalSystemPrompt = `
**Role:**
You are an expert AI assistant for PDF form completion. Your goal is to help users fill PDFs accurately, efficiently, and with minimal friction. You are confident, proactive, and technically precise.

**Current Date:**
${currentDate}

**CRITICAL: Session ID**
Session ID: \`${sessionId}\`
You MUST use this exact ID for ALL tool calls.

${pdfStructureContext}

**Core Capabilities:**
1.  **PDF Analysis (\`read_pdf\`)**: You can extract the exact field structure of any PDF.
2.  **PDF Writing (\`write_pdf\`)**: You can fill fields using their technical \`fieldName\`s.
3.  **Memory (\`manage_user_memory\`)**: You can save and retrieve user details to auto-fill forms.
4.  **Multimodal**: You can see and understand images (screenshots, receipts, etc.) provided by the user.

**Operational Rules:**

1.  **Initial Analysis & Summary**:
    -   If the PDF is already analyzed (see "ACTIVE PDF STRUCTURE" above), do NOT call \`read_pdf\` again unless explicitly asked.
    -   If not analyzed, call \`read_pdf\` immediately.
    -   Provide a *one-sentence* summary of the document and proactively suggest a section to fill.

2.  **Field Handling (The "Expert" Approach)**:
    -   **Internal**: You deal with technical \`fieldName\`s (e.g., \`Account_MainAccountHolder_FirstName\`).
    -   **External**: You speak to the user in *human* terms (e.g., "First Name").
    -   **Mapping**: When the user says "My name is John", you silently map that to \`Account_MainAccountHolder_FirstName\` and fill it. You do NOT need to ask "Did you mean Account_MainAccountHolder_FirstName?". Just do it.
    -   **Ambiguity**: Only ask for clarification if it's truly ambiguous (e.g., two "Signature" fields). When asking, you can mention the section to clarify (e.g., "Is this for the Shipper or the Consignee?").

3.  **Auto-Fill & Memory (Proactive)**:
    -   **Check Memory First**: Before asking for *any* common info (Name, Address, Phone), check your memory bank. If you have it, fill it automatically and tell the user: "I've filled in your saved address."
    -   **Save New Info**: If the user provides new details, fill the form AND ask to save it to memory for next time.

4.  **Image/Screenshot Handling**:
    -   If the user uploads an image (e.g., a screenshot of data, a driver's license), analyze it.
    -   Extract relevant data and map it to the PDF fields AUTOMATICALLY.
    -   Report back: "I extracted your details from the image and filled the Name and Address fields."

5.  **Writing Data**:
    -   **Batching**: Always bundle as many updates as possible into a single \`write_pdf\` call.
    -   **Tables**: You can fill entire tables in one go. If the user gives a list of items, map them to the table rows (e.g., \`Row[0]_Item\`, \`Row[1]_Item\`) and fill them all.

**Tone:**
Confident, helpful, efficient. Don't be robotic. Be a capable assistant getting the job done.
`;

  return new Agent({
    model: google(VIBE_AGENT_MODEL_NAME),
    system: finalSystemPrompt,
    stopWhen: stepCountIs(AGENT_MAX_STEPS), // Allow up to AGENT_MAX_STEPS
    tools: {
      read_pdf: tool({
        description:
          "Reads the currently active PDF to determine if it's fillable or not and extracts its structure. The session ID is automatically provided from the system prompt. This MUST be called before any attempt to write.",
        inputSchema: readPdfInputSchema,
        execute: async ({ sessionId: _ignoredSessionId }: z.infer<typeof readPdfInputSchema>) =>
          read_pdf(sessionId, userId, (status, progress) => {
            io.to(sessionId).emit("analysisStatus", { status, progress });
          }), // Use sessionId from closure to ensure accuracy
      }),
      write_pdf: tool({
        description:
          "Writes data to the PDF. The session ID is automatically provided from the system prompt. Uses 'fields' mode for fillable PDFs and 'coordinates' mode for non-fillable PDFs.",
        inputSchema: WritePdfInputSchema,
        execute: async ({ sessionId: _ignoredSessionId, fillData }: z.infer<typeof WritePdfInputSchema>) =>
          write_pdf(sessionId, fillData, userId), // Use sessionId from closure to ensure accuracy
      }),
      manage_user_memory: createMemoryTool(userId),
    },
    onStepFinish: async (stepResult) => {
      const currentSessionId = sessionId;
      const currentUserId = userId;

      if (!currentSessionId || !currentUserId) {
        console.error("Session ID or User ID not found in onStepFinish context.");
        return;
      }

      const io: Server = (global as any).io;

      if (!io) {
        console.error("Socket.io server instance not found on global object.");
        return;
      }

      const processAndEmitMessage = async (message: ChatMessage): Promise<ChatMessage | null> => {
        if (!message.content) {
          return null;
        }
        try {
          const messageId = await appendMessage(currentSessionId, message, currentUserId); // Persist the message and get its ID
          const persistedMessage = { ...message, id: messageId }; // Add the ID to the message
          io.to(currentSessionId).emit("agentMessage", persistedMessage);
          return persistedMessage;
        } catch (error) {
          console.error(
            `[Agent] Failed to persist/emit message for session ${currentSessionId}: ${error instanceof Error ? error.message : String(error)}`
          );
          return null;
        }
      };

      const googleUsageMetadata = (stepResult.providerMetadata as any)?.google?.usageMetadata;
      const inputTokens = googleUsageMetadata?.promptTokenCount || 0;
      const cachedTokens = googleUsageMetadata?.cachedContentTokenCount || 0;
      const outputTokens = googleUsageMetadata?.candidatesTokenCount || 0;
      const totalTokens = googleUsageMetadata?.totalTokenCount || 0;

      const getTokenUsage = (): TokenUsage => ({
        inputTokens: inputTokens,
        outputTokens: outputTokens,
        totalTokens: totalTokens,
        cachedTokens: cachedTokens,
        modelName: VIBE_AGENT_MODEL_NAME,
      });

      const tokenUsage = getTokenUsage();
      console.log(
        `[VibeAgent] Step finished. Total: ${tokenUsage.totalTokens} (In: ${tokenUsage.inputTokens}, Out: ${tokenUsage.outputTokens}, Cached: ${cachedTokens})`
      );

      if (tokenUsage.totalTokens > 0) {
        const costBreakdown = calculateCost(tokenUsage);
        // console.log(`[VibeAgent] Calculated cost breakdown:`, JSON.stringify(costBreakdown));

        const result = await updateSessionCostAndCredits(currentSessionId, tokenUsage, currentUserId);
        if (!result.success) {
          console.error(`[VibeAgent] Credit deduction failed. Insufficient credits: ${result.insufficientCredits}`);
        }

        if (!result.success && result.insufficientCredits) {
          if (!insufficientCreditsEmitted) {
            io.to(currentSessionId).emit("insufficientCredits", {
              message: "You have run out of credits. Please purchase more to continue.",
            });
            insufficientCreditsEmitted = true;
          }
          // Stop processing further steps if needed, or just notify.
          // For now, we just notify and let the current step finish, but maybe we should stop?
          // The plan said "Stop processing", but here we are at the end of a step.
          // We can't easily "stop" the agent loop from here without throwing or returning a signal.
          // But since this is onStepFinish, the step is already done.
          // The next step might fail if we check credits before execution.
          // For now, let's just emit the event.
        }

        // After updating the cost, fetch the latest session data to get the new total cost
        try {
          const updatedSession = await getSession(currentSessionId, currentUserId);
          io.to(currentSessionId).emit("sessionCostUpdated", { session: updatedSession });
        } catch (error) {
          console.error(
            `[Agent] Failed to fetch updated session after cost update for session ${currentSessionId}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      let tokensAssignedToMessage = false; // Track if we've already assigned tokens

      const handleToolCallPart = async (part: ToolCallPart) => {
        console.log(`[VibeAgent] Handling tool call: ${part.toolName}`);
        const messageToSend: ChatMessage = {
          role: "assistant",
          type: "tool-call",
          toolName: part.toolName,
          toolInput: part.input, // Use part.input directly
          content: [
            {
              type: "tool-call",
              toolCallId: part.toolCallId,
              toolName: part.toolName,
              input: part.input, // Use part.input directly
            },
          ],
          timestamp: Date.now(),
          tokenUsage: undefined, // Don't assign tokens to tool calls
          cost: 0, // Don't assign cost to tool calls
        };
        await processAndEmitMessage(messageToSend);
      };

      const handleToolResultPart = async (part: ToolResultPart) => {
        console.log(`[VibeAgent] Handling tool result: ${part.toolName}`);

        let toolOutputToPersist = part.output;

        // Optimization: Summarize read_pdf output for history. 
        // The agent already has the full structure in the system prompt.
        if (part.toolName === "read_pdf" && part.output && typeof part.output === "object") {
          const output = part.output as any;
          toolOutputToPersist = {
            summary: "PDF analysis complete.",
            fieldCount: Object.keys(output.fillableFields?.regularFields || {}).length,
            sectionCount: output.fillableFields?.sections?.length || 0,
            report: output.analysisReport?.substring(0, 100) + "...",
            note: "Full structure is injected into system context."
          };
        }

        // Only emit PDF update event if this is a write_pdf result and successful
        if (part.toolName === "write_pdf" && part.output && typeof part.output === "object") {
          const output = part.output as any;
          if (output.success) {
            io.to(currentSessionId).emit("pdfUpdated");
          }
        }
        const messageToSend: ChatMessage = {
          role: "tool",
          type: "tool-result",
          toolName: part.toolName,
          toolOutput: toolOutputToPersist,
          content: [
            {
              type: "tool-result",
              toolCallId: part.toolCallId,
              toolName: part.toolName,
              output: toolOutputToPersist,
            },
          ],
          timestamp: Date.now(),
          tokenUsage: undefined, // Don't assign tokens to tool results
          cost: 0, // Don't assign cost to tool results
        };
        await processAndEmitMessage(messageToSend);
      };

      const handleTextPart = async (part: TextPart) => {
        const messageToSend: ChatMessage = {
          role: "assistant",
          content: part.text,
          timestamp: Date.now(),
          // Assign tokens ONLY to text messages, and only once per step
          tokenUsage: tokensAssignedToMessage ? undefined : tokenUsage,
          cost: tokensAssignedToMessage ? 0 : tokenUsage.totalTokens > 0 ? calculateCost(tokenUsage).totalCost : 0,
        };
        tokensAssignedToMessage = true;
        await processAndEmitMessage(messageToSend);
      };

      // Process each content part in the stepResult
      if (stepResult.content) {
        for (const part of stepResult.content) {
          if (part.type === "tool-call") {
            await handleToolCallPart(part as ToolCallPart);
          } else if (part.type === "tool-result") {
            await handleToolResultPart(part as ToolResultPart);
          } else if (part.type === "text") {
            await handleTextPart(part as TextPart);
          }
        }
      }

      // Emit agentLoading: false when the agent finishes its work
      if (stepResult.finishReason === "stop") {
        io.to(currentSessionId).emit("agentLoading", { isLoading: false });
      }
    },
  });
}
