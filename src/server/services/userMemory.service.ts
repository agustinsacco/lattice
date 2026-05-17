import { supabaseAdmin } from "@/server/lib/supabase";

export interface UserMemoryEntry {
  id: string;
  userId: string;
  key: string;
  value: string;
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserMemoryCategory {
  category: string;
  entries: UserMemoryEntry[];
}

/**
 * Fetch all memory entries for a user
 * Uses RLS - no explicit user check needed
 */
export async function getUserMemory(userId: string): Promise<UserMemoryEntry[]> {
  const { data, error } = await supabaseAdmin
    .from("user_memory")
    .select("*")
    .eq("user_id", userId)
    .order("category", { ascending: true })
    .order("key", { ascending: true });

  if (error) {
    console.error(`[UserMemoryService] Failed to get memory for user ${userId}:`, error);
    throw new Error("Failed to get user memory");
  }

  return data.map((row) => ({
    id: row.id,
    userId: row.user_id,
    key: row.key,
    value: row.value,
    category: row.category,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }));
}

/**
 * Get memory entries grouped by category
 */
export async function getUserMemoryByCategory(userId: string): Promise<UserMemoryCategory[]> {
  const entries = await getUserMemory(userId);

  const grouped = entries.reduce(
    (acc, entry) => {
      if (!acc[entry.category]) {
        acc[entry.category] = [];
      }
      acc[entry.category].push(entry);
      return acc;
    },
    {} as Record<string, UserMemoryEntry[]>
  );

  return Object.entries(grouped).map(([category, entries]) => ({
    category,
    entries,
  }));
}

/**
 * Get specific memory entry by key
 */
export async function getUserMemoryEntry(userId: string, key: string): Promise<UserMemoryEntry | null> {
  const { data, error } = await supabaseAdmin
    .from("user_memory")
    .select("*")
    .eq("user_id", userId)
    .eq("key", key)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    console.error(`[UserMemoryService] Failed to get memory entry ${key} for user ${userId}:`, error);
    throw new Error("Failed to get user memory entry");
  }

  return {
    id: data.id,
    userId: data.user_id,
    key: data.key,
    value: data.value,
    category: data.category,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

/**
 * Batch create or upsert memory entries
 * This is the primary method for adding data
 */
export async function batchSetUserMemory(
  userId: string,
  entries: Array<{ key: string; value: string; category: string }>
): Promise<UserMemoryEntry[]> {
  const { data, error } = await supabaseAdmin
    .from("user_memory")
    .upsert(
      entries.map((entry) => ({
        user_id: userId,
        key: entry.key,
        value: entry.value,
        category: entry.category,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "user_id,key" }
    )
    .select();

  if (error) {
    console.error(`[UserMemoryService] Failed to batch set memory for user ${userId}:`, error);
    throw new Error("Failed to set user memory");
  }

  return data.map((row) => ({
    id: row.id,
    userId: row.user_id,
    key: row.key,
    value: row.value,
    category: row.category,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }));
}

/**
 * Delete memory entry
 */
export async function deleteUserMemory(userId: string, key: string): Promise<boolean> {
  const { error } = await supabaseAdmin.from("user_memory").delete().eq("user_id", userId).eq("key", key);

  if (error) {
    console.error(`[UserMemoryService] Failed to delete memory entry ${key} for user ${userId}:`, error);
    throw new Error("Failed to delete user memory entry");
  }

  return true;
}

/**
 * Get memory as formatted string for agent context
 * Formats in a way agent can easily understand and reference
 */
export async function getUserMemoryForAgent(userId: string): Promise<string> {
  const entries = await getUserMemory(userId);

  if (entries.length === 0) {
    return "User Memory Bank is empty.";
  }

  const grouped = entries.reduce(
    (acc, entry) => {
      if (!acc[entry.category]) {
        acc[entry.category] = [];
      }
      acc[entry.category].push(`${entry.key}: "${entry.value}"`);
      return acc;
    },
    {} as Record<string, string[]>
  );

  let output = "User Memory Bank:\n";
  for (const [category, items] of Object.entries(grouped)) {
    output += `\n[${category.toUpperCase()}]\n`;
    output += items.join("\n");
  }

  return output;
}
