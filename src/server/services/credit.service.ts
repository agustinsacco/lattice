import { supabaseAdmin } from "@/server/lib/supabase";

import { UserCredits, CreditTransaction } from "@/common/types";
import { CREDIT_CONFIG, PRICING_CONFIG } from "@/common/config";

/**
 * Get user's current credit balance
 */
export async function getUserCredits(userId: string): Promise<UserCredits | null> {
  const { data, error } = await supabaseAdmin.from("user_credits").select("*").eq("user_id", userId).single();

  if (error || !data) return null;

  return {
    userId: data.user_id,
    balance: data.balance,
    dailyCreditsLastReset: data.daily_credits_last_reset ? new Date(data.daily_credits_last_reset) : null,
    hasReceivedWelcomeCredits: data.has_received_welcome_credits ?? false,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

/**
 * Deduct credits for usage
 */
export async function deductCredits(
  userId: string,
  credits: number,
  description: string,
  sessionId?: string,
  messageId?: string,
  model?: string,
  baseCost?: number,
  margin?: number,
  inputTokens?: number,
  outputTokens?: number
): Promise<boolean> {
  const { data: success, error } = await supabaseAdmin.rpc("increment_user_credits_v2", {
    user_id_arg: userId,
    amount_arg: -credits, // Negative for deduction
    transaction_type_arg: "usage",
    description_arg: description,
    session_id_arg: sessionId || null,
    message_id_arg: messageId || null,
    model_arg: model || null,
    base_cost_arg: baseCost || null,
    margin_arg: margin || null,
    input_tokens_arg: inputTokens || null,
    output_tokens_arg: outputTokens || null,
    enforce_balance: true,
  });

  if (error) {
    console.error(`[CreditService] Atomic deduction failed for user ${userId}:`, error.message);
    return false;
  }

  return success === true;
}

/**
 * Add credits (for purchases, refunds, or manual additions)
 * @param idempotencyKey Optional key to prevent duplicate transactions (e.g., Stripe payment intent ID)
 */
export async function addCredits(
  userId: string,
  credits: number,
  transactionType: "purchase" | "refund" | "manual_add",
  description: string,
  idempotencyKey?: string
): Promise<void> {
  // Check for duplicate transaction if idempotency key provided
  if (idempotencyKey) {
    const { data: existingTransaction } = await supabaseAdmin
      .from("credit_transactions")
      .select("id")
      .eq("user_id", userId)
      .eq("description", description)
      .ilike("description", `%${idempotencyKey}%`)
      .limit(1);

    if (existingTransaction && existingTransaction.length > 0) {
      console.log(`Duplicate transaction detected for idempotency key: ${idempotencyKey}`);
      return; // Skip - already processed
    }
  }

  // Ensure user_credits row exists using upsert to handle race conditions
  const { error: upsertError } = await supabaseAdmin
    .from("user_credits")
    .upsert({ user_id: userId, balance: 0 }, { onConflict: "user_id", ignoreDuplicates: true });

  if (upsertError) {
    console.error("Failed to ensure user_credits row:", upsertError);
    // We proceed anyway, as the RPC might still work if the row exists
  }

  // Include idempotency key in description if provided
  const finalDescription = idempotencyKey ? `${description} (Payment ID: ${idempotencyKey})` : description;

  const { error } = await supabaseAdmin.rpc("increment_user_credits", {
    user_id_arg: userId,
    amount_arg: credits,
    transaction_type_arg: transactionType,
    description_arg: finalDescription,
    session_id_arg: null,
    message_id_arg: null,
    model_arg: null,
    base_cost_arg: null,
    margin_arg: null,
    input_tokens_arg: null,
    output_tokens_arg: null,
  });

  if (error) {
    console.error("Failed to add credits via RPC:", error);
    throw new Error(`Failed to add credits: ${error.message}`);
  }
}

/**
 * Get user's credit transaction history
 */
export async function getCreditTransactions(
  userId: string,
  limit: number = 50,
  sessionId?: string
): Promise<CreditTransaction[]> {
  let query = supabaseAdmin
    .from("credit_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (sessionId) {
    query = query.eq("session_id", sessionId);
  }

  const { data, error } = await query;

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    userId: row.user_id,
    amount: row.amount,
    transactionType: row.transaction_type as CreditTransaction["transactionType"],
    description: row.description,
    sessionId: row.session_id,
    messageId: row.message_id,
    model: row.model,
    baseCost: row.base_cost,
    margin: row.margin,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    createdAt: new Date(row.created_at),
  }));
}

/**
 * Grant welcome credits to a new user (one-time only)
 * Returns true if credits were granted, false if user already received them
 */
export async function grantWelcomeCredits(userId: string): Promise<{ granted: boolean; balance: number }> {
  // 1. Check current status
  const currentCredits = await getUserCredits(userId);

  if (currentCredits?.hasReceivedWelcomeCredits) {
    return { granted: false, balance: currentCredits.balance };
  }

  const welcomeAmount = CREDIT_CONFIG.WELCOME_CREDITS;
  const description = `Welcome bonus - ${welcomeAmount} Credits on us!`;

  // 2. Grant credits
  // Case A: User doesn't even have a row in user_credits yet (Brand new user)
  if (!currentCredits) {
    const { data: newData, error: insertError } = await supabaseAdmin
      .from("user_credits")
      .insert({
        user_id: userId,
        balance: welcomeAmount,
        has_received_welcome_credits: true,
      })
      .select();

    if (insertError) {
      // If insert failed (maybe they signed up in another tab simultaneously), 
      // check if it's because the row now exists
      if (insertError.code === "23505") { // Unique violation
         // Fall through to update logic below
      } else {
        console.error("Failed to insert welcome credits:", insertError);
        return { granted: false, balance: 0 };
      }
    } else if (newData && newData.length > 0) {
      await recordTransaction(userId, welcomeAmount, description);
      return { granted: true, balance: newData[0].balance };
    }
  }

  // Case B: User has a row but hasn't received the bonus yet
  // We use an atomic update with a flag check to prevent duplicate grants
  const { data: updateData, error: updateError } = await supabaseAdmin
    .from("user_credits")
    .update({
      balance: (currentCredits?.balance ?? 0) + welcomeAmount,
      has_received_welcome_credits: true,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("has_received_welcome_credits", false)
    .select();

  if (updateError || !updateData || updateData.length === 0) {
    // If update failed or affected 0 rows, they already got it or something is wrong
    const latest = await getUserCredits(userId);
    return { granted: false, balance: latest?.balance ?? 0 };
  }

  await recordTransaction(userId, welcomeAmount, description);

  return {
    granted: true,
    balance: updateData[0].balance,
  };
}

/**
 * Internal helper to record a transaction without updating balance
 */
async function recordTransaction(userId: string, amount: number, description: string) {
  const { error } = await supabaseAdmin.from("credit_transactions").insert({
    user_id: userId,
    amount: amount,
    transaction_type: "welcome_bonus",
    description: description,
  });
  if (error) console.error("Failed to record transaction:", error);
}
