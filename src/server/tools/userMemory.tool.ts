import { z } from "zod";
import { tool } from "ai";
import { batchSetUserMemory, getUserMemoryForAgent, deleteUserMemory } from "../services/userMemory.service";

// Schema for memory management tool
export const ManageUserMemoryInputSchema = z.object({
  action: z.enum(["add", "delete", "get"]),
  entries: z
    .array(
      z.object({
        key: z.string().describe("Unique identifier (e.g., 'address_home_city', 'phone_primary')"),
        value: z.string().describe("The value to store"),
        category: z
          .enum(["contact", "address", "personal", "preferences", "account", "emergency", "organization"])
          .describe("Category for organization"),
      })
    )
    .optional()
    .describe("List of entries to add/update. Required for 'add' action."),
  keysToDelete: z.array(z.string()).optional().describe("List of keys to delete. Required for 'delete' action."),
  reason: z.string().optional().describe("Brief explanation of why this action is being taken"),
});

export function createMemoryTool(userId: string) {
  return tool({
    description:
      "Manage user's stored personal information. Use 'add' to save multiple pieces of info at once (e.g. a full address split into components).",
    inputSchema: ManageUserMemoryInputSchema,
    execute: async ({ action, entries, keysToDelete, reason }: z.infer<typeof ManageUserMemoryInputSchema>) => {
      try {
        switch (action) {
          case "add":
            if (!entries || entries.length === 0) {
              return { success: false, error: "No entries provided for add action" };
            }
            const saved = await batchSetUserMemory(userId, entries);
            return {
              success: true,
              action: "add",
              count: saved.length,
              message: `Successfully saved ${saved.length} entries.`,
            };

          case "delete":
            if (!keysToDelete || keysToDelete.length === 0) {
              return { success: false, error: "No keys provided for delete action" };
            }
            // Execute deletes in parallel
            await Promise.all(keysToDelete.map((key) => deleteUserMemory(userId, key)));
            return {
              success: true,
              action: "delete",
              message: `Successfully deleted ${keysToDelete.length} entries.`,
            };

          case "get":
            const memory = await getUserMemoryForAgent(userId);
            return {
              success: true,
              action: "get",
              memory: memory,
              message: "Retrieved current memory bank contents.",
            };
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    },
  });
}
