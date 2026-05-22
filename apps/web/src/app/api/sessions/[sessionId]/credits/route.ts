import { NextRequest, NextResponse } from "next/server";
import { getUserFromAccessToken } from "@/server/lib/auth";
import { getCreditTransactions } from "@/server/services/credit.service";
import { supabaseAdmin } from "@/server/lib/supabase";

export async function GET(request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.split(" ")[1];
  const userId = token ? await getUserFromAccessToken(token) : null;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await params;

  // Verify session ownership
  const { data: session, error: sessionError } = await supabaseAdmin
    .from("sessions")
    .select("cost_usd, credits_used")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Get transactions for this session
  const transactions = await getCreditTransactions(userId, 50, sessionId);

  return NextResponse.json({
    sessionId,
    costUsd: session.cost_usd,
    creditsUsed: session.credits_used,
    transactions,
  });
}
